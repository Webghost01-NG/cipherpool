import { isAddress } from "ethers";

type FrontendEnvironment = Record<string, string | undefined>;

const environment: FrontendEnvironment =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as FrontendEnvironment)
    : {};

function readAddress(name: string): string {
  const value = environment[name]?.trim() ?? "";
  return isAddress(value) ? value : "";
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

export const runtimeConfig = Object.freeze({
  poolAddress: readAddress("VITE_POOL_ADDRESS"),
  vaultAddress: readAddress("VITE_VAULT_ADDRESS"),
  custodyAssetAddress: readAddress("VITE_USDC_ADDRESS"),
  backendUrl: readUrl("VITE_BACKEND_URL"),
  explorerUrl: readUrl("VITE_EXPLORER_URL"),
  tokenSymbol: environment.VITE_TOKEN_SYMBOL?.trim() ?? "",
  tokenDecimals: readTokenDecimals(),
  protocolWritesEnabled: environment.VITE_ENABLE_PROTOCOL_WRITES === "true",
});

export const configurationErrors = [
  !runtimeConfig.poolAddress && "VITE_POOL_ADDRESS must be a valid EVM address.",
  !runtimeConfig.custodyAssetAddress && "VITE_USDC_ADDRESS must be a valid EVM address.",
  !runtimeConfig.backendUrl && "VITE_BACKEND_URL must be a valid absolute URL.",
  !runtimeConfig.explorerUrl && "VITE_EXPLORER_URL must be a valid absolute URL.",
  !runtimeConfig.tokenSymbol && "VITE_TOKEN_SYMBOL is required.",
  runtimeConfig.tokenDecimals < 0 && "VITE_TOKEN_DECIMALS must be an integer from 0 to 255.",
].filter((message): message is string => Boolean(message));

export const DEFAULT_POOL_ADDRESS = runtimeConfig.poolAddress;
export const DEFAULT_VAULT_ADDRESS = runtimeConfig.vaultAddress;
export const DEFAULT_USDC_ADDRESS = runtimeConfig.custodyAssetAddress;
export const DEFAULT_BACKEND_URL = runtimeConfig.backendUrl;
