// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IPoolTypes
 * @notice Canonical struct definitions for Confidential PoolTogether on fhEVM.
 */
interface IPoolTypes {
    /**
     * @notice Represents an active or pending 2-step withdrawal request.
     * @param handle The FHE ciphertext handle output of FHE.select, authorized for KMS decryption.
     * @param requestedAmount The plaintext amount requested for withdrawal.
     * @param timestamp The block timestamp when the request was initiated.
     * @param active True if request is pending; false once finalized or cancelled.
     * @param requestHash Application-level cryptographic domain binding hash.
     */
    struct WithdrawalRequest {
        euint64 handle;
        uint64 requestedAmount;
        uint64 timestamp;
        bool active;
        bytes32 requestHash;
    }

    /**
     * @notice Represents the immutable record of an executed confidential prize draw.
     * @param drawId Sequential identifier of the draw.
     * @param prizeAmount Total plaintext prize value allocated in the draw.
     * @param timestamp Block timestamp when draw was executed.
     * @param participantCount Total eligible depositors at the time of the draw.
     * @param executed True once the draw has completed homomorphic execution.
     */
    struct DrawRecord {
        uint256 drawId;
        uint64 prizeAmount;
        uint64 timestamp;
        uint256 participantCount;
        bool executed;
    }

    /**
     * @notice Configurable parameters governing pool operation.
     * @param minDeposit Minimum allowable plaintext deposit amount.
     * @param cancellationDelay Minimum elapsed seconds before a stale request can be cancelled.
     * @param custodyAsset Address of the underlying ERC-20 token held in custody.
     */
    struct PoolParameters {
        uint64 minDeposit;
        uint64 cancellationDelay;
        address custodyAsset;
    }
}
