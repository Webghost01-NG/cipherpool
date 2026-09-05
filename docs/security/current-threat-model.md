# Current Runtime Threat Model

## Assets and Invariants

The protected assets are confidential cUSDC custody, encrypted saver positions, encrypted prizes, draw eligibility, and user-authorized KMS reveal rights. The pool must never credit more than the ERC-7984 token actually transfers, award the same reserve twice, withdraw more than an encrypted position, accept a stale proof, or admit a zero position into the bounded draw set.

## Trust Boundaries

- Users, callers, keepers, calldata, public RPCs, the indexer, and the frontend are untrusted for contract safety.
- The configured cUSDC contract is trusted to enforce ERC-7984 encrypted transfers and return the actual transferred ciphertext. Its proxy administrator and upgrades are external risks.
- Zama's Sepolia ACL, coprocessor, and KMS are trusted for FHE execution, permissions, confidentiality, and proof validity.
- The owner can pause/unpause but cannot choose a winner, prize amount, or draw time. Owner-key loss can prevent emergency pauses; it cannot block permissionless draws or withdrawals while unpaused.

## Adversaries

A malicious saver may submit arbitrary external ciphertexts, zero transfers, repeated callbacks, stale proofs, or reentrant calls. A keeper may reorder, withhold, alter, or replay KMS results. A searcher may observe and reorder public transactions. A hostile RPC or frontend may lie about state or transaction targets, so production writes require reviewed bytecode/custody checks and wallet confirmation.

## Security Controls

- Credits use only the configured token callback's returned ciphertext.
- Participant activation/deactivation and draw readiness proofs are bound to storage-anchored handles and single-use request hashes.
- Draw mutation locks prevent balances or reserve handles changing during settlement.
- A fixed prize is encrypted-debited before encrypted winner credit; the readiness proof covers positive weight and sufficient reserve.
- Full-width encrypted sampling and 128-bit scaling avoid power-of-two restrictions and arithmetic overflow.
- Active participants are capped at 12; proof-bound zero-position removal reclaims slots.
- Encrypted withdrawals debit accounting by the token's actual returned transfer and use the same public path for prize and principal.
- Reentrancy guards, pause gates, cadence, and permissionless stale-draw cancellation bound common liveness and replay failures.

## Residual Risks

The code is unaudited. Testnet prizes are sponsor-funded, not yield-generated. Participant addresses/count, fixed prize, timing, readiness, and round count are public. A Zama or cUSDC failure can break confidentiality, correctness, or availability. The bounded linear draw design is not suitable for an unbounded production pool. Independent code review, external-wallet QA, production yield integration, owner hardening, and incident exercises remain required.
