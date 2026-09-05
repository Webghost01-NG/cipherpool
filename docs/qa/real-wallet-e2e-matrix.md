# Real-Wallet and Cross-Device QA Matrix

This matrix separates production evidence from deterministic tests. A check is marked complete only when the stated route was actually exercised; simulated providers are never described as MetaMask evidence.

## Verified on 5 September 2026

| Route | Environment | Result | Evidence |
| --- | --- | --- | --- |
| Public load | Chrome, 1440×900 | Pass | [Desktop capture](evidence/live-desktop.png) |
| Public load | Chrome, 768×1024 | Pass | [Tablet capture](evidence/live-tablet.png) |
| Public load | Chrome, 390×844 | Pass | [Mobile capture](evidence/live-mobile.png) |
| Runtime reads | Production URL + redundant Sepolia RPCs | Pass | Rendered `Deployment verified`; pool reports draw 1 and zero active participants |
| Deposit, activation, draw, claim, withdrawals | Three separately keyed Sepolia signers | Pass | [Confirmed lifecycle receipts](../operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle) |
| Connect rejection and retained disconnect | Deterministic EIP-1193 tests | Pass | `frontend/test/wallet.test.ts`; not claimed as a live wallet test |
| Account selection and cancellation | Deterministic EIP-1193 tests | Pass | Current account is retained after a rejected switch |
| Wrong network and wallet-RPC failure messages | Deterministic presentation tests | Pass | `frontend/test/networkStatus.test.ts` and `frontend/test/rpcReliability.test.ts` |

Reproduce the production viewport captures without adding a browser dependency:

```bash
QA_URL=https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/ npm run qa:live-ui
```

## External Verification Still Required

Independent testers must repeat connect, disconnect, account switch, rejected signature, private reveal, and one funded write in their own MetaMask-compatible browser. Record browser/wallet version, device, public address, transaction target, receipt, and whether retry guidance was needed. Never record seed phrases, private keys, encrypted-balance cleartexts, or wallet telemetry. Mobile Chrome/Safari without an injected EIP-1193 provider is expected to show the no-wallet path; use a wallet's in-app browser for an actual mobile-wallet test.

Give each tester the [independent wallet test runbook](independent-wallet-runbook.md). It separates no-cost connection checks from funded writes and includes a paste-ready evidence record, so reviewers can reproduce the result without collecting private wallet data.

This external row remains open because local automation and operator-controlled keys cannot prove an independent wallet or device. The completed protocol receipts demonstrate real writes, while the matrix avoids overstating who controlled the clients.
