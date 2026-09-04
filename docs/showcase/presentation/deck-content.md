# CipherPool Presentation Content

> **Archived draft:** This content predates the ERC-7984 migration and must be rewritten before submission. See the [current submission overview](../SUBMISSION_OVERVIEW.md).

## 1. Private prize savings, built for verification

CipherPool is a no-loss prize savings protocol on Zama fhEVM. Principal remains withdrawable while encrypted balances and ticket weights stay confidential. This is a research deployment on Ethereum Sepolia—not production software.

## 2. Public ledgers expose private financial context

- Balance exposure reveals a saver’s position and history.
- Visible ticket weights make whale activity easy to track.
- Transaction timing can reveal intent around prize rounds.

## 3. Public custody, confidential accounting

The official cUSDC token passes the actual encrypted transfer result to CipherPool. The pool maintains balances and draw weights as `euint64` and reveals a balance only after wallet-authorized client-side decryption.

## 4. Architecture

The React client reads Sepolia and submits wallet-signed transactions. `ConfidentialPool` owns encrypted accounting, requests, and prize liabilities. Sponsors contribute encrypted cUSDC to the Sepolia prize reserve without any false yield claim. The Zama relayer/KMS supplies threshold-decryption evidence. A Node indexer exposes public protocol state and persists checkpoints in PostgreSQL.

## 5. The product is live

The white-and-blue console shows public pool health without exposing private positions. Wallet identity is rendered only after a provider returns an account. Runtime code, chain, and custody bindings are checked before writes are enabled.

## 6. One coherent user journey

1. Deposit confidential testnet cUSDC; the pool credits only the token-returned encrypted amount.
2. Enter encrypted prize rounds; weighted selection runs homomorphically.
3. Contribute encrypted sponsor funds to the prize reserve or monitor a round.
4. Withdraw cUSDC directly; sufficiency is evaluated without revealing the balance.

## 7. Security controls that protect solvency

- Deposit credit is derived from the transferred custody amount.
- Draws consume the verified sponsor reserve so assets cannot fund repeated prizes.
- Compounded prizes remain included in the encrypted aggregate liability.
- Withdrawals debit accounting by the token-returned encrypted transfer result.
- KMS signatures are verified on-chain; stale requests have a 24-hour cancellation escape valve.

## 8. Verified cUSDC Sepolia evidence

- Deposit: `0x36f81f…fa87`
- Direct withdrawal: `0x8ee0e4…8429`
- Sponsor reserve: `0x07b797…7eaa`

All three receipts succeeded. Authorized KMS verification confirmed the deposit/withdrawal round trip and the sponsor wallet’s 1 cUSDC reserve contribution.

## 9. Engineering evidence

The repository has 100 passing automated tests: 42 Foundry contract tests, 23 backend tests, 1 client adapter test, and 34 frontend tests. Vercel serves the client, Render serves the indexer, and PostgreSQL preserves indexer checkpoints across restarts.

## 10. Confidential savings, without blind trust

Try the research app at `https://cipherpool-beta.vercel.app`. Inspect the active pool on Sepolia at `0xE47eF44EBB804A507173BEFa5beb2325aA7451AD`. Review the source and evidence at `github.com/Webghost01-NG/fhevm-pooltogether-security`.
