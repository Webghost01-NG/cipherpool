import type { DecryptionResult, IKMSClient } from "../../src/relayer/kms.js";

export class TestKMSClient implements IKMSClient {
  public failAttempts: number;
  private attempts = 0;

  constructor(
    private readonly cleartext: bigint,
    failAttempts = 0
  ) {
    this.failAttempts = failAttempts;
  }

  async fetchDecryptionProof(): Promise<DecryptionResult> {
    this.attempts += 1;
    if (this.attempts <= this.failAttempts) {
      throw new Error(`Test KMS failure ${this.attempts}`);
    }

    return {
      cleartext: this.cleartext,
      proof: `0x${"ab".repeat(32)}`,
    };
  }
}
