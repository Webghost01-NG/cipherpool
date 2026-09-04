# Private Participant Activation

ERC-7984 returns the actual transfer result as an encrypted value, including encrypted zero when a wallet lacks funds. Veylott must not branch on that value synchronously or add every callback sender to its permanent draw array.

Each non-participant balance mutation now computes the encrypted predicate `position > 0`, makes only that boolean publicly decryptable, and replaces the wallet’s pending activation request. The request hash binds the chain, pool, wallet, per-wallet nonce, timestamp, current balance handle, and eligibility handle. Any later deposit or withdrawal produces a new balance and request, so an earlier KMS proof cannot validate against current storage.

Any account may submit `finalizeParticipantActivation(user, eligible, proof)`. The contract verifies the KMS signature against the stored eligibility handle. A verified `true` adds the wallet exactly once and moves its encrypted balance into the separate eligible-weight aggregate. A verified `false` clears the request without consuming participant capacity. Draws snapshot only this eligible aggregate; unverified positions therefore cannot dilute selection or create a ticket range with no winner.

The boolean result discloses no amount. A successful result reveals only what public participant membership already conveys: the wallet held a positive position at activation. Individual balances, subsequent deposits, withdrawals, ticket weight, and prize values remain encrypted.

Activation is intentionally recoverable. If the browser closes or a wallet rejects the finalization transaction, custody is unchanged and the interface exposes a retry action. Test-only FHE and KMS doubles remain under `test/`; production paths require a real Zama public-decryption proof.

This mechanism prevents zero-callback list expansion. It does not compact previously activated addresses after they later withdraw fully; bounded or removable participant sets remain part of the separate scalability work.
