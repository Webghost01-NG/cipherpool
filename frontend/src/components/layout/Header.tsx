import React, { useState } from "react";
import { Shield, Copy, Check } from "lucide-react";
import { Badge } from "../common/UIPrimitives.js";
import { WalletButton } from "../wallet/WalletButton.js";
import { DEFAULT_POOL_ADDRESS } from "../../contracts/config.js";

export interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  contractAddress?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = "pool",
  onTabChange,
  contractAddress = DEFAULT_POOL_ADDRESS,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncated = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "rgba(9, 13, 22, 0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "72px",
        }}
      >
        {/* Brand Logo & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-cyan-subtle)",
              border: "1px solid var(--accent-cyan)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                CipherPool
              </span>
              <Badge variant="info">fhEVM v0.13.3</Badge>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Confidential Prize Savings
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "4px" }} aria-label="Main Navigation">
          {[
            { id: "pool", label: "Savings Pool" },
            { id: "draw", label: "Lottery Draw" },
            { id: "docs", label: "Security & Audits" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              style={{
                background: activeTab === tab.id ? "var(--bg-tertiary)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Technical Status & Wallet Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleCopy}
            title="Copy contract address"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            <span>{truncated}</span>
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          </button>

          <WalletButton />
        </div>
      </div>
    </header>
  );
};
