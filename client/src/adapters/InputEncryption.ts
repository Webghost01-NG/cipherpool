import { getAddress, hexlify, isAddress } from "ethers";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

export interface EncryptedInputPayload {
  handle: string;
  inputProof: string;
}

export type FhevmInstanceFactory = () => Promise<
  Pick<FhevmInstance, "createEncryptedInput">
>;

let browserInstancePromise: Promise<FhevmInstance> | null = null;

export async function getBrowserFhevmInstance(): Promise<FhevmInstance> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("An EIP-1193 browser wallet is required for FHE operations.");
  }

  if (!browserInstancePromise) {
    browserInstancePromise = import("@zama-fhe/relayer-sdk/web")
      .then(async ({ createInstance, initSDK, SepoliaConfig }) => {
        await initSDK();
        return createInstance({ ...SepoliaConfig, network: window.ethereum! });
      })
      .catch((error) => {
        browserInstancePromise = null;
        throw error;
      });
  }

  return browserInstancePromise;
}

export class InputEncryptionAdapter {
  private readonly contractAddress: string;
  private readonly userAddress: string;
  private readonly instanceFactory: FhevmInstanceFactory;

  constructor(
    contractAddress: string,
    userAddress: string,
    instanceFactory: FhevmInstanceFactory = getBrowserFhevmInstance
  ) {
    if (!isAddress(contractAddress)) {
      throw new Error("Pool contract address is not configured correctly.");
    }
    if (!isAddress(userAddress)) {
      throw new Error("Connected wallet address is invalid.");
    }
    this.contractAddress = getAddress(contractAddress);
    this.userAddress = getAddress(userAddress);
    this.instanceFactory = instanceFactory;
  }

  public async encryptUint64(amountPlain: bigint): Promise<EncryptedInputPayload> {
    if (amountPlain <= 0n) throw new Error("Amount must be strictly greater than zero.");
    if (amountPlain >= 2n ** 64n) throw new Error("Amount exceeds the uint64 protocol limit.");

    const instance = await this.instanceFactory();
    const encryptedInput = instance
      .createEncryptedInput(this.contractAddress, this.userAddress)
      .add64(amountPlain);
    const encrypted = await encryptedInput.encrypt();

    if (!encrypted.handles[0] || !encrypted.inputProof) {
      throw new Error("The Zama relayer did not return a valid encrypted input proof.");
    }

    return {
      handle: hexlify(encrypted.handles[0]),
      inputProof: hexlify(encrypted.inputProof),
    };
  }
}
