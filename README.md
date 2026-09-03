# CipherPool — Confidential Prize Savings Protocol on Zama fhEVM

> **CipherPool**: A no-loss confidential prize savings protocol on Zama fhEVM where balances, tickets, and lottery draws remain fully encrypted on-chain.

> [!WARNING]
> The current Sepolia pool is a research deployment, not production software. Review the open security limitations below before depositing test assets.

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

CipherPool uses **Zama fhEVM v0.13.3** Fully Homomorphic Encryption to protect pool positions and prize calculations:
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
       ▼ (1. Public Custody Amount)
[ConfidentialPool.sol] ─── (2. Custody Deposit & Contract-Derived Encrypted Credit)
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

## 4. Live Protocol & Sepolia Deployments

### Live Application Endpoints
- **Live Web Application (Vercel):** [https://cipherpool-beta.vercel.app](https://cipherpool-beta.vercel.app)
- **Live Relayer & Indexer (Render):** [https://cipherpool-backend.onrender.com](https://cipherpool-backend.onrender.com)
- **Relayer Health Check:** [https://cipherpool-backend.onrender.com/health](https://cipherpool-backend.onrender.com/health)

### Bytecode-Verified Smart Contracts (Ethereum Sepolia)
| Component | Sepolia Contract Address | Status | Deployment Evidence |
| :--- | :--- | :--- | :--- |
| **Active ConfidentialPool** | [`0xf4Ea29C0966913031770e2Bee2C3259bd5f51714`](https://sepolia.etherscan.io/address/0xf4Ea29C0966913031770e2Bee2C3259bd5f51714) | Corrected deployment | [Deploy transaction](https://sepolia.etherscan.io/tx/0xbe748232c494872cd98215e8e39b23855787b3f92ecd66e2f2f2703954ca8f24) |
| **Active ConfidentialVault** | [`0x21e4aEeE2DCbc7f6d99729C38CdF4CDA73f86507`](https://sepolia.etherscan.io/address/0x21e4aEeE2DCbc7f6d99729C38CdF4CDA73f86507) | Bound to active pool | [Deploy transaction](https://sepolia.etherscan.io/tx/0xeb9f1565eb8010f0d1c983e29bf7e0a66575ed707da56f816d450422a2ec0436) |
| **Archived ConfidentialPool** | [`0x602AE8011F478EBbe87Da760C054B5C25911612a`](https://sepolia.etherscan.io/address/0x602AE8011F478EBbe87Da760C054B5C25911612a) | Exit only; new writes disabled | [Original deployment](https://sepolia.etherscan.io/tx/0x1f4b0bcc4e4436095a7d7412987ef4ec11c1cc72725066d131278d26bc88c9d4) |
| **Custody Asset (USDC)** | [`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`](https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) | Circle Sepolia USDC | [Token contract](https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) |
| **Zama ACL** | [`0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D`](https://sepolia.etherscan.io/address/0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D) | Canonical Sepolia | [Verified Coprocessor ACL](https://sepolia.etherscan.io/address/0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D) |
| **Zama Coprocessor** | [`0x92C920834Ec8941d2C77D188936E1f7A6f49c127`](https://sepolia.etherscan.io/address/0x92C920834Ec8941d2C77D188936E1f7A6f49c127) | Canonical Sepolia | [Verified fhEVM Executor](https://sepolia.etherscan.io/address/0x92C920834Ec8941d2C77D188936E1f7A6f49c127) |
| **Zama KMSVerifier** | [`0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A`](https://sepolia.etherscan.io/address/0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A) | Canonical Sepolia | [Threshold KMS Verifier](https://sepolia.etherscan.io/address/0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A) |

---

## 5. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v22+
- **Foundry**: latest stable (`forge`, `cast`, `anvil`)

### Installation
```bash
git clone https://github.com/Webghost01-NG/fhevm-pooltogether-security.git
cd fhevm-pooltogether-security
npm ci
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Set `RPC_URL` to a real Sepolia RPC endpoint. Frontend deployment addresses and service URLs are environment configuration; the application intentionally refuses transaction flows when required values are missing.
`INDEXER_START_BLOCK` must be the pool deployment block so restarts reconstruct all indexed state.

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

### Run Backend Indexer and Proof Service via Docker
```bash
docker compose up --build
```

---

## 6. Security Invariants & Formal Assumptions

1. **Storage Anchoring:** Calldata can never dictate the ciphertext handle fed into `FHE.checkSignatures`. Handles are immutably retrieved from `_pendingWithdrawals[msg.sender].handle`.
2. **Reentrancy Protection:** Checks-Effects-Interactions (CEI) combined with OpenZeppelin `ReentrancyGuard` on all state-altering operations.
3. **KMS Threshold Security:** Relies on the honest-majority assumption of Zama's KMS signing committee.

### Known deployment limitations

- Frontend writes require both the operations switch and live verification of the configured Sepolia chain, pool runtime bytecode hash, corrected accounting getter, custody address, and token metadata.
- The archived pool remains available only to finalize or cancel requests that already existed before migration. It must never be restored as a write target.
- `finalizeWithdrawal` keys requests by `msg.sender`; therefore the requesting wallet—not a backend relayer—must submit the KMS proof on-chain. The frontend now follows this requirement.

Deployment evidence, service configuration, and rollback instructions are documented in [`docs/operations/sepolia-deployment.md`](docs/operations/sepolia-deployment.md).

---

## 7. Judge Pitch & Layman Explanation

### 30-Second Judge Pitch
> "CipherPool brings confidential prize savings to Zama fhEVM. In standard no-loss pools, participant balances and ticket chances are exposed, enabling MEV sniping and whale surveillance. CipherPool keeps deposits, ticket allocations, and lottery draws homomorphically encrypted (`euint64`) on-chain. Withdrawals employ storage-anchored 2-step settlement verified with Zama KMS threshold proofs, eliminating front-running while preserving self-sovereign user safety."

### 30-Second Layman Explanation
> **What problem does this project solve?** When you save money in conventional crypto prize lotteries, everyone can see your bankroll and track your every move.  
> **Why can't ordinary blockchain apps solve it?** Blockchains are completely transparent by default, exposing every account balance and transaction.  
> **How does CipherPool solve it?** CipherPool converts each public deposit into an encrypted running balance. The protocol can then calculate lottery weights and prizes without revealing a user's current pool position.
