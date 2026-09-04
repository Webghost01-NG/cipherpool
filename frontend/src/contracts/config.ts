type FrontendEnvironment = Record<string, string | undefined>;

const environment: FrontendEnvironment =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as FrontendEnvironment)
    : {};

function readAddress(name: string): string {
  const value = environment[name]?.trim() ?? "";
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? value.toLowerCase() : "";
}

function readUrl(name: string): string {
  const value = environment[name]?.trim() ?? "";
  if (!value) return "";
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function readTokenDecimals(): number {
  const value = Number(environment.VITE_TOKEN_DECIMALS);
  return Number.isInteger(value) && value >= 0 && value <= 255 ? value : -1;
}

function readPositiveInteger(name: string): number {
  const value = Number(environment[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : -1;
}

function readBytes32(name: string): string {
  const value = environment[name]?.trim() ?? "";
  return /^0x[a-fA-F0-9]{64}$/.test(value) ? value.toLowerCase() : "";
}

export const runtimeConfig = Object.freeze({
  chainId: readPositiveInteger("VITE_CHAIN_ID"),
  poolAddress: readAddress("VITE_POOL_ADDRESS"),
  legacyPoolAddress: readAddress("VITE_LEGACY_POOL_ADDRESS"),
  custodyAssetAddress: readAddress("VITE_CONFIDENTIAL_ASSET_ADDRESS"),
  poolRuntimeCodeHash: readBytes32("VITE_POOL_RUNTIME_CODE_HASH"),
  deploymentBlock: readPositiveInteger("VITE_POOL_DEPLOYMENT_BLOCK"),
  backendUrl: readUrl("VITE_BACKEND_URL"),
  explorerUrl: readUrl("VITE_EXPLORER_URL"),
  tokenSymbol: environment.VITE_TOKEN_SYMBOL?.trim() ?? "",
  tokenDecimals: readTokenDecimals(),
  protocolWritesEnabled: environment.VITE_ENABLE_PROTOCOL_WRITES === "true",
});

export const configurationErrors = [
  runtimeConfig.chainId !== 11155111 && "VITE_CHAIN_ID must be Ethereum Sepolia (11155111).",
  !runtimeConfig.poolAddress && "VITE_POOL_ADDRESS must be a valid EVM address.",
  !runtimeConfig.legacyPoolAddress && "VITE_LEGACY_POOL_ADDRESS must be a valid EVM address.",
  runtimeConfig.poolAddress &&
    runtimeConfig.legacyPoolAddress &&
    runtimeConfig.poolAddress.toLowerCase() === runtimeConfig.legacyPoolAddress.toLowerCase() &&
    "Active and legacy pool addresses must differ.",
  !runtimeConfig.custodyAssetAddress && "VITE_CONFIDENTIAL_ASSET_ADDRESS must be a valid EVM address.",
  !runtimeConfig.poolRuntimeCodeHash && "VITE_POOL_RUNTIME_CODE_HASH must be a bytes32 hash.",
  runtimeConfig.deploymentBlock < 0 && "VITE_POOL_DEPLOYMENT_BLOCK must be a positive integer.",
  !runtimeConfig.backendUrl && "VITE_BACKEND_URL must be a valid absolute URL.",
  !runtimeConfig.explorerUrl && "VITE_EXPLORER_URL must be a valid absolute URL.",
  !runtimeConfig.tokenSymbol && "VITE_TOKEN_SYMBOL is required.",
  runtimeConfig.tokenDecimals < 0 && "VITE_TOKEN_DECIMALS must be an integer from 0 to 255.",
].filter((message): message is string => Boolean(message));

export const DEFAULT_POOL_ADDRESS = runtimeConfig.poolAddress;
export const DEFAULT_LEGACY_POOL_ADDRESS = runtimeConfig.legacyPoolAddress;
export const DEFAULT_CONFIDENTIAL_ASSET_ADDRESS = runtimeConfig.custodyAssetAddress;
export const DEFAULT_BACKEND_URL = runtimeConfig.backendUrl;
