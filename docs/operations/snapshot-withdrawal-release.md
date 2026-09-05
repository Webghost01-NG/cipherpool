# Snapshot Withdrawal Release

Status: candidate source only. The deployed `readiness-v2` pool and its historical audit scope still enforce withdrawal locks. Do not configure `snapshot-v3` against that runtime.

The successor stores each participant's encrypted weight at request time. Membership, deposits, and reserve contributions stay locked until settlement; withdrawals and ordinary prize withdrawals remain available during both pending draws and owner pause. Settlement selects against frozen weights and credits current balances. A user who exits after the request remains eligible for that round. Slot reclamation waits for settlement because even a fully withdrawn user can receive its award.

The reserve is separate from user liabilities, so principal exits cannot consume the reserved award. Assuming correct ERC-7984 transfers and no encrypted overflow, custody covers the sum of user balances plus the unallocated reserve: withdrawal reduces custody and user liabilities equally; draw settlement moves the award from reserve into user liabilities. Historical weights are eligibility evidence, never additional liabilities.

## Release Acceptance

- Deploy a new immutable pool with an authorized Sepolia signer; verify creation input, custody, constructor policy, runtime hash, and receipt through two RPCs.
- Exercise full and partial exits while a draw is pending and while the owner has paused new activity. Then settle the original KMS proof, privately verify the award, withdraw it, and reclaim slots.
- Verify KMS settlement failure does not prevent withdrawal submission. Underlying token, RPC, input encryption, and Zama execution availability remain dependencies; this does not promise exits through a protocol-wide outage.
- Measure request and finalization at all 12 slots on the real FHE execution path. Local executor tests validate handle routing and guards, not numerical encrypted solvency or production HCU execution.
- Publish a new audit scope and retain a usable exit path for the predecessor before changing frontend/backend deployment configuration. Only the verified successor may enable `snapshot-v3`.

No successor address, deployment receipt, or independent tester result has been supplied for this candidate. The existing deployment evidence must not be reused as proof of this change.
