import React, { useState } from "react";
import { Dices, Gift, Info, Sparkles } from "lucide-react";
import { Badge, Card } from "../common/UIPrimitives.js";
import { WalletGateButton } from "../wallet/WalletGateButton.js";
import type { WalletStatus } from "../../hooks/useWallet.js";
import { formatTokenAmount } from "../../utils/format.js";
import { parseTokenAmount } from "../../utils/tokenAmount.js";

export interface LotteryDrawCardProps {
  prizeReserve: string;
  totalDraws: number;
  drawPrizeAmount: string;
  drawIntervalSeconds: number;
  nextDrawRequestTimestamp: number;
  prizeReserveStatus: "loading" | "fresh" | "stale" | "unavailable";
  totalDrawsStatus: "loading" | "fresh" | "stale" | "unavailable";
  onFundReserve: (amount: bigint) => Promise<void>;
  onExecuteDraw: () => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  walletStatus: WalletStatus;
  onWalletAction: () => void;
  walletActionEnabled: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  writesEnabled: boolean;
}

export const LotteryDrawCard: React.FC<LotteryDrawCardProps> = ({
  prizeReserve,
  totalDraws,
  drawPrizeAmount,
  drawIntervalSeconds,
  nextDrawRequestTimestamp,
  prizeReserveStatus,
  totalDrawsStatus,
  onFundReserve,
  onExecuteDraw,
  isLoading,
  walletConnected,
  walletStatus,
  onWalletAction,
  walletActionEnabled,
  tokenSymbol,
  tokenDecimals,
  writesEnabled,
}) => {
  const [sponsorAmount, setSponsorAmount] = useState("");
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const cadenceOpen = nextDrawRequestTimestamp > 0 && Math.floor(Date.now() / 1000) >= nextDrawRequestTimestamp;
  const fixedPrizeLabel = `${formatTokenAmount(drawPrizeAmount, tokenDecimals)} ${tokenSymbol}`;
  const drawIntervalDays = drawIntervalSeconds > 0 ? drawIntervalSeconds / 86_400 : 0;
  const nextWindowLabel = nextDrawRequestTimestamp > 0
    ? cadenceOpen
      ? "Open now"
      : new Date(nextDrawRequestTimestamp * 1000).toLocaleString()
    : "Loading on-chain policy…";
  const hasPrizeReserve = prizeReserveStatus === "fresh" || prizeReserveStatus === "stale";
  const hasTotalDraws = totalDrawsStatus === "fresh" || totalDrawsStatus === "stale";
  const prizeReserveLabel = hasPrizeReserve
    ? `${formatTokenAmount(prizeReserve, tokenDecimals)} ${tokenSymbol}${prizeReserveStatus === "stale" ? " (stale)" : ""}`
    : "—";
  const confirmedRoundsLabel = hasTotalDraws
    ? `${totalDraws} confirmed round${totalDraws === 1 ? "" : "s"}${totalDrawsStatus === "stale" ? " (last confirmed)" : ""}.`
    : totalDrawsStatus === "loading"
      ? "Loading confirmed rounds…"
      : "Confirmed rounds unavailable.";

  const handleSponsor = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const value = parseTokenAmount(sponsorAmount, tokenDecimals);
      if (value <= 0n) throw new Error("Enter a contribution greater than zero.");
      setSponsorError(null);
      await onFundReserve(value);
      setSponsorAmount("");
    } catch (error) {
      setSponsorError(error instanceof Error ? error.message : "Enter a valid contribution.");
    }
  };

  const handleDraw = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setValidationError(null);
      await onExecuteDraw();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Unable to request the draw.");
    }
  };

  return (
    <Card
      eyebrow="Keeper action"
      title="Run a confidential prize round"
      subtitle="A winning ticket is selected inside the encrypted domain."
      headerAction={<Badge variant="success">Permissionless</Badge>}
    >
      <div className="callout">
        <Dices size={18} aria-hidden="true" />
        <span>
          {confirmedRoundsLabel} Sepolia prizes are sponsor-funded, not protocol yield. Each draw verifies the current encrypted reserve through Zama KMS.
        </span>
      </div>
      <form className="form-stack" onSubmit={handleSponsor} style={{ marginTop: "1rem" }}>
        <label className="field" htmlFor="sponsor-reserve-input">
          <span className="field__label">
            <span>Sponsor prize reserve</span>
            <span>Encrypted cUSDC contribution</span>
          </span>
          <span className="input-shell">
            <input
              id="sponsor-reserve-input"
              inputMode="decimal"
              autoComplete="off"
              value={sponsorAmount}
              onChange={(event) => { setSponsorAmount(event.target.value); setSponsorError(null); }}
              disabled={!walletConnected || !writesEnabled || isLoading}
              placeholder="0.00"
            />
            <span>{tokenSymbol}</span>
          </span>
        </label>
        {sponsorError && <p role="alert" className="badge badge--error">{sponsorError}</p>}
        <WalletGateButton
          className="button--wide"
          type="submit"
          disabled={!walletConnected || !writesEnabled || !sponsorAmount}
          isLoading={isLoading}
          walletStatus={walletStatus}
          onWalletAction={onWalletAction}
          walletActionEnabled={walletActionEnabled}
          connectLabel="Connect wallet to fund reserve"
          switchNetworkLabel="Switch to Sepolia to fund reserve"
          lockedLabel="Reserve funding safety-locked"
        >
          <Gift size={17} /> Fund encrypted reserve
        </WalletGateButton>
      </form>
      <form className="form-stack" onSubmit={handleDraw} style={{ marginTop: "1rem" }}>
        <div className="callout">
          <Info size={17} aria-hidden="true" />
          <span>
            On-chain policy: {fixedPrizeLabel} every {drawIntervalDays || "—"} days. Next request: {nextWindowLabel}. Last verified reserve: {prizeReserveLabel}.
          </span>
        </div>
        {validationError && <p role="alert" className="badge badge--error">{validationError}</p>}
        {(!writesEnabled || !cadenceOpen) && (
          <div className="callout"><Info size={17} /><span>{!writesEnabled ? "Draw execution is locked by runtime verification, the safety switch, a pool pause, or an unsettled draw." : "The fixed-cadence draw window has not opened yet."}</span></div>
        )}
        <WalletGateButton
          className="button--wide"
          type="submit"
          disabled={!walletConnected || !writesEnabled || !cadenceOpen}
          isLoading={isLoading}
          walletStatus={walletStatus}
          onWalletAction={onWalletAction}
          walletActionEnabled={walletActionEnabled}
          connectLabel="Connect wallet to request draw"
          switchNetworkLabel="Switch to Sepolia to request draw"
          lockedLabel="Draws safety-locked"
        >
          <Sparkles size={17} /> {writesEnabled && cadenceOpen ? "Request encrypted draw" : "Draws safety-locked"}
        </WalletGateButton>
      </form>
    </Card>
  );
};
