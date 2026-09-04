export interface DepositedEvent {
  user: string;
  nonce: bigint;
  encryptedAmountHandle: string;
  blockNumber: number;
  transactionHash: string;
}

export interface WithdrawnEvent {
  user: string;
  nonce: bigint;
  encryptedAmountHandle: string;
  blockNumber: number;
  transactionHash: string;
}

export interface PrizeReserveFundedEvent {
  source: string;
  encryptedAmountHandle: string;
  blockNumber: number;
  transactionHash: string;
}

export interface DrawExecutedEvent {
  drawId: bigint;
  requestHash: string;
  prizeAmount: bigint;
  timestamp: number;
  participantCount: number;
  blockNumber: number;
  transactionHash: string;
}
