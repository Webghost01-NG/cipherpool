import React, { useState } from "react";
import { Layout } from "./components/layout/Layout.js";
import { Card, Badge, Button, StatBox } from "./components/common/UIPrimitives.js";
import { BalanceRevealCard } from "./components/flows/BalanceRevealCard.js";
import { DepositCard } from "./components/flows/DepositCard.js";
import { WithdrawalCard } from "./components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "./components/flows/LotteryDrawCard.js";
import { TxStatusModal } from "./components/common/TxStatusModal.js";
import { useWallet } from "./hooks/useWallet.js";
import { usePool } from "./hooks/usePool.js";
import { useTxLifecycle } from "./hooks/useTxLifecycle.js";
import { ShieldCheck, Info, CheckCircle2 } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pool");
  const { address, status } = useWallet();
  const isWalletConnected = status === "connected" && !!address;

  const {
    poolStats,
    isBalanceRevealed,
    revealedBalance,
    pendingWithdrawal,
    isLoading,
    deposit,
    requestWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
  } = usePool();

  const {
    txState,
    startTx,
    setBroadcasting,
    setMining,
    setWaitingKms,
    setConfirmed,
    setFailed,
    reset,
  } = useTxLifecycle();

  const handleDeposit = async (amount: bigint) => {
    try {
      startTx("Confidential Deposit");
      await new Promise((r) => setTimeout(r, 400));
      const simulatedTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setBroadcasting(simulatedTx);
      await new Promise((r) => setTimeout(r, 600));
      setMining();
      await deposit(amount);
      setConfirmed(`Successfully encrypted and deposited ${Number(amount).toLocaleString()} USDC!`);
    } catch (err: unknown) {
      setFailed(err instanceof Error ? err : String(err));
    }
  };

  const handleRequestWithdrawal = async (amount: bigint) => {
    try {
      startTx("Request 2-Step Withdrawal");
      await new Promise((r) => setTimeout(r, 400));
      const simulatedTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setBroadcasting(simulatedTx);
      await new Promise((r) => setTimeout(r, 600));
      setMining();
      await requestWithdrawal(amount);
      setWaitingKms(simulatedTx);
      await new Promise((r) => setTimeout(r, 1200));
      setConfirmed(`Withdrawal of ${Number(amount).toLocaleString()} USDC anchored in storage and queued for KMS settlement.`);
    } catch (err: unknown) {
      setFailed(err instanceof Error ? err : String(err));
    }
  };

  const handleCancelWithdrawal = async () => {
    try {
      startTx("Cancel Withdrawal (Escape Valve)");
      await new Promise((r) => setTimeout(r, 500));
      await cancelWithdrawal();
      setConfirmed("Withdrawal request cleared. Encrypted principal restored to active balance.");
    } catch (err: unknown) {
      setFailed(err instanceof Error ? err : String(err));
    }
  };

  const handleDrawLottery = async (prizeAmount: bigint) => {
    try {
      startTx("Confidential Round Draw");
      await new Promise((r) => setTimeout(r, 400));
      setMining();
      await drawLottery(prizeAmount);
      setConfirmed("Confidential draw executed! Winning index derived homomorphically via FHE.randEuint64.");
    } catch (err: unknown) {
      setFailed(err instanceof Error ? err : String(err));
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <TxStatusModal state={txState} onClose={reset} />

      {/* Hero Section */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <div style={{ maxWidth: "840px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <Badge variant="success">Fully Homomorphic Encryption</Badge>
            <Badge variant="info">Zero-Loss Savings</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: "var(--space-md)",
            }}
          >
            Confidential Prize Savings on <span style={{ color: "var(--accent-cyan)" }}>Zama fhEVM</span>
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "var(--space-lg)",
            }}
          >
            Deposit custody assets to earn yield while entering confidential lottery draws.
            Your deposit balance, ticket distribution, and lottery selections remain <strong>100% encrypted on-chain</strong> at all times.
          </p>
        </div>
      </section>

      {/* Metrics Row */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-md)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <StatBox
          label="TOTAL ENCRYPTED PRINCIPAL"
          value={`${Number(poolStats.totalDeposits).toLocaleString()} USDC`}
          subtext="100% Capital Preserved"
          badge={<Badge variant="info">Encrypted</Badge>}
        />
        <StatBox
          label="ESTIMATED PRIZE POOL"
          value={`${Number(poolStats.prizePool).toLocaleString()} USDC`}
          subtext="Harvested Strategy Yield"
          badge={<Badge variant="success">Active</Badge>}
        />
        <StatBox
          label="DRAWS COMPLETED"
          value={`${poolStats.totalDraws} Rounds`}
          subtext="Homomorphic Modulo Derivation"
          badge={<Badge variant="neutral">Verified</Badge>}
        />
        <StatBox
          label="KMS RELAYER STATUS"
          value="Online (15s)"
          subtext="Threshold EIP-712 Signers"
          badge={<Badge variant="success">Operational</Badge>}
        />
      </section>

      {/* Interactive Flow Views */}
      {activeTab === "pool" && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "var(--space-lg)",
            marginBottom: "var(--space-2xl)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <BalanceRevealCard
              isRevealed={isBalanceRevealed}
              revealedAmount={revealedBalance}
              onReveal={revealBalance}
              onHide={hideBalance}
              isLoading={isLoading}
            />
            <DepositCard
              onDeposit={handleDeposit}
              isLoading={isLoading}
              walletConnected={isWalletConnected}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <WithdrawalCard
              pendingWithdrawal={pendingWithdrawal}
              onRequestWithdrawal={handleRequestWithdrawal}
              onCancelWithdrawal={handleCancelWithdrawal}
              isLoading={isLoading}
              walletConnected={isWalletConnected}
            />
            <LotteryDrawCard
              prizePool={poolStats.prizePool}
              totalDraws={poolStats.totalDraws}
              onExecuteDraw={handleDrawLottery}
              isLoading={isLoading}
            />
          </div>
        </section>
      )}

      {activeTab === "draw" && (
        <section style={{ maxWidth: "680px", margin: "0 auto", marginBottom: "var(--space-2xl)" }}>
          <LotteryDrawCard
            prizePool={poolStats.prizePool}
            totalDraws={poolStats.totalDraws}
            onExecuteDraw={handleDrawLottery}
            isLoading={isLoading}
          />
        </section>
      )}

      {activeTab === "docs" && (
        <section style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "var(--space-2xl)" }}>
          <Card title="Cryptographic Assurance & Security Specifications">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              <p>
                CipherPool eliminates MEV exploitation and ticket stalking by retaining lottery tickets and user deposits entirely inside the ciphertext domain (<code>euint64</code>) using Zama fhEVM.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a
                  href="https://github.com/Webghost01-NG/fhevm-pooltogether-security/blob/main/docs/security/replay-boundaries.md"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="secondary">
                    <ShieldCheck size={16} color="var(--accent-cyan)" /> EIP-712 Replay Boundaries
                  </Button>
                </a>
                <a
                  href="https://github.com/Webghost01-NG/fhevm-pooltogether-security/blob/main/docs/security/stale-handles.md"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="secondary">
                    <ShieldCheck size={16} color="var(--accent-amber)" /> Stale Handles & Race Proofs
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </section>
      )}
    </Layout>
  );
};
