# Snapshot Withdrawal Release

Status: successor deployed and operator-owned live lifecycle confirmed on 5 September 2026. Frontend activation must use the exact `snapshot-v3` deployment below. The predecessor `readiness-v2` pool retains its original restrictions.

The successor stores each participant's encrypted weight at request time. Membership, deposits, and reserve contributions stay locked until settlement; withdrawals and ordinary prize withdrawals remain available during both pending draws and owner pause. Settlement selects against frozen weights and credits current balances. A user who exits after the request remains eligible for that round. Slot reclamation waits for settlement because even a fully withdrawn user can receive its award.

The reserve is separate from user liabilities, so principal exits cannot consume the reserved award. Assuming correct ERC-7984 transfers and no encrypted overflow, custody covers the sum of user balances plus the unallocated reserve: withdrawal reduces custody and user liabilities equally; draw settlement moves the award from reserve into user liabilities. Historical weights are eligibility evidence, never additional liabilities.

## Release Acceptance

- Deploy a new immutable pool with an authorized Sepolia signer; verify creation input, custody, constructor policy, runtime hash, and receipt through two RPCs.
- Exercise full and partial exits while a draw is pending and while the owner has paused new activity. Then settle the original KMS proof, privately verify the award, withdraw it, and reclaim slots.
- Verify KMS settlement failure does not prevent withdrawal submission. Underlying token, RPC, input encryption, and Zama execution availability remain dependencies; this does not promise exits through a protocol-wide outage.
- Measure request and finalization at all 12 slots on the real FHE execution path. Local executor tests validate handle routing and guards, not numerical encrypted solvency or production HCU execution.
- Publish a new audit scope and retain a usable exit path for the predecessor before changing frontend/backend deployment configuration. Only the verified successor may enable `snapshot-v3`.

## Verified Successor

- Pool: `0x90F72615Be5f05A2ce9DCA540D756a4415CE0AD1` on Ethereum Sepolia.
- Contract source: `4510d62995f17e4fec53e5828075d23271c263c8`.
- Runtime hash: `0x633df4b2049aa628ee2395813aeacb8efbc054cc32c1d6dc524f965db661311b`.
- [Creation receipt](https://sepolia.etherscan.io/tx/0x9166ffbdea9c2a2aabf8d2c95d2b5ac0ba79bb39fd6819111b98ff765b4aea1b), block `11639494`.
- Two independent RPCs (PublicNode and Tenderly) verified runtime, creation input, constructor policy, receipt, owner, and custody using `npm run verify:audit-scope`.
- Unchanged policy: 12 active slots, seven-day draw interval, 24-hour cancellation delay, fixed 0.5 cUSDC award.

## Real Live Lifecycle

The operator sponsored 0.5 cUSDC and deposited 0.1 cUSDC using real Zama input proofs. These are voluntarily disclosed test amounts, not public access to other users' balances.

| Action | Confirmed receipt |
| --- | --- |
| Sponsor reserve | [11639513](https://sepolia.etherscan.io/tx/0x115f6d19116db394c1911e746b2f4dacf35d21a1cc115558c39c0036055047f1) |
| Deposit | [11639517](https://sepolia.etherscan.io/tx/0xf726b6885d85edc4516770c3f2d31d923af729496b62bfab1f9f135b9d7d01f5) |
| Request draw | [11639520](https://sepolia.etherscan.io/tx/0xca781538074ebd7afb28839743cb86105ad5fa1cd056415d9faae2f8f223cf40) |
| Withdraw 0.04 while pending | [11639524](https://sepolia.etherscan.io/tx/0xad071b434a42a3c46c29f0e38a981e5656a751a6636c50cd1d2a675a45f102ee) |
| Withdraw remaining principal while pending and paused | [11639532](https://sepolia.etherscan.io/tx/0xc25bdf975a322e8b1bcdb4281d2d5c914c8e68f06ecb14eb99ecde70fb18be4b) |
| KMS-finalize original draw while paused | [11639535](https://sepolia.etherscan.io/tx/0x7fd7d8ae7e5e14b959e5967320b4958eefc47d73c9e04c48f6f107130f0233c8) |
| Withdraw prize while paused | [11639541](https://sepolia.etherscan.io/tx/0x30edba521f79d454a403692a68053b541b0f679ebc34b99a8b66c105250563e2) |
| Reclaim empty participant slot | [11639543](https://sepolia.etherscan.io/tx/0x83a769685ec542e391ec7e90d8dd7b5cca9fcec8b5d7242f293aadc3d0f52ee8) |
| Unpause | [11639544](https://sepolia.etherscan.io/tx/0x7a0db6139c3987da14db11e52dc0d2cd51dc91337ab023af270347bb5f3ea1c8) |

Authorized private decryptions confirmed zero principal before settlement, the correct prize afterward, then zero position/prize and restoration of the operator's starting wallet token balance. Final observed state: one finalized round, zero participants, no pending draw, unpaused. A new round still requires the genuine seven-day cadence and funded reserve; no round is fabricated for a demo.

This is an operator-owned singleton test, not independent human-wallet QA, a 12-slot live capacity benchmark, or an audit. Those validation gaps remain explicit. Tests with the local FHE executor validate routing and guards, not numerical encrypted execution.

## Predecessor Exits

Existing funds remain at `0x2150d7D82117b927Dd3253935E34f67D8B37d424`. The [immutable predecessor app](https://veylott-p1wxl07lb-webghost01-ngs-projects.vercel.app/) retains its old runtime configuration and exit flow. Do not repurpose the separate plaintext legacy-exit ABI for this pool. The new app links this exit path; it does not migrate or reset anyone's balance.
