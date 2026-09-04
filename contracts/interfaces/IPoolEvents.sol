// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

interface IPoolEvents {
    event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle);
    event Withdrawn(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle);
    event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle);
    event DrawRequested(
        uint256 indexed nonce,
        bytes32 indexed requestHash,
        uint64 prizeAmount,
        bytes32 totalHandle,
        bytes32 reserveHandle
    );
    event DrawCancelled(bytes32 indexed requestHash);
    event DrawSkipped(
        bytes32 indexed requestHash,
        uint64 totalWeight,
        uint64 prizeReserve,
        uint64 requiredPrizeAmount,
        uint256 timestamp
    );
    event DrawExecuted(
        uint256 indexed drawId,
        bytes32 indexed requestHash,
        uint64 prizeAmount,
        uint64 totalWeight,
        uint64 remainingPrizeReserve,
        uint256 timestamp,
        uint256 participantCount
    );

    /** @dev Archived-pool exit events retained for compatibility. */
    event WithdrawalRequested(
        address indexed user,
        uint256 indexed nonce,
        bytes32 indexed requestHash,
        uint64 requestedAmount,
        bytes32 handle
    );
    event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount);
    event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash);
}
