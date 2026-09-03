import React, { useState } from "react";
import { Card, Button, Badge } from "../common/UIPrimitives.js";
import { Shield, ArrowDownRight, Info, ExternalLink } from "lucide-react";

export interface DepositCardProps {
  onDeposit: (amount: bigint) => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({
  onDeposit,
  isLoading,
  walletConnected,
}) => {
  const [amount, setAmount] = useState<string>("1000");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = BigInt(amount);
    if (val > 0n) {
      await onDeposit(val);
    }
  };

  return (
    <Card
      title="Deposit Custody Assets"
      subtitle="Client-Side Encrypted Input via InputVerifier"
      headerAction={<Badge variant="success">Zero-Loss</Badge>}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "var(--space-md)" }}>
          <label
            htmlFor="deposit-amount-input"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            Deposit Amount (USDC)
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="deposit-amount-input"
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

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {["100", "500", "1000", "5000"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                disabled={isLoading || !walletConnected}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--accent-cyan-subtle)",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            display: "flex",
            gap: "8px",
            marginBottom: "var(--space-md)",
          }}
        >
          <Info size={16} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>
            Amount is encrypted into an <code>externalEuint64</code> handle client-side. The underlying balance is deployed to ERC-4626 yield strategy while remaining confidential on-chain.
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          style={{ width: "100%" }}
          disabled={!walletConnected || !amount || BigInt(amount) <= 0n}
          isLoading={isLoading}
        >
          <ArrowDownRight size={16} /> {walletConnected ? "Confirm Encrypted Deposit" : "Connect Wallet to Deposit"}
        </Button>

        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <a
            href="https://faucet.circle.com/"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.8125rem",
              color: "var(--accent-cyan)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>Need Sepolia USDC? Claim free tokens from Circle Faucet</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </form>
    </Card>
  );
};
