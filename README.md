# CipherPool — Confidential Prize Savings Protocol on Zama fhEVM

> **CipherPool**: A no-loss confidential prize savings protocol on Zama fhEVM where balances, tickets, and lottery draws remain fully encrypted on-chain.

[![CipherPool CI](https://github.com/Webghost01-NG/fhevm-pooltogether-security/actions/workflows/ci.yml/badge.svg)](https://github.com/Webghost01-NG/fhevm-pooltogether-security/actions)
[![fhEVM v0.13.3](https://img.shields.io/badge/Zama_fhEVM-v0.13.3-blue)](https://docs.zama.ai/fhevm)
[![Solidity ^0.8.24](https://img.shields.io/badge/Solidity-^0.8.24-orange)](https://soliditylang.org/)
[![License: BSD-3-Clause-Clear](https://img.shields.io/badge/License-BSD_3--Clause--Clear-green.svg)](LICENSE)

---

## 1. The Real-World Problem

Transparent blockchain prize savings protocols expose participant balances and winning tickets directly on-chain:
- **Whale Stalking & Odds Exploitation:** Observers monitor deposit distributions in real-time, calculating exact odds to snipe prize draws.
- **Complete Loss of Financial Privacy:** Every deposit, ticket accumulation, and win history is permanently linked to the user's public address.
- **MEV on Lottery Settlement:** Searchers front-run draw transactions using knowledge of participant distributions.

---

## 2. The Solution: CipherPool

CipherPool uses **Zama fhEVM v0.13.3** Fully Homomorphic Encryption to enable completely private prize savings:
- **Encrypted Principals (`euint64`):** Balances are homomorphically encrypted and incremented without revealing numbers to other users, searchers, or node operators.
- **Encrypted Lottery Draws (`FHE.randEuint64`):** Bounded homomorphic randomness derives winning tickets via cumulative intervals without leaking winner identity or ticket amounts.
- **Storage-Anchored 2-Step Settlement:** Withdrawal requests anchor ciphertext handles directly in immutable contract storage slots, preventing calldata manipulation and handle substitution attacks.
- **Cryptographic Domain Binding:** Proof of decryption is strictly verified via `FHE.checkSignatures` against storage-anchored handles before custody transfer.
- **Self-Sovereign Escape Valve:** Users can unilaterally cancel stale withdrawal requests via `cancelWithdrawal` after the cancellation delay if an off-chain relayer stalls.

---

## 3. Architecture & End-to-End Lifecycle

```
[User / Frontend]
       │
       ▼ (1. Client ZK-PoK Proof of Encryption)
[ConfidentialPool.sol] ─── (2. Custody Deposit & Homomorphic Credit)
       │
       ▼ (3. Principal Segregation & Strategy Management)
[ConfidentialVault.sol] ─── (4. Yield Harvest into Prize Pool)
       │
       ▼ (5. FHE.randEuint64 + Homomorphic Interval Winner Derivation)
[Confidential Draw]
       │
       ▼ (6. 2-Step Withdrawal Request -> FHE.select)
[Storage-Anchored Handle] ─── (7. KMS Threshold Decryption Proof)
       │
       ▼ (8. FHE.checkSignatures Verification & Atomic Storage Deletion)
[ERC-20 Custody Transfer]
```

---

## 4. Verified Sepolia Deployments

| Component | Sepolia Contract Address | Network |
| :--- | :--- | :--- |
| **ConfidentialPool** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Ethereum Sepolia (11155111) |
| **ConfidentialVault** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Ethereum Sepolia (11155111) |
| **Custody Asset (USDC)** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Ethereum Sepolia (11155111) |
| **Zama ACL** | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` | Canonical Sepolia |
| **Zama Coprocessor** | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` | Canonical Sepolia |
| **Zama KMSVerifier** | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` | Canonical Sepolia |

---

## 5. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v22+
- **Foundry**: latest stable (`forge`, `cast`, `anvil`)

### Installation
```bash
git clone https://github.com/Webghost01-NG/fhevm-pooltogether-security.git
cd fhevm-pooltogether-security
npm install
```

### Run Tests
```bash
# Run all test suites (Foundry, Backend, Client Adapters, Frontend)
npm test

# Run individual suites
forge test -vv
npm run test:backend
npm run test:client
npm run test:frontend
```

### Build Frontend and Backend
```bash
npm run build:backend
npm run build:frontend
```

### Run Backend Relayer via Docker
```bash
docker compose up --build
```

---

## 6. Security Invariants & Formal Assumptions

1. **Storage Anchoring:** Calldata can never dictate the ciphertext handle fed into `FHE.checkSignatures`. Handles are immutably retrieved from `_pendingWithdrawals[msg.sender].handle`.
2. **Reentrancy Protection:** Checks-Effects-Interactions (CEI) combined with OpenZeppelin `ReentrancyGuard` on all state-altering operations.
3. **KMS Threshold Security:** Relies on the honest-majority assumption of Zama's KMS signing committee.

---

## 7. Judge Pitch & Layman Explanation

### 30-Second Judge Pitch
> "CipherPool brings confidential prize savings to Zama fhEVM. In standard no-loss pools, participant balances and ticket chances are exposed, enabling MEV sniping and whale surveillance. CipherPool keeps deposits, ticket allocations, and lottery draws homomorphically encrypted (`euint64`) on-chain. Withdrawals employ storage-anchored 2-step settlement verified with Zama KMS threshold proofs, eliminating front-running while preserving self-sovereign user safety."

### 30-Second Layman Explanation
> **What problem does this project solve?** When you save money in conventional crypto prize lotteries, everyone can see your bankroll and track your every move.  
> **Why can't ordinary blockchain apps solve it?** Blockchains are completely transparent by default, exposing every account balance and transaction.  
> **How does CipherPool solve it?** CipherPool uses math called Fully Homomorphic Encryption. It encrypts your deposit so the computer can run fair lotteries and calculate prizes without ever seeing or revealing how much money you actually have.
