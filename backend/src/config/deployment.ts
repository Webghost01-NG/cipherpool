import { AbstractProvider, Contract, keccak256 } from "ethers";

const VERIFICATION_ABI = [
  "function custodyAsset() external view returns (address)",
  "function totalAccountedBalancePlain() external view returns (uint256)",
];

export interface PoolDeploymentExpectation {
  chainId: number;
  poolAddress: string;
  custodyAssetAddress: string;
  poolRuntimeCodeHash: string;
}

export interface PoolDeploymentEvidence {
  chainId: number;
  poolRuntimeCodeHash: string;
  custodyAssetAddress: string;
  supportsCorrectedAccounting: boolean;
}

export function validatePoolDeployment(
  expected: PoolDeploymentExpectation,
  observed: PoolDeploymentEvidence
): string[] {
  const errors: string[] = [];
  if (observed.chainId !== expected.chainId) errors.push("RPC chain ID does not match configuration");
  if (observed.poolRuntimeCodeHash.toLowerCase() !== expected.poolRuntimeCodeHash.toLowerCase()) {
    errors.push("pool runtime bytecode hash does not match the reviewed deployment");
  }
  if (observed.custodyAssetAddress.toLowerCase() !== expected.custodyAssetAddress.toLowerCase()) {
    errors.push("pool custody asset does not match configuration");
  }
  if (!observed.supportsCorrectedAccounting) errors.push("pool does not expose corrected aggregate accounting");
  return errors;
}

export async function verifyPoolDeployment(
  provider: AbstractProvider,
  expected: PoolDeploymentExpectation
): Promise<PoolDeploymentEvidence> {
  const [network, code] = await Promise.all([
    provider.getNetwork(),
    provider.getCode(expected.poolAddress),
  ]);
  if (code === "0x") throw new Error("Configured pool address has no deployed bytecode");

  const pool = new Contract(expected.poolAddress, VERIFICATION_ABI, provider);
  const custodyAssetAddress = await pool.custodyAsset() as string;
  let supportsCorrectedAccounting = false;
  try {
    const aggregate = await pool.totalAccountedBalancePlain() as bigint;
    supportsCorrectedAccounting = typeof aggregate === "bigint";
  } catch {
    supportsCorrectedAccounting = false;
  }

  const evidence: PoolDeploymentEvidence = {
    chainId: Number(network.chainId),
    poolRuntimeCodeHash: keccak256(code),
    custodyAssetAddress,
    supportsCorrectedAccounting,
  };
  const errors = validatePoolDeployment(expected, evidence);
  if (errors.length > 0) throw new Error("Deployment verification failed: " + errors.join("; "));
  return evidence;
}
