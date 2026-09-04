import React from "react";
import { Fingerprint } from "lucide-react";
import { WalletButton } from "../wallet/WalletButton.js";

export interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const tabs = [
  { id: "pool", label: "Save privately" },
  { id: "draw", label: "Prize rounds" },
  { id: "docs", label: "How it works" },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab = "pool",
  onTabChange,
}) => (
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
          <WalletButton />
        </div>
      </div>
    </header>
);
