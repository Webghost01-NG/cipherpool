export type WalletConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network";

export interface NetworkStatusPresentation {
  label: string;
  isHealthy: boolean;
}

export function canReadSepoliaContracts(
  configuredRpcCount: number
): boolean {
  return configuredRpcCount >= 2;
}

export function canUseWalletTransactionRoute(
  status: WalletConnectionStatus,
  hasProvider: boolean,
  hasAddress: boolean
): boolean {
  return status === "connected" && hasProvider && hasAddress;
}

export function getNetworkStatus(
  status: WalletConnectionStatus
): NetworkStatusPresentation {
  if (status === "connected") {
    return { label: "Wallet Sepolia", isHealthy: true };
  }
  if (status === "wrong_network") {
    return { label: "Wallet wrong network", isHealthy: false };
  }
  if (status === "connecting") {
    return { label: "Wallet checking", isHealthy: false };
  }
  return { label: "Wallet disconnected", isHealthy: false };
}
