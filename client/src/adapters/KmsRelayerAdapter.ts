export interface WithdrawalStatusResponse {
  user: string;
  hasPendingWithdrawal: boolean;
  withdrawal?: {
    requestHash: string;
    requestedAmount: string;
    handle: string;
    nonce: string;
    timestamp: number;
    status: "PENDING" | "FINALIZED" | "CANCELLED";
  };
}

export interface KmsRelayerAdapterConfig {
  backendApiUrl: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface WithdrawalProofResponse {
  status: "proof_ready";
  requestHash: string;
  cleartextAmount: string;
  decryptionProof: string;
}

export class KmsRelayerAdapter {
  private backendApiUrl: string;
  private pollIntervalMs: number;
  private maxPollAttempts: number;

  constructor(config: KmsRelayerAdapterConfig) {
    this.backendApiUrl = config.backendApiUrl.replace(/\/+$/, "");
    this.pollIntervalMs = config.pollIntervalMs ?? 1000;
    this.maxPollAttempts = config.maxPollAttempts ?? 30;
  }

  /**
   * Fetches the current withdrawal status for a specific user.
   */
  public async getWithdrawalStatus(userAddress: string): Promise<WithdrawalStatusResponse> {
    const response = await fetch(`${this.backendApiUrl}/api/v1/users/${userAddress}/withdrawal`);
    if (!response.ok) {
      throw new Error(`Failed to fetch withdrawal status: HTTP ${response.status}`);
    }
    return (await response.json()) as WithdrawalStatusResponse;
  }

  /**
   * Requests a public KMS proof. The requesting wallet must submit the proof
   * because pending withdrawals are keyed by msg.sender in the pool contract.
   */
  public async requestWithdrawalProof(requestHash: string): Promise<WithdrawalProofResponse> {
    const response = await fetch(`${this.backendApiUrl}/api/v1/relayer/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestHash }),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string; message?: string };
      throw new Error(errorBody.message || `Proof request failed: HTTP ${response.status}`);
    }

    return (await response.json()) as WithdrawalProofResponse;
  }

  /**
   * Polls the withdrawal state until it is finalized or cancelled.
   */
  public async pollUntilSettled(
    userAddress: string,
    onProgress?: (status: WithdrawalStatusResponse) => void
  ): Promise<WithdrawalStatusResponse> {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      attempts++;
      const current = await this.getWithdrawalStatus(userAddress);
      if (onProgress) onProgress(current);

      if (!current.hasPendingWithdrawal || current.withdrawal?.status === "FINALIZED") {
        return current;
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    throw new Error(`Polling timed out after ${this.maxPollAttempts} attempts`);
  }
}
