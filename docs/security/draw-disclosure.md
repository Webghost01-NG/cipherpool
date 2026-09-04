# Draw Disclosure Boundary

## Successor Protocol

`requestDraw` computes an encrypted boolean that is true only when eligible weight is positive and the encrypted prize reserve covers the immutable prize. The request hash binds that predicate to the chain, pool, nonce, timestamp, prize, encrypted total handle, and encrypted reserve handle. Only the predicate is publicly decryptable.

A keeper submits `finalizeDraw(ready, proof)`. `FHE.checkSignatures` rejects a changed bit, substituted handle, stale proof, or replay. A verified false result unlocks the pool without allocating a prize. A verified true result samples against the encrypted total, debits the encrypted reserve, and credits exactly one encrypted weighted interval.

## Public Information

Observers still learn the participant addresses and count, fixed prize, request and settlement timing, readiness bit, finalized-round count, and timeout/cancellation status. Individual positions, aggregate eligible weight, exact reserve, winner, and prize balance remain ciphertexts. The readiness bit is necessary because the contract must branch truthfully between settlement and skip without allowing encrypted arithmetic wraparound to create an unfunded award.

The active Sepolia deployment uses readiness-only settlement. The backend records round metadata but its API does not collect or expose aggregate eligible weight or reserve values.

## Regression Evidence

Tests reject modified, substituted, and replayed readiness proofs; assert that legacy aggregate getters and the aggregate-finalization selector are absent; cover insufficient reserve; preserve non-power-of-two weighted sampling; and execute at the 12-participant HCU ceiling. Settlement events contain only fixed/public round metadata, never aggregate cleartexts.
