# CipherPool Presentation Content

> **Archived draft:** This content predates the ERC-7984 migration and must be rewritten before submission. See the [current submission overview](../SUBMISSION_OVERVIEW.md).

## 1. Private prize savings, built for verification

CipherPool is a no-loss prize savings protocol on Zama fhEVM. Principal remains withdrawable while encrypted balances and ticket weights stay confidential. This is a research deployment on Ethereum Sepolia—not production software.

## 2. Public ledgers expose private financial context

- Balance exposure reveals a saver’s position and history.
- Visible ticket weights make whale activity easy to track.
- Transaction timing can reveal intent around prize rounds.

## 3. Public custody, confidential accounting

The custody amount remains publicly auditable. CipherPool derives the matching encrypted credit inside the contract, maintains balances and draw weights as `euint64`, and reveals a balance only after wallet-authorized client-side decryption.

## 4. Architecture

The React client reads Sepolia and submits wallet-signed transactions. `ConfidentialPool` owns encrypted accounting, requests, and prize liabilities. `ConfidentialVault` isolates custody strategy operations. The Zama relayer/KMS supplies threshold-decryption evidence. A Node indexer exposes public protocol state and persists checkpoints in PostgreSQL.

## 5. The product is live

The white-and-blue console shows public pool health without exposing private positions. Wallet identity is rendered only after a provider returns an account. Runtime code, chain, vault, and custody bindings are checked before writes are enabled.

## 6. One coherent user journey

1. Deposit public testnet USDC; the contract derives an equal encrypted credit.
2. Enter encrypted prize rounds; weighted selection runs homomorphically.
3. Request a withdrawal; sufficiency is evaluated without revealing the balance.
4. The KMS proof is prepared; the requesting wallet submits finalization.

## 7. Security controls that protect solvency

- Deposit credit is derived from the transferred custody amount.
- Draws reserve yield so assets cannot fund repeated prizes.
- Compounded prizes increase aggregate plaintext liabilities.
- Withdrawal handles are storage-anchored and request-bound.
- KMS signatures are verified on-chain; stale requests have a 24-hour cancellation escape valve.

## 8. Verified 1 USDC Sepolia cycle

- Deposit: `0x934340…8e2e`
- Withdrawal request: `0x31ae42…7a6b`
- KMS-proof finalization: `0xc160a1…3878`

All three receipts succeeded. Finalization emitted the public-decryption verification and withdrawal-finalized events; custody and accounted principal returned to zero.

## 9. Engineering evidence

The repository has 113 passing automated tests: 51 Foundry contract tests, 32 backend tests, 2 client adapter tests, and 28 frontend tests. Vercel serves the client, Render serves the relayer/indexer, and a free Neon PostgreSQL database preserves indexer checkpoints across restarts.

## 10. Confidential savings, without blind trust

Try the research app at `https://cipherpool-beta.vercel.app`. Inspect the active pool on Sepolia at `0x105C57860b32a37F3C7CF2AEcF5a39AbbCA1d265`. Review the source and evidence at `github.com/Webghost01-NG/fhevm-pooltogether-security`.
