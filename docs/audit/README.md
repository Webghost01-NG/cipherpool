# Veylott Independent Audit Package

## Audit Status

Veylott is unaudited. This package prepares a reproducible external review; it is not an audit opinion. The immutable source scope is commit [`92a51ab869e706a3b53e3be63d411b01eb06ac09`](https://github.com/Webghost01-NG/veylott/commit/92a51ab869e706a3b53e3be63d411b01eb06ac09), whose contract and deployment-script files remain unchanged on `main`.

## Scope

| Item | Frozen value |
| --- | --- |
| Contract | `contracts/ConfidentialPool.sol` and its imported local interfaces |
| Deployment | `0x2150d7D82117b927Dd3253935E34f67D8B37d424`, Ethereum Sepolia |
| Runtime hash | `0x38dcfee7fcbecb12f8be9c4d73c596e7f9bc1b0a3d910e49cc8d8a3cc7af4ed4` |
| Deployment receipt | [`0x89f75d…19f0`](https://sepolia.etherscan.io/tx/0x89f75d0986b7d4bd5000a5e72acec640cfd32d00c09f78f96a060087f48a19f0), block `11636641` |
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

The core pool currently has 100% line and function coverage. Coverage is not a proof of correctness; branch coverage and the external dependencies still require manual review.

## Deliverable Requirements

An acceptable final report must identify the auditor, scope commit, methodology, findings with severity and proof of impact, remediation status, residual risks, and a signature or independently verifiable publication. Findings must be fixed through separate reviewed PRs and the deployed-runtime correspondence repeated before this package links any report as final.
