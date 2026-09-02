import { Logger } from "../utils/logger.js";

export interface DecryptionResult {
  cleartext: bigint;
  proof: string;
}

export interface IKMSClient {
  fetchDecryptionProof(handle: string): Promise<DecryptionResult>;
}

export class KMSClient implements IKMSClient {
  private gatewayUrl: string;
  private logger: Logger;

  constructor(gatewayUrl: string = "https://gateway.sepolia.zama.ai") {
    this.gatewayUrl = gatewayUrl;
    this.logger = new Logger("KMSClient");
  }

  async fetchDecryptionProof(handle: string): Promise<DecryptionResult> {
    try {
      this.logger.info("Requesting threshold decryption from KMS gateway", { handle });
      
      const response = await fetch(`${this.gatewayUrl}/v1/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });

      if (!response.ok) {
        throw new Error(`KMS gateway returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as { cleartext: string | number; proof: string };
      return {
        cleartext: BigInt(data.cleartext),
        proof: data.proof,
      };
    } catch (err: unknown) {
      this.logger.error("Failed to query KMS gateway", {
        handle,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export class MockKMSClient implements IKMSClient {
  public failAttempts: number = 0;
  private attempts: number = 0;
  public defaultCleartext: bigint = 1000n;

  constructor(defaultCleartext: bigint = 1000n, failAttempts: number = 0) {
    this.defaultCleartext = defaultCleartext;
    this.failAttempts = failAttempts;
  }

  async fetchDecryptionProof(handle: string): Promise<DecryptionResult> {
    this.attempts++;
    if (this.attempts <= this.failAttempts) {
      throw new Error(`Simulated transient KMS network failure (attempt ${this.attempts})`);
    }

    return {
      cleartext: this.defaultCleartext,
      proof: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    };
  }
}
