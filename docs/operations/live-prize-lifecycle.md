# Live Sepolia Prize Lifecycle

Use `npm run lifecycle:sepolia` to inspect or execute one explicit phase of the real CipherPool lifecycle. The default action is read-only `preflight`; there is no “run everything” mode. The runner validates Ethereum Sepolia, reviewed runtime bytecode, custody token, pause and pending-draw state, current draw ID, wallet identity, and the complete expected participant set before accepting a write.

Load public deployment values from an untracked environment file. Supply the encrypted keystore password through a secret manager or a permission-restricted password file—never command history or the repository.

```bash
LIFECYCLE_ACTION=preflight \
LIFECYCLE_WALLET_ADDRESS=0x... \
npm run lifecycle:sepolia
```

Set `LIFECYCLE_DECRYPT_PRIVATE=true`, `LIFECYCLE_KEYSTORE_PATH`, and either `LIFECYCLE_KEYSTORE_PASSWORD` or `LIFECYCLE_KEYSTORE_PASSWORD_FILE` to include an authorized KMS check. Private values remain reduced to zero/nonzero flags unless `LIFECYCLE_DISCLOSE_PRIVATE_VALUES=true` is explicitly set.

## Write Guard

Every write also requires:

- `LIFECYCLE_EXPECTED_PARTICIPANTS` — comma-separated full addresses, or `none` for a new empty deployment.
- `LIFECYCLE_EXPECTED_DRAW_ID` — the exact current draw counter.
- `LIFECYCLE_AMOUNT` — human token units for deposits, draws, and withdrawals.
- `LIFECYCLE_CONFIRM` — the exact phrase printed by a failed dry attempt, binding action, amount, draw ID, pool, and wallet.

Run phases independently: `deposit`, `draw`, `reveal-prize`, `claim-prize`, then `withdraw`. The runner's draw phase keeps request and KMS finalization together for operator convenience. Any keeper may present the valid proof bound to an active request. The runner prints the confirmed request receipt immediately; if KMS finalization stalls, do not request another draw. Record the request hash and use the deployed contract's 24-hour permissionless cancellation path.

`claim-prize` privately decrypts the caller’s prize, rejects zero, re-encrypts the positive amount, and submits the ordinary `withdraw` operation. Public calldata and events therefore do not label the payment as prize rather than principal.

## Completed Predecessor-Deployment Lifecycle

On 4 September 2026, the runner completed a real 0.5 cUSDC lifecycle against predecessor pool `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0`. No mocked handle, proof, receipt, RPC response, or winner was used. This remains historical protocol evidence; the current permissionless-finalization deployment began at block `11635277` with empty state.

| Phase | Block | Transaction | Verified result |
| --- | ---: | --- | --- |
| Sponsor reserve | `11634718` | [`0x1a5ec5…2b8d`](https://sepolia.etherscan.io/tx/0x1a5ec5591461605f1de3ec303079d7eaa0d70fdb072d4e7c869b9b2d43de2b8d) | Encrypted 0.5 cUSDC reserve funded |
| Confidential deposit | `11634926` | [`0xe36db7…b39f`](https://sepolia.etherscan.io/tx/0xe36db7ad47a927811971b56166ced5dd5ffa388d368f54623d09d7124ca8b39f) | One encrypted position entered the pool |
| Draw request | `11634931` | [`0xd290ee…3873`](https://sepolia.etherscan.io/tx/0xd290ee8b719917abf4c1207bbffaed7041a19f8f3d9801fba69572b2b64a3873) | Aggregate and reserve handles bound to request `0xc3a4…694d` |
| KMS finalization | `11634933` | [`0x504862…ce6c`](https://sepolia.etherscan.io/tx/0x504862de2aa5ad002f2314ea834b5336d394e9bf111c5652bb16c8700a1ece6c) | Draw 1 finalized with 500,000 weight, 500,000 prize, and zero remaining reserve |
| Private prize claim | `11634944` | [`0x5763be…c969`](https://sepolia.etherscan.io/tx/0x5763bef70ffc5954c640cb1b5c39cad4bf8a56e45b37caa09e55b861184bc969) | Positive privately decrypted prize claimed through ordinary `withdraw` |
| Principal withdrawal | `11634955` | [`0x767d89…5262`](https://sepolia.etherscan.io/tx/0x767d893e35f10c8a6b9c246004a0518bad81a12d021232173815211b7fae5262) | Remaining 0.5 cUSDC principal returned |

The post-settlement authorized KMS check returned zero for both the private pool position and prize counter. The public indexer independently recorded one deposit, two confidential withdrawals, one reserve-funding event, and one finalized draw. Its verified aggregate snapshot is the draw-time value of 1 cUSDC and intentionally remains historical after later private withdrawals.
