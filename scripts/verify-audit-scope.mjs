import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { ethers } from "ethers";

const scope = JSON.parse(fs.readFileSync(new URL("../docs/audit/scope.json", import.meta.url), "utf8"));
const rpcUrls = [...new Set((process.env.AUDIT_RPC_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean))];
if (rpcUrls.length < 2) throw new Error("AUDIT_RPC_URLS must contain at least two independent HTTPS Sepolia RPC URLs.");
for (const value of rpcUrls) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Every audit RPC URL must use HTTPS.");
}

const sourcePaths = ["contracts", "script/DeploySepolia.s.sol", "foundry.toml"];
const commitCheck = spawnSync("git", ["cat-file", "-e", `${scope.source.contractCommit}^{commit}`]);
if (commitCheck.status !== 0) throw new Error("The frozen contract commit is not available in this checkout.");
const diffCheck = spawnSync("git", ["diff", "--quiet", scope.source.contractCommit, "--", ...sourcePaths]);
if (diffCheck.status !== 0) throw new Error("Current contract or deployment source differs from the frozen audit commit.");

const artifactPath = new URL("../out/ConfidentialPool.sol/ConfidentialPool.json", import.meta.url);
if (!fs.existsSync(artifactPath)) throw new Error("Missing Foundry artifact. Run forge build before verifying audit scope.");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const constructorArguments = ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "uint64", "uint64", "uint64"],
  [
    scope.deployment.custodyAsset,
    scope.deployment.cancellationDelaySeconds,
    scope.deployment.drawIntervalSeconds,
    scope.deployment.fixedPrizeBaseUnits,
  ]
);
const expectedCreationInput = ethers.concat([artifact.bytecode.object, constructorArguments]).toLowerCase();

const abi = [
  "function custodyAsset() view returns (address)",
  "function owner() view returns (address)",
  "function drawCancellationDelay() view returns (uint64)",
  "function drawInterval() view returns (uint64)",
  "function drawPrizeAmount() view returns (uint64)",
  "function MAX_PARTICIPANTS() view returns (uint256)",
];

async function verifyProvider(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, scope.network.chainId, {
    staticNetwork: true,
    batchMaxCount: 1,
  });
  const [network, code, receipt, deploymentTransaction] = await Promise.all([
    provider.getNetwork(),
    provider.getCode(scope.deployment.poolAddress),
    provider.getTransactionReceipt(scope.deployment.transactionHash),
    provider.getTransaction(scope.deployment.transactionHash),
  ]);
  if (Number(network.chainId) !== scope.network.chainId) throw new Error(`${new URL(rpcUrl).hostname} returned the wrong chain.`);
  if (code === "0x" || ethers.keccak256(code).toLowerCase() !== scope.deployment.runtimeCodeHash.toLowerCase()) {
    throw new Error(`${new URL(rpcUrl).hostname} returned an unexpected pool runtime.`);
  }
  if (!receipt || receipt.status !== 1 || receipt.blockNumber !== scope.deployment.blockNumber) {
    throw new Error(`${new URL(rpcUrl).hostname} returned an unexpected deployment receipt.`);
  }
  if (receipt.contractAddress?.toLowerCase() !== scope.deployment.poolAddress.toLowerCase()) {
    throw new Error(`${new URL(rpcUrl).hostname} returned an unexpected deployment address.`);
  }
  if (!deploymentTransaction || deploymentTransaction.data.toLowerCase() !== expectedCreationInput) {
    throw new Error(`${new URL(rpcUrl).hostname} returned creation input that does not match the frozen local artifact.`);
  }
  if (deploymentTransaction.from.toLowerCase() !== scope.deployment.owner.toLowerCase()) {
    throw new Error(`${new URL(rpcUrl).hostname} returned an unexpected deployer.`);
  }
  const pool = new ethers.Contract(scope.deployment.poolAddress, abi, provider);
  const [custodyAsset, owner, cancellationDelay, drawInterval, drawPrizeAmount, maximumParticipants] = await Promise.all([
    pool.custodyAsset(), pool.owner(), pool.drawCancellationDelay(), pool.drawInterval(), pool.drawPrizeAmount(), pool.MAX_PARTICIPANTS(),
  ]);
  if (custodyAsset.toLowerCase() !== scope.deployment.custodyAsset.toLowerCase()) throw new Error("Custody asset mismatch.");
  if (owner.toLowerCase() !== scope.deployment.owner.toLowerCase()) throw new Error("Owner mismatch.");
  if (cancellationDelay !== BigInt(scope.deployment.cancellationDelaySeconds)) throw new Error("Cancellation delay mismatch.");
  if (drawInterval !== BigInt(scope.deployment.drawIntervalSeconds)) throw new Error("Draw interval mismatch.");
  if (drawPrizeAmount !== BigInt(scope.deployment.fixedPrizeBaseUnits)) throw new Error("Fixed prize mismatch.");
  if (maximumParticipants !== BigInt(scope.deployment.maximumParticipants)) throw new Error("Participant bound mismatch.");
  return new URL(rpcUrl).hostname;
}

const providers = await Promise.all(rpcUrls.map(verifyProvider));
console.log(JSON.stringify({
  status: "verified",
  contractCommit: scope.source.contractCommit,
  poolAddress: scope.deployment.poolAddress,
  runtimeCodeHash: scope.deployment.runtimeCodeHash,
  deploymentBlock: scope.deployment.blockNumber,
  providerCount: providers.length,
  providers,
}, null, 2));
