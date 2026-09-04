// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolTypes} from "./IPoolTypes.sol";
import {IPoolEvents} from "./IPoolEvents.sol";
import {IPoolErrors} from "./IPoolErrors.sol";

interface IConfidentialPool is IPoolTypes, IPoolEvents, IPoolErrors {
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external;
    function finalizeParticipantActivation(address user, bool eligible, bytes calldata decryptionProof) external;
    function requestDraw(uint64 prizeAmount) external;
    /// @notice Permissionlessly relays a KMS proof bound to the active draw request.
    function finalizeDraw(uint64 totalEligibleBalance, uint64 prizeReserve, bytes calldata decryptionProof) external;
    function cancelDraw() external;
    function compoundPrizes() external;
    function getPendingDraw() external view returns (DrawRequest memory);
    function getPendingParticipantActivation(address user) external view returns (ParticipantActivationRequest memory);
    function drawCancellationDelay() external view returns (uint64);
    function drawInterval() external view returns (uint64);
    function drawPrizeAmount() external view returns (uint64);
    function nextDrawRequestTimestamp() external view returns (uint64);
    function getBalanceHandle(address user) external view returns (bytes32);
    function getPrizeHandle(address user) external view returns (bytes32);
    function getTotalEligibleBalanceHandle() external view returns (bytes32);
    function getPrizeReserveHandle() external view returns (bytes32);
    function getParticipantCount() external view returns (uint256);
    function currentDrawId() external view returns (uint256);
    function lastVerifiedTotalEligibleBalance() external view returns (uint64);
    function lastVerifiedPrizeReserve() external view returns (uint64);
    function lastDrawVerificationTimestamp() external view returns (uint64);
    function custodyAsset() external view returns (address);
}
