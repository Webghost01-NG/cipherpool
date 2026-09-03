import React, { useState } from "react";
import { ArrowDown, ExternalLink, Info } from "lucide-react";
import { parseUnits } from "ethers";
import { Badge, Button, Card } from "../common/UIPrimitives.js";
import { formatTokenAmount } from "../../utils/format.js";

export interface DepositCardProps {
  onDeposit: (amount: bigint) => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  walletBalance: string;
  writesEnabled: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({
  onDeposit,
  isLoading,
  walletConnected,
  tokenSymbol,
  tokenDecimals,
  walletBalance,
  writesEnabled,
}) => {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const parseAmount = (): bigint | null => {
    try {
      const value = parseUnits(amount, tokenDecimals);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      if (value >= 2n ** 64n) throw new Error("Amount exceeds the protocol limit.");
      if (value > BigInt(walletBalance)) throw new Error("Amount exceeds your wallet balance.");
      setValidationError(null);
      return value;
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Enter a valid amount.");
      return null;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseAmount();
    if (value) await onDeposit(value);
  };

  const handleMax = () => {
    setAmount(formatTokenAmount(walletBalance, tokenDecimals, tokenDecimals));
    setValidationError(null);
  };

  return (
    <Card
      eyebrow="Step 01"
      title="Fund your private position"
      subtitle="The amount is encrypted in your browser before the contract receives it."
      headerAction={<Badge variant="success">Encrypted input</Badge>}
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="deposit-amount-input">
          <span className="field__label">
            <span>Amount</span>
            <span>
              Wallet: {walletConnected ? formatTokenAmount(walletBalance, tokenDecimals) : "—"} {tokenSymbol}
              {walletConnected && BigInt(walletBalance) > 0n && (
                <button className="button button--ghost" type="button" onClick={handleMax}>Max</button>
              )}
            </span>
          </span>
          <span className="input-shell">
            <input
              id="deposit-amount-input"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => { setAmount(event.target.value); setValidationError(null); }}
              disabled={isLoading || !walletConnected || !writesEnabled}
              placeholder="0.00"
              aria-describedby={validationError ? "deposit-error" : "deposit-help"}
            />
            <span>{tokenSymbol}</span>
          </span>
        </label>

        {validationError && <p id="deposit-error" role="alert" className="badge badge--error">{validationError}</p>}
        <div className="callout" id="deposit-help">
          <Info size={17} aria-hidden="true" />
          <span>One wallet approval may be required before the encrypted deposit transaction. Wait for both transactions to confirm.</span>
        </div>
        <Button className="button--wide" type="submit" disabled={!walletConnected || !writesEnabled || !amount} isLoading={isLoading}>
          <ArrowDown size={17} /> {!writesEnabled ? "Deposits paused for upgrade" : walletConnected ? "Encrypt and deposit" : "Connect wallet to deposit"}
        </Button>
        <a className="helper-link" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">
          Get Sepolia test USDC <ExternalLink size={12} />
        </a>
      </form>
    </Card>
  );
};
