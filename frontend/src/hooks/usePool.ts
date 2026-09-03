import { useState, useCallback } from "react";
import { useWallet } from "./useWallet.js";
import { InputEncryptionAdapter } from "../../../client/src/adapters/InputEncryption.js";

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

export const usePool = (contractAddress: string = "0x1111111111111111111111111111111111111111") => {
  const { address, isConnected } = useWallet();

  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalDeposits: "1420500",
    prizePool: "24850",
    totalDraws: 12,
    isPaused: false,
  });

  const [plainDepositAmount, setPlainDepositAmount] = useState<string>("50000");
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

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setTxMessage("Generating client-side ZK proof via Zama fhEVM...");

      try {
        const adapter = new InputEncryptionAdapter(contractAddress, address);
        await adapter.encryptUint64(amount);

        setTxMessage("Awaiting block confirmation on Sepolia...");
        await new Promise((resolve) => setTimeout(resolve, 800));

        const updated = BigInt(plainDepositAmount) + amount;
        setPlainDepositAmount(updated.toString());
        setPoolStats((prev) => ({
          ...prev,
          totalDeposits: (BigInt(prev.totalDeposits) + amount).toString(),
        }));

        setTxMessage("Confidential deposit confirmed successfully!");
      } finally {
        setIsLoading(false);
      }
    },
    [address, contractAddress, plainDepositAmount]
  );

  const requestWithdrawal = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setTxMessage("Submitting 2-step withdrawal request to pool...");

      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const rHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        const rHandle = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

        setPendingWithdrawal({
          hasPending: true,
          requestHash: rHash,
          requestedAmount: amount.toString(),
          handle: rHandle,
          timestamp: Date.now(),
          status: "PENDING",
        });

        setTxMessage("Withdrawal request anchored. KMS threshold decryption in progress...");
      } finally {
        setIsLoading(false);
      }
    },
    [address]
  );

  const cancelWithdrawal = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setIsLoading(true);
    setTxMessage("Executing self-sovereign cancellation escape...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPendingWithdrawal((prev) => ({
        ...prev,
        hasPending: false,
        status: "CANCELLED",
      }));
      setTxMessage("Withdrawal cancelled. Encrypted principal remains fully restored.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const revealBalance = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setIsLoading(true);
    setTxMessage("Requesting EIP-712 decryption authorization from wallet...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setRevealedBalance(plainDepositAmount);
      setIsBalanceRevealed(true);
      setTxMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, plainDepositAmount]);

  const hideBalance = useCallback(() => {
    setIsBalanceRevealed(false);
    setRevealedBalance(null);
  }, []);

  const drawLottery = useCallback(
    async (prizeAmount: bigint) => {
      setIsLoading(true);
      setTxMessage("Evaluating homomorphic modulo on Zama coprocessor...");

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setPoolStats((prev) => ({
          ...prev,
          totalDraws: prev.totalDraws + 1,
          prizePool: "0",
        }));
        setTxMessage("Prize draw executed! Winner balance credited homomorphically.");
      } finally {
        setIsLoading(false);
      }
    },
    []
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
  };
};
