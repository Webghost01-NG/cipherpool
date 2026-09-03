import React, { useState } from "react";
import { Layout } from "./components/layout/Layout.js";
import { Card, Badge, Button, StatBox } from "./components/common/UIPrimitives.js";
import { BalanceRevealCard } from "./components/flows/BalanceRevealCard.js";
import { DepositCard } from "./components/flows/DepositCard.js";
import { WithdrawalCard } from "./components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "./components/flows/LotteryDrawCard.js";
import { useWallet } from "./hooks/useWallet.js";
import { usePool } from "./hooks/usePool.js";
import { ShieldCheck, Info, CheckCircle2, ArrowRight } from "lucide-react";

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
    txMessage,
    deposit,
    requestWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
  } = usePool();

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Toast Notification for Transaction Lifecycle */}
      {txMessage && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--accent-cyan)",
            borderRadius: "10px",
            padding: "14px 20px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "420px",
          }}
        >
          <CheckCircle2 size={20} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{txMessage}</div>
        </div>
      )}

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
              onDeposit={deposit}
              isLoading={isLoading}
              walletConnected={isWalletConnected}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <WithdrawalCard
              pendingWithdrawal={pendingWithdrawal}
              onRequestWithdrawal={requestWithdrawal}
              onCancelWithdrawal={cancelWithdrawal}
              isLoading={isLoading}
              walletConnected={isWalletConnected}
            />
            <LotteryDrawCard
              prizePool={poolStats.prizePool}
              totalDraws={poolStats.totalDraws}
              onExecuteDraw={drawLottery}
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
            onExecuteDraw={drawLottery}
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
