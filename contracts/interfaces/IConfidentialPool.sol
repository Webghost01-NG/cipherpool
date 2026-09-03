// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolTypes} from "./IPoolTypes.sol";
import {IPoolEvents} from "./IPoolEvents.sol";
import {IPoolErrors} from "./IPoolErrors.sol";

/**
 * @title IConfidentialPool
 * @notice Core interface for the Confidential PoolTogether prize savings protocol.
 * @dev Integrates Zama FHEVM v0.13.3 encrypted accounting with 2-step async KMS settlement.
 */
interface IConfidentialPool is IPoolTypes, IPoolEvents, IPoolErrors {
    /**
     * @notice Deposits funds and derives the encrypted balance credit from the custody amount.
     * @param amount The amount transferred from the caller and credited to their encrypted balance.
     */
    function deposit(uint64 amount) external;

    /**
     * @notice Initiates an asynchronous 2-step withdrawal request.
     * @dev Homomorphically evaluates balance sufficiency and authorizes handle for KMS public decryption.
     * @param amount The plaintext amount requested for withdrawal.
     */
    function requestWithdrawal(uint64 amount) external;

    /**
     * @notice Finalizes a pending withdrawal using a verified KMS threshold decryption proof.
     * @dev Verifies KMS signatures against storage-anchored handle, consumes request, and transfers assets.
     * @param cleartextAmount The decrypted plaintext amount verified by the KMS signers.
     * @param decryptionProof The KMS threshold signature proof.
     */
    function finalizeWithdrawal(
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) external;

    /**
     * @notice Cancels a stale pending withdrawal request if the cancellation delay has elapsed.
     * @dev Atomic storage deletion resets state and reclaims gas.
     */
    function cancelWithdrawal() external;

    /**
     * @notice Executes a homomorphic confidential prize draw across eligible depositors.
     * @dev Generates on-chain encrypted randomness with bounded modulo reduction and cumulative interval search.
     * @param prizeAmount The plaintext prize amount to award to the winner.
     */
    function draw(uint64 prizeAmount) external;

    /**
     * @notice Merges caller's accumulated confidential prizes into their active principal balance.
     * @dev Homomorphically adds _prizes[msg.sender] into _balances[msg.sender] and resets _prizes[msg.sender].
     */
    function compoundPrizes() external;

    /**
     * @notice Returns the pending withdrawal request for a given user.
     * @param user The address of the user.
     * @return The active or empty WithdrawalRequest struct.
     */
    function getPendingWithdrawal(address user) external view returns (WithdrawalRequest memory);

    /**
     * @notice Returns the current withdrawal nonce for a given user.
     * @param user The address of the user.
     * @return The current nonce value.
     */
    function getUserWithdrawalNonce(address user) external view returns (uint256);

    /**
     * @notice Returns the raw ciphertext handle representing the user's encrypted balance.
     * @dev Used by client applications for off-chain user re-encryption queries.
     * @param user The address of the user.
     * @return The raw bytes32 ciphertext handle.
     */
    function getBalanceHandle(address user) external view returns (bytes32);

    /**
     * @notice Returns the raw ciphertext handle representing the user's accumulated prize allocations.
     * @dev Used by client applications for off-chain user re-encryption queries.
     * @param user The address of the user.
     * @return The raw bytes32 ciphertext handle.
     */
    function getPrizeHandle(address user) external view returns (bytes32);

    /**
     * @notice Returns the aggregate plaintext custody balance held in the pool.
     * @return The total plaintext deposits.
     */
    function totalDepositsPlain() external view returns (uint64);

    /**
     * @notice Returns custody yield already allocated to encrypted prize balances.
     * @return The aggregate reserved prize liability.
     */
    function reservedPrizesPlain() external view returns (uint256);

    /**
     * @notice Returns custody yield not allocated to principal or prizes.
     * @return The amount available for future draws.
     */
    function availableYieldPlain() external view returns (uint256);

    /**
     * @notice Returns the total count of registered depositors in the pool.
     * @return The total number of participants.
     */
    function getParticipantCount() external view returns (uint256);

    /**
     * @notice Returns the address of the underlying custody ERC-20 token.
     * @return The token address.
     */
    function custodyAsset() external view returns (address);

    /**
     * @notice Returns the minimum seconds required before a withdrawal can be cancelled.
     * @return The delay in seconds.
     */
    function cancellationDelay() external view returns (uint64);

    /**
     * @notice Returns the sequential identifier of the current draw.
     * @return The draw ID counter.
     */
    function currentDrawId() external view returns (uint256);
}
