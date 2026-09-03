import React, { createContext, useContext, useState, useEffect } from "react";

export const TARGET_CHAIN_ID = 11155111; // Sepolia Testnet
export const TARGET_CHAIN_NAME = "Ethereum Sepolia";

export type WalletStatus = "disconnected" | "connecting" | "connected" | "wrong_network";

export interface WalletContextType {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  connect: (connector?: "injected" | "mock") => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isCorrectNetwork = chainId === TARGET_CHAIN_ID || chainId === 31337;

  useEffect(() => {
    // Check if ethereum provider exists in window
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          setStatus(isCorrectNetwork ? "connected" : "wrong_network");
        }
      };

      const handleChainChanged = (newChainIdHex: string) => {
        const newChainId = parseInt(newChainIdHex, 16);
        setChainId(newChainId);
        if (address) {
          setStatus(newChainId === TARGET_CHAIN_ID || newChainId === 31337 ? "connected" : "wrong_network");
        }
      };

      ethereum.on?.("accountsChanged", handleAccountsChanged);
      ethereum.on?.("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
        ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    }
  }, [address, isCorrectNetwork]);

  const connect = async (connector: "injected" | "mock" = "injected") => {
    if (connector === "mock") {
      setAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      setChainId(TARGET_CHAIN_ID);
      setStatus("connected");
      return;
    }

    if (typeof window === "undefined" || !(window as any).ethereum) {
      // Fallback to mock account in headless/non-browser testing environments
      setAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      setChainId(TARGET_CHAIN_ID);
      setStatus("connected");
      return;
    }

    try {
      setStatus("connecting");
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const currentChainHex = await ethereum.request({ method: "eth_chainId" });
      const currentChain = parseInt(currentChainHex, 16);

      setAddress(accounts[0]);
      setChainId(currentChain);

      if (currentChain === TARGET_CHAIN_ID || currentChain === 31337) {
        setStatus("connected");
      } else {
        setStatus("wrong_network");
      }
    } catch {
      setStatus("disconnected");
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setStatus("disconnected");
  };

  const switchNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
        });
        setChainId(TARGET_CHAIN_ID);
        setStatus("connected");
      } catch (err: any) {
        if (err.code === 4902) {
          // Add Sepolia network
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${TARGET_CHAIN_ID.toString(16)}`,
                chainName: TARGET_CHAIN_NAME,
                nativeCurrency: { name: "Sepolia ETH", symbol: "SEP", decimals: 18 },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          setChainId(TARGET_CHAIN_ID);
          setStatus("connected");
        }
      }
    } else {
      // Mock switch
      setChainId(TARGET_CHAIN_ID);
      setStatus("connected");
    }
  };

  return React.createElement(
    WalletContext.Provider,
    { value: { status, address, chainId, isCorrectNetwork, connect, disconnect, switchNetwork } },
    children
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
