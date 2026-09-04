const COMMON_POOL_ABI = [
  "function DEPOSIT_ACTION() external view returns (bytes32)",
  "function PRIZE_RESERVE_ACTION() external view returns (bytes32)",
  "function withdraw(bytes32 encryptedAmount, bytes calldata inputProof) external",
  "function finalizeParticipantActivation(address user, bool eligible, bytes calldata decryptionProof) external",
  "function requestDraw(uint64 prizeAmount) external",
  "function cancelDraw() external",
  "function getPendingParticipantActivation(address user) external view returns (tuple(bytes32 eligibilityHandle, uint64 timestamp, bool active, bytes32 requestHash))",
  "function getBalanceHandle(address user) external view returns (bytes32)",
  "function getPrizeHandle(address user) external view returns (bytes32)",
  "function getTotalEligibleBalanceHandle() external view returns (bytes32)",
  "function getPrizeReserveHandle() external view returns (bytes32)",
  "function lastDrawVerificationTimestamp() external view returns (uint64)",
  "function getParticipantCount() external view returns (uint256)",
  "function currentDrawId() external view returns (uint256)",
  "function custodyAsset() external view returns (address)",
  "function drawCancellationDelay() external view returns (uint64)",
  "function drawInterval() external view returns (uint64)",
  "function drawPrizeAmount() external view returns (uint64)",
  "function nextDrawRequestTimestamp() external view returns (uint64)",
  "function owner() external view returns (address)",
  "function paused() external view returns (bool)",
  "event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event Withdrawn(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle)",
  "event ParticipantActivationRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, bytes32 eligibilityHandle)",
  "event ParticipantActivationFinalized(address indexed user, bytes32 indexed requestHash, bool eligible, uint256 participantCount)",
];

export const POOL_ABI = [
  ...COMMON_POOL_ABI,
  "function finalizeDraw(uint64 totalEligibleBalance, uint64 prizeReserve, bytes calldata decryptionProof) external",
  "function getPendingDraw() external view returns (tuple(bytes32 totalHandle, bytes32 reserveHandle, uint64 prizeAmount, uint64 timestamp, bool active, bytes32 requestHash))",
  "function lastVerifiedTotalEligibleBalance() external view returns (uint64)",
  "function lastVerifiedPrizeReserve() external view returns (uint64)",
  "event DrawRequested(uint256 indexed nonce, bytes32 indexed requestHash, uint64 prizeAmount, bytes32 totalHandle, bytes32 reserveHandle)",
  "event DrawSkipped(bytes32 indexed requestHash, uint64 totalWeight, uint64 prizeReserve, uint64 requiredPrizeAmount, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed drawId, bytes32 indexed requestHash, uint64 prizeAmount, uint64 totalWeight, uint64 remainingPrizeReserve, uint256 timestamp, uint256 participantCount)",
];

export const POOL_ABI_READINESS_V2 = [
  ...COMMON_POOL_ABI,
  "function finalizeDraw(bool ready, bytes calldata decryptionProof) external",
  "function getPendingDraw() external view returns (tuple(bytes32 totalHandle, bytes32 reserveHandle, bytes32 readinessHandle, uint64 prizeAmount, uint64 timestamp, bool active, bytes32 requestHash))",
  "function lastDrawReady() external view returns (bool)",
  "function MAX_PARTICIPANTS() external view returns (uint256)",
  "event DrawRequested(uint256 indexed nonce, bytes32 indexed requestHash, uint64 prizeAmount, bytes32 totalHandle, bytes32 reserveHandle, bytes32 readinessHandle)",
  "event DrawSkipped(bytes32 indexed requestHash, uint64 prizeAmount, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed drawId, bytes32 indexed requestHash, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

export function getPoolAbi(version: "aggregate-v1" | "readiness-v2"): readonly string[] {
  return version === "readiness-v2" ? POOL_ABI_READINESS_V2 : POOL_ABI;
}

export const ERC7984_ABI = [
  "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes calldata inputProof, bytes calldata data) external returns (bytes32)",
  "function confidentialBalanceOf(address account) external view returns (bytes32)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

/** Archived plaintext pool ABI; used only to let existing users exit the superseded deployment. */
export const LEGACY_POOL_ABI = [
  "function getPendingWithdrawal(address user) external view returns (tuple(bytes32 handle, uint64 requestedAmount, uint64 timestamp, bool active, bytes32 requestHash))",
  "function cancellationDelay() external view returns (uint64)",
  "function finalizeWithdrawal(uint64 cleartextAmount, bytes calldata decryptionProof) external",
  "function cancelWithdrawal() external",
];
