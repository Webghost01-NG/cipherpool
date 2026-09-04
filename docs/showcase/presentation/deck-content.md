# CipherPool Presentation Content

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

## 8. Verified cUSDC Sepolia evidence

- Deposit: `0x36f81f…fa87`
- Direct withdrawal: `0x8ee0e4…8429`
- Sponsor reserve: `0x07b797…7eaa`

All three receipts succeeded. Authorized KMS verification confirmed that the round trip restored the test wallet to 10 cUSDC; the later sponsor contribution moved 1 cUSDC into the encrypted reserve.

## 9. Engineering evidence

The reproducible validation covers Foundry contract invariants, backend API and indexer behavior, the client encryption adapter, and frontend UX. Vercel serves the client, Render serves the read-only indexer/API, and PostgreSQL preserves indexer checkpoints across restarts. The deck intentionally avoids a fixed test count that would become stale as coverage grows.

## 10. Confidential savings, without blind trust

Try the research app at `https://cipherpool-beta.vercel.app`. Inspect the active pool on Sepolia at `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0`. Review the source and evidence at `github.com/Webghost01-NG/fhevm-pooltogether-security`.
