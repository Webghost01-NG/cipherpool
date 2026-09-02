# FHEVM Confidential PoolTogether — Security & Verification Research

A rigorous security research, formal analysis, and adversarial verification project focused on confidential prize savings protocols built on Zama's Fully Homomorphic Encryption Virtual Machine (fhEVM).

---

## Research Overview

This repository documents the end-to-end security architecture, cryptographic handle provenance, and application-level domain separation models required to safely build confidential financial primitives using `@fhevm/solidity@0.13.3` and Zama coprocessor host infrastructure.

### Core Security Scope

1. **Handle Provenance & Cross-Contract Substitution:** Ensuring ciphertext handles cannot be forged, manipulated, or re-used across different smart contract contexts.
2. **Cryptographic Binding:** Auditing EIP-712 KMS decryption signatures (`FHE.checkSignatures`) and identifying where protocol-level vs. application-level protections are required.
3. **Storage-Anchored Execution:** Proving that withdrawal and settlement pipelines read ciphertext handles exclusively from immutable contract storage rather than calldata.
4. **Replay & Re-entrancy Prevention:** Establishing strict Checks-Effects-Interactions (CEI) state machines to guarantee single-use consumption of KMS decryption proofs.

---

## Project Milestones

| Milestone | Description | Status |
| :--- | :--- | :--- |
| **Phase 1 — Cross-Contract Handle Provenance Investigation** | Forensic audit of FHEVM v0.13.3 source, FHEVMExecutor DAG handle derivation, and cross-contract boundaries. | **Complete** |
| **Phase 2 — Application-Level Domain Binding Analysis** | Formal mapping of application-level request binding, storage-anchoring invariants, and withdrawal state transitions. | **Active** |
| **Phase 3 — Adversarial Testing & Exploit Simulation** | Automated adversarial test suites, mock coprocessor exploit simulations, and replay test execution. | **Planned** |
| **Phase 4 — Formal Security Validation** | Mathematical verification of balance invariance, privacy boundaries, and state consistency. | **Planned** |
| **Phase 5 — Final Audit Report & Evidence** | Consolidated security audit report, cryptographic proofs, and Sepolia runtime readiness sign-off. | **Planned** |

---

## Phase 1 Forensic Conclusions Summary

1. **Deterministic DAG Handles:** In Zama FHEVM, computation handles are deterministic hashes over `(op, lhs, rhs, scalar, acl, block.chainid)`.
2. **User Input Domain Isolation:** User input ciphertexts (`FHE.fromExternal`) require an EIP-712 ZKPoK signature strictly bound to the target dApp contract address (`InputVerifier.sol:301`).
3. **Cryptographic Uniqueness:** Fresh LWE encryption noise ensures that user deposit handles are mathematically distinct across contracts ($P_{\text{collision}} < 2^{-160}$).
4. **Storage Anchoring:** Constructing verification handle arrays exclusively from internal contract storage (`pendingWithdrawals[msg.sender].handle`) guarantees that external attackers cannot substitute arbitrary handles into `FHE.checkSignatures`.

---

## Engineering Discipline

- Work proceeds strictly across scoped, single-objective issues.
- All implementation changes require dedicated feature/audit branches, isolated PRs, and passing test suites.
- No direct commits to `main`.
