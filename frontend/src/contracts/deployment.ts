export interface DeploymentExpectation {
  chainId: number;
  poolAddress: string;
  poolRuntimeCodeHash: string;
  custodyAssetAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

export interface DeploymentEvidence {
  chainId: number;
  poolAddress: string;
  poolRuntimeCodeHash: string;
  custodyAssetAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  supportsConfidentialAccounting: boolean;
}

export function validateDeploymentEvidence(
  expected: DeploymentExpectation,
  observed: DeploymentEvidence
): string[] {
  const errors: string[] = [];

  if (observed.chainId !== expected.chainId) errors.push("read-provider network does not match the configured chain");
  if (observed.poolAddress.toLowerCase() !== expected.poolAddress.toLowerCase()) {
    errors.push("pool address does not match the configured deployment");
  }
  if (observed.poolRuntimeCodeHash.toLowerCase() !== expected.poolRuntimeCodeHash.toLowerCase()) {
    errors.push("pool bytecode hash does not match the reviewed deployment");
  }
  if (observed.custodyAssetAddress.toLowerCase() !== expected.custodyAssetAddress.toLowerCase()) {
    errors.push("pool custody asset does not match the configured token");
  }
  if (observed.tokenSymbol !== expected.tokenSymbol) errors.push("custody token symbol does not match configuration");
  if (observed.tokenDecimals !== expected.tokenDecimals) errors.push("custody token decimals do not match configuration");
  if (!observed.supportsConfidentialAccounting) errors.push("pool does not expose confidential aggregate accounting");

  return errors;
}
