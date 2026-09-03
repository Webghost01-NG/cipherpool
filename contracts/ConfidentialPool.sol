// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IConfidentialPool} from "./interfaces/IConfidentialPool.sol";
import {RequestBindingState} from "./base/RequestBindingState.sol";

/**
 * @title ConfidentialPool
 * @notice Production implementation of the Confidential PoolTogether prize savings pool.
 * @dev Combines Zama fhEVM v0.13.3 encrypted accounting with storage-anchored 2-step settlement.
 */
contract ConfidentialPool is
    RequestBindingState,
    IConfidentialPool,
    ReentrancyGuard,
    Ownable2Step,
    Pausable
{
    using SafeERC20 for IERC20;

    /// @notice Address of the underlying ERC-20 asset held in custody.
    address public immutable override custodyAsset;

    /// @notice Plaintext aggregate deposits tracked for modulo arithmetic and custody solvency.
    uint64 internal _totalDepositsPlain;

    /// @notice Aggregate custody yield allocated to encrypted prize balances.
    uint256 internal _reservedPrizesPlain;

    /// @notice Sequential identifier for executed prize draws.
    uint256 public override currentDrawId;

    /// @notice Encrypted per-user principal balance ciphertexts.
    mapping(address => euint64) internal _balances;

    /// @notice Encrypted per-user accumulated prize ciphertexts.
    mapping(address => euint64) internal _prizes;

    /// @notice List of registered depositor addresses for draw iteration.
    address[] public participants;

    /// @notice Mapping to track active participant registration.
    mapping(address => bool) public isParticipant;

    /// @notice Monotonically increasing deposit sequence counter per user.
    mapping(address => uint256) public userDepositNonces;

    /**
     * @param _custodyAsset Address of the underlying ERC-20 token (e.g. USDC).
     * @param _cancellationDelay Minimum duration (in seconds) before stale withdrawals can be cancelled.
     */
    constructor(
        address _custodyAsset,
        uint64 _cancellationDelay
    ) RequestBindingState(_cancellationDelay) Ownable(msg.sender) {
        if (_custodyAsset == address(0)) {
            revert InvalidAssetAddress();
        }
        custodyAsset = _custodyAsset;
    }

    /**
     * @notice Emergency administrative pause halts new deposits, withdrawals, and draws.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses normal protocol operations.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Deposits underlying ERC-20 tokens and credits the same amount to an encrypted balance.
     * @dev The contract derives the ciphertext from the custody amount, so callers cannot provide
     *      independent values for custody and encrypted accounting.
     * @param amount The amount transferred from the caller and credited to their encrypted balance.
     */
    function deposit(uint64 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) {
            revert ZeroDepositAmount();
        }

        // 1. Derive the encrypted credit from the sole custody amount.
        euint64 amountEnc = FHE.asEuint64(amount);

        // 2. Homomorphic balance incrementation & participant tracking
        if (!isParticipant[msg.sender]) {
            isParticipant[msg.sender] = true;
            participants.push(msg.sender);
            _balances[msg.sender] = amountEnc;
        } else {
            _balances[msg.sender] = FHE.add(_balances[msg.sender], amountEnc);
        }

        // 3. Persistent ACL allowances for contract and user
        _balances[msg.sender] = FHE.allowThis(_balances[msg.sender]);
        _balances[msg.sender] = FHE.allow(_balances[msg.sender], msg.sender);

        // 4. Accounting & event emission
        _totalDepositsPlain += amount;
        uint256 nonce = userDepositNonces[msg.sender]++;

        emit Deposited(msg.sender, nonce, amount, FHE.toBytes32(amountEnc));

        // 5. Custody asset transfer (Checks-Effects-Interactions)
        IERC20(custodyAsset).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Initiates an asynchronous 2-step withdrawal request.
     * @dev Homomorphically evaluates balance sufficiency and authorizes handle for KMS public decryption.
     * @param amount The plaintext amount requested for withdrawal.
     */
    function requestWithdrawal(uint64 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) {
            revert ZeroDepositAmount();
        }

        // 1. Homomorphically evaluate balance sufficiency
        euint64 amountEnc = FHE.asEuint64(amount);
        ebool sufficient = FHE.ge(_balances[msg.sender], amountEnc);
        euint64 approvedEnc = FHE.select(sufficient, amountEnc, FHE.asEuint64(0));

        // 2. Authorize approved ciphertext handle for KMS off-chain public decryption
        FHE.makePubliclyDecryptable(approvedEnc);

        // 3. Commit domain-bound request to storage (enforces single-use active state)
        _createWithdrawalRequest(msg.sender, approvedEnc, amount);
    }

    /**
     * @notice Finalizes a pending withdrawal using a verified KMS threshold decryption proof.
     * @dev Verifies KMS signatures against storage-anchored handle, consumes request, and transfers assets.
     * @param cleartextAmount The decrypted plaintext amount verified by the KMS signers.
     * @param decryptionProof The KMS threshold signature proof.
     */
    function finalizeWithdrawal(
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) external override nonReentrant {
        WithdrawalRequest storage req = _pendingWithdrawals[msg.sender];
        if (!req.active) {
            revert NoActiveWithdrawalRequest(msg.sender);
        }

        // Defensive range assertion: KMS output must strictly be requestedAmount or 0
        if (cleartextAmount != req.requestedAmount && cleartextAmount != 0) {
            revert InvalidDecryptedAmount(cleartextAmount, req.requestedAmount);
        }

        // Storage-anchored handle extraction (calldata CANNOT inject or alter handles)
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(req.handle);

        // Verify KMS threshold signature
        bytes memory abiEncodedCleartexts = abi.encode(cleartextAmount);
        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        // Checks-Effects-Interactions: Delete request from storage BEFORE custody transfer
        bytes32 consumedHash = _deleteWithdrawalRequest(msg.sender);

        // Settle payout if balance was sufficient
        if (cleartextAmount > 0) {
            euint64 newBalance = FHE.sub(_balances[msg.sender], cleartextAmount);
            _balances[msg.sender] = FHE.allowThis(newBalance);
            _balances[msg.sender] = FHE.allow(newBalance, msg.sender);
            _totalDepositsPlain -= cleartextAmount;

            emit WithdrawalFinalized(msg.sender, consumedHash, cleartextAmount);

            IERC20(custodyAsset).safeTransfer(msg.sender, cleartextAmount);
        } else {
            emit WithdrawalFinalized(msg.sender, consumedHash, 0);
        }
    }

    /**
     * @notice Cancels a stale pending withdrawal request if the cancellation delay has elapsed.
     * @dev Atomic storage deletion resets state and reclaims gas.
     */
    function cancelWithdrawal() external override nonReentrant {
        WithdrawalRequest storage req = _pendingWithdrawals[msg.sender];
        if (!req.active) {
            revert NoActiveWithdrawalRequest(msg.sender);
        }

        uint256 elapsed = block.timestamp - req.timestamp;
        if (elapsed <= _cancellationDelay) {
            revert WithdrawalNotStale(elapsed, _cancellationDelay);
        }

        bytes32 cancelledHash = _deleteWithdrawalRequest(msg.sender);

        emit WithdrawalCancelled(msg.sender, cancelledHash);
    }

    /**
     * @notice Executes an encrypted prize lottery draw across all registered depositors.
     * @dev Uses homomorphic randomness with bounded reduction and cumulative interval evaluation.
     * @param prizeAmount The plaintext prize amount to award to the winner.
     */
    function draw(uint64 prizeAmount) external override nonReentrant whenNotPaused onlyOwner {
        if (prizeAmount == 0) {
            revert ZeroPrizeAmount();
        }
        if (_totalDepositsPlain == 0 || participants.length == 0) {
            revert EmptyPool();
        }

        uint256 availableYield = availableYieldPlain();
        if (prizeAmount > availableYield) {
            revert InsufficientPrizeYield(prizeAmount, availableYield);
        }

        // Reserve custody before awarding so subsequent draws cannot reuse it.
        _reservedPrizesPlain += prizeAmount;

        // 1. Generate homomorphic random winning ticket bounded by total deposits
        euint64 winningTicket = FHE.randEuint64(_totalDepositsPlain);

        // 2. Cumulative interval search across participants
        euint64 cumEnd = FHE.asEuint64(0);
        euint64 prizeEnc = FHE.asEuint64(prizeAmount);

        uint256 len = participants.length;
        for (uint256 i = 0; i < len; i++) {
            address p = participants[i];
            euint64 bal = _balances[p];

            euint64 cumStart = cumEnd;
            cumEnd = FHE.add(cumEnd, bal);

            // Winner condition: cumStart <= winningTicket < cumEnd
            ebool geStart = FHE.ge(winningTicket, cumStart);
            ebool ltEnd = FHE.lt(winningTicket, cumEnd);
            ebool isWinner = FHE.and(geStart, ltEnd);

            // Award prize homomorphically without revealing winner identity
            euint64 award = FHE.select(isWinner, prizeEnc, FHE.asEuint64(0));
            _prizes[p] = FHE.add(_prizes[p], award);

            // Update ACL allowances for the user
            _prizes[p] = FHE.allowThis(_prizes[p]);
            _prizes[p] = FHE.allow(_prizes[p], p);
        }

        currentDrawId++;
        emit DrawExecuted(currentDrawId, prizeAmount, block.timestamp, len);
    }

    /**
     * @notice Merges caller's accumulated confidential prizes into their active principal balance.
     * @dev Homomorphically adds _prizes[msg.sender] into _balances[msg.sender] and resets _prizes[msg.sender].
     */
    function compoundPrizes() external override nonReentrant whenNotPaused {
        _balances[msg.sender] = FHE.add(_balances[msg.sender], _prizes[msg.sender]);
        _prizes[msg.sender] = FHE.asEuint64(0);

        _balances[msg.sender] = FHE.allowThis(_balances[msg.sender]);
        _balances[msg.sender] = FHE.allow(_balances[msg.sender], msg.sender);
        _prizes[msg.sender] = FHE.allowThis(_prizes[msg.sender]);
        _prizes[msg.sender] = FHE.allow(_prizes[msg.sender], msg.sender);
    }

    /**
     * @notice Returns the pending withdrawal request for a given user.
     * @param user The address of the user.
     */
    function getPendingWithdrawal(address user)
        external
        view
        virtual
        override(RequestBindingState, IConfidentialPool)
        returns (WithdrawalRequest memory)
    {
        return _pendingWithdrawals[user];
    }

    /**
     * @notice Returns the current withdrawal nonce for a given user.
     * @param user The address of the user.
     */
    function getUserWithdrawalNonce(address user)
        external
        view
        virtual
        override(RequestBindingState, IConfidentialPool)
        returns (uint256)
    {
        return userWithdrawalNonces[user];
    }

    /**
     * @notice Returns the cancellation delay in seconds.
     */
    function cancellationDelay()
        external
        view
        virtual
        override(RequestBindingState, IConfidentialPool)
        returns (uint64)
    {
        return _cancellationDelay;
    }

    /**
     * @notice Returns the raw ciphertext handle representing the user's encrypted balance.
     * @param user The address of the user.
     */
    function getBalanceHandle(address user) external view override returns (bytes32) {
        return FHE.toBytes32(_balances[user]);
    }

    /**
     * @notice Returns the raw ciphertext handle representing the user's encrypted prize balance.
     * @param user The address of the user.
     */
    function getPrizeHandle(address user) external view override returns (bytes32) {
        return FHE.toBytes32(_prizes[user]);
    }

    /**
     * @notice Returns the aggregate plaintext custody balance held in the pool.
     */
    function totalDepositsPlain() external view override returns (uint64) {
        return _totalDepositsPlain;
    }

    /**
     * @notice Returns custody yield that has been allocated to encrypted prize balances.
     */
    function reservedPrizesPlain() external view override returns (uint256) {
        return _reservedPrizesPlain;
    }

    /**
     * @notice Returns unallocated custody yield available for future draws.
     * @dev Principal and already-awarded prizes are both treated as liabilities.
     */
    function availableYieldPlain() public view override returns (uint256) {
        uint256 liabilities = uint256(_totalDepositsPlain) + _reservedPrizesPlain;
        uint256 custodyBalance = IERC20(custodyAsset).balanceOf(address(this));
        return custodyBalance > liabilities ? custodyBalance - liabilities : 0;
    }

    /**
     * @notice Returns the total count of registered depositors in the pool.
     */
    function getParticipantCount() external view override returns (uint256) {
        return participants.length;
    }
}
