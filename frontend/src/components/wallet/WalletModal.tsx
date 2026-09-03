import React from "react";
import { useWallet } from "../../hooks/useWallet.js";
import { Button, Badge } from "../common/UIPrimitives.js";
import { X, Wallet, AlertTriangle, ShieldCheck } from "lucide-react";

export interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { status, connect, switchNetwork } = useWallet();

  if (!isOpen) return null;

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
        zIndex: 100,
        padding: "var(--space-md)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "420px",
          padding: "var(--space-xl)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <h3 id="wallet-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Connect Wallet
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
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
        </div>

        {status === "wrong_network" ? (
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <div
              style={{
                backgroundColor: "var(--accent-amber-subtle)",
                border: "1px solid var(--accent-amber)",
                borderRadius: "10px",
                padding: "var(--space-md)",
                marginBottom: "var(--space-md)",
                display: "flex",
                gap: "10px",
              }}
            >
              <AlertTriangle color="var(--accent-amber)" size={22} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                <p style={{ fontWeight: 600, marginBottom: "2px" }}>Unsupported Network</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  CipherPool requires <strong>Ethereum Sepolia</strong> for Zama fhEVM coprocessor compatibility.
                </p>
              </div>
            </div>
            <Button variant="primary" style={{ width: "100%" }} onClick={() => { switchNetwork(); onClose(); }}>
              Switch to Sepolia Testnet
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => { connect("injected"); onClose(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Wallet size={20} color="var(--accent-cyan)" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Browser Wallet</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>MetaMask, Brave, Coinbase</div>
                </div>
              </div>
              <Badge variant="info">Detected</Badge>
            </button>

            <button
              onClick={() => { connect("mock"); onClose(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ShieldCheck size={20} color="var(--accent-emerald)" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Judge Demo Account</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Instant Sepolia Test Persona</div>
                </div>
              </div>
              <Badge variant="success">Instant</Badge>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
