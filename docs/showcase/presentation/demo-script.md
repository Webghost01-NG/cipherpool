# Veylott Demo Script

Target runtime: 2 minutes 40 seconds. Present this over the generated deck and the canonical app. The recorded evidence is real; do not imply that a transaction completed during recording unless its wallet prompt and confirmed receipt are visible.

## Run of Show

### 0:00–0:20 — Hook

“Veylott is confidential prize savings on Zama fhEVM. A saver keeps principal withdrawable while balances, draw weights, and the winning outcome stay encrypted. This is unaudited research software on Ethereum Sepolia.”

### 0:20–0:40 — Problem and privacy model

“Public prize pools expose balances and relative odds. Veylott keeps custody and receipts verifiable, but stores positions and prize state as encrypted `euint64` values. A balance is revealed only with wallet authorization.”

### 0:40–1:05 — Live product

Open the [canonical app](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/). Show the disconnected `Connect wallet` state, then connect MetaMask on Sepolia. Point to runtime assurance and explain that chain, bytecode, and custody checks fail closed before writes.

### 1:05–1:30 — User journey

“A wallet wraps test USDC into official cUSDC, encrypts a deposit, and activates a participant slot using only a positive-position proof. A draw publicly reveals one request-bound readiness bit; aggregate weight, reserve, and winner remain encrypted. Prize and principal use the same withdrawal path.”

### 1:30–2:05 — Real receipts

Show the [active lifecycle table](../../operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle). “Three separately keyed wallets deposited 0.1 cUSDC each. This [request](https://sepolia.etherscan.io/tx/0x7d49133e11b8685a080ee3303ecedbd3ebd4441b5631922c4ba6ad87cc56bf54) and [KMS finalization](https://sepolia.etherscan.io/tx/0x0970fff858788dcbf926730c495fac1bd9ded55114d730aeae0c20b9d642b320) settled draw one. The winner [claimed privately](https://sepolia.etherscan.io/tx/0xb8f29170094ac40f14df409838a08b5303265d6a3b6988a49a7f796db33fd50a), all principals exited, and participant slots returned to zero.”

### 2:05–2:25 — Engineering proof

“The 163-test suite covers contract invariants, the indexer, encryption adapter, and interface. The audit package independently rechecks deployed source, constructor input, runtime hash, custody, and draw policy across two RPC providers.”

### 2:25–2:40 — Honest close

“Sepolia prizes are sponsor-funded, not generated yield. Winner selection is capped at 12 and the contracts are not externally audited. The live app, source, limitations, and every receipt are public.”

## Recording Checklist

- Record at 1080p; hide seed phrases, private keys, tokens, RPC credentials, and unrelated tabs.
- Use only the canonical URL and Ethereum Sepolia; confirm the connected address aloud.
- Capture `Connect wallet`, the MetaMask origin, `Deployment verified`, and the active pool address.
- If signing, show the wallet prompt and wait for the explorer receipt before saying “confirmed.”
- Do not expose private balances without the wallet owner’s consent.
- Keep the sponsor-funded, 12-participant, unaudited, and independent-human-QA limitations visible.
- Open receipt links in advance and keep a local copy of the deck as a network-failure fallback.
