# Forensic Audit: Core Contract Interfaces & Error Types

> **Archived design:** This document describes the superseded plaintext-custody pool and is retained only as historical analysis. It is not evidence for the active ERC-7984 deployment; see [`docs/ux/user-flows.md`](../ux/user-flows.md) and [`docs/operations/sepolia-deployment.md`](../operations/sepolia-deployment.md).

**Issue Reference:** [#8 — feat(interface): Define core contract interfaces, structs, and custom errors](https://github.com/Webghost01-NG/fhevm-pooltogether-security/issues/8)  
**Pull Request:** Planned for Issue #8  
**Milestone:** Phase 2 — Project Architecture & Threat Modeling  
**Author:** Security Research Team  
**Audit Version:** 1.0  
**Status:** Audit Complete  

---

## 1. Scope of Audit

This audit validates the formal Solidity interface definitions created in `contracts/interfaces/`:
- `IPoolErrors.sol`: Protocol-wide custom errors.
- `IPoolEvents.sol`: Off-chain indexing and relayer event definitions.
- `IPoolTypes.sol`: Canonical structs for requests, draws, and pool configuration.
- `IConfidentialPool.sol`: Core contract interface for custody-bound encrypted accounting, 2-step withdrawal, and draw.
- `IConfidentialVault.sol`: Strategy custody and yield harvesting interface.

---

## 2. Invariant & Security Verification

### 2.1 Type Alignment with Zama fhEVM v0.13.3
- Deposits accept a single public `uint64` custody amount and derive the matching `euint64` credit on-chain.
- Internal encrypted handles strictly use `euint64` imported from `@fhevm/solidity/lib/FHE.sol`.
- Return handles for off-chain re-encryption strictly return raw `bytes32` via `getBalanceHandle` and `getPrizeHandle`.

### 2.2 Revert Determinism & Gas Optimization
- All revert conditions utilize custom errors (`error Name(...)`) rather than string reverts.
- Parameters in errors (`InvalidDecryptedAmount`, `WithdrawalNotStale`, `HandleMismatch`) supply explicit debugging contexts to client relayers without leaking encrypted plaintext.

### 2.3 Storage Struct Integrity
- `WithdrawalRequest` contains:
  - `euint64 handle`: 32-byte custom user type.
  - `uint64 requestedAmount`: 8-byte plaintext integer.
  - `uint64 timestamp`: 8-byte block timestamp.
  - `bool active`: 1-byte boolean flag.
  - `bytes32 requestHash`: 32-byte cryptographic binding hash.
- EVM Storage Packing: `requestedAmount` (8 bytes) + `timestamp` (8 bytes) + `active` (1 byte) pack efficiently into a single 32-byte storage slot (17 bytes total), reducing cold storage read/write costs.

### 2.4 Compilation Verification
- **Compiler:** Solc `0.8.27`
- **Command:** `forge build`
- **Result:** `Compiler run successful!` with zero warnings.

---

## 3. Acceptance Criteria Checklist

- [x] Full compilation against Solidity `^0.8.24` / `0.8.27`.
- [x] Complete struct definitions for `WithdrawalRequest`, `DrawRecord`, and `PoolParameters`.
- [x] Comprehensive custom error catalog covering all invalid state transitions.
- [x] Fully indexed events matching backend indexer specifications.
- [x] Raw handle accessors (`getBalanceHandle`, `getPrizeHandle`) for client re-encryption.
