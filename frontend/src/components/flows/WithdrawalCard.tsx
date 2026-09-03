import React, { useState } from "react";
import { Card, Button, Badge } from "../common/UIPrimitives.js";
import { PendingWithdrawal } from "../../hooks/usePool.js";
import { ArrowUpRight, Clock, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

export interface WithdrawalCardProps {
  pendingWithdrawal: PendingWithdrawal;
  onRequestWithdrawal: (amount: bigint) => Promise<void>;
  onCancelWithdrawal: () => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
}

export const WithdrawalCard: React.FC<WithdrawalCardProps> = ({
  pendingWithdrawal,
  onRequestWithdrawal,
  onCancelWithdrawal,
  isLoading,
  walletConnected,
}) => {
  const [amount, setAmount] = useState<string>("500");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = BigInt(amount);
    if (val > 0n) {
      await onRequestWithdrawal(val);
    }
  };

  return (
    <Card
      title="2-Step Async Withdrawal"
      subtitle="KMS Threshold Decryption Pipeline"
      headerAction={
        pendingWithdrawal.hasPending ? (
          <Badge variant="warning">In-Flight Decryption</Badge>
        ) : (
          <Badge variant="neutral">Ready</Badge>
        )
      }
    >
      {pendingWithdrawal.hasPending ? (
        <div>
          <div
            style={{
              backgroundColor: "var(--accent-amber-subtle)",
              border: "1px solid var(--accent-amber)",
              borderRadius: "10px",
              padding: "var(--space-md)",
              marginBottom: "var(--space-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Clock size={16} color="var(--accent-amber)" />
              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.875rem" }}>
                Step 2/2: Threshold Decryption in Progress
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Your withdrawal request of <strong>{Number(pendingWithdrawal.requestedAmount).toLocaleString()} USDC</strong> is anchored in contract storage. The Zama KMS is aggregating EIP-712 threshold signatures.
            </p>

            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Request Hash:{" "}
                <span className="mono" style={{ color: "var(--accent-cyan)" }}>
                  {pendingWithdrawal.requestHash.slice(0, 16)}...
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Ephemeral Handle:{" "}
                <span className="mono" style={{ color: "var(--accent-amber)" }}>
                  {pendingWithdrawal.handle.slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" style={{ flex: 1 }} disabled={true}>
              Awaiting Automated Relayer...
            </Button>
            <Button
              variant="danger"
              onClick={onCancelWithdrawal}
              isLoading={isLoading}
              title="Available if KMS does not settle within 24h"
            >
              Cancel (Escape Valve)
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRequest}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label
              htmlFor="withdrawal-amount-input"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Requested Withdrawal Amount (USDC)
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="withdrawal-amount-input"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading || !walletConnected}
                className="mono"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  fontSize: "1.125rem",
                }}
                placeholder="0"
              />
              <span
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                }}
              >
                USDC
              </span>
            </div>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--space-md)", lineHeight: 1.5 }}>
            Withdrawal evaluates sufficiency homomorphically without revealing whether you have enough funds. If sufficient, the requested amount is unlocked after KMS signing.
          </p>

          <Button
            type="submit"
            variant="primary"
            style={{ width: "100%" }}
            disabled={!walletConnected || !amount || BigInt(amount) <= 0n}
            isLoading={isLoading}
          >
            <ArrowUpRight size={16} /> {walletConnected ? "Request 2-Step Withdrawal" : "Connect Wallet to Withdraw"}
          </Button>
        </form>
      )}
    </Card>
  );
};
