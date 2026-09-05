# Independent Wallet Test Runbook

Use this checklist with the canonical [Veylott deployment](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/). The tester must control their own wallet and device. Never share a seed phrase, private key, recovery file, RPC credential, or private balance.

## Prerequisites

- A MetaMask-compatible browser wallet on Ethereum Sepolia.
- A fresh or low-value test-only account.
- Sepolia ETH for gas and wrapper-compatible test USDC only if performing the funded-write section.
- Screen capture with unrelated tabs and wallet secrets hidden.

Connection, network, rejection, and disconnect checks require no test tokens. Fund only the tester performing the real deposit/withdrawal route; screenshots alone never justify funding a wallet.

## No-Cost Checks

1. Open the canonical URL in a fresh private window. Confirm that no address appears before pressing **Connect wallet**.
2. Reject the first connection request. Confirm that Veylott stays disconnected and displays a useful recovery path.
3. Connect the intended account. Confirm the exact origin, selected address, Ethereum Sepolia, and `Deployment verified` status.
4. Switch accounts, then switch to a wrong network. Confirm the header updates and writes remain locked until Sepolia is restored.
5. Start a private reveal and reject its signature. Confirm no transaction is broadcast and the interface can retry.
6. Disconnect from Veylott and reload. Confirm there is no silent reconnection or placeholder address.

## Funded Write

Only after the no-cost checks pass, perform one minimal encrypted deposit using test assets. Before signing, verify that the wallet prompt targets official cUSDC `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`. Record the confirmed transfer and draw-activation receipts. Privately reveal the resulting position, withdraw the same principal through Veylott, and record the confirmed receipt. Use **Finalize slot reclamation** after the full withdrawal; if a draw invalidated the earlier check, use **Check and reclaim draw slot** to request a fresh proof first. Do not publish the revealed amount unless the tester explicitly consents.

## Evidence Record

Copy one record per independent tester into the QA matrix or issue #149:

```text
Tester pseudonym:
UTC date/time:
Device and operating system:
Browser and version:
Wallet and version:
Public test address:
Fresh-load disconnected state: PASS/FAIL
Rejected connection: PASS/FAIL
Connected account and origin verified: PASS/FAIL
Account switch: PASS/FAIL
Wrong-network lock and recovery: PASS/FAIL
Rejected private-reveal signature: PASS/FAIL
Explicit disconnect persisted after reload: PASS/FAIL
Funded deposit receipt or NOT RUN:
Private reveal: PASS/FAIL/NOT RUN
Withdrawal receipt or NOT RUN:
Participant-slot reclamation receipt or NOT RUN:
Retry guidance used:
Redacted screenshot links:
Unexpected behavior:
Tester statement: I independently controlled this wallet and device.
```

A maintainer must verify every supplied transaction receipt on Sepolia before marking the funded route complete. A screenshot, transaction hash, or tester statement must never be invented or copied from the operator-controlled lifecycle.
