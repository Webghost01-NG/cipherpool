# Veylott Presentation Content

## 1. Private prize savings, built for verification

Veylott is a no-loss prize savings protocol on Zama fhEVM. Principal remains withdrawable while encrypted balances and ticket weights stay confidential. This is a research deployment on Ethereum Sepolia—not production software.

## 2. Public ledgers expose private financial context

- Balance exposure reveals a saver’s position and history.
- Visible ticket weights make whale activity easy to track.
- Transaction timing can reveal intent around prize rounds.

## 3. Public custody, confidential accounting

The official cUSDC token passes the actual encrypted transfer result to Veylott. The pool maintains balances and draw weights as `euint64` and reveals a balance only after wallet-authorized client-side decryption.

## 4. Architecture

The React client reads Sepolia and submits wallet-signed transactions. `ConfidentialPool` owns encrypted accounting, requests, and prize liabilities. Sponsors contribute encrypted cUSDC to the Sepolia prize reserve without any false yield claim. The Zama relayer/KMS supplies threshold-decryption evidence. A Node indexer exposes public protocol state and persists checkpoints in PostgreSQL.

## 5. The product is live

The white-and-blue console shows public pool health without exposing private positions. Wallet identity is rendered only after a provider returns an account. Runtime code, chain, and custody bindings are checked before writes are enabled.

## 6. One coherent user journey

1. Wrap test USDC into confidential cUSDC with Zama's official Sepolia wrapper.
2. Deposit an encrypted cUSDC amount; the pool credits only the token-returned result.
3. Fund or monitor the sponsor reserve, then run a KMS-verified encrypted weighted draw.
4. Withdraw with an encrypted amount; the pool debits only the token-returned transfer result.

## 7. Security controls that protect solvency

- Deposit credit is derived from the token-returned encrypted custody amount.
- Draws consume the verified sponsor reserve so assets cannot fund repeated prizes.
- Winner credits enter both the encrypted position and aggregate liability during draw finalization; compounding only clears the separate prize counter.
- Withdrawals debit accounting by the token-returned encrypted transfer result.
- KMS proofs are bound to the stored aggregate and reserve handles; anyone can cancel a stale draw lock after 24 hours.
- Immutable prize and cadence parameters let any wallet request an eligible round without operator discretion or repeated lock spam.

## 8. Verified full Sepolia lifecycle

- Deposit: `0xe36db7…b39f`
- Draw finalization: `0x504862…ce6c`
- Private prize claim: `0x5763be…c969`
- Principal withdrawal: `0x767d89…5262`

All receipts succeeded on predecessor pool `0x9c939b82…191e0`. Zama KMS finalized draw 1 with a verified 0.5 cUSDC weight and prize. The winner privately detected and claimed the prize through the ordinary withdrawal path; post-settlement KMS verification returned zero position and prize balances. The active pool adds permissionless draw policy and KMS-verified participant activation, and began from empty state.

## 9. Engineering evidence

The reproducible validation covers Foundry contract invariants, backend API and indexer behavior, the client encryption adapter, and frontend UX. Vercel serves the client, Render serves the read-only indexer/API, and PostgreSQL preserves indexer checkpoints across restarts. The deck intentionally avoids a fixed test count that would become stale as coverage grows.

## 10. Confidential savings, without blind trust

Try the research app at `https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/`. Inspect the active pool on Sepolia at `0x54FdC46D0EA722EfA4853192678b35fCABFad99C`. Review the source and evidence at `github.com/Webghost01-NG/veylott`.
