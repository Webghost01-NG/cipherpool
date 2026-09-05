# Veylott Independent Audit Package

## Audit Status

This scope covers the snapshot-withdrawal successor. The [release evidence](../operations/snapshot-withdrawal-release.md) records its two-provider deployment verification and operator-owned live lifecycle. Earlier three-wallet evidence belongs to the predecessor and is not independent validation of this revision.

Veylott is unaudited. This package prepares a reproducible external review; it is not an audit opinion. The immutable source scope is commit [`4510d62995f17e4fec53e5828075d23271c263c8`](https://github.com/Webghost01-NG/veylott/commit/4510d62995f17e4fec53e5828075d23271c263c8), whose contract and deployment-script files remain unchanged on `main`.

## Scope

| Item | Frozen value |
| --- | --- |
| Contract | `contracts/ConfidentialPool.sol` and its imported local interfaces |
| Deployment | `0x90F72615Be5f05A2ce9DCA540D756a4415CE0AD1`, Ethereum Sepolia |
| Runtime hash | `0x633df4b2049aa628ee2395813aeacb8efbc054cc32c1d6dc524f965db661311b` |
| Deployment receipt | [`0x9166ff…ea1b`](https://sepolia.etherscan.io/tx/0x9166ffbdea9c2a2aabf8d2c95d2b5ac0ba79bb39fd6819111b98ff765b4aea1b), block `11639494` |
| Custody dependency | Zama cUSDCMock `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` |
| Compiler | Solidity `0.8.27`, optimizer enabled, 200 runs |

The exact machine-readable values and exclusions are in [`scope.json`](scope.json). The unused legacy `RequestBindingState` base, frontend, backend, deployment infrastructure, Zama protocol contracts, the upgradeable cUSDC implementation, and economic/yield viability are out of the active smart-contract code-review scope, but remain repository, integration, or trust considerations.

## Review Map

Start with the [current threat model](../security/current-threat-model.md), [draw disclosure boundary](../security/draw-disclosure.md), [bounded participant set](../security/bounded-participant-set.md), and [participant activation](../security/participant-activation.md). Then inspect the [live deployment evidence](../operations/sepolia-deployment.md) and [three-wallet lifecycle](../operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle). Files explicitly headed “Archived design” are historical context only and are excluded from current claims.

Priority questions for an independent reviewer:

1. Can any ERC-7984 callback or returned ciphertext create liabilities exceeding custody?
2. Can stale activation, deactivation, readiness, or ACL permissions be replayed after state changes?
3. Can encrypted arithmetic wrap, zero transfers, or an invalid KMS cleartext violate solvency?
4. Does weighted selection remain unbiased and within the documented Zama HCU budget at 12 participants?
5. Can pause, draw locks, KMS outage, token upgrade, or owner failure permanently strand funds?
6. Does public metadata or readiness disclosure exceed the documented privacy boundary?

## Reproduction

```bash
npm ci
forge test -vvv
forge coverage --report summary
npm test
npm run build:backend
npm run build:frontend
AUDIT_RPC_URLS=https://ethereum-sepolia-rpc.publicnode.com,https://sepolia.gateway.tenderly.co npm run verify:audit-scope
```

Recompute coverage for this revision; historical percentages do not establish coverage of new snapshot paths. Coverage is not a proof of correctness, and external dependencies require manual review.

## Deliverable Requirements

The [auditor engagement brief](engagement-brief.md) provides a direct frozen-source download, reviewer independence requirements, minimum manual review procedure, and finding format. An acceptable final report must identify the auditor, scope commit, methodology, findings with severity and proof of impact, remediation status, residual risks, and a signature or independently verifiable publication. Findings must be fixed through separate reviewed PRs and the deployed-runtime correspondence repeated before this package links any report as final.
