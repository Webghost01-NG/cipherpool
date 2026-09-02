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
     * @notice Placeholder for withdrawal request (implemented in Issue #12).
     */
    function requestWithdrawal(uint64 amount) external virtual override {}

    /**
     * @notice Placeholder for withdrawal finalization (implemented in Issue #12).
     */
    function finalizeWithdrawal(uint64 cleartextAmount, bytes calldata decryptionProof) external virtual override {}

    /**
     * @notice Placeholder for withdrawal cancellation (implemented in Issue #12).
     */
    function cancelWithdrawal() external virtual override {}

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
