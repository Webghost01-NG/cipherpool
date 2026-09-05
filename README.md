# Veylott

<p align="center"><img src="frontend/public/veylott-mark.svg" width="88" alt="Veylott logo" /></p>

Veylott is a confidential prize-savings prototype for Zama fhEVM. It uses the official ERC-7984 `cUSDCMock` wrapper on Ethereum Sepolia so deposit amounts, saved positions, withdrawals, prize reserves, and winner credits remain encrypted on-chain.

The privacy claim is private winner identity and encrypted personal prize balances. The fixed per-round award, participant addresses, and timing are public; a disclosed winner or a single-participant round can reveal who received the public award.

## Sepolia Funding Model

This submission uses the admin-funded prize reserve allowed by the bounty form's mock-yield clarification. Funding is a real encrypted transfer of official test cUSDC; the app never invents balances or yield. Saver principal stays in pool custody and does not pay prizes. An administrator or sponsor supplies the reserve, and each settled award reduces it.

To fund it, configure `RPC_URL`, `POOL_CONTRACT_ADDRESS`, `POOL_RUNTIME_CODE_HASH`, `CUSTODY_ASSET_ADDRESS`, `SPONSOR_AMOUNT`, `SPONSOR_KEYSTORE_PATH`, and `SPONSOR_KEYSTORE_PASSWORD_FILE` locally, then run `npm run fund:sponsor-reserve`. The script verifies the target and requires a successful receipt containing `PrizeReserveFunded`. See the [funding runbook](docs/operations/reserve-funding.md).

A real yield integration would route pooled assets through a compatible confidential ERC-4626 batcher, restore principal cost basis on redemption, and credit only realized surplus to the encrypted reserve. The [production specification](docs/spec/production-yield-architecture.md) defines loss, liquidity, proof, and recovery requirements. That integration is future work; the Sepolia reserve is admin-funded, not earned interest.

> Veylott is research software using test assets. It has not been independently audited and must not hold real funds.

## Why Veylott

Public prize pools reveal each saver’s position and therefore their exact winning odds. Veylott instead performs balance updates, sufficiency checks, and weighted winner selection over `euint64` ciphertexts. A wallet may reveal its own position with an EIP-712 authorization, but the application does not index plaintext user balances.

![Veylott production interface showing a disconnected, privacy-preserving dashboard](docs/showcase/presentation/assets/live-dashboard.png)

The interface reports public protocol health without substituting sample balances when a wallet, deployment check, or verified source is unavailable.

## Architecture

```text
Wallet + Zama Relayer SDK
  │ encrypted amount + input proof
  ▼
Official cUSDCMock (ERC-7984)
  │ actual encrypted transfer amount
  ▼
ConfidentialPool
  ├─ encrypted user positions and prize counters
  ├─ encrypted aggregate liability, eligible draw weight, and prize reserve
  ├─ KMS-verified positive-position participant activation
  ├─ direct confidential withdrawals
  └─ two-step, KMS-verified weighted draws
          │
          ▼
Backend indexer (public events and protocol metadata only)

Sponsor wallet
  └─ encrypted cUSDC testnet contribution ──► prize reserve
```

Deposits use `confidentialTransferAndCall`. The pool credits the encrypted amount returned by the token, preventing a caller from claiming more than was transferred. A new address enters the draw set only after the KMS proves its encrypted position is positive; the amount stays private, stale proofs cannot be replayed, and encrypted-zero callbacks never consume participant capacity. Withdrawals accept an encrypted amount and debit accounting by the token’s actual encrypted transfer result. The snapshot-v3 contract freezes encrypted draw weights, membership, and reserve mutations at request time, while allowing withdrawals during pending settlement and owner pause. Exiting savers retain eligibility for that requested round. It publicly decrypts only a proof-bound draw-readiness bit and scales encrypted randomness by the frozen encrypted total. Neither aggregate amount enters finalization calldata or settlement events. Each saver can privately reveal their own prize counter and claim through the same encrypted withdrawal path as principal. Token, RPC, and FHE execution outages remain external dependencies.

The Sepolia prize reserve is explicitly sponsor-funded. The official Zama cUSDCMock wraps `0x9b5C...DFfF`, whereas Aave Sepolia’s deployed USDC market uses `0x94a9...E4C8`; treating either a passive token holder or an unrelated Aave position as pool yield would be false. The rejected strategy is documented in [the reserve funding model](docs/operations/reserve-funding.md), and the [production yield specification](docs/spec/production-yield-architecture.md) fixes the successor accounting, batching, recovery, and release gates without pretending they are already deployed.

The snapshot-withdrawal successor completed a real operator-owned round with partial and full principal exits during pending settlement, exits during owner pause, KMS finalization against the original weight, and a private prize withdrawal. The [successor release evidence](docs/operations/snapshot-withdrawal-release.md) records its receipts and limitations. The predecessor's [three-wallet lifecycle](docs/operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle) is historical evidence, not proof of independent browser testing on the successor.

Production rendering is reproducibly captured at desktop, tablet, and mobile widths in the [real-wallet and cross-device QA matrix](docs/qa/real-wallet-e2e-matrix.md). The matrix distinguishes confirmed live-chain activity from deterministic wallet tests and keeps independent tester steps visibly open. Independent reviewers should follow the [wallet test runbook](docs/qa/independent-wallet-runbook.md), which separates no-cost checks from the single funded route.

The contracts are not independently audited. The [external audit package](docs/audit/README.md) freezes the exact deployed source/hash, removes stale sign-off claims, maps current threats, and supplies reproducible verification plus an [auditor engagement brief](docs/audit/engagement-brief.md) for a qualified reviewer.

## Live Sepolia Deployment

| Component | Address |
| --- | --- |
| ConfidentialPool (snapshot withdrawals) | [`0x90F72615Be5f05A2ce9DCA540D756a4415CE0AD1`](https://sepolia.etherscan.io/address/0x90F72615Be5f05A2ce9DCA540D756a4415CE0AD1) |
| Official cUSDCMock | [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) |
| Test USDCMock underlying | [`0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`](https://sepolia.etherscan.io/address/0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF) |
| Legacy exit-only pool | [`0x602AE8011F478EBbe87Da760C054B5C25911612a`](https://sepolia.etherscan.io/address/0x602AE8011F478EBbe87Da760C054B5C25911612a) |

- Application: [Veylott live demo](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/)
- Previous pool exit app: [readiness-v2 predecessor](https://veylott-p1wxl07lb-webghost01-ngs-projects.vercel.app/) — existing positions remain there; balances are not migrated automatically.
- Indexer: [cipherpool-backend.onrender.com](https://cipherpool-backend.onrender.com)
- Deployment verification and historical encrypted prize-lifecycle evidence: [Sepolia operations guide](docs/operations/sepolia-deployment.md)
- Official Zama wrapper registry: [Sepolia confidential-token addresses](https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md)

## Demo and First Use

- [Captioned demo video](docs/showcase/presentation/Veylott-Demo.mp4)
- [Presentation PDF](docs/showcase/presentation/Veylott-Presentation.pdf)
- [Editable PowerPoint deck](docs/showcase/presentation/Veylott-Presentation.pptx)
- [Under-three-minute presenter script](docs/showcase/presentation/demo-script.md)
- [Evidence-linked X thread](docs/showcase/x-thread.md)
- [Downloadable X thread image pack](docs/showcase/x-thread-assets/)

To explore safely, open the application, connect the intended wallet on Ethereum Sepolia, and wait for runtime assurance to verify the chain, bytecode, and custody asset. Obtain test USDC, wrap it with the official cUSDC contract, then use Veylott's encrypted deposit, prize-round, private prize claim, and direct-withdrawal actions. Review every wallet prompt before signing and treat only a confirmed receipt as success. The recorded transactions above are historical evidence, not a promise that a new transaction has completed.

## Repository Layout

- `contracts/` — pool, interfaces, and archived legacy components.
- `test/` — Foundry unit, adversarial, and integration tests.
- `frontend/` — React/Vite application.
- `client/` — Zama input-encryption adapter shared by the frontend.
- `backend/` — TypeScript event indexer and read-only API.
- `script/` — reviewed Sepolia deployment script.
- `docs/` — security analysis, operations, UX, and submission material.

## Local Development

Requirements: Node.js 22+, Foundry, and PostgreSQL.

```bash
npm ci
cp .env.example .env
cp frontend/.env.example frontend/.env
npm test
npm run build:backend
npm run build:frontend
```

To make a real encrypted testnet prize contribution, load credentials from an external keystore and run `npm run fund:sponsor-reserve`. Required variables and receipt checks are documented in [the reserve funding guide](docs/operations/reserve-funding.md).

For a fail-closed deposit, draw, private claim, and withdrawal demonstration, use the phase-by-phase [live Sepolia lifecycle guide](docs/operations/live-prize-lifecycle.md). The runner defaults to read-only preflight and requires an exact state-bound confirmation phrase for every write.

Set `RPC_URL` and `DATABASE_URL` in `.env`. Configure at least two independent, credential-free frontend read endpoints in `VITE_SEPOLIA_RPC_URLS` and bind the reviewed code hash to `VITE_POOL_RUNTIME_VERSION`. Public state is read through those endpoints even when no wallet is connected; the injected wallet RPC is used only to verify the transaction route, sign, and submit. Frontend writes remain disabled unless `VITE_ENABLE_PROTOCOL_WRITES=true`, the independent runtime verification succeeds, and the wallet RPC sees the same bytecode.

Run the backend with `npm run build:backend && node dist/backend/src/index.js`. Run the frontend locally with `npx vite --config vite.config.mts`.

## Security Properties

- No active deposit or withdrawal function accepts a plaintext amount.
- The token callback is accepted only from the configured cUSDC contract.
- Invalid callback actions are rejected by returning an encrypted `false`, allowing ERC-7984 to refund.
- Source-level draw proofs reveal only a readiness bit bound to both encrypted aggregate handles stored by the pool.
- An address enters the draw set only after a storage-bound KMS proof verifies its encrypted position is positive.
- Source-level admission is capped at 12 active participants, and a KMS-verified zero position reclaims a slot without revealing the balance amount.
- Any keeper can relay a valid proof for an active draw; the caller cannot change its committed handles or prize amount.
- Draw requests use an immutable prize and minimum cadence; any wallet may request the next eligible round without owner-set timing or prize size.
- A stale draw can be cancelled permissionlessly after 24 hours.
- Protocol writes fail closed when deployment evidence does not match configuration.
- Secrets, private keys, RPC credentials, and deployment tokens must never be committed.

## Current Limitations

- Sepolia prizes are funded by voluntary encrypted sponsor contributions, not generated yield. A production deployment should adopt Zama’s audited confidential batching pattern for an ERC-4626 strategy whose underlying asset matches the pool’s cUSDC wrapper.
- Winner selection remains linear, and the active runtime caps the draw set at 12 participants using the documented Zama HCU budget.
- KMS-verified participant activation, the 12-member ceiling, and proof-bound slot reclamation are live in the active Sepolia runtime.
- The active Sepolia runtime reveals only the proof-bound readiness bit during settlement; exact eligible weight and reserve remain encrypted.
- The active Sepolia pool enforces permissionless, fixed-prize, cadence-controlled draw requests; see [the draw policy](docs/operations/draw-policy.md).

## License

BSD-3-Clause-Clear. See [LICENSE](LICENSE).
