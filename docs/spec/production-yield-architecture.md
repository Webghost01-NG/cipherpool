# Production Yield Architecture

## Status and Boundary

This is the implementation specification for a successor Veylott deployment; it is not a claim that the current Sepolia pool generates yield. The current pool keeps principal liquid in official `cUSDCMock` and uses an encrypted sponsor reserve. Integration stays blocked until `npm run verify:yield-route -- --require-live-yield` confirms an exact-asset venue with a real strategy.

The candidate route is [Zama's confidential vault design](https://www.zama.org/post/private-deposits-into-public-defi-zamas-first-confidential-vault-design) using [OpenZeppelin's `BatcherConfidential`](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/blob/master/contracts/finance/BatcherConfidential.sol): confidential wrapper → batcher → public ERC-4626 vault. The [official Zama registry](https://github.com/zama-ai/protocol-registry/blob/main/testnet.json) confirms the Sepolia wrapper, and the two-way batchers are asset-compatible, but the vault currently has no strategy. A production deployment must pin reviewed runtime hashes and re-read `fromToken`, `toToken`, `vault`, `asset`, pause state, capacity, and exchange-rate behavior on-chain.

## Components and Trust Boundaries

- **Pool** owns encrypted saver balances, prize liabilities, liquid principal, and strategy cost basis.
- **Deposit batcher** exchanges pooled confidential cUSDC for confidential vault shares. It must credit the pool, never individual savers.
- **ERC-4626 vault** is the public DeFi boundary. Its governance, adapters, fees, liquidity, and loss behavior become explicit external risks.
- **Redeem batcher** returns confidential cUSDC to the pool. Only its callback may enter strategy settlement.
- **Permissionless keepers** dispatch and finalize matured batches. They choose timing within fixed policy, not amounts, recipients, venues, or prizes.

Individual balances remain encrypted. Batch dispatch necessarily reveals an aggregate unwrap amount and the public vault exchange rate; the UI and threat model must disclose that leakage.

## Accounting Invariants

Use separate encrypted ledgers for `userPrincipal`, `liquidPrincipal`, `strategyPrincipal`, `prizeReserve`, and `prizeLiabilities`.

1. A deposit increases user and liquid principal only by the cUSDC amount actually returned by the ERC-7984 transfer.
2. Dispatch moves the exact accepted batch amount from liquid to strategy principal; it never creates reserve.
3. Redemption first restores strategy principal. Only `max(returned - costBasis, 0)` may increase the prize reserve.
4. Draw finalization atomically moves reserve into prize liabilities; the same yield cannot fund two prizes.
5. Withdrawal may consume liquid principal only. Insufficient liquidity queues redemption; it never returns encrypted zero as a successful exit.
6. Before each draw, a KMS proof reveals only a request-bound boolean that conservative assets cover principal plus existing prize liabilities and the proposed prize.

Unsolicited transfers, share-price estimates, sponsor contributions, and unfinalized batch outputs are never counted as yield.

## Batch and Recovery State Machine

`Idle → Pending → Dispatched → Finalized → Claimed` is the successful path. A user or the pool may quit while `Pending`; a failed route must become `Canceled → Refunded`. `Dispatched` needs a public deadline after which governance can pause new activity and invoke a venue-specific, audited recovery path. A callback cannot be replayed, change its route, or settle against a newer cost basis.

Only one accounting mutation that affects a draw snapshot may be active. Draws, strategy dispatch, redemption settlement, and reserve funding use request hashes bound to chain, pool, action, nonce, handles, and timestamps.

## Loss, Liquidity, and Governance

A negative redemption delta is a strategy loss, not negative yield. It must pause new deposits and draws, preserve pro-rata claims, and emit a public incident state. Insurance may cover a loss only through a separately funded, attributable reserve. The product must not promise principal protection beyond those enforceable assets.

Venue and risk-limit changes require a timelocked multisig and a fresh audit. Emergency authority may pause and start recovery, but cannot select winners, redirect claims, synthesize yield, or bypass proof verification. Normal dispatch, callback, claims, and draw requests remain permissionless.

## Required Verification Before Deployment

- Exact wrapper/vault/batcher relationships and runtime hashes verified through two independent RPC providers.
- Fork and live tests for successful deposit/redeem, zero output, partial execution, cancellation, timeout recovery, rounding dust, wrapper capacity, illiquidity, fees, and strategy loss.
- Adversarial tests for reentrancy, stale handles, replayed callbacks, front-running, denial of service, and concurrent draw/strategy mutations.
- A live low-value cycle proving deposited principal, vault shares, redemption, cost-basis restoration, and positive yield attribution with confirmed receipts.
- Independent review of the successor contracts and the external venue, followed by a new deployment and wallet QA pass.

Until every gate passes, the canonical app and submission material must continue to say **sponsor-funded testnet reserve**, not generated yield or production-ready no-loss savings.
