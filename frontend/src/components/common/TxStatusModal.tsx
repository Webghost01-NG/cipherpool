import React from "react";
import { TxState } from "../../hooks/useTxLifecycle.js";
import { Button } from "./UIPrimitives.js";
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Loader2,
  Shield,
} from "lucide-react";

export interface TxStatusModalProps {
  state: TxState;
  onClose: () => void;
}

export const TxStatusModal: React.FC<TxStatusModalProps> = ({ state, onClose }) => {
  if (state.phase === "IDLE") return null;

  const isPending =
    state.phase === "PROMPTED" ||
    state.phase === "BROADCASTING" ||
    state.phase === "MINING" ||
    state.phase === "WAITING_KMS";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        padding: "var(--space-md)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "440px",
          padding: "var(--space-xl)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          {!isPending && (
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Phase Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
          {state.phase === "CONFIRMED" && (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-emerald-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={32} color="var(--accent-emerald)" />
            </div>
          )}

          {state.phase === "FAILED" && (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-rose-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertOctagon size={32} color="var(--accent-rose)" />
            </div>
          )}

          {isPending && (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-cyan-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader2 size={32} color="var(--accent-cyan)" className="animate-spin" />
            </div>
          )}
        </div>

        <h3
          id="tx-modal-title"
          style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}
        >
          {state.actionTitle || "Transaction Status"}
        </h3>

        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "var(--space-lg)", lineHeight: 1.5 }}>
          {state.phase === "PROMPTED" && "Waiting for signature confirmation in your wallet..."}
          {state.phase === "BROADCASTING" && "Broadcasting transaction to Sepolia testnet..."}
          {state.phase === "MINING" && "Transaction included in mempool. Waiting for block confirmation..."}
          {state.phase === "WAITING_KMS" && "Awaiting Zama threshold KMS signers to verify decryption..."}
          {state.phase === "CONFIRMED" && (state.details || "Transaction confirmed on-chain successfully.")}
          {state.phase === "FAILED" && (state.errorMessage || "Transaction was rejected or reverted on-chain.")}
        </p>

        {/* Sepolia Explorer Link if Hash Exists */}
        {state.txHash && (
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "var(--space-lg)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sepolia Transaction</span>
            <a
              href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>{state.txHash.slice(0, 8)}...{state.txHash.slice(-6)}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Bottom Actions */}
        <div>
          {state.phase === "CONFIRMED" && (
            <Button variant="primary" style={{ width: "100%" }} onClick={onClose}>
              Done
            </Button>
          )}

          {state.phase === "FAILED" && (
            <Button variant="secondary" style={{ width: "100%" }} onClick={onClose}>
              Dismiss & Retry
            </Button>
          )}

          {isPending && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Please keep this window open while the transaction is processing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
