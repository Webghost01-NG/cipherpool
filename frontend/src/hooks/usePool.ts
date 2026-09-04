import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./useWallet.js";
import { ERC7984_ABI, POOL_ABI } from "../contracts/abi.js";
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_CONFIDENTIAL_ASSET_ADDRESS,
  DEFAULT_POOL_ADDRESS,
  runtimeConfig,
} from "../contracts/config.js";
import { validateDeploymentEvidence } from "../contracts/deployment.js";
import { canReadSepoliaContracts } from "../utils/networkStatus.js";

export interface PoolStats {
  totalDeposits: string;
  prizeReserve: string;
  custodyBalance: string;
  totalDraws: number;
  participantCount: number;
  drawPrizeAmount: string;
  drawInterval: number;
  nextDrawRequestTimestamp: number;
  isPaused: boolean;
  owner: string;
  pendingDraw: {
    active: boolean;
    prizeAmount: string;
    timestamp: number;
    requestHash: string;
  };
  pendingActivation: {
    active: boolean;
    timestamp: number;
    requestHash: string;
    eligibilityHandle: string;
  };
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

export type MetricFreshness = "loading" | "pending" | "fresh" | "stale" | "unavailable";
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

const ZERO_HASH = `0x${"0".repeat(64)}`;

function ensureReceipt<T extends { status: number | null; hash: string }>(receipt: T | null): T {
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed on-chain.");
  return receipt;
}

function readClearValue(clearValues: Record<string, bigint>, handle: string): bigint {
  const value = Object.entries(clearValues).find(([key]) => key.toLowerCase() === handle.toLowerCase())?.[1];
  if (typeof value !== "bigint") throw new Error("Zama KMS returned an invalid aggregate value.");
  return value;
}

function readClearBoolean(clearValues: Record<string, unknown>, handle: string): boolean {
  const value = Object.entries(clearValues).find(([key]) => key.toLowerCase() === handle.toLowerCase())?.[1];
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  throw new Error("Zama KMS returned an invalid participant eligibility value.");
}

export const usePool = (contractAddress: string = DEFAULT_POOL_ADDRESS) => {
  const { address, status } = useWallet();
  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalDeposits: "0",
    prizeReserve: "0",
    custodyBalance: "0",
    totalDraws: 0,
    participantCount: 0,
    drawPrizeAmount: "0",
    drawInterval: 0,
    nextDrawRequestTimestamp: 0,
    isPaused: false,
    owner: "",
    pendingDraw: {
      active: false,
      prizeAmount: "0",
      timestamp: 0,
      requestHash: ZERO_HASH,
    },
    pendingActivation: {
      active: false,
      timestamp: 0,
      requestHash: ZERO_HASH,
      eligibilityHandle: ZERO_HASH,
    },
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
  const [isPrizeRevealed, setIsPrizeRevealed] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<string | null>(null);
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
    setRevealedBalance(null);
    setIsBalanceRevealed(false);
    setRevealedPrize(null);
    setIsPrizeRevealed(false);
  }, [address]);

  useEffect(() => {
    setRevealedPrize(null);
    setIsPrizeRevealed(false);
  }, [poolStats.totalDraws]);

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
        lastVerifiedTotalEligibleBalance?: string;
        totalDraws?: number;
        prizeReserveFundingModel?: string;
        latestDraw?: { remainingPrizeReserve?: string } | null;
      };
      if (typeof data.totalDraws !== "number" || !Number.isSafeInteger(data.totalDraws)) throw new Error("Invalid draw count.");
      if (data.prizeReserveFundingModel !== "sponsor-funded-testnet") throw new Error("Unsupported prize reserve funding model.");
      setBackendStatus("online");
      setPoolStats((current) => ({
        ...current,
        totalDeposits: data.lastVerifiedTotalEligibleBalance ?? current.totalDeposits,
        prizeReserve: data.latestDraw?.remainingPrizeReserve ?? current.prizeReserve,
        totalDraws: data.totalDraws!,
      }));
      setMetricFreshness((current) => ({
        ...current,
        totalDeposits: data.latestDraw ? "stale" : "pending",
        prizeReserve: data.latestDraw ? "stale" : "pending",
        totalDraws: "fresh",
      }));
    } catch {
      setBackendStatus("offline");
    }

    if (!canReadSepoliaContracts(status, Boolean(window.ethereum))) {
      setDeploymentVerification({
        status: "pending",
        message: status === "wrong_network" ? "Switch the connected wallet to Ethereum Sepolia." : "Connect a Sepolia wallet to verify the active deployment.",
      });
      setDataError(null);
      setLastUpdatedAt(Date.now());
      return;
    }
    if (!address) return;

    try {
      const { ethers } = await import("../utils/walletRuntime.js");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, provider);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== runtimeConfig.chainId) {
        throw new Error("Wallet is not connected to Ethereum Sepolia.");
      }
      const poolCode = await provider.getCode(contractAddress);
      if (poolCode === "0x") {
        throw new Error("The configured Veylott contract was not found on Ethereum Sepolia.");
      }
      const observedPoolCodeHash = ethers.keccak256(poolCode);
      if (observedPoolCodeHash.toLowerCase() !== runtimeConfig.poolRuntimeCodeHash.toLowerCase()) {
        throw new Error("The configured Veylott bytecode does not match the reviewed Sepolia deployment.");
      }

      const [
        total,
        reserve,
        verifiedAt,
        totalDraws,
        participantCount,
        drawPrizeAmount,
        drawInterval,
        nextDrawRequestTimestamp,
        paused,
        owner,
        custodyAddress,
        pendingDraw,
        pendingActivation,
      ] = await Promise.all([
        pool.lastVerifiedTotalEligibleBalance() as Promise<bigint>,
        pool.lastVerifiedPrizeReserve() as Promise<bigint>,
        pool.lastDrawVerificationTimestamp() as Promise<bigint>,
        pool.currentDrawId() as Promise<bigint>,
        pool.getParticipantCount() as Promise<bigint>,
        pool.drawPrizeAmount() as Promise<bigint>,
        pool.drawInterval() as Promise<bigint>,
        pool.nextDrawRequestTimestamp() as Promise<bigint>,
        pool.paused() as Promise<boolean>,
        pool.owner() as Promise<string>,
        pool.custodyAsset() as Promise<string>,
        pool.getPendingDraw() as Promise<{
          prizeAmount: bigint;
          timestamp: bigint;
          active: boolean;
          requestHash: string;
        }>,
        pool.getPendingParticipantActivation(address) as Promise<{
          eligibilityHandle: string;
          timestamp: bigint;
          active: boolean;
          requestHash: string;
        }>,
      ]);
      const token = new ethers.Contract(custodyAddress, ERC7984_ABI, provider);
      const [decimals, symbol, aggregateHandle] = await Promise.all([
        token.decimals() as Promise<bigint>,
        token.symbol() as Promise<string>,
        pool.getTotalEligibleBalanceHandle() as Promise<string>,
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
          poolRuntimeCodeHash: observedPoolCodeHash,
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
        drawPrizeAmount: drawPrizeAmount.toString(),
        drawInterval: Number(drawInterval),
        nextDrawRequestTimestamp: Number(nextDrawRequestTimestamp),
        isPaused: paused,
        owner,
        pendingDraw: {
          active: pendingDraw.active,
          prizeAmount: pendingDraw.prizeAmount.toString(),
          timestamp: Number(pendingDraw.timestamp),
          requestHash: pendingDraw.requestHash,
        },
        pendingActivation: {
          active: pendingActivation.active,
          timestamp: Number(pendingActivation.timestamp),
          requestHash: pendingActivation.requestHash,
          eligibilityHandle: pendingActivation.eligibilityHandle,
        },
      });
      setMetricFreshness({
        totalDeposits: hasSnapshot ? "stale" : "pending",
        prizeReserve: hasSnapshot ? "stale" : "pending",
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
  }, [address, contractAddress, status]);

  useEffect(() => {
    void refreshPoolData();
    const interval = window.setInterval(() => void refreshPoolData(), 15_000);
    return () => window.clearInterval(interval);
  }, [refreshPoolData]);

  const requireVerifiedWrites = useCallback(() => {
    if (!runtimeConfig.protocolWritesEnabled) throw new Error("Protocol writes are disabled by the safety switch.");
    if (deploymentVerification.status !== "verified") throw new Error("Protocol writes require verified Sepolia bytecode and ERC-7984 custody.");
    if (poolStats.isPaused) throw new Error("Protocol writes are disabled while the pool is paused.");
    if (poolStats.pendingDraw.active) throw new Error("Protocol writes are locked while a prize draw awaits settlement or cancellation.");
  }, [deploymentVerification.status, poolStats.isPaused, poolStats.pendingDraw.active]);

  const activateParticipant = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const [{ ethers }, { getBrowserFhevmInstance }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, await provider.getSigner());
      const pending = await pool.getPendingParticipantActivation(address) as {
        eligibilityHandle: string;
        active: boolean;
        requestHash: string;
      };
      if (!pending.active) throw new Error("No participant activation is pending for this wallet.");
      callbacks.onProofRequested?.(pending.requestHash);
      const result = await (await getBrowserFhevmInstance()).publicDecrypt([pending.eligibilityHandle]);
      const eligible = readClearBoolean(result.clearValues, pending.eligibilityHandle);
      const transaction = await pool.finalizeParticipantActivation(address, eligible, result.decryptionProof);
      callbacks.onBroadcast?.(transaction.hash);
      const receipt = ensureReceipt(await transaction.wait());
      return {
        txHash: receipt.hash,
        eligible,
        successMessage: eligible
          ? "KMS-verified positive position activated for prize draws."
          : "The encrypted transfer settled at zero, so no draw entry was created.",
      };
    } finally {
      await refreshPoolData();
      setIsLoading(false);
    }
  }, [address, contractAddress, refreshPoolData, requireVerifiedWrites, status]);

  const deposit = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const [{ ethers }, { InputEncryptionAdapter }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
      const encrypted = await new InputEncryptionAdapter(asset.address, address).encryptUint64(amount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = new ethers.Contract(asset.address, ERC7984_ABI, await provider.getSigner());
      const actionData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [ethers.id("CIPHERPOOL_DEPOSIT_V1")]);
      const transaction = await token.confidentialTransferAndCall(contractAddress, encrypted.handle, encrypted.inputProof, actionData);
      callbacks.onBroadcast?.(transaction.hash);
      ensureReceipt(await transaction.wait());
      return await activateParticipant(callbacks);
    } finally {
      setIsLoading(false);
    }
  }, [activateParticipant, address, asset.address, contractAddress, requireVerifiedWrites, status]);

  const withdraw = useCallback(async (amount: bigint, callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    setIsLoading(true);
    try {
      const [{ ethers }, { InputEncryptionAdapter }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
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
      const [{ ethers }, { InputEncryptionAdapter }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
      const encrypted = await new InputEncryptionAdapter(asset.address, address).encryptUint64(amount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = new ethers.Contract(asset.address, ERC7984_ABI, await provider.getSigner());
      const actionData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [ethers.id("CIPHERPOOL_PRIZE_RESERVE_V1")]);
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
      const [{ ethers }, { getBrowserFhevmInstance }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
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

  const hideBalance = useCallback(() => {
    setIsBalanceRevealed(false);
    setRevealedBalance(null);
  }, []);

  const revealPrize = useCallback(async () => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    setIsLoading(true);
    try {
      const [{ ethers }, { getBrowserFhevmInstance }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const handle = await new ethers.Contract(contractAddress, POOL_ABI, provider).getPrizeHandle(address) as string;
      if (handle === ethers.ZeroHash) {
        setRevealedPrize("0");
        setIsPrizeRevealed(true);
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
      if (typeof clearValue !== "bigint") throw new Error("KMS returned an invalid prize value.");
      setRevealedPrize(clearValue.toString());
      setIsPrizeRevealed(true);
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, status]);

  const hidePrize = useCallback(() => {
    setIsPrizeRevealed(false);
    setRevealedPrize(null);
  }, []);

  const claimPrize = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (revealedPrize === null || BigInt(revealedPrize) <= 0n) {
      throw new Error("Reveal a positive unclaimed prize before claiming it.");
    }
    const result = await withdraw(BigInt(revealedPrize), callbacks);
    setRevealedPrize("0");
    setIsPrizeRevealed(true);
    return result;
  }, [revealedPrize, withdraw]);

  const drawLottery = useCallback(async (callbacks: TransactionCallbacks = {}) => {
    if (!address || status !== "connected" || !window.ethereum) throw new Error("Connect a Sepolia wallet first.");
    requireVerifiedWrites();
    const prizeAmount = BigInt(poolStats.drawPrizeAmount);
    if (prizeAmount <= 0n) throw new Error("The on-chain draw policy is unavailable.");
    if (Math.floor(Date.now() / 1000) < poolStats.nextDrawRequestTimestamp) {
      throw new Error("The next permissionless draw window is not open yet.");
    }
    setIsLoading(true);
    try {
      const [{ ethers }, { getBrowserFhevmInstance }] = await Promise.all([
        import("../utils/walletRuntime.js"),
        import("../../../client/src/adapters/InputEncryption.js"),
      ]);
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
      const finalizeTx = await pool.finalizeDraw(total, reserve, result.decryptionProof);
      callbacks.onBroadcast?.(finalizeTx.hash);
      const receipt = ensureReceipt(await finalizeTx.wait());
      const drawSkipped = receipt.logs.some((log) => {
        try {
          return pool.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "DrawSkipped";
        } catch {
          return false;
        }
      });
      return {
        txHash: receipt.hash,
        successMessage: drawSkipped
          ? "The KMS-verified pool or reserve could not fund this round. No prize was awarded and the lock was released."
          : undefined,
      };
    } finally {
      await refreshPoolData();
      setIsLoading(false);
    }
  }, [address, contractAddress, poolStats.drawPrizeAmount, poolStats.nextDrawRequestTimestamp, refreshPoolData, requireVerifiedWrites, status]);

  return {
    poolStats,
    asset,
    isBalanceRevealed,
    revealedBalance,
    isPrizeRevealed,
    revealedPrize,
    isLoading,
    backendStatus,
    dataError,
    lastUpdatedAt,
    metricFreshness,
    deploymentVerification,
    writesEnabled:
      runtimeConfig.protocolWritesEnabled &&
      deploymentVerification.status === "verified" &&
      !poolStats.isPaused &&
      !poolStats.pendingDraw.active,
    deposit,
    activateParticipant,
    withdraw,
    fundPrizeReserve,
    revealBalance,
    hideBalance,
    revealPrize,
    hidePrize,
    claimPrize,
    drawLottery,
    refreshPoolData,
  };
};
