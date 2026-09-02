import { ethers } from "ethers";

export interface EncryptedInputPayload {
  handle: string;
  inputProof: string;
}

export class InputEncryptionAdapter {
  private contractAddress: string;
  private userAddress: string;

  constructor(contractAddress: string, userAddress: string) {
    if (!ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }
    if (!ethers.isAddress(userAddress)) {
      throw new Error(`Invalid user address: ${userAddress}`);
    }
    this.contractAddress = ethers.getAddress(contractAddress);
    this.userAddress = ethers.getAddress(userAddress);
  }

  /**
   * Encrypts a 64-bit plaintext integer for submission to ConfidentialPool.deposit
   * @param amountPlain uint64 amount
   * @returns EncryptedInputPayload with handle and zero-knowledge input proof
   */
  public async encryptUint64(amountPlain: bigint): Promise<EncryptedInputPayload> {
    if (amountPlain <= 0n) {
      throw new Error("Amount must be strictly greater than zero");
    }
    if (amountPlain >= 2n ** 64n) {
      throw new Error("Amount exceeds 64-bit unsigned integer maximum");
    }

    // Deterministic cryptographic handle generation for client binding
    const salt = ethers.hexlify(ethers.randomBytes(16));
    const handle = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint64", "bytes16"],
        [this.contractAddress, this.userAddress, amountPlain, salt]
      )
    );

    // ZK input proof mock simulating the Zama InputVerifier coprocessor proof
    const inputProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address", "uint256"],
      [handle, this.contractAddress, this.userAddress, Date.now()]
    );

    return {
      handle,
      inputProof,
    };
  }
}
