import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Fingerprint,
  KeyRound,
  Layers3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Layout } from "./components/layout/Layout.js";
import { Badge, Card, StatBox } from "./components/common/UIPrimitives.js";
import { BalanceRevealCard } from "./components/flows/BalanceRevealCard.js";
import { DepositCard } from "./components/flows/DepositCard.js";
import { WithdrawalCard } from "./components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "./components/flows/LotteryDrawCard.js";
import { PrizeClaimCard } from "./components/flows/PrizeClaimCard.js";
import { LegacyExitCard } from "./components/flows/LegacyExitCard.js";
import { TxStatusModal } from "./components/common/TxStatusModal.js";
import { WalletModal } from "./components/wallet/WalletModal.js";
import { useWallet } from "./hooks/useWallet.js";
import { usePool, TransactionCallbacks } from "./hooks/usePool.js";
import { useLegacyExit } from "./hooks/useLegacyExit.js";
import { useTxLifecycle, type TxTarget } from "./hooks/useTxLifecycle.js";
import {
  configurationErrors,
  DEFAULT_LEGACY_POOL_ADDRESS,
  DEFAULT_POOL_ADDRESS,
  runtimeConfig,
} from "./contracts/config.js";
import { formatTokenAmount } from "./utils/format.js";
import { getNetworkStatus } from "./utils/networkStatus.js";
import { getPoolStatus } from "./utils/poolStatus.js";

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

export async function revealPrizeWithFeedback(
  revealPrize: () => Promise<void>,
  feedback: PrivateRevealFeedback
): Promise<void> {
  feedback.start(
    "Private prize reveal",
    "Approve the private decryption request in your wallet. This signature does not broadcast a transaction."
  );
  try {
    await revealPrize();
    feedback.confirm("Prize checked locally. No blockchain transaction was submitted.");
  } catch (error) {
    feedback.fail(error instanceof Error ? error : String(error));
  }
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pool");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { address, status } = useWallet();
  const {
    poolStats,
    asset,
    isBalanceRevealed,
    revealedBalance,
    isPrizeRevealed,
    revealedPrize,
    isLoading,
    backendStatus,
    dataError,
    lastUpdatedAt,
    metricFreshness,
    activeRuntimeVersion,
    deploymentVerification,
    walletRpcVerification,
    writesEnabled,
    withdrawalsEnabled,
    deposit,
    activateParticipant,
    withdraw,
    deactivateParticipant,
    fundPrizeReserve,
    revealBalance,
    hideBalance,
    revealPrize,
    hidePrize,
    claimPrize,
    drawLottery,
    refreshPoolData,
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
  const walletConfigurationReady = configurationErrors.length === 0;
  const walletWriteActionEnabled =
    walletConfigurationReady &&
    runtimeConfig.protocolWritesEnabled &&
    !poolStats.isPaused &&
    !poolStats.pendingDraw.active;
  const transactionCallbacks: TransactionCallbacks = {
    onBroadcast: (hash) => {
      setBroadcasting(hash);
      setMining();
    },
    onProofRequested: (requestHash) => setWaitingKms(requestHash),
  };

  const runAction = async (
    title: string,
    action: () => Promise<{ txHash: string; successMessage?: string }>,
    successMessage: string,
    expectedTarget: TxTarget
  ) => {
    try {
      startTx(
        title,
        "Review the exact contract target below, then approve the request in your wallet.",
        expectedTarget
      );
      const result = await action();
      setConfirmed(result.successMessage ?? successMessage);
    } catch (error) {
      setFailed(error instanceof Error ? error : String(error));
    }
  };

  const totalDeposits = formatTokenAmount(poolStats.totalDeposits, asset.decimals);
  const prizeReserve = formatTokenAmount(poolStats.prizeReserve, asset.decimals);
  const networkStatus = getNetworkStatus(status);
  const poolStatus = getPoolStatus(
    deploymentVerification.status,
    poolStats.isPaused,
    poolStats.pendingDraw.active
  );
  const hasDrawCount = metricFreshness.totalDraws === "fresh" || metricFreshness.totalDraws === "stale";
  const hasConfirmedRounds = hasDrawCount && poolStats.totalDraws > 0;
  const runBalanceReveal = () => revealBalanceWithFeedback(revealBalance, {
    start: startTx,
    confirm: setConfirmed,
    fail: setFailed,
  });
  const runPrizeReveal = () => revealPrizeWithFeedback(revealPrize, {
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
      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />

      <div className="container dashboard-shell">
        <section className="console-intro" aria-labelledby="console-title">
          <div className="console-intro__copy">
            <p className="eyebrow"><span className="signal-pulse" aria-hidden="true" /> Confidential savings console</p>
            <h1 id="console-title">Your position stays <em>private.</em></h1>
            <p className="console-intro__description">
              Deposit confidential cUSDC, enter verifiable prize rounds, and withdraw without publishing amounts, balances, or ticket weight.
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
                <dd><span className={"status-dot " + (deploymentVerification.status === "verified" ? "status-dot--ok" : "status-dot--warn")} /> App Sepolia</dd>
              </div>
              <div>
                <dt>Wallet</dt>
                <dd><span className={"status-dot " + (walletRpcVerification.status === "ready" ? "status-dot--ok" : "status-dot--warn")} /> {walletRpcVerification.status.replace("_", "-")}</dd>
              </div>
              <div>
                <dt>Indexer</dt>
                <dd><span className={"status-dot " + (backendStatus === "online" ? "status-dot--ok" : "status-dot--warn")} /> {backendStatus}</dd>
              </div>
              <div>
                <dt>Transactions</dt>
                <dd><span className={"status-dot " + (writesEnabled || withdrawalsEnabled ? "status-dot--ok" : "status-dot--warn")} /> {writesEnabled ? "enabled" : withdrawalsEnabled ? "withdrawals available" : "safety-locked"}</dd>
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
                The operational safety switch is off. New confidential deposits, withdrawals, and draws are disabled; archived withdrawal exits remain available.
              </span>
            </div>
          )}

          {runtimeConfig.protocolWritesEnabled && deploymentVerification.status !== "verified" && (
            <div className="callout callout--alert" role="alert">
              <AlertTriangle size={18} />
              <span>Writes remain locked until runtime verification succeeds. {deploymentVerification.message}</span>
            </div>
          )}

          {runtimeConfig.protocolWritesEnabled && deploymentVerification.status === "verified" && status !== "disconnected" && walletRpcVerification.status !== "ready" && (
            <div className="callout callout--alert" role="alert">
              <AlertTriangle size={18} />
              <span>{walletRpcVerification.message}</span>
              <button className="button button--secondary callout__action" type="button" onClick={() => void refreshPoolData()}>
                <RefreshCw size={15} /> Retry
              </button>
            </div>
          )}

          {deploymentVerification.status === "verified" && poolStats.pendingDraw.active && (
            <div className="callout callout--alert" role="status">
              <Activity size={17} />
              <span>
                {activeRuntimeVersion === "snapshot-v3"
                  ? "A prize draw is awaiting settlement. Withdrawals remain available; this round uses balances frozen when it was requested. Deposits and participant changes wait for settlement."
                  : "A prize draw is awaiting KMS settlement or timeout cancellation. Deposits, withdrawals, reserve funding, and new draw requests remain locked until it resolves."}
              </span>
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
                <span className={"status-dot " + (poolStatus.isHealthy ? "status-dot--ok" : "status-dot--warn")} />
                {poolStatus.label}
              </span>
              <span className="status-item">
                <span className={"status-dot " + (networkStatus.isHealthy ? "status-dot--ok" : "status-dot--warn")} />
                {networkStatus.label}
              </span>
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
            <StatBox
              label="Verified eligible weight"
              value={totalDeposits + " " + asset.symbol}
              subtext={metricFreshness.totalDeposits === "pending"
                ? "New pool; appears after the first finalized draw"
                : activeRuntimeVersion && activeRuntimeVersion !== "aggregate-v1"
                  ? "Encrypted by design; no public aggregate is collected"
                : "Aggregate only; individual positions stay encrypted"}
              status={metricFreshness.totalDeposits}
            />
            <StatBox
              label="Verified prize reserve"
              value={prizeReserve + " " + asset.symbol}
              subtext={metricFreshness.prizeReserve === "pending"
                ? "New pool; appears after the first finalized draw"
                : activeRuntimeVersion && activeRuntimeVersion !== "aggregate-v1"
                  ? "Encrypted by design; only reserve sufficiency is revealed"
                : "Sponsor-funded on Sepolia; last KMS-verified snapshot"}
              status={metricFreshness.prizeReserve}
            />
            <StatBox
              label="Private savers"
              value={poolStats.participantCount}
              subtext={poolStats.participantCount === 0 ? "No KMS-activated savers yet" : "KMS-activated on-chain participants"}
              status={metricFreshness.participantCount}
            />
            <StatBox
              label="Confirmed rounds"
              value={poolStats.totalDraws}
              subtext={poolStats.totalDraws === 0 ? "No finalized rounds yet" : "Recorded on Sepolia"}
              badge={<Badge variant="info">Live</Badge>}
              status={metricFreshness.totalDraws}
            />
          </div>
          {deploymentVerification.status === "verified" && poolStats.totalDraws === 0 && (
            <div className="callout protocol-empty-state" role="status">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>This deployment is live and intentionally empty. Metrics populate only from real deposits, KMS-verified activation, reserve funding, and finalized Sepolia rounds—nothing is preloaded.</span>
            </div>
          )}
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
                walletStatus={status}
                onWalletAction={() => setIsWalletModalOpen(true)}
                walletActionEnabled={walletConfigurationReady}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
              />
              <DepositCard
                onDeposit={(amount) =>
                  runAction(
                    "Encrypted deposit",
                    () => deposit(amount, transactionCallbacks),
                    "Deposit confirmed on Ethereum Sepolia.",
                    { label: "Official cUSDC", address: asset.address }
                  )
                }
                onActivate={() =>
                  runAction(
                    "Private draw activation",
                    () => activateParticipant(transactionCallbacks),
                    "KMS-verified draw eligibility finalized on Ethereum Sepolia.",
                    { label: "ConfidentialPool", address: DEFAULT_POOL_ADDRESS }
                  )
                }
                activationPending={poolStats.pendingActivation.active}
                isLoading={isLoading}
                walletConnected={walletReady && !poolStats.isPaused}
                walletStatus={status}
                onWalletAction={() => setIsWalletModalOpen(true)}
                walletActionEnabled={walletWriteActionEnabled}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                writesEnabled={writesEnabled}
              />
              <WithdrawalCard
                onWithdraw={(amount) =>
                  runAction(
                    "Encrypted withdrawal",
                    () => withdraw(amount, transactionCallbacks),
                    "Confidential cUSDC withdrawal confirmed on Ethereum Sepolia.",
                    { label: "ConfidentialPool", address: DEFAULT_POOL_ADDRESS }
                  )
                }
                onDeactivate={() =>
                  runAction(
                    "Participant slot reclamation",
                    () => deactivateParticipant(transactionCallbacks),
                    "KMS-verified participant slot check finalized on Ethereum Sepolia.",
                    { label: "ConfidentialPool", address: DEFAULT_POOL_ADDRESS }
                  )
                }
                participantActive={poolStats.participantActive}
                deactivationPending={poolStats.pendingDeactivation.active}
                deactivationEnabled={writesEnabled}
                isLoading={isLoading}
                walletConnected={walletReady}
                walletStatus={status}
                onWalletAction={() => setIsWalletModalOpen(true)}
                walletActionEnabled={walletWriteActionEnabled || withdrawalsEnabled}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                writesEnabled={withdrawalsEnabled}
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
              walletStatus={status}
              onWalletAction={() => setIsWalletModalOpen(true)}
              isLoading={legacyExit.isLoading}
              isChecking={legacyExit.isChecking}
              error={legacyExit.error}
              tokenSymbol={runtimeConfig.tokenSymbol}
              tokenDecimals={Math.max(runtimeConfig.tokenDecimals, 0)}
              onFinalizeWithdrawal={() =>
                runAction(
                  "Finalize archived withdrawal",
                  () => legacyExit.finalizeWithdrawal(transactionCallbacks),
                  "Archived withdrawal finalized on Ethereum Sepolia.",
                  { label: "Legacy ConfidentialPool", address: DEFAULT_LEGACY_POOL_ADDRESS }
                )
              }
              onCancelWithdrawal={() =>
                runAction(
                  "Cancel archived withdrawal",
                  () => legacyExit.cancelWithdrawal(transactionCallbacks),
                  "Archived withdrawal request cancelled on Ethereum Sepolia.",
                  { label: "Legacy ConfidentialPool", address: DEFAULT_LEGACY_POOL_ADDRESS }
                )
              }
            />
          </section>
        )}

        {activeTab === "draw" && (
          <div className="tab-stage">
            <div className="section-heading">
              <div><p className="eyebrow">Prize operations</p><h2>Confidential rounds</h2></div>
              <p>Any Sepolia wallet can request a policy-sized draw when the on-chain cadence opens. KMS publicly verifies only the request-bound readiness bit; eligible weight and prize reserve remain encrypted.</p>
            </div>
            <section className="workspace" aria-label="Prize round">
              <LotteryDrawCard
                prizeReserve={poolStats.prizeReserve}
                totalDraws={poolStats.totalDraws}
                drawPrizeAmount={poolStats.drawPrizeAmount}
                drawIntervalSeconds={poolStats.drawInterval}
                nextDrawRequestTimestamp={poolStats.nextDrawRequestTimestamp}
                prizeReserveStatus={metricFreshness.prizeReserve}
                totalDrawsStatus={metricFreshness.totalDraws}
                onFundReserve={(amount) =>
                  runAction(
                    "Sponsor prize reserve",
                    () => fundPrizeReserve(amount, transactionCallbacks),
                    "Encrypted sponsor contribution confirmed on Ethereum Sepolia.",
                    { label: "Official cUSDC", address: asset.address }
                  )
                }
                onExecuteDraw={() =>
                  runAction(
                    "Confidential prize draw",
                    () => drawLottery(transactionCallbacks),
                    "Prize round confirmed on Ethereum Sepolia.",
                    { label: "ConfidentialPool", address: DEFAULT_POOL_ADDRESS }
                  )
                }
                isLoading={isLoading}
                walletConnected={walletReady && !poolStats.isPaused}
                walletStatus={status}
                onWalletAction={() => setIsWalletModalOpen(true)}
                walletActionEnabled={walletWriteActionEnabled}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                writesEnabled={writesEnabled}
              />
              <PrizeClaimCard
                isRevealed={isPrizeRevealed}
                revealedPrize={revealedPrize}
                onReveal={runPrizeReveal}
                onHide={hidePrize}
                onClaim={() =>
                  runAction(
                    "Claim private prize",
                    () => claimPrize(transactionCallbacks),
                    "Prize paid confidentially to your cUSDC wallet on Ethereum Sepolia.",
                    { label: "ConfidentialPool", address: DEFAULT_POOL_ADDRESS }
                  )
                }
                isLoading={isLoading}
                walletConnected={walletReady}
                walletStatus={status}
                onWalletAction={() => setIsWalletModalOpen(true)}
                walletActionEnabled={walletConfigurationReady}
                tokenSymbol={asset.symbol}
                tokenDecimals={asset.decimals}
                writesEnabled={withdrawalsEnabled}
              />
            </section>
            <aside className="privacy-note">
              <span className="privacy-note__icon"><Layers3 size={18} /></span>
              <div>
                <strong>The winner is never exposed</strong>
                <p>
                  {hasConfirmedRounds
                    ? `${poolStats.totalDraws} encrypted round${poolStats.totalDraws === 1 ? "" : "s"} completed. Each wallet privately checks its own result.`
                    : hasDrawCount
                      ? "No prize round has finalized on this deployment yet."
                      : "Confirmed round data will appear after a verified source responds."}
                </p>
              </div>
            </aside>
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
