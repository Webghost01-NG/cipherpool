import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, LogOut, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "../../hooks/useWallet.js";
import { Button } from "../common/UIPrimitives.js";
import { WalletModal } from "./WalletModal.js";
import { shortenHex } from "../../utils/format.js";

const walletMenuItemSelector = '[role="menuitem"]:not([disabled])';

export function getWalletMenuFocusIndex(
  key: string,
  activeIndex: number,
  itemCount: number
): number | null {
  if (itemCount <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  if (key === "ArrowDown") return activeIndex < 0 ? 0 : (activeIndex + 1) % itemCount;
  if (key === "ArrowUp") return activeIndex < 0 ? itemCount - 1 : (activeIndex - 1 + itemCount) % itemCount;
  return null;
}

export const WalletButton: React.FC = () => {
  const { status, address, isCorrectNetwork, errorMessage, disconnect, switchAccount } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsDropdownOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;

    const menuItems = () => Array.from(
      menu.querySelectorAll<HTMLButtonElement>(walletMenuItemSelector)
    );
    menuItems()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      const items = menuItems();
      const activeIndex = items.findIndex((item) => item === document.activeElement);
      const targetIndex = getWalletMenuFocusIndex(event.key, activeIndex, items.length);
      if (targetIndex === null) return;

      event.preventDefault();
      items[targetIndex]?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (menu.contains(event.target) || trigger.contains(event.target)) return;
      closeMenu(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [address, closeMenu, isCorrectNetwork, isDropdownOpen, status]);

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
      closeMenu(true);
    } catch {
      // The wallet context retains the current account and exposes an actionable message.
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  return (
    <div className="wallet-wrap">
      <button
        ref={triggerRef}
        className="wallet-chip"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-controls={isDropdownOpen ? "wallet-account-menu" : undefined}
        onClick={() => setIsDropdownOpen((open) => !open)}
      >
        <span className="status-dot status-dot--ok" />
        <span className="mono">{shortenHex(address)}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {isDropdownOpen && (
        <div ref={menuRef} id="wallet-account-menu" className="wallet-menu" role="menu" aria-label="Wallet account actions">
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
            onClick={() => { disconnect(); closeMenu(); }}
          >
            <LogOut size={15} /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
