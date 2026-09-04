// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IPoolTypes {
    /**
     * @dev Retained for the archived pool exit state machine and its regression tests.
     */
    struct WithdrawalRequest {
        euint64 handle;
        uint64 requestedAmount;
        uint64 timestamp;
        bool active;
        bytes32 requestHash;
    }

    struct DrawRequest {
        euint64 totalHandle;
        euint64 reserveHandle;
        ebool readinessHandle;
        uint64 prizeAmount;
        uint64 timestamp;
        bool active;
        bytes32 requestHash;
    }

    struct ParticipantActivationRequest {
        ebool eligibilityHandle;
        uint64 timestamp;
        bool active;
        bytes32 requestHash;
    }

    struct ParticipantDeactivationRequest {
        ebool zeroBalanceHandle;
        uint64 timestamp;
        bool active;
        bytes32 requestHash;
    }
}
