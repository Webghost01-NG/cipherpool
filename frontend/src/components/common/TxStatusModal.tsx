import React from "react";
import {
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { TxState } from "../../hooks/useTxLifecycle.js";
import { runtimeConfig } from "../../contracts/config.js";
import { useModalFocus } from "../../hooks/useModalFocus.js";
import { shortenHex } from "../../utils/format.js";
import { Button } from "./UIPrimitives.js";

export interface TxStatusModalProps {
  state: TxState;
  onClose: () => void;
}

const phaseCopy: Record<TxState["phase"], string> = {
  IDLE: "",
  PROMPTED: "Approve the request in your wallet. Nothing has been submitted yet.",
  BROADCASTING: "The transaction was broadcast to Ethereum Sepolia.",
  MINING: "Waiting for block inclusion and a successful receipt.",
  WAITING_KMS: "The request is on-chain. Zama threshold signers are producing a decryption proof.",
  CONFIRMED: "The transaction receipt confirms success on-chain.",
  FAILED: "The action did not complete. No success state has been recorded.",
};

export const TxStatusModal: React.FC<TxStatusModalProps> = ({ state, onClose }) => {
  const isOpen = state.phase !== "IDLE";
  const isPending = ["PROMPTED", "BROADCASTING", "MINING", "WAITING_KMS"].includes(state.phase);
  const isSuccess = state.phase === "CONFIRMED";
  const dialogRef = useModalFocus({ isOpen, onDismiss: onClose, canDismiss: !isPending });
  if (!isOpen) return null;
  const explorerHref =
    state.txHash && runtimeConfig.explorerUrl
      ? runtimeConfig.explorerUrl + "/tx/" + state.txHash
      : "";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!isPending && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal tx-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        aria-describedby="tx-modal-description"
        tabIndex={-1}
      >
        <div className="modal__top">
          <span className="eyebrow">Transaction evidence</span>
          {!isPending && (
            <button className="icon-button" type="button" aria-label="Close transaction dialog" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className={"tx-icon " + (isSuccess ? "tx-icon--success" : state.phase === "FAILED" ? "tx-icon--error" : "")}>
          {isSuccess ? (
            <CheckCircle2 size={30} />
          ) : state.phase === "FAILED" ? (
            <AlertOctagon size={30} />
          ) : state.phase === "WAITING_KMS" ? (
            <ShieldCheck size={30} />
          ) : (
            <LoaderCircle className="animate-spin" size={30} />
          )}
        </div>
        <h2 id="tx-modal-title">{state.actionTitle || "Transaction status"}</h2>
        <p id="tx-modal-description">{state.details || state.errorMessage || phaseCopy[state.phase]}</p>
        {state.txHash && (
          <div className="tx-evidence">
            <span className="mono">{shortenHex(state.txHash, 10, 8)}</span>
            {explorerHref && (
              <a href={explorerHref} target="_blank" rel="noreferrer">
                View receipt <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}
        {!isPending && (
          <Button className="button--wide" variant={isSuccess ? "primary" : "secondary"} onClick={onClose}>
            {isSuccess ? "Done" : "Dismiss and retry"}
          </Button>
        )}
      </div>
    </div>
  );
};
