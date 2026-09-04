import { useCallback, useEffect, useState } from "react";
import { LEGACY_POOL_ABI } from "../contracts/abi.js";
import { useWallet } from "./useWallet.js";
import type { PendingWithdrawal, TransactionCallbacks } from "./usePool.js";

const emptyWithdrawal: PendingWithdrawal = {
  hasPending: false,
  requestHash: "",
  requestedAmount: "0",
  handle: "",
  timestamp: 0,
  status: "FINALIZED",
};

function ensureReceipt<T extends { status: number | null; hash: string }>(receipt: T | null): T {
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed on-chain.");
  return receipt;
}

export const useLegacyExit = (legacyPoolAddress: string) => {
  const { address, status } = useWallet();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal>(emptyWithdrawal);
  const [cancellationDelaySeconds, setCancellationDelaySeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!legacyPoolAddress || !address || !window.ethereum) {
      setPendingWithdrawal(emptyWithdrawal);
      setError(null);
      return;
    }
    if (status !== "connected") {
      setError(status === "wrong_network" ? "Switch to Ethereum Sepolia to inspect the archived pool." : null);
      return;
    }

    setIsChecking(true);
    try {
      const { ethers } = await import("../utils/walletRuntime.js");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const code = await provider.getCode(legacyPoolAddress);
      if (code === "0x") throw new Error("The configured archived pool has no Sepolia bytecode.");
      const pool = new ethers.Contract(legacyPoolAddress, LEGACY_POOL_ABI, provider);
      const [pending, cancellationDelay] = await Promise.all([
        pool.getPendingWithdrawal(address),
        pool.cancellationDelay() as Promise<bigint>,
      ]);
      setCancellationDelaySeconds(Number(cancellationDelay));
      setPendingWithdrawal(pending.active ? {
        hasPending: true,
        requestHash: pending.requestHash,
        requestedAmount: pending.requestedAmount.toString(),
        handle: pending.handle,
        timestamp: Number(pending.timestamp) * 1000,
        status: "PENDING",
      } : emptyWithdrawal);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to inspect the archived pool.");
    } finally {
      setIsChecking(false);
    }
  }, [address, legacyPoolAddress, status]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const finalizeWithdrawal = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the requesting wallet on Sepolia.");
    if (!pendingWithdrawal.hasPending) throw new Error("No archived withdrawal request was found.");
    setIsLoading(true);
    try {
      const [{ ethers }, { getBrowserFhevmInstance }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
      const instance = await getBrowserFhevmInstance();
      const result = await instance.publicDecrypt([pendingWithdrawal.handle]);
      const clearValue = Object.entries(result.clearValues).find(
        ([handle]) => handle.toLowerCase() === pendingWithdrawal.handle.toLowerCase()
      )?.[1];
      if (typeof clearValue !== "bigint") throw new Error("KMS returned an invalid withdrawal clear value.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(legacyPoolAddress, LEGACY_POOL_ABI, signer);
      const transaction = await pool.finalizeWithdrawal(clearValue, result.decryptionProof);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refresh();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, legacyPoolAddress, pendingWithdrawal, refresh, status]);

  const cancelWithdrawal = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the requesting wallet on Sepolia.");
    if (!pendingWithdrawal.hasPending) throw new Error("No archived withdrawal request was found.");
    if (Date.now() <= pendingWithdrawal.timestamp + cancellationDelaySeconds * 1000) {
      throw new Error("The archived withdrawal cancellation delay has not elapsed.");
    }
    setIsLoading(true);
    try {
      const { ethers } = await import("../utils/walletRuntime.js");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(legacyPoolAddress, LEGACY_POOL_ABI, signer);
      const transaction = await pool.cancelWithdrawal();
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refresh();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, cancellationDelaySeconds, legacyPoolAddress, pendingWithdrawal, refresh, status]);

  return {
    pendingWithdrawal,
    cancellationDelaySeconds,
    isLoading,
    isChecking,
    error,
    finalizeWithdrawal,
    cancelWithdrawal,
    refresh,
  };
};
