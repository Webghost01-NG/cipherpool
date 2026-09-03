import React from "react";
import { Card, Button, Badge } from "../common/UIPrimitives.js";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export interface BalanceRevealCardProps {
  isRevealed: boolean;
  revealedAmount: string | null;
  onReveal: () => Promise<void>;
  onHide: () => void;
  isLoading: boolean;
}

export const BalanceRevealCard: React.FC<BalanceRevealCardProps> = ({
  isRevealed,
  revealedAmount,
  onReveal,
  onHide,
  isLoading,
}) => {
  return (
    <Card
      title="Confidential Position"
      subtitle="On-Chain euint64 Ciphertext Balance"
      headerAction={<Badge variant="info">Zama FHE Encrypted</Badge>}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            USER DEPOSIT BALANCE
          </div>
          <div
            className="mono"
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: isRevealed ? "var(--accent-emerald)" : "var(--text-primary)",
              letterSpacing: isRevealed ? "normal" : "2px",
            }}
          >
            {isRevealed && revealedAmount ? `${Number(revealedAmount).toLocaleString()} USDC` : "•••••••• USDC"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            {isRevealed
              ? "Decrypted locally via volatile EIP-712 token. Key never leaves memory."
              : "Raw balance is stored as an opaque 32-byte ciphertext handle in EVM storage."}
          </p>
        </div>

        <div>
          {isRevealed ? (
            <Button variant="secondary" onClick={onHide}>
              <EyeOff size={16} /> Hide Balance
            </Button>
          ) : (
            <Button variant="primary" isLoading={isLoading} onClick={onReveal}>
              <Eye size={16} /> Reveal Balance (EIP-712)
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
