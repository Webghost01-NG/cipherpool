import React, { useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { parseUnits } from "ethers";
import { Badge, Button, Card } from "../common/UIPrimitives.js";

export interface WithdrawalCardProps {
  onWithdraw: (amount: bigint) => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  writesEnabled: boolean;
}

export const WithdrawalCard: React.FC<WithdrawalCardProps> = ({
  onWithdraw,
  isLoading,
  walletConnected,
  tokenSymbol,
  tokenDecimals,
  writesEnabled,
}) => {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const value = parseUnits(amount, tokenDecimals);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      if (value >= 2n ** 64n) throw new Error("Amount exceeds the protocol limit.");
      setValidationError(null);
      await onWithdraw(value);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Enter a valid amount.");
    }
  };

  return (
    <Card
      eyebrow="Step 02"
      title="Withdraw confidentially"
      subtitle="The requested amount and transferred cUSDC remain encrypted throughout settlement."
      headerAction={<Badge variant="success">One transaction</Badge>}
    >
      <form className="form-stack" onSubmit={handleWithdraw}>
        <label className="field" htmlFor="withdrawal-amount-input">
          <span className="field__label"><span>Amount</span><span>Encrypted sufficiency check</span></span>
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
          <span>ERC-7984 transfers zero if your private balance is insufficient. Reveal your position afterward to verify the result.</span>
        </div>
        <Button className="button--wide" type="submit" disabled={!walletConnected || !writesEnabled || !amount} isLoading={isLoading}>
          <ArrowUpRight size={17} /> {!writesEnabled ? "Withdrawals safety-locked" : walletConnected ? "Withdraw privately" : "Connect wallet to withdraw"}
        </Button>
      </form>
    </Card>
  );
};
