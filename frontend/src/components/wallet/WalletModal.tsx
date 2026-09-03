import React from "react";
import { AlertTriangle, ArrowRight, ShieldCheck, Wallet, X } from "lucide-react";
import { useWallet } from "../../hooks/useWallet.js";
import { Badge, Button } from "../common/UIPrimitives.js";

export interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { status, connect, switchNetwork, errorMessage } = useWallet();
  if (!isOpen) return null;

  const hasInjectedWallet =
    typeof window !== "undefined" &&
    Boolean((window as Window & { ethereum?: unknown }).ethereum);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
      <div className="modal">
        <div className="modal__top">
          <div>
            <p className="eyebrow">Wallet access</p>
            <h2 id="wallet-modal-title">{status === "wrong_network" ? "Change network" : "Enter CipherPool"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close wallet dialog" onClick={onClose}><X size={18} /></button>
        </div>

        {status === "wrong_network" ? (
          <>
            <div className="modal__notice">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>This deployment uses Ethereum Sepolia. Your wallet is connected to another network.</span>
            </div>
            <Button className="button--wide" onClick={() => void switchNetwork().then(onClose).catch(() => undefined)}>
              Switch to Sepolia <ArrowRight size={16} />
            </Button>
          </>
        ) : hasInjectedWallet ? (
          <>
            <button
              className="connector"
              type="button"
              disabled={status === "connecting"}
              onClick={() => void connect().then(onClose).catch(() => undefined)}
            >
              <span className="connector__body">
                <Wallet size={20} aria-hidden="true" />
                <span><strong>{status === "connecting" ? "Connecting…" : "Browser wallet"}</strong><span>MetaMask, Brave Wallet, Coinbase Wallet</span></span>
              </span>
              <Badge variant="success">Detected</Badge>
            </button>
            <div className="modal__notice">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Connecting only requests your public address. Transactions always require an explicit wallet signature.</span>
            </div>
          </>
        ) : (
          <div className="modal__notice" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>No browser wallet was detected. Install an EIP-1193 wallet extension, then refresh this page.</span>
          </div>
        )}
        {errorMessage && (
          <div className="modal__notice" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
