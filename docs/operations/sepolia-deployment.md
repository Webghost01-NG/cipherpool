# Sepolia Deployment and Rollback

## Active Deployment Evidence

The active pool uses the official Zama `cUSDCMock` ERC-7984 wrapper on Ethereum Sepolia (`11155111`). The broadcast creation input was compared byte-for-byte with the locally compiled creation bytecode and ABI-encoded constructor arguments.

| Component | Address | Block | Transaction | Runtime code hash |
| --- | --- | ---: | --- | --- |
| ConfidentialPool | `0xE47eF44EBB804A507173BEFa5beb2325aA7451AD` | `11632698` | [`0x975f25...`](https://sepolia.etherscan.io/tx/0x975f25bb9a538be979f95649c1dd52756e7df6bbac6cd58424f8505d70666b29) | `0xbc5984bbcc66d3f24893ec880973aa268989bcce76e6c485b3f39c33bb047f51` |
| Official cUSDCMock | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama-managed | [Contract](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) | Upgradeable proxy |

Verified initial state:

- Owner: `0xF19125e08AFC9502DCde60703c1E24C334902356`
- Custody asset: official cUSDCMock address above
- Runtime size: `18,516` bytes
- Cancellation delay: `86,400` seconds
- Paused: `false`; draw count and participant count: `0`

## Real ERC-7984 Round Trip

No mocked handle, proof, RPC response, or transaction hash was used in this validation. Ten test USDCMock were minted and wrapped 1:1. A 1 cUSDC amount was encrypted by the official Zama Sepolia relayer, transferred into the pool through the ERC-7984 callback, then withdrawn through the pool’s encrypted withdrawal entry point.

| Step | Block | Transaction | Result |
| --- | ---: | --- | --- |
| Mint 10 USDCMock | `11632712` | [`0x67e64a...`](https://sepolia.etherscan.io/tx/0x67e64a5729f350bf79c41fda5e4c4580419c280e315ef45e17b1a3e37ea7d099) | Public test underlying minted |
| Approve wrapper | `11632713` | [`0x942a22...`](https://sepolia.etherscan.io/tx/0x942a22c8abc6a710993685257304379f40661f9c483933053988ffae9b7f619c) | Wrapper allowance confirmed |
| Wrap to cUSDC | `11632715` | [`0xaf8fc6...`](https://sepolia.etherscan.io/tx/0xaf8fc6d362ea25a54f17e3341c081241d08e528e8acca95328ea5d0e020a7ce0) | Encrypted cUSDC position created |
| Confidential deposit | `11632733` | [`0x36f81f...`](https://sepolia.etherscan.io/tx/0x36f81f06a30a600ed67e70e19a0d6239beb1d31fceb3822decfc88f7e7cdfa87) | Participant count and deposit nonce became `1`; encrypted aggregate matched encrypted user position |
| Confidential withdrawal | `11632753` | [`0x8ee0e4...`](https://sepolia.etherscan.io/tx/0x8ee0e488e23620b567ac8b105a0b5d43d3bde2c72f84113889f8f48784738429) | Direct ERC-7984 transfer returned custody to the wallet |

An authorized KMS user-decryption after settlement returned pool position `0` and wallet cUSDC balance `10,000,000` base units. These clear values were obtained only with the deployment wallet’s EIP-712 authorization.

## Sponsor-Funded Prize Reserve

Sepolia has no verified external yield venue whose underlying asset matches the official cUSDCMock wrapper used by CipherPool. The placeholder token-holding vault was therefore removed instead of being presented as a strategy. The active testnet reserve is explicitly sponsor-funded; see [the funding model and production path](reserve-funding.md).

| Step | Block | Transaction | Result |
| --- | ---: | --- | --- |
| Encrypted 1 cUSDC sponsor contribution | `11632933` | [`0x07b797...`](https://sepolia.etherscan.io/tx/0x07b797674aa730eea1b851d5ed78352741d7029ef0b1168521244c81e1057eaa) | Confirmed `PrizeReserveFunded`; backend indexed one funding event; authorized KMS verification confirmed the wallet moved from 10 to 9 cUSDC |

## Runtime Activation

The backend must use `INDEXER_START_BLOCK=11632698` and namespace its checkpoint by chain ID plus lowercased pool address. Configure the frontend and backend with the address, custody asset, and runtime hash above. Enable frontend writes only after both services pass their deployment checks.

## Rollback

1. Set `VITE_ENABLE_PROTOCOL_WRITES=false` and redeploy the frontend.
2. If the contract is unsafe, call `pause()` from the pool owner and confirm the receipt and `paused()` state.
3. Keep the indexer pointed at the affected deployment for incident reconstruction.
4. Keep the legacy exit-only pool available only for requests created before migration.
5. Record the incident and new verification evidence before re-enabling writes.

Never commit deployment-wallet secrets, RPC credentials, Vercel tokens, Render keys, or database URLs.
