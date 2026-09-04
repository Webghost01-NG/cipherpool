import React from "react";
import { RefreshCw, Wallet } from "lucide-react";
import type { WalletStatus } from "../../hooks/useWallet.js";
import { Button, type ButtonProps } from "../common/UIPrimitives.js";

export interface WalletGateButtonProps extends ButtonProps {
  walletStatus: WalletStatus;
  onWalletAction: () => void;
  walletActionEnabled?: boolean;
  connectLabel: string;
  switchNetworkLabel: string;
  lockedLabel?: string;
}

export const WalletGateButton: React.FC<WalletGateButtonProps> = ({
  walletStatus,
  onWalletAction,
  walletActionEnabled = true,
  connectLabel,
  switchNetworkLabel,
  lockedLabel,
  children,
  disabled,
  isLoading,
  onClick,
  type,
  ...buttonProps
}) => {
  if (!walletActionEnabled) {
    return (
      <Button {...buttonProps} type="button" disabled>
        {lockedLabel ?? children}
      </Button>
    );
  }

  if (walletStatus === "disconnected" || walletStatus === "wrong_network") {
    const isWrongNetwork = walletStatus === "wrong_network";
    return (
      <Button
        {...buttonProps}
        type="button"
        aria-haspopup="dialog"
        onClick={onWalletAction}
      >
        {isWrongNetwork ? <RefreshCw size={17} /> : <Wallet size={17} />}
        {isWrongNetwork ? switchNetworkLabel : connectLabel}
      </Button>
    );
  }

  if (walletStatus === "connecting") {
    return (
      <Button {...buttonProps} type="button" disabled>
        <RefreshCw className="animate-spin" size={17} /> Waiting for wallet…
      </Button>
    );
  }

  return (
    <Button
      {...buttonProps}
      type={type}
      disabled={disabled}
      isLoading={isLoading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
