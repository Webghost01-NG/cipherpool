# Sepolia Deployment and Rollback

## Active Deployment Evidence

The corrected contracts were broadcast from repository commit `d05751b` on Ethereum Sepolia (`11155111`). Both creation transactions were compared byte-for-byte with locally compiled creation bytecode and ABI-encoded constructor arguments before activation.

| Component | Address | Block | Transaction | Runtime code hash |
| --- | --- | ---: | --- | --- |
| ConfidentialPool | `0xf4Ea29C0966913031770e2Bee2C3259bd5f51714` | `11628407` | `0xbe748232c494872cd98215e8e39b23855787b3f92ecd66e2f2f2703954ca8f24` | `0x1af2ff9df83b63f8563848fe5552dd4c7fb668c43524b5a44ebb50c956604870` |
| ConfidentialVault | `0x21e4aEeE2DCbc7f6d99729C38CdF4CDA73f86507` | `11628408` | `0xeb9f1565eb8010f0d1c983e29bf7e0a66575ed707da56f816d450422a2ec0436` | `0x0799aea498eaa3507f64f4e66a528ad1ffd2b6f3acd9517b5c3c6562af2cfbfc` |

The pool reports custody asset `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, cancellation delay `86400`, unpaused state, and zero initial deposits, prizes, accounted balances, and yield. The vault reports the same asset and the active pool address.

## Runtime Activation

Render must index the active pool from block `11628407` and must pass startup verification for chain ID, runtime code hash, custody address, and `totalAccountedBalancePlain()`. Vercel receives the matching public metadata plus `VITE_LEGACY_POOL_ADDRESS=0x602AE8011F478EBbe87Da760C054B5C25911612a`.

Activate in this order:

1. Deploy Render with the active address, deployment block, custody address, and runtime hash.
2. Confirm `/health` and `/api/v1/pool/state` return successfully.
3. Deploy Vercel with `VITE_ENABLE_PROTOCOL_WRITES=false` and verify the active and archived reads.
4. Set `VITE_ENABLE_PROTOCOL_WRITES=true`, redeploy, and confirm the UI reports `Deployment verified` before testing a write.

## Rollback

1. Immediately set `VITE_ENABLE_PROTOCOL_WRITES=false` and redeploy Vercel.
2. If the contract itself is unsafe, call `pause()` from the active pool owner and confirm `paused() == true` on Sepolia.
3. Keep Render pointed at the active deployment for incident reconstruction; do not substitute the archived vulnerable pool.
4. Keep the archived exit card available so pre-migration requests can still be finalized or cancelled.
5. Record the incident, affected deployment hash, and recovery verification before re-enabling writes.

Never commit RPC credentials, deployment-wallet secrets, Vercel tokens, or Render API keys. Rotate any credential exposed outside the operating-system secret store.
