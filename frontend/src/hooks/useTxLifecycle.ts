import { useState, useCallback } from "react";

export type TxPhase =
  | "IDLE"
  | "PROMPTED"
  | "BROADCASTING"
  | "MINING"
  | "WAITING_KMS"
  | "CONFIRMED"
  | "FAILED";

export interface TxState {
  phase: TxPhase;
  actionTitle: string;
  txHash: string | null;
  errorMessage: string | null;
  details?: string | null;
}

export const useTxLifecycle = () => {
  const [txState, setTxState] = useState<TxState>({
    phase: "IDLE",
    actionTitle: "",
    txHash: null,
    errorMessage: null,
    details: null,
  });

  const startTx = useCallback((actionTitle: string) => {
    setTxState({
      phase: "PROMPTED",
      actionTitle,
      txHash: null,
      errorMessage: null,
      details: "Please approve the transaction request in your connected wallet.",
    });
  }, []);

  const setBroadcasting = useCallback((txHash: string) => {
    setTxState((prev) => ({
      ...prev,
      phase: "BROADCASTING",
      txHash,
      details: "Transaction broadcast to Ethereum Sepolia mempool...",
    }));
  }, []);

  const setMining = useCallback(() => {
    setTxState((prev) => ({
      ...prev,
      phase: "MINING",
      details: "Awaiting block inclusion and consensus confirmation...",
    }));
  }, []);

  const setWaitingKms = useCallback((requestHash: string) => {
    setTxState((prev) => ({
      ...prev,
      phase: "WAITING_KMS",
      details: `Request locked (${requestHash.slice(0, 10)}...). Zama KMS threshold signers aggregating decryption proof...`,
    }));
  }, []);

  const setConfirmed = useCallback((details?: string) => {
    setTxState((prev) => ({
      ...prev,
      phase: "CONFIRMED",
      details: details ?? "Transaction confirmed on-chain successfully!",
    }));
  }, []);

  const setFailed = useCallback((error: Error | string) => {
    const msg = error instanceof Error ? error.message : String(error);
    setTxState((prev) => ({
      ...prev,
      phase: "FAILED",
      errorMessage: msg,
      details: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setTxState({
      phase: "IDLE",
      actionTitle: "",
      txHash: null,
      errorMessage: null,
      details: null,
    });
  }, []);

  return {
    txState,
    startTx,
    setBroadcasting,
    setMining,
    setWaitingKms,
    setConfirmed,
    setFailed,
    reset,
  };
};
