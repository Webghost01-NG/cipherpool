import React, { useEffect } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import { formatTokenAmount } from "../../utils/format.js";

export interface BalanceRevealCardProps {
  isRevealed: boolean;
  revealedAmount: string | null;
  onReveal: () => Promise<void>;
  onHide: () => void;
  isLoading: boolean;
  walletConnected: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
}

export const BalanceRevealCard: React.FC<BalanceRevealCardProps> = ({
  isRevealed,
  revealedAmount,
  onReveal,
  onHide,
  isLoading,
  walletConnected,
  tokenSymbol,
  tokenDecimals,
}) => {
  useEffect(() => {
    if (!isRevealed) return;
    const timeout = window.setTimeout(onHide, 60_000);
    return () => window.clearTimeout(timeout);
  }, [isRevealed, onHide]);

  const displayValue =
    isRevealed && revealedAmount !== null
      ? formatTokenAmount(revealedAmount, tokenDecimals, tokenDecimals) + " " + tokenSymbol
      : "••••••";

  return (
    <Card
      className="panel--ink"
      eyebrow="Private position"
      title="Only you can reveal this balance"
      subtitle="The ciphertext stays on-chain. Decryption happens locally after wallet authorization."
      headerAction={<Badge variant="success"><LockKeyhole size={11} /> ACL protected</Badge>}
    >
      <div className="balance-display">
        <div>
          <span className="balance-display__label">Available principal</span>
          <strong className="balance-display__value">{displayValue}</strong>
        </div>
        <p className="balance-display__hint">
          {isRevealed
            ? "This value will hide automatically after 60 seconds and is never persisted."
            : "Authorize a one-time EIP-712 request to decrypt the position assigned to your wallet."}
        </p>
        {isRevealed ? (
          <Button variant="secondary" onClick={onHide}><EyeOff size={16} /> Hide balance</Button>
        ) : (
          <Button
            variant="secondary"
            onClick={onReveal}
            disabled={!walletConnected}
            isLoading={isLoading}
          >
            <Eye size={16} /> {walletConnected ? "Reveal privately" : "Connect wallet to reveal"}
          </Button>
        )}
      </div>
    </Card>
  );
};
