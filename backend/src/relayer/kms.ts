import { Logger } from "../utils/logger.js";

export interface DecryptionResult {
  cleartext: bigint;
  proof: string;
}

export interface IKMSClient {
  fetchDecryptionProof(handle: string): Promise<DecryptionResult>;
}

export class KMSClient implements IKMSClient {
  private rpcUrl: string;
  private relayerUrl?: string;
  private logger: Logger;
  private instancePromise?: ReturnType<typeof this.createInstance>;

  constructor(rpcUrl: string, relayerUrl?: string) {
    this.rpcUrl = rpcUrl;
    this.relayerUrl = relayerUrl;
    this.logger = new Logger("KMSClient");
  }

  private async createInstance() {
    const { createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/node");
    return createInstance({
      ...SepoliaConfig,
      network: this.rpcUrl,
      ...(this.relayerUrl ? { relayerUrl: this.relayerUrl } : {}),
    });
  }

  private getInstance() {
    this.instancePromise ??= this.createInstance();
    return this.instancePromise;
  }

  async fetchDecryptionProof(handle: string): Promise<DecryptionResult> {
    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(handle)) {
        throw new Error("Decryption handle must be a 32-byte hex value");
      }

      this.logger.info("Requesting public decryption from the Zama relayer", { handle });
      const instance = await this.getInstance();
      const result = await instance.publicDecrypt([handle]);
      const entry = Object.entries(result.clearValues).find(
        ([key]) => key.toLowerCase() === handle.toLowerCase()
      );
      if (!entry || typeof entry[1] !== "bigint") {
        throw new Error("Zama relayer did not return an integer clear value for the handle");
      }

      return {
        cleartext: entry[1],
        proof: result.decryptionProof,
      };
    } catch (err: unknown) {
      this.logger.error("Failed to query the Zama relayer", {
        handle,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
