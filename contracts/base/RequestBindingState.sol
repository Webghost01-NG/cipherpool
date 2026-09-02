// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolTypes} from "../interfaces/IPoolTypes.sol";
import {IPoolErrors} from "../interfaces/IPoolErrors.sol";
import {IPoolEvents} from "../interfaces/IPoolEvents.sol";

/**
 * @title RequestBindingState
 * @notice Abstract base contract implementing the storage-anchored withdrawal request state machine.
 * @dev Enforces immutable slot binding, single-use active flags, and atomic storage deletion.
 */
abstract contract RequestBindingState is IPoolTypes, IPoolErrors, IPoolEvents {
    /// @notice Primary storage mapping for user pending withdrawal requests.
    mapping(address => WithdrawalRequest) internal _pendingWithdrawals;

    /// @notice Monotonically increasing nonce per user to prevent cross-request hash collisions.
    mapping(address => uint256) public userWithdrawalNonces;

    /// @notice Minimum delay (in seconds) before an unfinalized withdrawal request can be cancelled.
    uint64 public immutable cancellationDelay;

    /**
     * @param _cancellationDelay Minimum duration before stale requests can be cancelled.
     */
    constructor(uint64 _cancellationDelay) {
        cancellationDelay = _cancellationDelay;
    }

    /**
     * @notice Internal helper to create and store a domain-bound withdrawal request.
     * @param user The address of the withdrawer.
     * @param handle The FHE ciphertext handle output of FHE.select.
     * @param amount The plaintext amount requested for withdrawal.
     * @return requestHash The 32-byte cryptographic domain-binding hash.
     */
    function _createWithdrawalRequest(
        address user,
        euint64 handle,
        uint64 amount
    ) internal returns (bytes32 requestHash) {
        if (_pendingWithdrawals[user].active) {
            revert ActiveWithdrawalExists(user);
        }

        uint256 nonce = userWithdrawalNonces[user]++;
        bytes32 rHandle = FHE.toBytes32(handle);

        requestHash = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                user,
                nonce,
                amount,
                uint64(block.timestamp),
                rHandle
            )
        );

        _pendingWithdrawals[user] = WithdrawalRequest({
            handle: handle,
            requestedAmount: amount,
            timestamp: uint64(block.timestamp),
            active: true,
            requestHash: requestHash
        });

        emit WithdrawalRequested(user, nonce, requestHash, amount, rHandle);
    }

    /**
     * @notice Internal helper to atomically delete a withdrawal request from storage.
     * @dev Reclaims EVM storage gas and completely prevents replay or residual state reuse.
     * @param user The address of the withdrawer.
     * @return consumedHash The requestHash that was consumed.
     */
    function _deleteWithdrawalRequest(address user) internal returns (bytes32 consumedHash) {
        consumedHash = _pendingWithdrawals[user].requestHash;
        delete _pendingWithdrawals[user];
    }

    /**
     * @notice Returns the pending withdrawal request for a given user.
     * @param user The address of the user.
     * @return The active or empty WithdrawalRequest struct.
     */
    function getPendingWithdrawal(address user) external view returns (WithdrawalRequest memory) {
        return _pendingWithdrawals[user];
    }

    /**
     * @notice Returns the current withdrawal nonce for a given user.
     * @param user The address of the user.
     * @return The current nonce value.
     */
    function getUserWithdrawalNonce(address user) external view returns (uint256) {
        return userWithdrawalNonces[user];
    }
}
