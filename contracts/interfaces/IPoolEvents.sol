// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title IPoolEvents
 * @notice Standard event definitions for the Confidential PoolTogether protocol.
 * @dev Indexed parameters are selected for optimal off-chain indexing and relayer monitoring.
 */
interface IPoolEvents {
    /// @notice Emitted when a user successfully deposits funds into the confidential pool.
    /// @param user The address of the depositor.
    /// @param nonce The per-user deposit sequence counter.
    /// @param plainAmount The plaintext custody amount transferred to the pool.
    /// @param inputHandle The external ciphertext handle submitted by the user.
    event Deposited(
        address indexed user,
        uint256 indexed nonce,
        uint64 plainAmount,
        bytes32 indexed inputHandle
    );

    /// @notice Emitted when an asynchronous 2-step withdrawal is requested.
    /// @param user The address of the withdrawer.
    /// @param nonce The per-user withdrawal sequence counter.
    /// @param requestHash The cryptographic domain-binding hash of the request.
    /// @param requestedAmount The plaintext amount requested for withdrawal.
    /// @param handle The ciphertext handle authorized for off-chain KMS public decryption.
    event WithdrawalRequested(
        address indexed user,
        uint256 indexed nonce,
        bytes32 indexed requestHash,
        uint64 requestedAmount,
        bytes32 handle
    );

    /// @notice Emitted when a withdrawal request is finalized with a verified KMS decryption proof.
    /// @param user The address of the withdrawer.
    /// @param requestHash The cryptographic domain-binding hash that was consumed.
    /// @param cleartextAmount The verified plaintext amount paid out (0 if balance was insufficient).
    event WithdrawalFinalized(
        address indexed user,
        bytes32 indexed requestHash,
        uint64 cleartextAmount
    );

    /// @notice Emitted when a stale withdrawal request is cancelled by the user.
    /// @param user The address of the withdrawer.
    /// @param requestHash The cryptographic domain-binding hash that was cancelled.
    event WithdrawalCancelled(
        address indexed user,
        bytes32 indexed requestHash
    );

    /// @notice Emitted when a confidential prize draw is executed.
    /// @param drawId The unique sequential identifier of the draw.
    /// @param prizeAmount The prize amount awarded to the winning participant.
    /// @param timestamp The block timestamp of the draw.
    /// @param participantCount The number of active depositors eligible in the draw.
    event DrawExecuted(
        uint256 indexed drawId,
        uint64 prizeAmount,
        uint256 timestamp,
        uint256 participantCount
    );

    /// @notice Emitted when external yield is contributed to the prize pool.
    /// @param source The address supplying the yield.
    /// @param yieldAmount The plaintext yield amount added to the prize reserve.
    /// @param timestamp The block timestamp of the yield contribution.
    event YieldDeposited(
        address indexed source,
        uint64 yieldAmount,
        uint256 timestamp
    );
}
