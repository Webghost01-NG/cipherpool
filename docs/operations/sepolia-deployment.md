# Sepolia Deployment and Rollback

## Active Deployment Evidence

The active pool uses the official Zama `cUSDCMock` ERC-7984 wrapper on Ethereum Sepolia (`11155111`). The broadcast creation input was compared byte-for-byte with the locally compiled creation bytecode and ABI-encoded constructor arguments.

| Component | Address | Block | Transaction | Runtime code hash |
| --- | --- | ---: | --- | --- |
| ConfidentialPool | `0x2150d7D82117b927Dd3253935E34f67D8B37d424` | `11636641` | [`0x89f75d...`](https://sepolia.etherscan.io/tx/0x89f75d0986b7d4bd5000a5e72acec640cfd32d00c09f78f96a060087f48a19f0) | `0x38dcfee7fcbecb12f8be9c4d73c596e7f9bc1b0a3d910e49cc8d8a3cc7af4ed4` |
| Official cUSDCMock | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama-managed | [Contract](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) | Upgradeable proxy |

Verified initial state:

- Owner: `0xF19125e08AFC9502DCde60703c1E24C334902356`
- Custody asset: official cUSDCMock address above
- Runtime size: `14,855` bytes
- Cancellation delay: `86,400` seconds
- Draw interval: `604,800` seconds; fixed prize: `500,000` base units
- Paused: `false`; draw count and participant count: `0`

## Predecessor ERC-7984 Round Trip

No mocked handle, proof, RPC response, or transaction hash was used in this validation of the predecessor pool at `0xE47eF44EBB804A507173BEFa5beb2325aA7451AD`. Ten test USDCMock were minted and wrapped 1:1. A 1 cUSDC amount was encrypted by the official Zama Sepolia relayer, transferred into the pool through the ERC-7984 callback, then withdrawn through the pool’s encrypted withdrawal entry point.

| Step | Block | Transaction | Result |
| --- | ---: | --- | --- |
| Mint 10 USDCMock | `11632712` | [`0x67e64a...`](https://sepolia.etherscan.io/tx/0x67e64a5729f350bf79c41fda5e4c4580419c280e315ef45e17b1a3e37ea7d099) | Public test underlying minted |
| Approve wrapper | `11632713` | [`0x942a22...`](https://sepolia.etherscan.io/tx/0x942a22c8abc6a710993685257304379f40661f9c483933053988ffae9b7f619c) | Wrapper allowance confirmed |
| Wrap to cUSDC | `11632715` | [`0xaf8fc6...`](https://sepolia.etherscan.io/tx/0xaf8fc6d362ea25a54f17e3341c081241d08e528e8acca95328ea5d0e020a7ce0) | Encrypted cUSDC position created |
| Confidential deposit | `11632733` | [`0x36f81f...`](https://sepolia.etherscan.io/tx/0x36f81f06a30a600ed67e70e19a0d6239beb1d31fceb3822decfc88f7e7cdfa87) | Participant count and deposit nonce became `1`; encrypted aggregate matched encrypted user position |
| Confidential withdrawal | `11632753` | [`0x8ee0e4...`](https://sepolia.etherscan.io/tx/0x8ee0e488e23620b567ac8b105a0b5d43d3bde2c72f84113889f8f48784738429) | Direct ERC-7984 transfer returned custody to the wallet |

An authorized KMS user-decryption after settlement returned pool position `0` and wallet cUSDC balance `10,000,000` base units. These clear values were obtained only with the deployment wallet’s EIP-712 authorization.

## Sponsor-Funded Prize Reserve

Sepolia now has a verified exact-asset confidential vault and two-way batchers, but its vault is passive: it reports no strategy adapters, no liquidity adapter, and `maxRate = 0`. It cannot currently generate prizes. The placeholder token-holding vault remains removed and the active testnet reserve remains explicitly sponsor-funded; see [the funding model and reproducible venue check](reserve-funding.md).

| Step | Block | Transaction | Result |
| --- | ---: | --- | --- |
| Encrypted 1 cUSDC sponsor contribution | `11632933` | [`0x07b797...`](https://sepolia.etherscan.io/tx/0x07b797674aa730eea1b851d5ed78352741d7029ef0b1168521244c81e1057eaa) | Confirmed `PrizeReserveFunded`; backend indexed one funding event; authorized KMS verification confirmed the wallet moved from 10 to 9 cUSDC |
| Encrypted 0.5 cUSDC contribution to predecessor pool | `11634718` | [`0x1a5ec5...`](https://sepolia.etherscan.io/tx/0x1a5ec5591461605f1de3ec303079d7eaa0d70fdb072d4e7c869b9b2d43de2b8d) | Confirmed sponsor funding used in the historical complete lifecycle |

## Superseded Draw Incident

An earlier predecessor pool accepted a real 8 cUSDC deposit and draw request, but finalization reverted because the prior bounded-randomness implementation required a power-of-two total. Pool `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0` replaced that implementation with unbiased scaling over an unbounded encrypted `uint64`. The affected predecessor remains excluded from active configuration; its stale draw can be cancelled permissionlessly after the configured delay.

## Historical Full Prize Lifecycle

Pool `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0` completed the full real flow before the permissionless-finalization migration: encrypted 0.5 cUSDC deposit, KMS-verified draw request and finalization, private winner check, prize claim through the ordinary withdrawal path, and principal withdrawal. Draw 1 finalized in block `11634933` with total weight `500,000`, prize `500,000`, and zero remaining reserve. Post-settlement authorized KMS verification returned a zero private position and zero prize counter. See the [phase-by-phase evidence](live-prize-lifecycle.md) for every confirmed transaction.

## Runtime Activation

The backend uses `INDEXER_START_BLOCK=11636641` and namespaces its checkpoint by chain ID plus lowercased pool address. The frontend and backend were independently verified against the address, custody asset, and runtime hash above before writes were enabled. Historical predecessor receipts are not copied into its live indexer state. KMS-verified positive-position activation and zero-balance slot reclamation are active in this runtime.

On 5 September 2026, the active pool completed draw 1 over three separately keyed wallets. The reserve funding, deposits, readiness-only KMS finalization, private winner claim, principal withdrawals, and return to zero active participants are linked in the [active-deployment lifecycle](live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle).

Frontend public reads use the comma-separated `VITE_SEPOLIA_RPC_URLS` list and require at least two HTTPS endpoints. These endpoints are independent of the injected wallet. The reviewed `VITE_POOL_RUNTIME_CODE_HASH` selects the `readiness-v2` ABI; unknown bytecode fails closed instead of trying an assumed ABI. A connected wallet must independently see the same runtime on chain ID `11155111` before transactions are enabled. The deployed creation input exactly matches the local initcode plus constructor arguments, and four independent RPCs returned the same runtime hash.

## Rollback

1. Set `VITE_ENABLE_PROTOCOL_WRITES=false` and redeploy the frontend.
2. If the contract is unsafe, call `pause()` from the pool owner and confirm the receipt and `paused()` state.
3. Keep the indexer pointed at the affected deployment for incident reconstruction.
4. Keep the legacy exit-only pool available only for requests created before migration.
5. Record the incident and new verification evidence before re-enabling writes.

Never commit deployment-wallet secrets, RPC credentials, Vercel tokens, Render keys, or database URLs.
