import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet.js";
import { getBrowserFhevmInstance } from "../../../client/src/adapters/InputEncryption.js";
import { POOL_ABI, ERC20_ABI } from "../contracts/abi.js";
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_POOL_ADDRESS,
  DEFAULT_USDC_ADDRESS,
  runtimeConfig,
} from "../contracts/config.js";

export interface PoolStats {
  totalDeposits: string;
  availableYield: string;
  custodyBalance: string;
  totalDraws: number;
  participantCount: number;
  isPaused: boolean;
  owner: string;
}

export interface AssetMetadata {
  address: string;
  symbol: string;
  decimals: number;
  walletBalance: string;
  isLoaded: boolean;
}

export interface PendingWithdrawal {
  hasPending: boolean;
  requestHash: string;
  requestedAmount: string;
  handle: string;
  timestamp: number;
  status: "PENDING" | "FINALIZED" | "CANCELLED";
}

export interface TransactionCallbacks {
  onBroadcast?: (hash: string) => void;
}

const emptyWithdrawal: PendingWithdrawal = {
  hasPending: false,
  requestHash: "",
  requestedAmount: "0",
  handle: "",
  timestamp: 0,
  status: "FINALIZED",
};

function ensureReceipt(receipt: ethers.ContractTransactionReceipt | null): ethers.ContractTransactionReceipt {
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed on-chain.");
  return receipt;
}

export const usePool = (contractAddress: string = DEFAULT_POOL_ADDRESS) => {
  const { address, status } = useWallet();
  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalDeposits: "0",
    availableYield: "0",
    custodyBalance: "0",
    totalDraws: 0,
    participantCount: 0,
    isPaused: false,
    owner: "",
  });
  const [asset, setAsset] = useState<AssetMetadata>({
    address: DEFAULT_USDC_ADDRESS,
    symbol: runtimeConfig.tokenSymbol,
    decimals: Math.max(runtimeConfig.tokenDecimals, 0),
    walletBalance: "0",
    isLoaded: false,
  });
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [revealedBalance, setRevealedBalance] = useState<string | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal>(emptyWithdrawal);
  const [cancellationDelaySeconds, setCancellationDelaySeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const persistWithdrawal = useCallback((withdrawal: PendingWithdrawal) => {
    setPendingWithdrawal(withdrawal);
    if (!address) return;
    const key = "cipherpool_withdrawal_" + address.toLowerCase();
    try {
      if (withdrawal.hasPending && withdrawal.status === "PENDING") {
        localStorage.setItem(key, JSON.stringify(withdrawal));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // Local storage is an optional cache; chain state remains authoritative.
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setPendingWithdrawal(emptyWithdrawal);
      setRevealedBalance(null);
      setIsBalanceRevealed(false);
      return;
    }
    try {
      const saved = localStorage.getItem("cipherpool_withdrawal_" + address.toLowerCase());
      if (saved) {
        const parsed = JSON.parse(saved) as PendingWithdrawal;
        if (parsed.status === "PENDING") setPendingWithdrawal(parsed);
      }
    } catch {
      setPendingWithdrawal(emptyWithdrawal);
    }
  }, [address]);

  const refreshPoolData = useCallback(async () => {
    if (!contractAddress || !DEFAULT_BACKEND_URL) {
      setDataError("Protocol environment variables are incomplete.");
      setBackendStatus("offline");
      return;
    }

    let backendRequestFailed = false;
    try {
      const response = await fetch(DEFAULT_BACKEND_URL + "/api/v1/pool/state");
      if (!response.ok) throw new Error("Backend returned HTTP " + response.status);
      const data = await response.json() as {
        totalDeposits?: string;
        totalAccountedBalance?: string;
        totalDraws?: number;
      };
      setBackendStatus("online");
      setPoolStats((current) => ({
        ...current,
        totalDeposits: data.totalAccountedBalance ?? data.totalDeposits ?? current.totalDeposits,
        totalDraws: data.totalDraws ?? current.totalDraws,
      }));
    } catch {
      backendRequestFailed = true;
      setBackendStatus("offline");
    }

    if (!window.ethereum || status === "wrong_network") {
      setDataError(backendRequestFailed ? "Live protocol data is temporarily unavailable." : null);
      setLastUpdatedAt(Date.now());
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, provider);
      const [
        totalDeposits,
        totalDraws,
        participantCount,
        paused,
        owner,
        custodyAddress,
        cancellationDelay,
      ] = await Promise.all([
        pool.totalDepositsPlain() as Promise<bigint>,
        pool.currentDrawId() as Promise<bigint>,
        pool.getParticipantCount() as Promise<bigint>,
        pool.paused() as Promise<boolean>,
        pool.owner() as Promise<string>,
        pool.custodyAsset() as Promise<string>,
        pool.cancellationDelay() as Promise<bigint>,
      ]);

      const token = new ethers.Contract(custodyAddress, ERC20_ABI, provider);
      const [decimals, symbol, custodyBalance, walletBalance] = await Promise.all([
        token.decimals() as Promise<bigint>,
        token.symbol() as Promise<string>,
        token.balanceOf(contractAddress) as Promise<bigint>,
        address ? token.balanceOf(address) as Promise<bigint> : Promise.resolve(0n),
      ]);
      let totalAccountedBalance = totalDeposits;
      try {
        totalAccountedBalance = await pool.totalAccountedBalancePlain() as bigint;
      } catch {
        // Compatibility for the read-only legacy deployment; writes remain disabled there.
      }
      let availableYield: bigint;
      try {
        availableYield = await pool.availableYieldPlain() as bigint;
      } catch {
        // Compatibility for the read-only legacy deployment; writes remain disabled there.
        availableYield = custodyBalance > totalAccountedBalance ? custodyBalance - totalAccountedBalance : 0n;
      }

      setPoolStats({
        totalDeposits: totalAccountedBalance.toString(),
        availableYield: availableYield.toString(),
        custodyBalance: custodyBalance.toString(),
        totalDraws: Number(totalDraws),
        participantCount: Number(participantCount),
        isPaused: paused,
        owner,
      });
      setAsset({
        address: custodyAddress,
        symbol,
        decimals: Number(decimals),
        walletBalance: walletBalance.toString(),
        isLoaded: true,
      });
      setCancellationDelaySeconds(Number(cancellationDelay));

      if (address) {
        const pending = await pool.getPendingWithdrawal(address);
        if (pending.active) {
          persistWithdrawal({
            hasPending: true,
            requestHash: pending.requestHash,
            requestedAmount: pending.requestedAmount.toString(),
            handle: pending.handle,
            timestamp: Number(pending.timestamp) * 1000,
            status: "PENDING",
          });
        } else {
          persistWithdrawal(emptyWithdrawal);
        }
      }

      setDataError(null);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to read the pool contract.");
      setLastUpdatedAt(Date.now());
    }
  }, [address, contractAddress, persistWithdrawal, status]);

  useEffect(() => {
    void refreshPoolData();
    const interval = window.setInterval(() => void refreshPoolData(), 15_000);
    return () => window.clearInterval(interval);
  }, [refreshPoolData]);

  const deposit = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    if (!asset.isLoaded) throw new Error("Custody asset metadata is still loading.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const token = new ethers.Contract(asset.address, ERC20_ABI, signer);
      const allowance = await token.allowance(address, contractAddress) as bigint;

      if (allowance < amount) {
        const approval = await token.approve(contractAddress, amount);
        callbacks.onBroadcast?.(approval.hash);
        ensureReceipt(await approval.wait());
      }

      const transaction = await pool.deposit(amount);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, asset, contractAddress, refreshPoolData, status]);

  const requestWithdrawal = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const transaction = await pool.requestWithdrawal(amount);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      const pending = await pool.getPendingWithdrawal(address);
      const withdrawal: PendingWithdrawal = {
        hasPending: true,
        requestHash: pending.requestHash,
        requestedAmount: pending.requestedAmount.toString(),
        handle: pending.handle,
        timestamp: Number(pending.timestamp) * 1000,
        status: "PENDING",
      };
      persistWithdrawal(withdrawal);
      return { txHash: receipt.hash, requestHash: withdrawal.requestHash };
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, persistWithdrawal, status]);

  const finalizeWithdrawal = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the requesting wallet first.");
    if (!pendingWithdrawal.hasPending) throw new Error("No active withdrawal request was found.");
    setIsLoading(true);
    try {
      const instance = await getBrowserFhevmInstance();
      const result = await instance.publicDecrypt([pendingWithdrawal.handle]);
      const clearValue = Object.entries(result.clearValues).find(
        ([handle]) => handle.toLowerCase() === pendingWithdrawal.handle.toLowerCase()
      )?.[1];
      if (typeof clearValue !== "bigint") throw new Error("KMS returned an invalid withdrawal clear value.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const transaction = await pool.finalizeWithdrawal(clearValue, result.decryptionProof);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      persistWithdrawal(emptyWithdrawal);
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, pendingWithdrawal, persistWithdrawal, refreshPoolData, status]);

  const cancelWithdrawal = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the requesting wallet first.");
    if (Date.now() <= pendingWithdrawal.timestamp + cancellationDelaySeconds * 1000) {
      throw new Error("The withdrawal cancellation delay has not elapsed.");
    }
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const transaction = await pool.cancelWithdrawal();
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      persistWithdrawal({ ...emptyWithdrawal, status: "CANCELLED" });
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, cancellationDelaySeconds, contractAddress, pendingWithdrawal.timestamp, persistWithdrawal, refreshPoolData, status]);

  const revealBalance = useCallback(async () => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, provider);
      const handle = await pool.getBalanceHandle(address) as string;
      if (handle === ethers.ZeroHash) {
        setRevealedBalance("0");
        setIsBalanceRevealed(true);
        return;
      }

      const instance = await getBrowserFhevmInstance();
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 1;
      const contractAddresses = [contractAddress];
      const typedData = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
      const signature = await signer.signTypedData(
        typedData.domain,
        { UserDecryptRequestVerification: typedData.types.UserDecryptRequestVerification },
        typedData.message
      );
      const result = await instance.userDecrypt(
        [{ handle, contractAddress }],
        keypair.privateKey,
        keypair.publicKey,
        signature,
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );
      const clearValue = result[handle];
      if (typeof clearValue !== "bigint") throw new Error("KMS returned an invalid balance value.");
      setRevealedBalance(clearValue.toString());
      setIsBalanceRevealed(true);
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, status]);

  const hideBalance = useCallback(() => {
    setIsBalanceRevealed(false);
    setRevealedBalance(null);
  }, []);

  const drawLottery = useCallback(async (prizeAmount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the owner wallet first.");
    if (address.toLowerCase() !== poolStats.owner.toLowerCase()) throw new Error("Only the pool owner can execute a draw.");
    if (prizeAmount > BigInt(poolStats.availableYield)) throw new Error("Prize exceeds verified available yield.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const transaction = await pool.draw(prizeAmount);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, poolStats.availableYield, poolStats.owner, refreshPoolData, status]);

  const isOwner = useMemo(
    () => Boolean(address && poolStats.owner && address.toLowerCase() === poolStats.owner.toLowerCase()),
    [address, poolStats.owner]
  );

  return {
    poolStats,
    asset,
    isBalanceRevealed,
    revealedBalance,
    pendingWithdrawal,
    cancellationDelaySeconds,
    isLoading,
    backendStatus,
    dataError,
    lastUpdatedAt,
    isOwner,
    deposit,
    requestWithdrawal,
    finalizeWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
    refreshPoolData,
  };
};
