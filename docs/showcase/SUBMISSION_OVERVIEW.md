# Veylott Submission Overview

## Product

Veylott is a confidential prize-savings prototype on Zama fhEVM. It keeps each saver’s cUSDC position, withdrawal amount, prize counter, and draw weight encrypted while performing weighted winner selection over ciphertexts.

- Application: [Veylott live demo](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/)
- Pool: [`0x2150d7D82117b927Dd3253935E34f67D8B37d424`](https://sepolia.etherscan.io/address/0x2150d7D82117b927Dd3253935E34f67D8B37d424)
- Official cUSDCMock: [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639)
- Network: Ethereum Sepolia

## Core Flow

1. A wallet encrypts a `uint64` deposit for the official cUSDC contract.
2. `confidentialTransferAndCall` moves cUSDC and passes the actual encrypted result to Veylott.
3. Veylott updates encrypted positions and liabilities. A KMS proof of a positive position activates a bounded participant slot without revealing the amount.
4. A sponsor contributes encrypted cUSDC to the Sepolia prize reserve; this is not presented as generated yield.
5. Any wallet requests a cadence-eligible, fixed-prize draw. Position-changing writes remain locked while settlement is pending.
6. The KMS publicly decrypts only a proof-bound readiness predicate. If true, `FHE.randEuint64` and encrypted cumulative intervals select a winner without disclosing aggregate weight, reserve, or winner.
7. A saver privately reveals only their own prize counter. A winner claims through the ordinary encrypted withdrawal path, so public calls do not label prize claims.
8. Direct withdrawals use encrypted amounts, and accounting follows the token-returned transfer result.

## Verified Evidence

- The deployed runtime is 14,855 bytes with hash `0x38dcfee7fcbecb12f8be9c4d73c596e7f9bc1b0a3d910e49cc8d8a3cc7af4ed4`.
- Three separately keyed wallets deposited 0.1 cUSDC each and completed a real active-pool round. This demonstrates multi-key behavior; it is not represented as three independent human testers.
- The sponsor [funded 0.5 cUSDC](https://sepolia.etherscan.io/tx/0x30d5b85a4e51c495b4e92ecab20b922328c6fc6dc7715479eef5ec073dc8363b), a wallet [requested draw 1](https://sepolia.etherscan.io/tx/0x7d49133e11b8685a080ee3303ecedbd3ebd4441b5631922c4ba6ad87cc56bf54), the KMS [finalized readiness-only settlement](https://sepolia.etherscan.io/tx/0x0970fff858788dcbf926730c495fac1bd9ded55114d730aeae0c20b9d642b320), and the winner [claimed privately](https://sepolia.etherscan.io/tx/0xb8f29170094ac40f14df409838a08b5303265d6a3b6988a49a7f796db33fd50a).
- All three principals exited, zero-position proofs reclaimed all participant slots, and authorized post-settlement KMS checks returned zero pool position and zero prize for each test wallet.
- All receipt hashes, blocks, retry evidence, and exit transactions are in the [live lifecycle record](../operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle).

## Data Integrity and Limitations

Deployment identifiers are pinned, not sample data. Live state comes from the reviewed contract or read-only indexer; unavailable data remains unavailable. Secrets stay in ignored files or external secret stores.

This is unaudited research software using test assets. Sepolia prizes are sponsor-funded because the official cUSDC wrapper does not match a verified Sepolia yield venue. Winner selection is intentionally capped at 12 active participants. Independent human wallet/device QA remains open. The final screenshots, deck, and captioned walkthrough were refreshed against the canonical deployment on 5 September 2026.
