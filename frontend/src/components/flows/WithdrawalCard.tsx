import React, { useState } from "react";
import { ArrowUpRight, Clock3, Info, RotateCcw } from "lucide-react";
import { parseUnits } from "ethers";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import { PendingWithdrawal } from "../../hooks/usePool.js";
import { formatTokenAmount, shortenHex } from "../../utils/format.js";

export interface WithdrawalCardProps {
  pendingWithdrawal: PendingWithdrawal;
  onRequestWithdrawal: (amount: bigint) => Promise<void>;
  onFinalizeWithdrawal: () => Promise<void>;
  onCancelWithdrawal: () => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  cancellationDelaySeconds: number;
  writesEnabled: boolean;
}

export const WithdrawalCard: React.FC<WithdrawalCardProps> = ({
  pendingWithdrawal,
  onRequestWithdrawal,
  onFinalizeWithdrawal,
  onCancelWithdrawal,
  isLoading,
  walletConnected,
  tokenSymbol,
  tokenDecimals,
  cancellationDelaySeconds,
  writesEnabled,
}) => {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const cancellableAt = pendingWithdrawal.timestamp + cancellationDelaySeconds * 1000;
  const canCancel = pendingWithdrawal.hasPending && Date.now() > cancellableAt;

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const value = parseUnits(amount, tokenDecimals);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      if (value >= 2n ** 64n) throw new Error("Amount exceeds the protocol limit.");
      setValidationError(null);
      await onRequestWithdrawal(value);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Enter a valid amount.");
    }
  };

  return (
    <Card
      eyebrow="Step 02"
      title="Withdraw without exposing your balance"
      subtitle="A public KMS proof settles the request after on-chain sufficiency is evaluated."
      headerAction={<Badge variant={pendingWithdrawal.hasPending ? "warning" : "neutral"}>{pendingWithdrawal.hasPending ? "Pending" : "Ready"}</Badge>}
    >
      {pendingWithdrawal.hasPending ? (
        <>
          <div className="pending-box">
            <div className="pending-box__title"><Clock3 size={16} /> Settlement in progress</div>
            <p>
              {formatTokenAmount(pendingWithdrawal.requestedAmount, tokenDecimals, tokenDecimals)} {tokenSymbol}
              {" "}is anchored to an on-chain request. The interface will refresh from the contract and indexer.
            </p>
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
      ) : (
        <form className="form-stack" onSubmit={handleRequest}>
          <label className="field" htmlFor="withdrawal-amount-input">
            <span className="field__label"><span>Requested amount</span><span>Private sufficiency check</span></span>
            <span className="input-shell">
              <input
                id="withdrawal-amount-input"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => { setAmount(event.target.value); setValidationError(null); }}
                disabled={isLoading || !walletConnected || !writesEnabled}
                placeholder="0.00"
              />
              <span>{tokenSymbol}</span>
            </span>
          </label>
          {validationError && <p role="alert" className="badge badge--error">{validationError}</p>}
          <div className="callout">
            <Info size={17} aria-hidden="true" />
            <span>The contract reveals neither your balance nor whether it covered the request. A zero settlement means the encrypted sufficiency check failed.</span>
          </div>
          <Button className="button--wide" type="submit" disabled={!walletConnected || !writesEnabled || !amount} isLoading={isLoading}>
            <ArrowUpRight size={17} /> {!writesEnabled ? "New requests safety-locked" : walletConnected ? "Request private withdrawal" : "Connect wallet to withdraw"}
          </Button>
        </form>
      )}
    </Card>
  );
};
