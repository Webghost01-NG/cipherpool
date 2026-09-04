import React, { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, LogOut, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "../../hooks/useWallet.js";
import { Button } from "../common/UIPrimitives.js";
import { WalletModal } from "./WalletModal.js";
import { shortenHex } from "../../utils/format.js";

export const WalletButton: React.FC = () => {
  const { status, address, isCorrectNetwork, errorMessage, disconnect, switchAccount } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  if (status === "disconnected" || !address) {
    return (
      <>
        <Button onClick={() => setIsModalOpen(true)}><Wallet size={16} /> Connect wallet</Button>
        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (status === "wrong_network" || !isCorrectNetwork) {
    return (
      <>
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          <AlertTriangle size={16} /> Switch network
        </Button>
        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true);
    try {
      await switchAccount();
      setIsDropdownOpen(false);
    } catch {
      // The wallet context retains the current account and exposes an actionable message.
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  return (
    <div className="wallet-wrap">
      <button
        className="wallet-chip"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        onClick={() => setIsDropdownOpen((open) => !open)}
      >
        <span className="status-dot status-dot--ok" />
        <span className="mono">{shortenHex(address)}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {isDropdownOpen && (
        <div className="wallet-menu" role="menu">
          <div className="wallet-menu__meta">Connected to Ethereum Sepolia</div>
          <button className="menu-button" type="button" role="menuitem" onClick={handleCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Address copied" : "Copy address"}
          </button>
          <button
            className="menu-button"
            type="button"
            role="menuitem"
            disabled={isSwitchingAccount}
            onClick={() => void handleSwitchAccount()}
          >
            <RefreshCw className={isSwitchingAccount ? "animate-spin" : undefined} size={15} />
            {isSwitchingAccount ? "Waiting for wallet…" : "Switch account"}
          </button>
          {errorMessage && <div className="wallet-menu__error" role="alert">{errorMessage}</div>}
          <button
            className="menu-button menu-button--danger"
            type="button"
            role="menuitem"
            onClick={() => { disconnect(); setIsDropdownOpen(false); }}
          >
            <LogOut size={15} /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
