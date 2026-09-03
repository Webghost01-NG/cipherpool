import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Fingerprint,
  KeyRound,
  Layers3,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Layout } from "./components/layout/Layout.js";
import { Badge, Card, StatBox } from "./components/common/UIPrimitives.js";
import { BalanceRevealCard } from "./components/flows/BalanceRevealCard.js";
import { DepositCard } from "./components/flows/DepositCard.js";
import { WithdrawalCard } from "./components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "./components/flows/LotteryDrawCard.js";
import { TxStatusModal } from "./components/common/TxStatusModal.js";
import { useWallet } from "./hooks/useWallet.js";
import { usePool, TransactionCallbacks } from "./hooks/usePool.js";
import { useTxLifecycle } from "./hooks/useTxLifecycle.js";
import { configurationErrors, DEFAULT_POOL_ADDRESS, runtimeConfig } from "./contracts/config.js";
import { formatTokenAmount } from "./utils/format.js";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pool");
  const { address, status } = useWallet();
  const {
    poolStats,
    asset,
    isBalanceRevealed,
    revealedBalance,
    pendingWithdrawal,
    cancellationDelaySeconds,
    isLoading,
    backendStatus,
    dataError,
    lastUpdatedAt,
    isOwner,
    deposit,
    requestWithdrawal,
    finalizeWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
  } = usePool(DEFAULT_POOL_ADDRESS);
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

  const walletReady = status === "connected" && Boolean(address) && asset.isLoaded && configurationErrors.length === 0;
  const transactionCallbacks: TransactionCallbacks = {
    onBroadcast: (hash) => {
      setBroadcasting(hash);
      setMining();
    },
  };

  const runAction = async (
    title: string,
    action: () => Promise<{ txHash: string }>,
    successMessage: string
  ) => {
    try {
      startTx(title);
      await action();
      setConfirmed(successMessage);
    } catch (error) {
      setFailed(error instanceof Error ? error : String(error));
    }
  };

  const totalDeposits = formatTokenAmount(poolStats.totalDeposits, asset.decimals);
  const availableYield = formatTokenAmount(poolStats.availableYield, asset.decimals);

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      contractAddress={DEFAULT_POOL_ADDRESS || undefined}
    >
      <TxStatusModal state={txState} onClose={reset} />

      <section className="hero">
        <div className="container hero__grid">
          <div>
            <p className="eyebrow">Encrypted savings • verifiable outcomes</p>
            <h1>Save in public. Compete in <em>private.</em></h1>
          </div>
          <div className="hero__aside">
            <p>
              CipherPool turns testnet USDC deposits into confidential prize entries.
              Balances and ticket weight stay encrypted while the protocol proves every state transition on-chain.
            </p>
            <div className="hero__proof">
              <span className="proof-chip"><ShieldCheck size={15} /> Encrypted principal</span>
              <span className="proof-chip"><Fingerprint size={15} /> Private odds</span>
              <span className="proof-chip"><KeyRound size={15} /> User-authorized reveal</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {configurationErrors.length > 0 && (
          <div className="callout" role="alert" style={{ marginBottom: "1rem" }}>
            <AlertTriangle size={18} />
            <span>
              This build is missing required deployment configuration: {configurationErrors.join(" ")}
              Transactions are disabled until the environment is corrected.
            </span>
          </div>
        )}

        {!runtimeConfig.protocolWritesEnabled && (
          <div className="callout" role="alert" style={{ marginBottom: "1rem" }}>
            <ShieldCheck size={18} />
            <span>
              Safety mode is active. New deposits, withdrawal requests, and draws are paused pending the documented contract accounting upgrade. Existing withdrawal finalization and cancellation remain available.
            </span>
          </div>
        )}

        <div className="status-ribbon" aria-live="polite">
          <div className="status-ribbon__group">
            <span className="status-item">
              <span className={"status-dot " + (backendStatus === "online" ? "status-dot--ok" : "status-dot--warn")} />
              Indexer {backendStatus}
            </span>
            <span className="status-item">
              <span className={"status-dot " + (!poolStats.isPaused ? "status-dot--ok" : "status-dot--warn")} />
              Pool contract {poolStats.isPaused ? "paused" : "unpaused"}
            </span>
            <span className="status-item"><LockKeyhole size={14} /> Ethereum Sepolia</span>
          </div>
          <span>
            {lastUpdatedAt ? "Live state checked " + new Date(lastUpdatedAt).toLocaleTimeString() : "Checking live state…"}
          </span>
        </div>

        {dataError && (
          <div className="callout" role="status" style={{ marginTop: "1rem" }}>
            <Activity size={17} /><span>{dataError}</span>
          </div>
        )}

        <section className="metrics-grid" aria-label="Live pool metrics">
          <StatBox label="Accounted balances" value={totalDeposits + " " + asset.symbol} subtext="Principal plus awarded prizes" />
          <StatBox label="Available yield" value={availableYield + " " + asset.symbol} subtext="After principal and reserved prizes" />
          <StatBox label="Private savers" value={poolStats.participantCount} subtext="Registered on-chain participants" />
          <StatBox
            label="Confirmed rounds"
            value={poolStats.totalDraws}
            subtext="Draw IDs recorded on Sepolia"
            badge={<Badge variant="info">Live</Badge>}
          />
        </section>

        {activeTab === "pool" && (
          <section className="workspace" aria-label="Savings actions">
            <div className="stack">
              <BalanceRevealCard
                isRevealed={isBalanceRevealed}
                revealedAmount={revealedBalance}
                onReveal={revealBalance}
                onHide={hideBalance}
                isLoading={isLoading}
                walletConnected={walletReady}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
              />
              <DepositCard
                onDeposit={(amount) =>
                  runAction(
                    "Encrypted deposit",
                    () => deposit(amount, transactionCallbacks),
                    "Deposit confirmed on Ethereum Sepolia."
                  )
                }
                isLoading={isLoading}
                walletConnected={walletReady && !poolStats.isPaused}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                walletBalance={asset.walletBalance}
                writesEnabled={runtimeConfig.protocolWritesEnabled}
              />
            </div>
            <div className="stack">
              <WithdrawalCard
                pendingWithdrawal={pendingWithdrawal}
                onRequestWithdrawal={(amount) =>
                  runAction(
                    "Private withdrawal request",
                    async () => {
                      const result = await requestWithdrawal(amount, transactionCallbacks);
                      setWaitingKms(result.requestHash || result.txHash);
                      return result;
                    },
                    "Request confirmed. Generate the threshold proof to finalize settlement."
                  )
                }
                onFinalizeWithdrawal={() =>
                  runAction(
                    "Finalize withdrawal",
                    () => finalizeWithdrawal(transactionCallbacks),
                    "KMS proof verified and withdrawal finalized on-chain."
                  )
                }
                onCancelWithdrawal={() =>
                  runAction(
                    "Cancel stale withdrawal",
                    () => cancelWithdrawal(transactionCallbacks),
                    "Stale withdrawal request cancelled on-chain."
                  )
                }
                isLoading={isLoading}
                walletConnected={walletReady && !poolStats.isPaused}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                cancellationDelaySeconds={cancellationDelaySeconds}
                writesEnabled={runtimeConfig.protocolWritesEnabled}
              />
              <Card
                eyebrow="Why it matters"
                title="No public balance leaderboard"
                subtitle="Observers can verify custody and activity without learning individual ticket weight."
              >
                <div className="callout">
                  <Layers3 size={18} />
                  <span>Encrypted accounting prevents whale tracking and makes mempool-based odds exploitation materially harder.</span>
                </div>
              </Card>
            </div>
          </section>
        )}

        {activeTab === "draw" && (
          <section className="workspace" aria-label="Prize round">
            <LotteryDrawCard
              availableYield={poolStats.availableYield}
              totalDraws={poolStats.totalDraws}
              onExecuteDraw={(amount) =>
                runAction(
                  "Confidential prize draw",
                  () => drawLottery(amount, transactionCallbacks),
                  "Prize round confirmed on Ethereum Sepolia."
                )
              }
              isLoading={isLoading}
              isOwner={isOwner && !poolStats.isPaused}
              tokenSymbol={asset.symbol}
              tokenDecimals={asset.decimals}
              writesEnabled={runtimeConfig.protocolWritesEnabled}
            />
            <Card className="panel--ink" eyebrow="Draw invariant" title="The winner is never exposed">
              <div className="balance-display">
                <strong className="balance-display__value">{poolStats.totalDraws}</strong>
                <p className="balance-display__hint">
                  Encrypted rounds completed. Winner selection uses bounded fhEVM randomness against encrypted cumulative balances.
                </p>
              </div>
            </Card>
          </section>
        )}

        {activeTab === "docs" && (
          <section className="security-grid" aria-label="Protocol guarantees">
            <article className="panel security-card">
              <span className="security-card__number">01 / INPUT</span>
              <h3>Encrypted before submission</h3>
              <p>The Zama relayer creates a contract- and user-bound proof. Plaintext never becomes transaction calldata.</p>
            </article>
            <article className="panel security-card">
              <span className="security-card__number">02 / STORAGE</span>
              <h3>Proof handles stay anchored</h3>
              <p>Withdrawal verification reads the ciphertext handle from contract storage, preventing calldata substitution.</p>
            </article>
            <article className="panel security-card">
              <span className="security-card__number">03 / EXIT</span>
              <h3>Stale requests remain recoverable</h3>
              <p>After the configured delay, the requesting wallet can cancel an unsettled withdrawal without relayer permission.</p>
            </article>
          </section>
        )}
      </div>
    </Layout>
  );
};
