# Sepolia Deployment and Rollback

## Active Deployment Evidence

The active contracts were broadcast from repository commit `3308b0fafa724760f7887af90c8f75273cafc5c3` on Ethereum Sepolia (`11155111`). Both creation transactions were compared byte-for-byte with locally compiled creation bytecode and ABI-encoded constructor arguments before activation.

| Component | Address | Block | Transaction | Runtime code hash |
| --- | --- | ---: | --- | --- |
| ConfidentialPool | `0x105C57860b32a37F3C7CF2AEcF5a39AbbCA1d265` | `11628822` | `0xf92d5f8e11c97c03d2cc1f9d18c3b928085a59bba2477647c837bf066ae8bc55` | `0x0d64b3c5225b9998dbe18358011bded115d122477dff41308079b50e0df28f6f` |
| ConfidentialVault | `0xF159100235A8B820CfF03aB402cD9d1D0d18aCDf` | `11628822` | `0xc0e3fcd7a38faede8b7c148f25f30b14173ff2ef030a5b210d010324045f5c2a` | `0x0bb78e3b972d62ba06bc8ac94958177a84105e52ce810b3df5f77f09c4118ff5` |

The pool reports custody asset `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, confidential protocol ID `10001`, cancellation delay `86400`, unpaused state, and canonical Sepolia ACL, executor, and KMS verifier values in its coprocessor storage. The vault reports the same asset and the active pool address.

The previous candidate pool at `0xf4Ea29C0966913031770e2Bee2C3259bd5f51714` omitted `ZamaEthereumConfig`. Its FHE calls reverted before custody transfer, it accepted no deposits, and it is not an active or legacy-exit target.

## Live KMS Settlement Evidence

A real 1 USDC cycle used the deployment wallet, Circle Sepolia USDC, and the official Zama relayer. No mocked handles, proofs, RPC responses, or transaction hashes were used.

| Step | Block | Transaction | Verified result |
| --- | ---: | --- | --- |
| Deposit | `11628842` | `0x9343409424cdc02a24072d5387bb66024e93571348717ca4c07ddeaf44f78e2e` | Receipt succeeded; custody and accounted balance increased by `1000000` |
| Withdrawal request | `11628864` | `0x31ae42662b335897374765e8e7ef1de68ac5a19e5be03aa87b9692590a9f7a6b` | Request `0x2e55986f341c7c0fb273331c93188eefc00eb882904e316e8b1f16a8e6f43025` anchored handle `0x68d1d00b06e910ae47dae291dec47cfa46b80110bdff0000000000aa36a70500` |
| Finalization | `11628885` | `0xc160a12430dc923605816d1c80cd391dc46dccb911ca35c9cae424891a2f3878` | Receipt succeeded and emitted `PublicDecryptionVerified` plus `WithdrawalFinalized` for `1000000` |

The official KMS returned a 456-byte proof. After finalization, the wallet held its original 20 USDC, pool custody and aggregate liabilities were zero, and the pending request storage was cleared. Render then replayed the deployment logs and recorded `Deposited`, `WithdrawalRequested`, and `WithdrawalFinalized` for the same user and request hash.

## Runtime Activation

Render must index the active pool from block `11628822`, connect through `DATABASE_URL` to the Frankfurt Neon PostgreSQL project, and pass startup verification for chain ID, runtime code hash, custody address, and `totalAccountedBalancePlain()`. The indexer stores one versioned checkpoint under `<chain-id>:<lowercase-pool-address>` after each complete block batch. Vercel receives the matching public metadata plus `VITE_LEGACY_POOL_ADDRESS=0x602AE8011F478EBbe87Da760C054B5C25911612a`.

Activate in this order:

1. Provision PostgreSQL in Neon’s Frankfurt region and set the backend's `DATABASE_URL` to its pooled TLS connection URL.
2. Deploy Render with the active address, deployment block, custody address, and runtime hash.
3. Confirm the logs report either a restored checkpoint or a first replay, then verify `/health` and `/api/v1/pool/state`.
4. Deploy Vercel with `VITE_ENABLE_PROTOCOL_WRITES=false` and verify the active and archived reads.
5. Set `VITE_ENABLE_PROTOCOL_WRITES=true`, redeploy, and confirm the UI reports `Deployment verified` before testing a write.

## Rollback

1. Immediately set `VITE_ENABLE_PROTOCOL_WRITES=false` and redeploy Vercel.
2. If the contract itself is unsafe, call `pause()` from the active pool owner and confirm `paused() == true` on Sepolia.
3. Keep Render pointed at the active deployment for incident reconstruction; do not substitute the archived vulnerable pool.
4. Keep the archived exit card available so pre-migration requests can still be finalized or cancelled.
5. Record the incident, affected deployment hash, and recovery verification before re-enabling writes.

If the checkpoint is unavailable, leave writes disabled while restoring PostgreSQL. Deleting a checkpoint intentionally causes a full replay from `INDEXER_START_BLOCK`; never manually advance `next_block_number` without matching state from the same completed batch.

Never commit RPC credentials, deployment-wallet secrets, Vercel tokens, or Render API keys. Rotate any credential exposed outside the operating-system secret store.
