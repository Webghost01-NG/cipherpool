import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet.js";
import { InputEncryptionAdapter } from "../../../client/src/adapters/InputEncryption.js";
import { POOL_ABI, ERC20_ABI } from "../contracts/abi.js";
import { DEFAULT_POOL_ADDRESS, DEFAULT_USDC_ADDRESS, DEFAULT_BACKEND_URL } from "../contracts/config.js";

export interface PoolStats {
  totalDeposits: string;
  prizePool: string;
  totalDraws: number;
  isPaused: boolean;
}

export interface PendingWithdrawal {
  hasPending: boolean;
  requestHash: string;
  requestedAmount: string;
  handle: string;
  timestamp: number;
  status: "PENDING" | "FINALIZED" | "CANCELLED";
}

export const usePool = (contractAddress: string = DEFAULT_POOL_ADDRESS) => {
  const { address, status } = useWallet();

  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalDeposits: "0",
    prizePool: "0",
    totalDraws: 0,
    isPaused: false,
  });

  const [plainDepositAmount, setPlainDepositAmount] = useState<string>("0");
  const [isBalanceRevealed, setIsBalanceRevealed] = useState<boolean>(false);
  const [revealedBalance, setRevealedBalance] = useState<string | null>(null);

  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal>({
    hasPending: false,
    requestHash: "",
    requestedAmount: "0",
    handle: "",
    timestamp: 0,
    status: "FINALIZED",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);

  // Restore pending withdrawal from LocalStorage if available
  useEffect(() => {
    if (!address) return;
    try {
      const saved = localStorage.getItem(`cipherpool_withdrawal_${address.toLowerCase()}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "PENDING") {
          setPendingWithdrawal(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [address]);

  // Save pending withdrawal to LocalStorage
  const persistWithdrawal = useCallback(
    (w: PendingWithdrawal) => {
      setPendingWithdrawal(w);
      if (!address) return;
      try {
        if (w.hasPending && w.status === "PENDING") {
          localStorage.setItem(`cipherpool_withdrawal_${address.toLowerCase()}`, JSON.stringify(w));
        } else {
          localStorage.removeItem(`cipherpool_withdrawal_${address.toLowerCase()}`);
        }
      } catch {
        // Ignore localStorage errors
      }
    },
    [address]
  );

  // Fetch real on-chain or backend state
  const refreshPoolData = useCallback(async () => {
    try {
      // 1. Try fetching from backend indexer API
      try {
        const res = await fetch(`${DEFAULT_BACKEND_URL}/api/v1/pool/state`);
        if (res.ok) {
          const data = await res.json();
          setPoolStats((prev) => ({
            ...prev,
            totalDeposits: data.totalDeposits || prev.totalDeposits,
            totalDraws: data.totalDraws ?? prev.totalDraws,
          }));
        }
      } catch {
        // Fallback to direct RPC reading
      }

      // 2. Read directly from smart contract via window.ethereum if available
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const poolContract = new ethers.Contract(contractAddress, POOL_ABI, provider);

        const totalDeposits: bigint = await poolContract.totalDepositsPlain().catch(() => 0n);
        const currentDrawId: bigint = await poolContract.currentDrawId().catch(() => 0n);

        setPoolStats((prev) => ({
          ...prev,
          totalDeposits: totalDeposits.toString(),
          totalDraws: Number(currentDrawId),
        }));

        if (address) {
          const pending = await poolContract.getPendingWithdrawal(address).catch(() => null);
          if (pending && pending.active) {
            persistWithdrawal({
              hasPending: true,
              requestHash: pending.requestHash,
              requestedAmount: pending.requestedAmount.toString(),
              handle: pending.handle,
              timestamp: Number(pending.timestamp) * 1000,
              status: "PENDING",
            });
          }
        }
      }
    } catch {
      // Ignore network fetch errors
    }
  }, [address, contractAddress, persistWithdrawal]);

  useEffect(() => {
    refreshPoolData();
    const interval = setInterval(refreshPoolData, 15000);
    return () => clearInterval(interval);
  }, [refreshPoolData]);

  // Real on-chain deposit
  const deposit = useCallback(
    async (amount: bigint): Promise<{ txHash: string }> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);

      try {
        if (typeof window !== "undefined" && (window as any).ethereum && status === "connected") {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const poolContract = new ethers.Contract(contractAddress, POOL_ABI, signer);

          // Get custody asset and check allowance
          const custodyAddr = await poolContract.custodyAsset().catch(() => DEFAULT_USDC_ADDRESS);
          const usdc = new ethers.Contract(custodyAddr, ERC20_ABI, signer);

          setTxMessage("Checking USDC custody allowance...");
          const currentAllowance: bigint = await usdc.allowance(address, contractAddress).catch(() => 0n);

          if (currentAllowance < amount) {
            setTxMessage("Requesting USDC approval in wallet...");
            const approveTx = await usdc.approve(contractAddress, ethers.MaxUint256);
            await approveTx.wait();
          }

          setTxMessage("Generating client-side ZK encryption proof...");
          const adapter = new InputEncryptionAdapter(contractAddress, address);
          const payload = await adapter.encryptUint64(amount);

          setTxMessage("Submitting confidential deposit to Sepolia...");
          const tx = await poolContract.deposit(payload.handle, payload.inputProof, amount);
          const receipt = await tx.wait();

          await refreshPoolData();
          setPlainDepositAmount((prev) => (BigInt(prev) + amount).toString());
          return { txHash: receipt.hash };
        } else {
          // Mock persona fallback for testing without web3
          await new Promise((r) => setTimeout(r, 800));
          const updated = BigInt(plainDepositAmount) + amount;
          setPlainDepositAmount(updated.toString());
          setPoolStats((prev) => ({
            ...prev,
            totalDeposits: (BigInt(prev.totalDeposits) + amount).toString(),
          }));
          return { txHash: "" };
        }
      } finally {
        setIsLoading(false);
        setTxMessage(null);
      }
    },
    [address, contractAddress, plainDepositAmount, refreshPoolData, status]
  );

  // Real on-chain withdrawal request
  const requestWithdrawal = useCallback(
    async (amount: bigint): Promise<{ txHash: string; requestHash?: string }> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);

      try {
        if (typeof window !== "undefined" && (window as any).ethereum && status === "connected") {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const poolContract = new ethers.Contract(contractAddress, POOL_ABI, signer);

          setTxMessage("Submitting 2-step withdrawal request to Sepolia...");
          const tx = await poolContract.requestWithdrawal(amount);
          const receipt = await tx.wait();

          // Read newly anchored pending withdrawal
          const pending = await poolContract.getPendingWithdrawal(address);
          const newRequest: PendingWithdrawal = {
            hasPending: true,
            requestHash: pending.requestHash,
            requestedAmount: amount.toString(),
            handle: pending.handle,
            timestamp: Date.now(),
            status: "PENDING",
          };
          persistWithdrawal(newRequest);

          return { txHash: receipt.hash, requestHash: pending.requestHash };
        } else {
          // Mock persona fallback
          await new Promise((r) => setTimeout(r, 800));
          const rHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
          const rHandle = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
          const mockReq: PendingWithdrawal = {
            hasPending: true,
            requestHash: rHash,
            requestedAmount: amount.toString(),
            handle: rHandle,
            timestamp: Date.now(),
            status: "PENDING",
          };
          persistWithdrawal(mockReq);
          return { txHash: "", requestHash: rHash };
        }
      } finally {
        setIsLoading(false);
        setTxMessage(null);
      }
    },
    [address, contractAddress, persistWithdrawal, status]
  );

  // Real on-chain cancel withdrawal
  const cancelWithdrawal = useCallback(async (): Promise<{ txHash: string }> => {
    if (!address) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum && status === "connected") {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const poolContract = new ethers.Contract(contractAddress, POOL_ABI, signer);

        setTxMessage("Submitting cancellation escape transaction...");
        const tx = await poolContract.cancelWithdrawal();
        const receipt = await tx.wait();

        persistWithdrawal({
          hasPending: false,
          requestHash: "",
          requestedAmount: "0",
          handle: "",
          timestamp: 0,
          status: "CANCELLED",
        });

        return { txHash: receipt.hash };
      } else {
        await new Promise((r) => setTimeout(r, 600));
        persistWithdrawal({
          hasPending: false,
          requestHash: "",
          requestedAmount: "0",
          handle: "",
          timestamp: 0,
          status: "CANCELLED",
        });
        return { txHash: "" };
      }
    } finally {
      setIsLoading(false);
      setTxMessage(null);
    }
  }, [address, contractAddress, persistWithdrawal, status]);

  // Real EIP-712 balance reveal signature
  const revealBalance = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setIsLoading(true);
    setTxMessage("Requesting EIP-712 decryption authorization from wallet...");

    try {
      if (typeof window !== "undefined" && (window as any).ethereum && status === "connected") {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();

        const domain = {
          name: "CipherPool Decryption",
          version: "1",
          chainId: 11155111,
          verifyingContract: contractAddress,
        };

        const types = {
          BalanceQuery: [
            { name: "user", type: "address" },
            { name: "timestamp", type: "uint256" },
          ],
        };

        const value = {
          user: address,
          timestamp: Math.floor(Date.now() / 1000),
        };

        // Prompt real EIP-712 signature
        await signer.signTypedData(domain, types, value).catch(() => {
          // User rejected or wallet does not support EIP-712
        });

        // Try getting real balance from backend or contract
        try {
          const res = await fetch(`${DEFAULT_BACKEND_URL}/api/v1/users/${address}/deposit`);
          if (res.ok) {
            const data = await res.json();
            setRevealedBalance(data.plainDepositAmount || plainDepositAmount);
          } else {
            setRevealedBalance(plainDepositAmount);
          }
        } catch {
          setRevealedBalance(plainDepositAmount);
        }

        setIsBalanceRevealed(true);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setRevealedBalance(plainDepositAmount);
        setIsBalanceRevealed(true);
      }
    } finally {
      setIsLoading(false);
      setTxMessage(null);
    }
  }, [address, contractAddress, plainDepositAmount, status]);

  const hideBalance = useCallback(() => {
    setIsBalanceRevealed(false);
    setRevealedBalance(null);
  }, []);

  // Real on-chain lottery draw execution
  const drawLottery = useCallback(
    async (prizeAmount: bigint): Promise<{ txHash: string }> => {
      setIsLoading(true);
      setTxMessage("Evaluating homomorphic draw on Zama coprocessor...");

      try {
        if (typeof window !== "undefined" && (window as any).ethereum && status === "connected") {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const poolContract = new ethers.Contract(contractAddress, POOL_ABI, signer);

          const tx = await poolContract.draw(prizeAmount);
          const receipt = await tx.wait();

          await refreshPoolData();
          return { txHash: receipt.hash };
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setPoolStats((prev) => ({
            ...prev,
            totalDraws: prev.totalDraws + 1,
            prizePool: "0",
          }));
          return { txHash: "" };
        }
      } finally {
        setIsLoading(false);
        setTxMessage(null);
      }
    },
    [contractAddress, refreshPoolData, status]
  );

  return {
    poolStats,
    plainDepositAmount,
    isBalanceRevealed,
    revealedBalance,
    pendingWithdrawal,
    isLoading,
    txMessage,
    deposit,
    requestWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
    refreshPoolData,
  };
};
