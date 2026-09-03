# CipherPool — Project Showcase & Hackathon Submission Overview

**Project Name:** CipherPool  
**Tagline:** A no-loss confidential prize savings protocol on Zama fhEVM where balances, tickets, and lottery draws remain fully encrypted on-chain.  
**Track:** Zama fhEVM Bounty Track / Confidential Financial Applications  
**Live Sepolia Testnet Contracts:**
- **ConfidentialPool:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **ConfidentialVault:** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Custody Asset (Sepolia USDC):** `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

---

## 1. The Real-World Problem

In traditional transparent prize savings pools (such as PoolTogether on Ethereum or Polygon):
1. **Whale Stalking & Front-Running:** Anyone can monitor whale deposits in real-time, calculate odds, and exploit or time lottery entries.
2. **Total Balance Exposure:** Users cannot protect their financial privacy; their wealth, ticket accumulation, and win history are public to everyone on block explorers.
3. **MEV & Arbitrage on Lottery Draws:** Frontrunning transactions exploit knowledge of participant ticket weights right before a draw round closes.

---

## 2. The Solution: CipherPool

CipherPool leverages **Zama fhEVM v0.13.3** homomorphic encryption to create a confidential, provably fair prize savings protocol:
- **Encrypted Principals:** User deposits are encrypted on the client and stored strictly in ciphertext form (`euint64`).
- **Encrypted Lottery Draws:** Randomness (`FHE.randEuint64`) selects winners homomorphically using cumulative interval evaluation without ever revealing participant balances or individual winner identities.
- **2-Step Storage-Anchored Settlement:** Withdrawals use homomorphic balance comparisons (`FHE.ge`) and KMS threshold signatures verified against immutable storage slots (`FHE.checkSignatures`), fully preventing handle substitution and replay attacks.
- **Escape Valve:** Users retain self-sovereign control via `cancelWithdrawal` if an off-chain relayer or KMS experiences a delay.

---

## 3. Architecture & End-to-End Lifecycle

```
[User / Frontend]
       │
       ▼ (1. Encrypt input with ZK proof)
[ConfidentialPool.sol] ─── (2. Deposit USDC + credit euint64 balance)
       │
       ▼ (3. Yield Strategy)
[ConfidentialVault.sol] (4. Harvest yield into prize pool)
       │
       ▼ (5. FHE.randEuint64 + Homomorphic interval selection)
[Prize Draw Round]
       │
       ▼ (6. 2-Step Withdrawal Request)
[Storage-Anchored Handle] ─── (7. KMS Threshold Public Decryption)
       │
       ▼ (8. FHE.checkSignatures on-chain)
[Finalize & Transfer USDC]
```

---

## 4. Step-by-Step Demo Guide for Judges

1. **Connect Wallet:**
   - Launch the frontend (`npm run build:frontend` or local dev).
   - Connect MetaMask configured to Ethereum Sepolia (Chain ID: `11155111`).
2. **Confidential Deposit:**
   - Enter deposit amount in USDC (e.g. 100 USDC).
   - Approve custody allowance, generate client ZK proof, and submit on-chain transaction.
   - Observe balance remaining encrypted in the pool.
3. **Client-Side Balance Reveal:**
   - Click "Reveal Balance" to authorize an EIP-712 decryption signature via the wallet.
   - Decrypt your private balance locally with zero leakage to unauthorized viewers.
4. **Lottery Draw Execution:**
   - Inspect the estimated prize pool harvested from the `ConfidentialVault` strategy.
   - Trigger `draw(prizeAmount)`: winner credit is computed homomorphically inside the fhEVM coprocessor without revealing the winner address publicly.
5. **2-Step Withdrawal & KMS Verification:**
   - Submit a withdrawal request: pool verifies sufficiency homomorphically (`FHE.select`) and anchors the request in storage.
   - Relayer fetches threshold signature proof from Zama KMS gateway and invokes `finalizeWithdrawal`.
   - Contract executes `FHE.checkSignatures` against the storage-anchored handle and transfers custody assets.

---

## 5. Security & Verification Evidence

- **85 Passing Automated Tests** across Foundry, Node.js backend services, client adapters, and frontend UX suites.
- Formal forensic audit covering Cross-Contract Handle Provenance, Replay Boundaries, and Stale Handles (`docs/security/`).
- 14-Point Sepolia Runtime Checklist verified (`test/runtime/SepoliaRuntimeChecklist.t.sol`).
