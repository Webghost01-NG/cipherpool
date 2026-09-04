# Bounded Participant Set

Veylott bounds the encrypted weighted-selection loop at 12 active participants. New callbacks are rejected when the set is full, while an already-pending positive-position proof cannot overfill the set. Deposited funds that have not completed activation remain withdrawable but do not enter draw weight.

## Slot Reclamation

An active participant withdrawal creates an encrypted `balance == 0` predicate and a request bound to the chain, pool, wallet, nonce, timestamp, balance handle, and predicate handle. Anyone may relay the matching KMS proof. A verified zero removes the address with swap-and-pop; a verified nonzero clears only the request. The participant can request a fresh check if settlement was interrupted.

Every later deposit or draw award invalidates the prior removal request before its stored balance handle can be reused. Removal therefore cannot subtract a positive balance or replay against new position state. Zero-value callbacks cannot reserve slots because only KMS-verified positive positions are admitted.

## HCU Budget

The bound uses Zama's published [HCU operation schedule](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu): 20,000,000 global HCU and 5,000,000 sequential-depth HCU per transaction.

At 12 participants, `finalizeDraw` consumes an estimated 12,799,000 global HCU: 1,945,000 for weighted-ticket sampling, 864,000 per participant, and 486,000 for final aggregate updates. Its longest dependency chain is approximately 4,283,000 HCU, leaving 717,000 HCU (14.3%) below the depth ceiling. ACL writes do not add homomorphic operations. The local mock-EVM upper-bound test uses 1,849,284 gas, but HCU—not mock gas—is the controlling confidential-compute limit.

The test suite covers capacity races, rejected overflow callbacks, stale proof invalidation, full and partial withdrawals, swap-and-pop index integrity, 256 fuzzed admission sequences, and draw finalization at the exact bound. This is an explicit prototype safety envelope, not a claim of unbounded scalability. A larger production pool requires a different selection architecture or a higher verified HCU budget.
