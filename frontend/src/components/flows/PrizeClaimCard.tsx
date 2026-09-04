import React, { useEffect } from "react";
import { Eye, EyeOff, LockKeyhole, Trophy } from "lucide-react";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import { WalletGateButton } from "../wallet/WalletGateButton.js";
import type { WalletStatus } from "../../hooks/useWallet.js";
import { formatTokenAmount } from "../../utils/format.js";

export interface PrizeClaimCardProps {
  isRevealed: boolean;
  revealedPrize: string | null;
  onReveal: () => Promise<void>;
  onHide: () => void;
  onClaim: () => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  walletStatus: WalletStatus;
  onWalletAction: () => void;
  walletActionEnabled: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  writesEnabled: boolean;
}

export const PrizeClaimCard: React.FC<PrizeClaimCardProps> = ({
  isRevealed,
  revealedPrize,
  onReveal,
  onHide,
  onClaim,
  isLoading,
  walletConnected,
  walletStatus,
  onWalletAction,
  walletActionEnabled,
  tokenSymbol,
  tokenDecimals,
  writesEnabled,
}) => {
  useEffect(() => {
    if (!isRevealed) return;
    const timeout = window.setTimeout(onHide, 60_000);
    return () => window.clearTimeout(timeout);
  }, [isRevealed, onHide]);

  const hasClaimablePrize = revealedPrize !== null && BigInt(revealedPrize) > 0n;
  const displayValue = isRevealed && revealedPrize !== null
    ? `${formatTokenAmount(revealedPrize, tokenDecimals, tokenDecimals)} ${tokenSymbol}`
    : "••••••";

  return (
    <Card
      className="panel--ink"
      eyebrow="Private prize"
      title="Reveal and claim your winnings"
      subtitle="Only your wallet can decrypt whether this position won a round."
      headerAction={<Badge variant="success"><LockKeyhole size={11} /> Wallet private</Badge>}
    >
      <div className="balance-display">
        <div>
          <span className="balance-display__label">Unclaimed prize</span>
          <strong className="balance-display__value" aria-live="polite">{displayValue}</strong>
        </div>
        <p className="balance-display__hint">
          {isRevealed
            ? hasClaimablePrize
              ? "Claiming re-encrypts this amount and pays it to your confidential cUSDC wallet through the same on-chain path as an ordinary withdrawal."
              : "This wallet has no unclaimed prize. The result remains private to you."
            : "Sign a one-time private decryption request to check your encrypted prize without broadcasting a transaction."}
        </p>
        {isRevealed ? (
          <>
            <div className="action-row">
              <Button variant="secondary" onClick={onHide}><EyeOff size={16} /> Hide prize</Button>
              <WalletGateButton
                onClick={onClaim}
                disabled={!walletConnected || !writesEnabled || !hasClaimablePrize}
                isLoading={isLoading}
                walletStatus={walletStatus}
                onWalletAction={onWalletAction}
                walletActionEnabled={walletActionEnabled && writesEnabled}
                connectLabel="Connect wallet to claim"
                switchNetworkLabel="Switch to Sepolia to claim"
                lockedLabel="Prize claims safety-locked"
              >
                <Trophy size={16} /> Claim privately
              </WalletGateButton>
            </div>
            {!hasClaimablePrize && <Badge variant="neutral">No prize available to claim</Badge>}
          </>
        ) : (
          <WalletGateButton
            variant="secondary"
            onClick={onReveal}
            disabled={!walletConnected}
            isLoading={isLoading}
            walletStatus={walletStatus}
            onWalletAction={onWalletAction}
            walletActionEnabled={walletActionEnabled}
            connectLabel="Connect wallet to check prize"
            switchNetworkLabel="Switch to Sepolia to check prize"
            lockedLabel="Prize unavailable"
          >
            <Eye size={16} /> Check prize privately
          </WalletGateButton>
        )}
      </div>
    </Card>
  );
};
