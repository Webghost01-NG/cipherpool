// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

interface IPoolErrors {
    error InvalidAssetAddress();
    error InvalidCancellationDelay();
    error InvalidDrawInterval(uint256 provided, uint256 minimum);
    error ZeroDepositAmount();
    error ZeroPrizeAmount();
    error InvalidDrawPrizeAmount(uint256 provided, uint256 required);
    error DrawRequestTooEarly(uint256 currentTimestamp, uint256 eligibleTimestamp);
    error EmptyPool();
    error EmptyPrizeReserve();
    error NoBalancePosition(address user);
    error NoActiveParticipantActivation(address user);
    error NoActiveParticipantDeactivation(address user);
    error ParticipantAlreadyActive(address user);
    error ParticipantNotActive(address user);
    error ParticipantCapacityReached(uint256 maximum);
    error UnauthorizedTokenCallback(address caller);
    error BalanceUpdatesLocked(bytes32 requestHash);
    error ActiveDrawRequestExists(bytes32 requestHash);
    error NoActiveDrawRequest();
    error DrawRequestNotStale(uint256 elapsed, uint256 requiredDelay);
    error InsufficientPrizeYield(uint256 requested, uint256 available);
    error InsufficientCustodyBalance(uint256 required, uint256 available);
    error UnauthorizedCaller(address caller);

    /**
     * @dev Archived-pool exit errors retained for compatibility.
     */
    error ActiveWithdrawalExists(address user);
    error NoActiveWithdrawalRequest(address user);
    error WithdrawalNotStale(uint256 elapsed, uint256 requiredDelay);
    error InvalidDecryptedAmount(uint64 decryptedAmount, uint64 requestedAmount);
    error HandleMismatch(bytes32 expectedHandle, bytes32 providedHandle);
    error AccountingCapacityExceeded(uint256 attempted, uint256 maximum);
}
