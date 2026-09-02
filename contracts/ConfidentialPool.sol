// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IConfidentialPool} from "./interfaces/IConfidentialPool.sol";
import {RequestBindingState} from "./base/RequestBindingState.sol";

/**
 * @title ConfidentialPool
 * @notice Production implementation of the Confidential PoolTogether prize savings pool.
 * @dev Combines Zama fhEVM v0.13.3 encrypted accounting with storage-anchored 2-step settlement.
 */
contract ConfidentialPool is RequestBindingState, IConfidentialPool, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Address of the underlying ERC-20 asset held in custody.
    address public immutable override custodyAsset;

    /// @notice Plaintext aggregate deposits tracked for modulo arithmetic and custody solvency.
    uint64 internal _totalDepositsPlain;

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
    ) RequestBindingState(_cancellationDelay) {
        if (_custodyAsset == address(0)) {
            revert InvalidAssetAddress();
        }
        custodyAsset = _custodyAsset;
    }

    /**
     * @notice Deposits underlying ERC-20 tokens while crediting an encrypted balance ciphertext.
     * @param inputHandle The external ciphertext handle submitted by the user.
     * @param inputProof The cryptographic ZK proof verifying encryption bound to this contract.
     * @param plainCustodyAmount The plaintext custody amount transferred from caller.
     */
    function deposit(
        externalEuint64 inputHandle,
        bytes calldata inputProof,
        uint64 plainCustodyAmount
    ) external override nonReentrant {
        if (plainCustodyAmount == 0) {
            revert ZeroDepositAmount();
        }

        // 1. Verify encrypted user input via Zama InputVerifier
        euint64 amountEnc = FHE.fromExternal(inputHandle, inputProof);

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
        _totalDepositsPlain += plainCustodyAmount;
        uint256 nonce = userDepositNonces[msg.sender]++;

        emit Deposited(msg.sender, nonce, plainCustodyAmount, externalEuint64.unwrap(inputHandle));

        // 5. Custody asset transfer (Checks-Effects-Interactions)
        IERC20(custodyAsset).safeTransferFrom(msg.sender, address(this), plainCustodyAmount);
    }

    /**
     * @notice Initiates an asynchronous 2-step withdrawal request.
     * @dev Homomorphically evaluates balance sufficiency and authorizes handle for KMS public decryption.
     * @param amount The plaintext amount requested for withdrawal.
     */
    function requestWithdrawal(uint64 amount) external override nonReentrant {
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
            _balances[msg.sender] = FHE.allow(_balances[msg.sender], msg.sender);
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
     * @notice Placeholder for prize draw (implemented in Issue #13).
     */
    function draw(uint64 prizeAmount) external virtual override {}

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
     * @notice Returns the total count of registered depositors in the pool.
     */
    function getParticipantCount() external view override returns (uint256) {
        return participants.length;
    }
}
