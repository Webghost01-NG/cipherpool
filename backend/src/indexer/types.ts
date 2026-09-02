export interface DepositedEvent {
  user: string;
  nonce: bigint;
  plainAmount: bigint;
  inputHandle: string;
  blockNumber: number;
  transactionHash: string;
}

export interface WithdrawalRequestedEvent {
  user: string;
  nonce: bigint;
  requestHash: string;
  requestedAmount: bigint;
  handle: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  status: "PENDING" | "FINALIZED" | "CANCELLED";
}

export interface WithdrawalFinalizedEvent {
  user: string;
  requestHash: string;
  cleartextAmount: bigint;
  blockNumber: number;
  transactionHash: string;
}

export interface WithdrawalCancelledEvent {
  user: string;
  requestHash: string;
  blockNumber: number;
  transactionHash: string;
}

export interface DrawExecutedEvent {
  drawId: bigint;
  prizeAmount: bigint;
  timestamp: number;
  participantCount: number;
  blockNumber: number;
  transactionHash: string;
}
