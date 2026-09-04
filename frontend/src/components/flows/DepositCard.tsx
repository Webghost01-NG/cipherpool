import React, { useState } from "react";
import { ArrowDown, ExternalLink, Info } from "lucide-react";
import { Badge, Card } from "../common/UIPrimitives.js";
import { WalletGateButton } from "../wallet/WalletGateButton.js";
import type { WalletStatus } from "../../hooks/useWallet.js";
import { parseTokenAmount } from "../../utils/tokenAmount.js";

export interface DepositCardProps {
  onDeposit: (amount: bigint) => Promise<void>;
  isLoading: boolean;
  walletConnected: boolean;
  walletStatus: WalletStatus;
  onWalletAction: () => void;
  walletActionEnabled: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  writesEnabled: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({
  onDeposit,
  isLoading,
  walletConnected,
  walletStatus,
  onWalletAction,
  walletActionEnabled,
  tokenSymbol,
  tokenDecimals,
  writesEnabled,
}) => {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const parseAmount = (): bigint | null => {
    try {
      const value = parseTokenAmount(amount, tokenDecimals);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      if (value >= 2n ** 64n) throw new Error("Amount exceeds the protocol limit.");
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

  return (
    <Card
      eyebrow="Step 01"
      title="Fund your private position"
      subtitle="The amount transfers as cUSDC and remains encrypted in calldata, events, and pool accounting."
      headerAction={<Badge variant="success">Encrypted end-to-end</Badge>}
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="deposit-amount-input">
          <span className="field__label">
            <span>Amount</span>
            <span>
              Wallet balance is private
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
          <span>The amount is encrypted for the official cUSDC contract before your wallet submits one transfer-and-deposit transaction.</span>
        </div>
        <WalletGateButton
          className="button--wide"
          type="submit"
          disabled={!walletConnected || !writesEnabled || !amount}
          isLoading={isLoading}
          walletStatus={walletStatus}
          onWalletAction={onWalletAction}
          walletActionEnabled={walletActionEnabled}
          connectLabel="Connect wallet to deposit"
          switchNetworkLabel="Switch to Sepolia to deposit"
          lockedLabel="Deposits safety-locked"
        >
          <ArrowDown size={17} /> {!writesEnabled ? "Deposits safety-locked" : "Deposit"}
        </WalletGateButton>
        <a className="helper-link" href="https://app.zama.org/" target="_blank" rel="noreferrer">
          Shield test tokens to cUSDC <ExternalLink size={12} />
        </a>
      </form>
    </Card>
  );
};
