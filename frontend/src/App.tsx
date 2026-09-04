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
import { LegacyExitCard } from "./components/flows/LegacyExitCard.js";
import { TxStatusModal } from "./components/common/TxStatusModal.js";
import { useWallet } from "./hooks/useWallet.js";
import { usePool, TransactionCallbacks } from "./hooks/usePool.js";
import { useLegacyExit } from "./hooks/useLegacyExit.js";
import { useTxLifecycle } from "./hooks/useTxLifecycle.js";
import {
  configurationErrors,
  DEFAULT_LEGACY_POOL_ADDRESS,
  DEFAULT_POOL_ADDRESS,
  runtimeConfig,
} from "./contracts/config.js";
import { formatTokenAmount } from "./utils/format.js";

interface PrivateRevealFeedback {
  start: (title: string, details?: string) => void;
  confirm: (details?: string) => void;
  fail: (error: Error | string) => void;
}

export async function revealBalanceWithFeedback(
  revealBalance: () => Promise<void>,
  feedback: PrivateRevealFeedback
): Promise<void> {
  feedback.start(
    "Private balance reveal",
    "Approve the private decryption request in your wallet. This signature does not broadcast a transaction."
  );
  try {
    await revealBalance();
    feedback.confirm("Balance decrypted locally. No blockchain transaction was submitted.");
  } catch (error) {
    feedback.fail(error instanceof Error ? error : String(error));
  }
}

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
    metricFreshness,
    deploymentVerification,
    writesEnabled,
    isOwner,
    deposit,
    requestWithdrawal,
    finalizeWithdrawal,
    cancelWithdrawal,
    revealBalance,
    hideBalance,
    drawLottery,
  } = usePool(DEFAULT_POOL_ADDRESS);
  const legacyExit = useLegacyExit(DEFAULT_LEGACY_POOL_ADDRESS);
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
  const poolStateStatus = metricFreshness.availableYield;
  const poolStatusLabel = poolStateStatus === "loading"
    ? "Pool checking"
    : poolStateStatus === "unavailable"
      ? "Pool unavailable"
      : `Pool ${poolStats.isPaused ? "paused" : "unpaused"}${poolStateStatus === "stale" ? " (stale)" : ""}`;
  const hasDrawCount = metricFreshness.totalDraws === "fresh" || metricFreshness.totalDraws === "stale";
  const runBalanceReveal = () => revealBalanceWithFeedback(revealBalance, {
    start: startTx,
    confirm: setConfirmed,
    fail: setFailed,
  });

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <TxStatusModal state={txState} onClose={reset} />

      <div className="container dashboard-shell">
        <section className="console-intro" aria-labelledby="console-title">
          <div className="console-intro__copy">
            <p className="eyebrow"><span className="signal-pulse" aria-hidden="true" /> Confidential savings console</p>
            <h1 id="console-title">Your position stays <em>private.</em></h1>
            <p className="console-intro__description">
              Deposit testnet USDC, enter verifiable prize rounds, and withdraw through threshold decryption—without publishing your balance or ticket weight.
            </p>
            <div className="console-intro__proofs" aria-label="Privacy guarantees">
              <span><ShieldCheck size={15} /> Encrypted accounting</span>
              <span><Fingerprint size={15} /> Wallet-bound access</span>
              <span><KeyRound size={15} /> Verifiable exits</span>
            </div>
          </div>

          <aside className="assurance-card" aria-label="Live protocol assurance">
            <div className="assurance-card__header">
              <div>
                <p className="eyebrow">Runtime assurance</p>
                <h2>Protocol state</h2>
              </div>
              <Badge variant={deploymentVerification.status === "verified" ? "success" : "warning"}>
                {deploymentVerification.status}
              </Badge>
            </div>
            <dl className="assurance-list">
              <div>
                <dt>Network</dt>
                <dd><LockKeyhole size={13} /> Ethereum Sepolia</dd>
              </div>
              <div>
                <dt>Indexer</dt>
                <dd><span className={"status-dot " + (backendStatus === "online" ? "status-dot--ok" : "status-dot--warn")} /> {backendStatus}</dd>
              </div>
              <div>
                <dt>Transactions</dt>
                <dd><span className={"status-dot " + (writesEnabled ? "status-dot--ok" : "status-dot--warn")} /> {writesEnabled ? "enabled" : "safety-locked"}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <div className="alert-stack">
          {configurationErrors.length > 0 && (
            <div className="callout callout--alert" role="alert">
              <AlertTriangle size={18} />
              <span>
                This build is missing required deployment configuration: {configurationErrors.join(" ")}
                Transactions are disabled until the environment is corrected.
              </span>
            </div>
          )}

          {!runtimeConfig.protocolWritesEnabled && (
            <div className="callout callout--alert" role="alert">
              <ShieldCheck size={18} />
              <span>
                The operational safety switch is off. New deposits, withdrawal requests, and draws are disabled; active and archived withdrawal exits remain available.
              </span>
            </div>
          )}

          {runtimeConfig.protocolWritesEnabled && deploymentVerification.status !== "verified" && (
            <div className="callout callout--alert" role="alert">
              <AlertTriangle size={18} />
              <span>Writes remain locked until runtime verification succeeds. {deploymentVerification.message}</span>
            </div>
          )}

          {dataError && (
            <div className="callout callout--alert" role="status">
              <Activity size={17} /><span>{dataError}</span>
            </div>
          )}
        </div>

        <section className="protocol-frame" aria-label="Live pool overview">
          <div className="status-ribbon" aria-live="polite">
            <div className="status-ribbon__group">
              <span className="status-item">
                <span className={"status-dot " + (backendStatus === "online" ? "status-dot--ok" : "status-dot--warn")} />
                Indexer {backendStatus}
              </span>
              <span className="status-item">
                <span className={"status-dot " + (poolStateStatus === "fresh" && !poolStats.isPaused ? "status-dot--ok" : "status-dot--warn")} />
                {poolStatusLabel}
              </span>
              <span className="status-item"><LockKeyhole size={13} /> Ethereum Sepolia</span>
              <span className="status-item">
                <span className={"status-dot " + (deploymentVerification.status === "verified" ? "status-dot--ok" : "status-dot--warn")} />
                Deployment {deploymentVerification.status}
              </span>
            </div>
            <span className="status-ribbon__time">
              {lastUpdatedAt ? "Checked " + new Date(lastUpdatedAt).toLocaleTimeString() : "Checking live state…"}
            </span>
          </div>

          <div className="metrics-grid" aria-label="Live pool metrics">
            <StatBox label="Accounted balances" value={totalDeposits + " " + asset.symbol} subtext="Principal + awarded prizes" status={metricFreshness.totalDeposits} />
            <StatBox label="Available yield" value={availableYield + " " + asset.symbol} subtext="After reserved liabilities" status={metricFreshness.availableYield} />
            <StatBox label="Private savers" value={poolStats.participantCount} subtext="On-chain participants" status={metricFreshness.participantCount} />
            <StatBox
              label="Confirmed rounds"
              value={poolStats.totalDraws}
              subtext="Recorded on Sepolia"
              badge={<Badge variant="info">Live</Badge>}
              status={metricFreshness.totalDraws}
            />
          </div>
        </section>

        {activeTab === "pool" && (
          <div className="tab-stage">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Private operations</p>
                <h2>Manage your savings</h2>
              </div>
              <p>Balances reveal only after wallet authorization. Deposits and settlement remain independently verifiable on-chain.</p>
            </div>
            <section className="operations-grid" aria-label="Savings actions">
              <BalanceRevealCard
                isRevealed={isBalanceRevealed}
                revealedAmount={revealedBalance}
                onReveal={runBalanceReveal}
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
                writesEnabled={writesEnabled}
              />
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
                writesEnabled={writesEnabled}
              />
            </section>
            <aside className="privacy-note">
              <span className="privacy-note__icon"><Layers3 size={18} /></span>
              <div>
                <strong>No public balance leaderboard</strong>
                <p>Observers can verify custody and activity without learning individual ticket weight, reducing whale tracking and odds exploitation.</p>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "pool" && DEFAULT_LEGACY_POOL_ADDRESS && (
          <section className="legacy-stage" aria-label="Archived pool exit actions">
            <LegacyExitCard
              legacyPoolAddress={DEFAULT_LEGACY_POOL_ADDRESS}
              explorerUrl={runtimeConfig.explorerUrl}
              pendingWithdrawal={legacyExit.pendingWithdrawal}
              cancellationDelaySeconds={legacyExit.cancellationDelaySeconds}
              walletConnected={status === "connected"}
              isLoading={legacyExit.isLoading}
              isChecking={legacyExit.isChecking}
              error={legacyExit.error}
              tokenSymbol={runtimeConfig.tokenSymbol}
              tokenDecimals={Math.max(runtimeConfig.tokenDecimals, 0)}
              onFinalizeWithdrawal={() =>
                runAction(
                  "Finalize archived withdrawal",
                  () => legacyExit.finalizeWithdrawal(transactionCallbacks),
                  "Archived withdrawal finalized on Ethereum Sepolia."
                )
              }
              onCancelWithdrawal={() =>
                runAction(
                  "Cancel archived withdrawal",
                  () => legacyExit.cancelWithdrawal(transactionCallbacks),
                  "Archived withdrawal request cancelled on Ethereum Sepolia."
                )
              }
            />
          </section>
        )}

        {activeTab === "draw" && (
          <div className="tab-stage">
            <div className="section-heading">
              <div><p className="eyebrow">Prize operations</p><h2>Confidential rounds</h2></div>
              <p>Only the pool owner can execute a draw. Prize capacity is read directly from reserved on-chain yield.</p>
            </div>
            <section className="workspace" aria-label="Prize round">
              <LotteryDrawCard
                availableYield={poolStats.availableYield}
                totalDraws={poolStats.totalDraws}
                availableYieldStatus={metricFreshness.availableYield}
                totalDrawsStatus={metricFreshness.totalDraws}
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
                writesEnabled={writesEnabled}
              />
              <Card className="panel--ink" eyebrow="Draw invariant" title="The winner is never exposed">
                <div className="balance-display">
                  <strong
                    className="balance-display__value"
                    aria-label={hasDrawCount
                      ? undefined
                      : metricFreshness.totalDraws === "loading"
                        ? "Confirmed rounds loading"
                        : "Confirmed rounds unavailable"}
                  >
                    {hasDrawCount ? poolStats.totalDraws : "—"}
                  </strong>
                  <p className="balance-display__hint">
                    {metricFreshness.totalDraws === "stale" && "Last confirmed value. "}
                    {hasDrawCount
                      ? "Encrypted rounds completed. Winner selection uses bounded fhEVM randomness against encrypted cumulative balances."
                      : "Confirmed round data will appear after a verified source responds."}
                  </p>
                </div>
              </Card>
            </section>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="tab-stage">
            <div className="section-heading">
              <div><p className="eyebrow">Security model</p><h2>Privacy you can inspect</h2></div>
              <p>These guarantees describe the deployed interaction model; source specifications remain available for independent review.</p>
            </div>
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
          </div>
        )}
      </div>
    </Layout>
  );
};
