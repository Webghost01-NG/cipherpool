import React, { useState } from "react";
import { useWallet } from "../../hooks/useWallet.js";
import { Button } from "../common/UIPrimitives.js";
import { WalletModal } from "./WalletModal.js";
import { Wallet, AlertTriangle, LogOut, ChevronDown, Check, Copy } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { status, address, isCorrectNetwork, disconnect, switchNetwork } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === "disconnected" || !address) {
    return (
      <>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Wallet size={16} /> Connect Wallet
        </Button>
        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (status === "wrong_network" || !isCorrectNetwork) {
    return (
      <>
        <Button
          variant="danger"
          style={{ backgroundColor: "var(--accent-amber)", color: "var(--text-inverse)" }}
          onClick={() => setIsModalOpen(true)}
        >
          <AlertTriangle size={16} /> Wrong Network
        </Button>
        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: "8px",
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border-medium)",
          color: "var(--text-primary)",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all var(--transition-fast)",
        }}
      >
        <span className="pulsing-dot" style={{ width: "6px", height: "6px" }} />
        <span className="mono">{truncated}</span>
        <ChevronDown size={14} color="var(--text-muted)" />
      </button>

      {isDropdownOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-medium)",
            borderRadius: "10px",
            padding: "8px",
            width: "200px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: "8px",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "4px",
            }}
          >
            Connected to Sepolia (11155111)
          </div>

          <button
            onClick={handleCopy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "6px",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Address"}</span>
          </button>

          <button
            onClick={() => { disconnect(); setIsDropdownOpen(false); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "6px",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--accent-rose)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <LogOut size={14} />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
};
