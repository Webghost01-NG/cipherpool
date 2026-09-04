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
  status: WalletConnectionStatus,
  hasProvider: boolean
): boolean {
  return hasProvider && status === "connected";
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
