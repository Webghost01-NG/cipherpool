// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title IPoolErrors
 * @notice Standard custom errors for the Confidential PoolTogether protocol.
 * @dev Custom errors provide deterministic reverts and save bytecode / execution gas.
 */
interface IPoolErrors {
    /// @notice Thrown when attempting to deposit a zero amount.
    error ZeroDepositAmount();

    /// @notice Thrown when attempting to execute a draw with zero prize amount.
    error ZeroPrizeAmount();

    /// @notice Thrown when attempting to deposit without an active or valid token address.
    error InvalidAssetAddress();

    /// @notice Thrown when a user attempts to initiate a withdrawal while an active one is already pending.
    /// @param user The address that already has an active pending request.
    error ActiveWithdrawalExists(address user);

    /// @notice Thrown when attempting to finalize or cancel a withdrawal request when none is active.
    /// @param user The address with no active request.
    error NoActiveWithdrawalRequest(address user);

    /// @notice Thrown when attempting to cancel a pending withdrawal before the cancellation delay has elapsed.
    /// @param elapsed The elapsed seconds since request submission.
    /// @param requiredDelay The minimum seconds required before cancellation is permitted.
    error WithdrawalNotStale(uint256 elapsed, uint256 requiredDelay);

    /// @notice Thrown when the decrypted cleartext amount from KMS is neither the requested amount nor zero.
    /// @param decryptedAmount The amount verified by KMS signatures.
    /// @param requestedAmount The amount originally requested in the withdrawal.
    error InvalidDecryptedAmount(uint64 decryptedAmount, uint64 requestedAmount);

    /// @notice Thrown when the handle in the KMS decryption proof does not match the stored request handle.
    /// @param expectedHandle The handle recorded in contract storage for the user.
    /// @param providedHandle The handle verified by the KMS decryption proof.
    error HandleMismatch(bytes32 expectedHandle, bytes32 providedHandle);

    /// @notice Thrown when attempting to execute a draw with zero total active deposits.
    error EmptyPool();

    /// @notice Thrown when custody ERC-20 transfer fails or returns insufficient balance.
    /// @param required The amount of underlying assets required.
    /// @param available The amount of underlying assets currently available.
    error InsufficientCustodyBalance(uint256 required, uint256 available);

    /// @notice Thrown when a draw attempts to allocate principal or previously reserved yield.
    /// @param requested The prize amount requested for the draw.
    /// @param available The unallocated custody yield available for prizes.
    error InsufficientPrizeYield(uint256 requested, uint256 available);

    /// @notice Thrown when an unauthorized caller attempts an administrative or restricted function.
    /// @param caller The address of the unauthorized caller.
    error UnauthorizedCaller(address caller);
}
