import React from "react";
import { ArchiveRestore, Clock3, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import type { PendingWithdrawal } from "../../hooks/usePool.js";
import { formatTokenAmount, shortenHex } from "../../utils/format.js";

export interface LegacyExitCardProps {
  legacyPoolAddress: string;
  explorerUrl: string;
  pendingWithdrawal: PendingWithdrawal;
  cancellationDelaySeconds: number;
  walletConnected: boolean;
  isLoading: boolean;
  isChecking: boolean;
  error: string | null;
  tokenSymbol: string;
  tokenDecimals: number;
  onFinalizeWithdrawal: () => Promise<void>;
  onCancelWithdrawal: () => Promise<void>;
}

export const LegacyExitCard: React.FC<LegacyExitCardProps> = ({
  legacyPoolAddress,
  explorerUrl,
  pendingWithdrawal,
  cancellationDelaySeconds,
  walletConnected,
  isLoading,
  isChecking,
  error,
  tokenSymbol,
  tokenDecimals,
  onFinalizeWithdrawal,
  onCancelWithdrawal,
}) => {
  const canCancel = pendingWithdrawal.hasPending &&
    Date.now() > pendingWithdrawal.timestamp + cancellationDelaySeconds * 1000;

  return (
    <Card
      eyebrow="Migration safety"
      title="Archived pool exits"
      subtitle="The previous deployment is permanently closed to deposits, new withdrawal requests, and draws. Existing requests retain their settlement and cancellation paths."
      headerAction={<Badge variant="warning">Exit only</Badge>}
    >
      <div className="evidence-list">
        <div className="evidence-row">
          <span>Archived contract</span>
          <a href={explorerUrl + "/address/" + legacyPoolAddress} target="_blank" rel="noreferrer">
            <code>{shortenHex(legacyPoolAddress, 10, 8)}</code> <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {error && <div className="callout" role="alert"><ArchiveRestore size={17} /><span>{error}</span></div>}
      {!error && !walletConnected && (
        <div className="callout"><ShieldCheck size={17} /><span>Connect the wallet that created the legacy request to check its exit status.</span></div>
      )}
      {!error && walletConnected && !pendingWithdrawal.hasPending && (
        <div className="callout"><ShieldCheck size={17} /><span>{isChecking ? "Checking the archived pool…" : "No pending legacy withdrawal was found for this wallet."}</span></div>
      )}
      {pendingWithdrawal.hasPending && (
        <>
          <div className="pending-box">
            <div className="pending-box__title"><Clock3 size={16} /> Legacy settlement pending</div>
            <p>{formatTokenAmount(pendingWithdrawal.requestedAmount, tokenDecimals, tokenDecimals)} {tokenSymbol} remains anchored to the archived contract.</p>
            <div className="evidence-list">
              <div className="evidence-row"><span>Request</span><code>{shortenHex(pendingWithdrawal.requestHash, 12, 8)}</code></div>
              <div className="evidence-row"><span>Ciphertext</span><code>{shortenHex(pendingWithdrawal.handle, 12, 8)}</code></div>
            </div>
          </div>
          <div className="action-row">
            <Button variant="primary" onClick={onFinalizeWithdrawal} isLoading={isLoading}>
              <Clock3 size={16} /> Generate proof &amp; finalize
            </Button>
            <Button variant="danger" onClick={onCancelWithdrawal} disabled={!canCancel} isLoading={isLoading}>
              <RotateCcw size={16} /> {canCancel ? "Cancel stale request" : "Cancellation locked"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
