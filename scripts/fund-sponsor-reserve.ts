import fs from "node:fs";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const POOL_ABI = [
  "function custodyAsset() external view returns (address)",
  "function paused() external view returns (bool)",
  "event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle)",
];

const TOKEN_ABI = [
  "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes calldata inputProof, bytes calldata data) external returns (bytes32)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

const requiredEnvironment = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
};

const keystorePassword = (): string => {
  const direct = process.env.SPONSOR_KEYSTORE_PASSWORD;
  if (direct) return direct;
  const passwordFile = process.env.SPONSOR_KEYSTORE_PASSWORD_FILE?.trim();
  if (!passwordFile) {
    throw new Error("Set SPONSOR_KEYSTORE_PASSWORD or SPONSOR_KEYSTORE_PASSWORD_FILE through a secret manager.");
  }
  return fs.readFileSync(passwordFile, "utf8").trimEnd();
};

async function main() {
  const rpcUrl = requiredEnvironment("RPC_URL");
  const poolAddress = ethers.getAddress(requiredEnvironment("POOL_CONTRACT_ADDRESS"));
  const custodyAssetAddress = ethers.getAddress(requiredEnvironment("CUSTODY_ASSET_ADDRESS"));
  const expectedRuntimeHash = requiredEnvironment("POOL_RUNTIME_CODE_HASH");
  if (!ethers.isHexString(expectedRuntimeHash, 32)) throw new Error("POOL_RUNTIME_CODE_HASH must be a bytes32 value.");
  const keystore = fs.readFileSync(requiredEnvironment("SPONSOR_KEYSTORE_PATH"), "utf8");
  const wallet = (await ethers.Wallet.fromEncryptedJson(keystore, keystorePassword())).connect(
    new ethers.JsonRpcProvider(rpcUrl)
  );
  const network = await wallet.provider!.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`Expected Ethereum Sepolia, received chain ${network.chainId}.`);
  const poolCode = await wallet.provider!.getCode(poolAddress);
  if (poolCode === "0x" || ethers.keccak256(poolCode).toLowerCase() !== expectedRuntimeHash.toLowerCase()) {
    throw new Error("The pool runtime bytecode does not match POOL_RUNTIME_CODE_HASH.");
  }

  const pool = new ethers.Contract(poolAddress, POOL_ABI, wallet);
  const [configuredCustody, paused] = await Promise.all([
    pool.custodyAsset() as Promise<string>,
    pool.paused() as Promise<boolean>,
  ]);
  if (ethers.getAddress(configuredCustody) !== custodyAssetAddress) {
    throw new Error("The pool custody asset does not match CUSTODY_ASSET_ADDRESS.");
  }
  if (paused) throw new Error("The pool is paused.");

  const token = new ethers.Contract(custodyAssetAddress, TOKEN_ABI, wallet);
  const [decimals, symbol] = await Promise.all([
    token.decimals() as Promise<bigint>,
    token.symbol() as Promise<string>,
  ]);
  const amount = ethers.parseUnits(requiredEnvironment("SPONSOR_AMOUNT"), Number(decimals));
  if (amount <= 0n || amount >= 2n ** 64n) throw new Error("SPONSOR_AMOUNT must fit a positive uint64 base-unit value.");

  const instance = await createInstance({ ...SepoliaConfig, network: rpcUrl });
  const encryptedInput = instance
    .createEncryptedInput(custodyAssetAddress, wallet.address)
    .add64(amount);
  const encrypted = await encryptedInput.encrypt();
  if (!encrypted.handles[0] || !encrypted.inputProof) throw new Error("Zama did not return a valid encrypted input proof.");

  const action = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32"],
    [ethers.id("CIPHERPOOL_PRIZE_RESERVE_V1")]
  );
  const transaction = await token.confidentialTransferAndCall(
    poolAddress,
    ethers.hexlify(encrypted.handles[0]),
    ethers.hexlify(encrypted.inputProof),
    action
  );
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Sponsor reserve transaction was not confirmed.");

  const event = receipt.logs
    .map((log) => {
      try { return pool.interface.parseLog(log); } catch { return null; }
    })
    .find((parsed) => parsed?.name === "PrizeReserveFunded");
  if (!event || ethers.getAddress(event.args.source) !== wallet.address) {
    throw new Error("The confirmed receipt did not contain the expected PrizeReserveFunded event.");
  }

  console.log(JSON.stringify({
    network: "Ethereum Sepolia",
    source: wallet.address,
    pool: poolAddress,
    custodyAsset: custodyAssetAddress,
    token: symbol,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    encryptedAmountHandle: event.args.encryptedAmountHandle,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
