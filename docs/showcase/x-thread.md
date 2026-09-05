# Evidence-Linked X Thread

Publish as a nine-post thread. Attach `presentation/assets/live-dashboard.png` to post 1 and export page 8 of `presentation/Veylott-Presentation.pdf` for post 6.

## 1/9

Meet Veylott: confidential prize savings on Zama fhEVM. Balances, draw weights and winner state stay encrypted while custody and receipts remain verifiable on Ethereum Sepolia. Live research app: https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/

## 2/9

Public prize pools expose how much every saver holds—and therefore their odds. Veylott stores positions, liabilities, reserve and prize counters as encrypted values. A saver can reveal only their own balance with wallet authorization.

## 3/9

Deposits are asset-bound: official cUSDC transfers the encrypted asset first, then Veylott credits only the token-returned result. Withdrawals use the same rule. No plaintext amount enters the active pool API. Source: https://github.com/Webghost01-NG/veylott

## 4/9

Draw settlement reveals only a proof-bound readiness bit. Eligible weight, prize reserve and winner remain encrypted. Encrypted randomness is mapped across encrypted cumulative balance intervals; any keeper can finalize valid proof evidence.

## 5/9

Live-chain evidence, not a mock: 3 separately keyed wallets entered the active pool, a 0.5 cUSDC sponsor reserve funded draw 1, and KMS readiness finalized. Request: https://sepolia.etherscan.io/tx/0x7d49133e11b8685a080ee3303ecedbd3ebd4441b5631922c4ba6ad87cc56bf54

## 6/9

The winner privately detected 0.5 cUSDC and claimed it through the ordinary encrypted withdrawal path. Public observers cannot label it as winnings. Confirmed receipt: https://sepolia.etherscan.io/tx/0xb8f29170094ac40f14df409838a08b5303265d6a3b6988a49a7f796db33fd50a

## 7/9

All 3 principals exited and zero-position proofs reclaimed every participant slot. Full blocks, receipts, activation retry and post-settlement checks: https://github.com/Webghost01-NG/veylott/blob/main/docs/operations/live-prize-lifecycle.md

## 8/9

Engineering evidence: 163 passing tests across Solidity invariants, backend/indexer, encryption adapter and frontend. A reproducible audit-scope verifier binds deployed source, constructor input, runtime hash, custody and immutable policy across 2 RPCs.

## 9/9

Honest limits: prizes are sponsor-funded—not generated yield. Selection is capped at 12. The contracts are unaudited research software, and independent human wallet/device QA remains open. Evidence: https://github.com/Webghost01-NG/veylott
