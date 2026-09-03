import React, { useState } from "react";
import { Check, Copy, Fingerprint } from "lucide-react";
import { WalletButton } from "../wallet/WalletButton.js";
import { shortenHex } from "../../utils/format.js";

export interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  contractAddress?: string;
}

const tabs = [
  { id: "pool", label: "Save privately" },
  { id: "draw", label: "Prize rounds" },
  { id: "docs", label: "How it works" },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab = "pool",
  onTabChange,
  contractAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!contractAddress) return;
    await navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button className="brand" type="button" onClick={() => onTabChange?.("pool")} aria-label="CipherPool home">
          <span className="brand__mark"><Fingerprint size={21} aria-hidden="true" /></span>
          <span>
            <span className="brand__name">CipherPool</span>
            <span className="brand__tag">Private prize savings</span>
          </span>
        </button>

        <nav className="nav-pill" aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => onTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {contractAddress && (
            <button className="contract-chip" type="button" onClick={handleCopy} title="Copy pool contract address">
              {shortenHex(contractAddress)}
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
};
