# Live Sepolia Prize Lifecycle

Use `npm run lifecycle:sepolia` to inspect or execute one explicit phase of the real Veylott lifecycle. The default action is read-only `preflight`; there is no “run everything” mode. The runner validates Ethereum Sepolia, reviewed runtime bytecode, custody token, pause and pending-draw state, current draw ID, wallet identity, and the complete expected participant set before accepting a write.

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
- `LIFECYCLE_AMOUNT` — human token units for deposits and withdrawals; draws read the immutable amount from `drawPrizeAmount()`.
- `LIFECYCLE_CONFIRM` — the exact phrase printed by a failed dry attempt, binding action, amount, draw ID, pool, and wallet.

Run phases independently: `deposit`, `activate`, `draw`, `reveal-prize`, `claim-prize`, `withdraw`, then `deactivate`. On the active deployment, `deposit` confirms the confidential transfer first, publicly decrypts only the resulting positive-position predicate, then confirms its proof-bound participant activation separately. If that second transaction is interrupted or reverts while the request remains active, run the guarded `activate` phase after ciphertext propagation completes; it never creates another deposit. After a full exit, `deactivate` proves only that the position is zero and reclaims the bounded participant slot. The runner records every receipt and stops truthfully if a predicate is false or interrupted. The draw phase reads the immutable prize/cadence policy and keeps request and KMS finalization together for keeper convenience. Any wallet may request an eligible round, and any keeper may present the valid proof bound to it. The KMS reveals only the stored readiness predicate—not eligible weight or reserve—and `finalizeDraw` verifies that proof-bound bit. The runner prints the confirmed request receipt immediately; if KMS finalization stalls, do not request another draw. Record the request hash and use the deployed contract's 24-hour permissionless cancellation path. A valid false readiness proof records `DrawSkipped` and releases the lock.

`claim-prize` privately decrypts the caller’s prize, rejects zero, re-encrypts the positive amount, and submits the ordinary `withdraw` operation. Public calldata and events therefore do not label the payment as prize rather than principal.

## Completed Active-Deployment Three-Wallet Lifecycle

On 5 September 2026, three separately keyed wallets completed a real lifecycle against the active `readiness-v2` pool. The wallets were isolated in encrypted keystores for this test; this is a multi-key protocol demonstration, not a claim of three independent human reviewers. Each wallet deposited 0.1 cUSDC and explicitly consented to disclosing that test amount. The sponsor disclosed its 0.5 cUSDC reserve contribution. All on-chain transfer inputs and balance, reserve, aggregate-weight, and prize state remained encrypted.

| Phase | Block | Transaction | Verified result |
| --- | ---: | --- | --- |
| Sponsor reserve | `11636879` | [`0x30d5b8…363b`](https://sepolia.etherscan.io/tx/0x30d5b85a4e51c495b4e92ecab20b922328c6fc6dc7715479eef5ec073dc8363b) | Real encrypted 0.5 cUSDC reserve funded |
| Wallet A deposit / activation | `11636884` / `11636885` | [`0x5fcdac…c676`](https://sepolia.etherscan.io/tx/0x5fcdac841c699f4353e90d29b62509bf243af48e1fbbc2ee642b4778cbb7c676) / [`0xf07630…82bd`](https://sepolia.etherscan.io/tx/0xf07630599e5f62c5014f24bd202cf78b7af6023aaf9f9742dc9e7568058882bd) | Encrypted 0.1 cUSDC position; positive-position proof activated |
| Wallet B deposit / activation | `11636891` / `11636902` | [`0xfd5a43…c962`](https://sepolia.etherscan.io/tx/0xfd5a430a141883ba45c07c06a275bd1e1af138a2d775c204e5dd5c5a62b6c962) / [`0xfaf9cf…e2ac`](https://sepolia.etherscan.io/tx/0xfaf9cf893777ac7dd31bb6b885d697bb92742cbc22ebd23c44f85d64a3fde2ac) | Encrypted 0.1 cUSDC position; guarded retry activated without another deposit |
| Wallet C deposit / activation | `11636913` / `11636915` | [`0xce756c…4e97`](https://sepolia.etherscan.io/tx/0xce756c038c7a334f084e5b75df0bafe4404e28a667fe7780215ccd5eb82b4e97) / [`0x357596…a0a9`](https://sepolia.etherscan.io/tx/0x3575963cd7419711278afea74c79b5e7834196884ef801384e7c56d06297a0a9) | Encrypted 0.1 cUSDC position; positive-position proof activated |
| Draw request / KMS finalization | `11636920` / `11636927` | [`0x7d4913…bf54`](https://sepolia.etherscan.io/tx/0x7d49133e11b8685a080ee3303ecedbd3ebd4441b5631922c4ba6ad87cc56bf54) / [`0x0970ff…b320`](https://sepolia.etherscan.io/tx/0x0970fff858788dcbf926730c495fac1bd9ded55114d730aeae0c20b9d642b320) | Readiness `true`; draw 1 finalized over three encrypted weights |
| Private prize claim | `11636938` | [`0xb8f291…d50a`](https://sepolia.etherscan.io/tx/0xb8f29170094ac40f14df409838a08b5303265d6a3b6988a49a7f796db33fd50a) | Wallet B privately revealed 0.5 cUSDC and claimed through ordinary `withdraw` |
| Principal withdrawals | `11636952`, `11636963`, `11636972` | [`B`](https://sepolia.etherscan.io/tx/0x6cbd6a619387f076735de101885fd1ef79348a7f6aa4cb665743a9e2526d40fe), [`C`](https://sepolia.etherscan.io/tx/0x978bab2336402060496cf68f89ca1b76d1b3fb8a728df4c48def3d3f0a2a8571), [`A`](https://sepolia.etherscan.io/tx/0xea70f3a31e98fd1eac11c4af3a5b4ae2a10dd922108e88be0e05b22280afe531) | All three 0.1 cUSDC principals returned |
| Slot reclamation | `11636992`, `11636995`, `11636999` | [`B`](https://sepolia.etherscan.io/tx/0x7712cd65a76bd43b676f1cda5b6f18fb558e73bb4630f42e32043fa2088f21d0), [`C`](https://sepolia.etherscan.io/tx/0x30647f547fd683f9e4965aa013892590cbdfa1eaea3f43ca5736fd8a3283e6ac), [`A`](https://sepolia.etherscan.io/tx/0x98ce8e66519667d7f2cb1a20d4cedc9aea3972fa9130ee7bd8d8a9f9b6a177d1) | Zero-position proofs reduced active participant count from three to zero |

Authorized post-settlement KMS checks returned zero pool position and zero prize for every wallet. The backend independently indexed three deposits, four indistinguishable confidential withdrawals, one reserve-funding event, and one finalized draw. Its API exposes the fixed prize and participant count but no eligible-weight or reserve aggregate.

After evidence capture, Wallets B and C returned their remaining confidential test-token balances to the sponsor in confirmed transfers [`0x45ad02…d84f`](https://sepolia.etherscan.io/tx/0x45ad02269c171690e031fbe40c9673d9185eec6e1f4b4aff5c80185610ced84f) and [`0x2b6097…afd`](https://sepolia.etherscan.io/tx/0x2b60978f5baa2b6025ad75bb91aae014c7671ed90d226220f1dd373c102ceafd). An authorized KMS check then returned a 1,000,000-base-unit sponsor wallet balance, zero pool position, and zero prize. Gas was swept back and the temporary encrypted keystores were securely removed.

Wallet B’s first activation-finalization attempt reverted before consuming its request: [`0x78046f…2b3a`](https://sepolia.etherscan.io/tx/0x78046f550201599b0a7ca336ea3e14b4eec44adc385624340d4f8f1269d02b3a). After ciphertext propagation, the guarded `activate` phase finalized the same request without moving more assets. This is retained as recovery-path evidence rather than omitted.

## Completed Predecessor-Deployment Lifecycle

On 4 September 2026, the runner completed a real 0.5 cUSDC lifecycle against predecessor pool `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0`. No mocked handle, proof, receipt, RPC response, or winner was used. This remains historical protocol evidence.

| Phase | Block | Transaction | Verified result |
| --- | ---: | --- | --- |
| Sponsor reserve | `11634718` | [`0x1a5ec5…2b8d`](https://sepolia.etherscan.io/tx/0x1a5ec5591461605f1de3ec303079d7eaa0d70fdb072d4e7c869b9b2d43de2b8d) | Encrypted 0.5 cUSDC reserve funded |
| Confidential deposit | `11634926` | [`0xe36db7…b39f`](https://sepolia.etherscan.io/tx/0xe36db7ad47a927811971b56166ced5dd5ffa388d368f54623d09d7124ca8b39f) | One encrypted position entered the pool |
| Draw request | `11634931` | [`0xd290ee…3873`](https://sepolia.etherscan.io/tx/0xd290ee8b719917abf4c1207bbffaed7041a19f8f3d9801fba69572b2b64a3873) | Aggregate and reserve handles bound to request `0xc3a4…694d` |
| KMS finalization | `11634933` | [`0x504862…ce6c`](https://sepolia.etherscan.io/tx/0x504862de2aa5ad002f2314ea834b5336d394e9bf111c5652bb16c8700a1ece6c) | Draw 1 finalized with 500,000 weight, 500,000 prize, and zero remaining reserve |
| Private prize claim | `11634944` | [`0x5763be…c969`](https://sepolia.etherscan.io/tx/0x5763bef70ffc5954c640cb1b5c39cad4bf8a56e45b37caa09e55b861184bc969) | Positive privately decrypted prize claimed through ordinary `withdraw` |
| Principal withdrawal | `11634955` | [`0x767d89…5262`](https://sepolia.etherscan.io/tx/0x767d893e35f10c8a6b9c246004a0518bad81a12d021232173815211b7fae5262) | Remaining 0.5 cUSDC principal returned |

The post-settlement authorized KMS check returned zero for both the private pool position and prize counter. The public indexer independently recorded one deposit, two confidential withdrawals, one reserve-funding event, and one finalized draw. Its verified aggregate snapshot is the draw-time value of 1 cUSDC and intentionally remains historical after later private withdrawals.
