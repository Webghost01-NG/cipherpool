import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const TARGET_CHAIN_ID = 11155111;
export const TARGET_CHAIN_NAME = "Ethereum Sepolia";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletStatus = "disconnected" | "connecting" | "connected" | "wrong_network";

export interface WalletContextType {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  errorMessage: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function parseChainId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed : null;
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  const applyWalletState = useCallback((accounts: unknown, nextChainId: number | null) => {
    const nextAddress = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
    setAddress(nextAddress);
    setChainId(nextChainId);
    setStatus(nextAddress ? (nextChainId === TARGET_CHAIN_ID ? "connected" : "wrong_network") : "disconnected");
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    Promise.all([
      ethereum.request({ method: "eth_accounts" }),
      ethereum.request({ method: "eth_chainId" }),
    ])
      .then(([accounts, currentChain]) => applyWalletState(accounts, parseChainId(currentChain)))
      .catch(() => applyWalletState([], null));

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAddress = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      setAddress(nextAddress);
      setStatus(nextAddress ? (chainId === TARGET_CHAIN_ID ? "connected" : "wrong_network") : "disconnected");
    };
    const handleChainChanged = (value: unknown) => {
      const nextChainId = parseChainId(value);
      setChainId(nextChainId);
      setStatus(address ? (nextChainId === TARGET_CHAIN_ID ? "connected" : "wrong_network") : "disconnected");
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [address, applyWalletState, chainId]);

  const connect = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      const message = "No EIP-1193 browser wallet was detected.";
      setErrorMessage(message);
      throw new Error(message);
    }

    setStatus("connecting");
    setErrorMessage(null);
    try {
      const [accounts, currentChain] = await Promise.all([
        ethereum.request({ method: "eth_requestAccounts" }),
        ethereum.request({ method: "eth_chainId" }),
      ]);
      applyWalletState(accounts, parseChainId(currentChain));
    } catch (error) {
      setStatus("disconnected");
      const message = error instanceof Error ? error.message : "Wallet connection was rejected.";
      setErrorMessage(message);
      throw error;
    }
  }, [applyWalletState]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setStatus("disconnected");
    setErrorMessage(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) throw new Error("No EIP-1193 browser wallet was detected.");

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
      setChainId(TARGET_CHAIN_ID);
      setStatus(address ? "connected" : "disconnected");
      setErrorMessage(null);
    } catch (error) {
      const message = "Add Ethereum Sepolia to your wallet, then try again.";
      setErrorMessage(message);
      throw new Error(message, { cause: error });
    }
  }, [address]);

  const value = useMemo(
    () => ({ status, address, chainId, isCorrectNetwork, errorMessage, connect, disconnect, switchNetwork }),
    [status, address, chainId, isCorrectNetwork, errorMessage, connect, disconnect, switchNetwork]
  );

  return React.createElement(WalletContext.Provider, { value }, children);
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
};
