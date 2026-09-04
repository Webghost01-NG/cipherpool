import React, { useState } from "react";
import { Dices, Info, Sparkles } from "lucide-react";
import { parseUnits } from "ethers";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import { formatTokenAmount } from "../../utils/format.js";

export interface LotteryDrawCardProps {
  availableYield: string;
  totalDraws: number;
  availableYieldStatus: "loading" | "fresh" | "stale" | "unavailable";
  totalDrawsStatus: "loading" | "fresh" | "stale" | "unavailable";
  onExecuteDraw: (prize: bigint) => Promise<void>;
  isLoading: boolean;
  isOwner: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  writesEnabled: boolean;
}

export const LotteryDrawCard: React.FC<LotteryDrawCardProps> = ({
  availableYield,
  totalDraws,
  availableYieldStatus,
  totalDrawsStatus,
  onExecuteDraw,
  isLoading,
  isOwner,
  tokenSymbol,
  tokenDecimals,
  writesEnabled,
}) => {
  const [drawPrize, setDrawPrize] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasAvailableYield = availableYieldStatus === "fresh" || availableYieldStatus === "stale";
  const hasTotalDraws = totalDrawsStatus === "fresh" || totalDrawsStatus === "stale";
  const availableYieldLabel = hasAvailableYield
    ? `${formatTokenAmount(availableYield, tokenDecimals)} ${tokenSymbol}${availableYieldStatus === "stale" ? " (stale)" : ""}`
    : "—";
  const confirmedRoundsLabel = hasTotalDraws
    ? `${totalDraws} confirmed round${totalDraws === 1 ? "" : "s"}${totalDrawsStatus === "stale" ? " (last confirmed)" : ""}.`
    : totalDrawsStatus === "loading"
      ? "Loading confirmed rounds…"
      : "Confirmed rounds unavailable.";

  const handleDraw = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const value = parseUnits(drawPrize, tokenDecimals);
      if (value <= 0n) throw new Error("Enter a prize greater than zero.");
      setValidationError(null);
      await onExecuteDraw(value);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Enter a valid prize.");
    }
  };

  return (
    <Card
      eyebrow="Keeper action"
      title="Run a confidential prize round"
      subtitle="A winning ticket is selected inside the encrypted domain."
      headerAction={<Badge variant={isOwner ? "success" : "neutral"}>{isOwner ? "Owner enabled" : "Read only"}</Badge>}
    >
      <div className="callout">
        <Dices size={18} aria-hidden="true" />
        <span>
          {confirmedRoundsLabel} The displayed reserve is the last verified snapshot; each new draw verifies the current encrypted reserve through Zama KMS.
        </span>
      </div>
      <form className="form-stack" onSubmit={handleDraw} style={{ marginTop: "1rem" }}>
        <label className="field" htmlFor="draw-prize-input">
          <span className="field__label">
            <span>Prize amount</span>
            <span>Available: {availableYieldLabel}</span>
          </span>
          <span className="input-shell">
            <input
              id="draw-prize-input"
              inputMode="decimal"
              autoComplete="off"
              value={drawPrize}
              onChange={(event) => { setDrawPrize(event.target.value); setValidationError(null); }}
              disabled={!isOwner || !writesEnabled || isLoading}
              placeholder="0.00"
            />
            <span>{tokenSymbol}</span>
          </span>
        </label>
        {validationError && <p role="alert" className="badge badge--error">{validationError}</p>}
        {(!isOwner || !writesEnabled) && (
          <div className="callout"><Info size={17} /><span>{!writesEnabled ? "Draw execution is locked until deployment verification and the operational safety switch both pass." : "Only the verified pool owner can execute a draw. Connected savers can monitor confirmed rounds here."}</span></div>
        )}
        <Button className="button--wide" type="submit" disabled={!isOwner || !writesEnabled || !drawPrize} isLoading={isLoading}>
          <Sparkles size={17} /> {writesEnabled ? "Execute encrypted draw" : "Draws safety-locked"}
        </Button>
      </form>
    </Card>
  );
};
