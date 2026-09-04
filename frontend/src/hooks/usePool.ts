import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet.js";
import { getBrowserFhevmInstance, InputEncryptionAdapter } from "../../../client/src/adapters/InputEncryption.js";
import { ERC7984_ABI, POOL_ABI } from "../contracts/abi.js";
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_CONFIDENTIAL_ASSET_ADDRESS,
  DEFAULT_POOL_ADDRESS,
  runtimeConfig,
} from "../contracts/config.js";
import { validateDeploymentEvidence } from "../contracts/deployment.js";

export interface PoolStats {
  totalDeposits: string;
  prizeReserve: string;
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

/** Archived-pool compatibility type used by the legacy exit card. */
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
  onProofRequested?: (requestHash: string) => void;
}

export interface DeploymentVerification {
  status: "pending" | "verified" | "failed";
  message: string;
}

export type MetricFreshness = "loading" | "fresh" | "stale" | "unavailable";
export interface PoolMetricFreshness {
  totalDeposits: MetricFreshness;
  prizeReserve: MetricFreshness;
  totalDraws: MetricFreshness;
  participantCount: MetricFreshness;
}

const initialMetricFreshness: PoolMetricFreshness = {
  totalDeposits: "loading",
  prizeReserve: "loading",
  totalDraws: "loading",
  participantCount: "loading",
};

const DEPOSIT_ACTION = ethers.id("CIPHERPOOL_DEPOSIT_V1");
const PRIZE_RESERVE_ACTION = ethers.id("CIPHERPOOL_PRIZE_RESERVE_V1");

function ensureReceipt(receipt: ethers.ContractTransactionReceipt | null): ethers.ContractTransactionReceipt {
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed on-chain.");
  return receipt;
}

function readClearValue(clearValues: Record<string, bigint>, handle: string): bigint {
  const value = Object.entries(clearValues).find(([key]) => key.toLowerCase() === handle.toLowerCase())?.[1];
  if (typeof value !== "bigint") throw new Error("Zama KMS returned an invalid aggregate value.");
  return value;
}

export const usePool = (contractAddress: string = DEFAULT_POOL_ADDRESS) => {
  const { address, status } = useWallet();
  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalDeposits: "0",
    prizeReserve: "0",
    custodyBalance: "0",
    totalDraws: 0,
    participantCount: 0,
    isPaused: false,
    owner: "",
  });
  const [asset, setAsset] = useState<AssetMetadata>({
    address: DEFAULT_CONFIDENTIAL_ASSET_ADDRESS,
    symbol: runtimeConfig.tokenSymbol,
    decimals: Math.max(runtimeConfig.tokenDecimals, 0),
    walletBalance: "0",
    isLoaded: false,
  });
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [revealedBalance, setRevealedBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [metricFreshness, setMetricFreshness] = useState<PoolMetricFreshness>(initialMetricFreshness);
  const [deploymentVerification, setDeploymentVerification] = useState<DeploymentVerification>({
    status: "pending",
    message: "Connect a Sepolia wallet to verify the active deployment.",
  });

  useEffect(() => {
    if (!address) {
      setRevealedBalance(null);
      setIsBalanceRevealed(false);
    }
  }, [address]);

  const refreshPoolData = useCallback(async () => {
    if (!contractAddress || !DEFAULT_BACKEND_URL) {
      setDataError("Protocol environment variables are incomplete.");
      setBackendStatus("offline");
      return;
    }

    try {
      const response = await fetch(DEFAULT_BACKEND_URL + "/api/v1/pool/state");
      if (!response.ok) throw new Error("Backend returned HTTP " + response.status);
      const data = await response.json() as {
        lastVerifiedTotalAccountedBalance?: string;
        totalDraws?: number;
        prizeReserveFundingModel?: string;
        latestDraw?: { remainingPrizeReserve?: string } | null;
      };
      if (typeof data.totalDraws !== "number" || !Number.isSafeInteger(data.totalDraws)) throw new Error("Invalid draw count.");
      if (data.prizeReserveFundingModel !== "sponsor-funded-testnet") throw new Error("Unsupported prize reserve funding model.");
      setBackendStatus("online");
      setPoolStats((current) => ({
        ...current,
        totalDeposits: data.lastVerifiedTotalAccountedBalance ?? current.totalDeposits,
        prizeReserve: data.latestDraw?.remainingPrizeReserve ?? current.prizeReserve,
        totalDraws: data.totalDraws!,
      }));
      setMetricFreshness((current) => ({
        ...current,
        totalDeposits: data.latestDraw ? "stale" : "unavailable",
        prizeReserve: data.latestDraw ? "stale" : "unavailable",
        totalDraws: "fresh",
      }));
    } catch {
      setBackendStatus("offline");
    }

    if (!window.ethereum || status === "wrong_network") {
      setDeploymentVerification({
        status: "pending",
        message: status === "wrong_network" ? "Switch the connected wallet to Ethereum Sepolia." : "Connect a Sepolia wallet to verify the active deployment.",
      });
      setLastUpdatedAt(Date.now());
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, provider);
      const [network, poolCode, total, reserve, verifiedAt, totalDraws, participantCount, paused, owner, custodyAddress] = await Promise.all([
        provider.getNetwork(),
        provider.getCode(contractAddress),
        pool.lastVerifiedTotalAccountedBalance() as Promise<bigint>,
        pool.lastVerifiedPrizeReserve() as Promise<bigint>,
        pool.lastDrawVerificationTimestamp() as Promise<bigint>,
        pool.currentDrawId() as Promise<bigint>,
        pool.getParticipantCount() as Promise<bigint>,
        pool.paused() as Promise<boolean>,
        pool.owner() as Promise<string>,
        pool.custodyAsset() as Promise<string>,
      ]);
      const token = new ethers.Contract(custodyAddress, ERC7984_ABI, provider);
      const [decimals, symbol, aggregateHandle] = await Promise.all([
        token.decimals() as Promise<bigint>,
        token.symbol() as Promise<string>,
        pool.getTotalAccountedBalanceHandle() as Promise<string>,
      ]);
      const verificationErrors = validateDeploymentEvidence(
        {
          chainId: runtimeConfig.chainId,
          poolAddress: runtimeConfig.poolAddress,
          poolRuntimeCodeHash: runtimeConfig.poolRuntimeCodeHash,
          custodyAssetAddress: runtimeConfig.custodyAssetAddress,
          tokenSymbol: runtimeConfig.tokenSymbol,
          tokenDecimals: runtimeConfig.tokenDecimals,
        },
        {
          chainId: Number(network.chainId),
          poolAddress: contractAddress,
          poolRuntimeCodeHash: poolCode === "0x" ? "" : ethers.keccak256(poolCode),
          custodyAssetAddress: custodyAddress,
          tokenSymbol: symbol,
          tokenDecimals: Number(decimals),
          supportsConfidentialAccounting: /^0x[a-fA-F0-9]{64}$/.test(aggregateHandle),
        }
      );
      if (verificationErrors.length > 0) throw new Error("Deployment verification failed: " + verificationErrors.join("; ") + ".");

      const hasSnapshot = verifiedAt > 0n;
      setDeploymentVerification({ status: "verified", message: "Active Sepolia bytecode and ERC-7984 custody verified." });
      setPoolStats({
        totalDeposits: total.toString(),
        prizeReserve: reserve.toString(),
        custodyBalance: "0",
        totalDraws: Number(totalDraws),
        participantCount: Number(participantCount),
        isPaused: paused,
        owner,
      });
      setMetricFreshness({
        totalDeposits: hasSnapshot ? "stale" : "unavailable",
        prizeReserve: hasSnapshot ? "stale" : "unavailable",
        totalDraws: "fresh",
        participantCount: "fresh",
      });
      setAsset({ address: custodyAddress, symbol, decimals: Number(decimals), walletBalance: "0", isLoaded: true });
      setDataError(null);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read the pool contract.";
      setDeploymentVerification({ status: "failed", message });
      setDataError(message);
      setLastUpdatedAt(Date.now());
    }
  }, [contractAddress, status]);

  useEffect(() => {
    void refreshPoolData();
    const interval = window.setInterval(() => void refreshPoolData(), 15_000);
    return () => window.clearInterval(interval);
  }, [refreshPoolData]);

  const requireVerifiedWrites = useCallback(() => {
    if (!runtimeConfig.protocolWritesEnabled) throw new Error("Protocol writes are disabled by the safety switch.");
    if (deploymentVerification.status !== "verified") throw new Error("Protocol writes require verified Sepolia bytecode and ERC-7984 custody.");
  }, [deploymentVerification.status]);

  const deposit = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const encrypted = await new InputEncryptionAdapter(asset.address, address).encryptUint64(amount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = new ethers.Contract(asset.address, ERC7984_ABI, await provider.getSigner());
      const actionData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [DEPOSIT_ACTION]);
      const transaction = await token.confidentialTransferAndCall(contractAddress, encrypted.handle, encrypted.inputProof, actionData);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, asset.address, contractAddress, refreshPoolData, requireVerifiedWrites, status]);

  const withdraw = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const encrypted = await new InputEncryptionAdapter(contractAddress, address).encryptUint64(amount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, await provider.getSigner());
      const transaction = await pool.withdraw(encrypted.handle, encrypted.inputProof);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, refreshPoolData, requireVerifiedWrites, status]);

  const fundPrizeReserve = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const encrypted = await new InputEncryptionAdapter(asset.address, address).encryptUint64(amount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = new ethers.Contract(asset.address, ERC7984_ABI, await provider.getSigner());
      const actionData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [PRIZE_RESERVE_ACTION]);
      const transaction = await token.confidentialTransferAndCall(
        contractAddress,
        encrypted.handle,
        encrypted.inputProof,
        actionData
      );
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, asset.address, contractAddress, refreshPoolData, requireVerifiedWrites, status]);

  const revealBalance = useCallback(async () => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const handle = await new ethers.Contract(contractAddress, POOL_ABI, provider).getBalanceHandle(address) as string;
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
      const signature = await signer.signTypedData(typedData.domain, { UserDecryptRequestVerification: typedData.types.UserDecryptRequestVerification }, typedData.message);
      const result = await instance.userDecrypt(
        [{ handle, contractAddress }], keypair.privateKey, keypair.publicKey, signature,
        contractAddresses, address, startTimestamp, durationDays
      );
      const clearValue = result[handle];
      if (typeof clearValue !== "bigint") throw new Error("KMS returned an invalid balance value.");
      setRevealedBalance(clearValue.toString());
      setIsBalanceRevealed(true);
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, status]);

  const drawLottery = useCallback(async (prizeAmount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect the owner wallet first.");
    requireVerifiedWrites();
    if (address.toLowerCase() !== poolStats.owner.toLowerCase()) throw new Error("Only the pool owner can execute a draw.");
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, await provider.getSigner());
      const requestTx = await pool.requestDraw(prizeAmount);
      callbacks.onBroadcast?.(requestTx.hash);
      ensureReceipt(await requestTx.wait());
      const pending = await pool.getPendingDraw();
      callbacks.onProofRequested?.(pending.requestHash);
      const result = await (await getBrowserFhevmInstance()).publicDecrypt([pending.totalHandle, pending.reserveHandle]);
      const total = readClearValue(result.clearValues, pending.totalHandle);
      const reserve = readClearValue(result.clearValues, pending.reserveHandle);
      if (prizeAmount > reserve) throw new Error("Prize exceeds the KMS-verified confidential reserve.");
      const finalizeTx = await pool.finalizeDraw(total, reserve, result.decryptionProof);
      callbacks.onBroadcast?.(finalizeTx.hash);
      const receipt = ensureReceipt(await finalizeTx.wait());
      await refreshPoolData();
      return { txHash: receipt.hash };
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, poolStats.owner, refreshPoolData, requireVerifiedWrites, status]);

  const isOwner = useMemo(
    () => Boolean(address && poolStats.owner && address.toLowerCase() === poolStats.owner.toLowerCase()),
    [address, poolStats.owner]
  );

  return {
    poolStats,
    asset,
    isBalanceRevealed,
    revealedBalance,
    isLoading,
    backendStatus,
    dataError,
    lastUpdatedAt,
    metricFreshness,
    deploymentVerification,
    writesEnabled: runtimeConfig.protocolWritesEnabled && deploymentVerification.status === "verified",
    isOwner,
    deposit,
    withdraw,
    fundPrizeReserve,
    revealBalance,
    hideBalance: () => { setIsBalanceRevealed(false); setRevealedBalance(null); },
    drawLottery,
    refreshPoolData,
  };
};
