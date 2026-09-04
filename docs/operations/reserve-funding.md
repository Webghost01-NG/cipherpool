# Sepolia Prize Reserve Funding

## Honest Testnet Model

CipherPool’s Sepolia reserve is funded by voluntary sponsor contributions of official `cUSDCMock`. It is not described as generated yield. Contributions use the same ERC-7984 transfer-and-callback path as deposits but carry `CIPHERPOOL_PRIZE_RESERVE_V1`, so the pool credits only the encrypted amount actually transferred. `PrizeReserveFunded` records the sponsor and ciphertext handle without exposing the amount.

The former `ConfidentialVault` was removed because it only held plaintext tokens and treated unsolicited balance increases as yield. It had no lending or ERC-4626 integration and could not prove where an increase originated.

## Why Aave Is Not Wired In

The [official Zama Sepolia cUSDC wrapper](https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md) reports underlying token `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`. [Aave’s official Sepolia address book](https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Sepolia.sol) lists USDC `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`. These are different assets. Sending CipherPool’s underlying to the Aave market would fail, while substituting or minting an equivalent amount would create an unverifiable bridge.

[Zama’s production confidential vault design](https://www.zama.org/post/private-deposits-into-public-defi-zamas-first-confidential-vault-design) solves the general ERC-7984/ERC-4626 boundary with OpenZeppelin’s [`BatcherConfidential`](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/blob/master/contracts/finance/BatcherConfidential.sol): individual encrypted contributions are aggregated, only the batch total is decrypted, and failure paths rewrap funds. That is the appropriate production architecture, but no compatible deployed Sepolia route for CipherPool’s official cUSDC asset was verified.

## Reproducible Contribution

Keep credentials outside the repository. Set `RPC_URL`, `POOL_CONTRACT_ADDRESS`, `POOL_RUNTIME_CODE_HASH`, `CUSTODY_ASSET_ADDRESS`, `SPONSOR_AMOUNT`, `SPONSOR_KEYSTORE_PATH`, and either `SPONSOR_KEYSTORE_PASSWORD` or `SPONSOR_KEYSTORE_PASSWORD_FILE`, then run:

```bash
npm run fund:sponsor-reserve
```

The tool fails closed on the wrong chain, wrong runtime bytecode, wrong custody asset, paused pool, invalid amount, failed receipt, or missing `PrizeReserveFunded` event. It prints only public receipt evidence and never prints the keystore password.

## Live Sepolia Evidence

On 2026-09-04, the verified deployment wallet contributed 1 cUSDC to the reserve through the official wrapper. The transaction succeeded in block `11632933` and emitted `PrizeReserveFunded` with ciphertext handle `0x0b10d18f1b8a7881826a6db971a3088fab455f7946ff0000000000aa36a70500`.

- Transaction: [`0x07b797674aa730eea1b851d5ed78352741d7029ef0b1168521244c81e1057eaa`](https://sepolia.etherscan.io/tx/0x07b797674aa730eea1b851d5ed78352741d7029ef0b1168521244c81e1057eaa)
- Sponsor: `0xF19125e08AFC9502DCde60703c1E24C334902356`
- Pool: `0xE47eF44EBB804A507173BEFa5beb2325aA7451AD`
- Custody token: `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`
- Independent indexer result: `prizeReserveFundingEvents = 1`

The contribution amount is disclosed here by the sponsor for reproducibility; the on-chain callback and event carry only its ciphertext handle. An authorized post-transaction KMS decryption returned a wallet balance of `9,000,000` base units, down from the previously verified `10,000,000`, independently confirming that 1 cUSDC left the sponsor wallet.

That evidence belongs to an earlier predecessor pool. Pool `0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0` received an encrypted 0.5 cUSDC sponsor contribution in block `11634718`: [`0x1a5ec5...`](https://sepolia.etherscan.io/tx/0x1a5ec5591461605f1de3ec303079d7eaa0d70fdb072d4e7c869b9b2d43de2b8d). It is retained as historical lifecycle evidence; the current pool starts with an empty reserve.

## Solvency Boundary

Sponsor funds enter `_prizeReserve`, never a saver’s position or `_totalAccountedBalance`. A draw can award no more than the KMS-verified reserve snapshot; finalization subtracts the awarded amount before another draw. Saver principal remains in cUSDC custody and is not deployed into the sponsor flow.

## Failure Matrix

| Condition | Sepolia behavior |
| --- | --- |
| Strategy loss | Not applicable: no strategy or saver principal is deployed. |
| Zero reserve | KMS verifies zero and `finalizeDraw` rejects any positive prize. |
| Unavailable strategy liquidity | Not applicable: saver withdrawals use liquid pool-held cUSDC directly. |
| Failed or insufficient sponsor transfer | The official token returns encrypted zero; the pool can credit only that result, which cannot cover a positive draw. |
| Concurrent reserve mutation | Reserve callbacks are rejected while a draw snapshot is active. |
| Reused prize liability | Finalization subtracts the prize from the encrypted reserve before a later draw. |

## Production Path

Adopt the audited batcher pattern only after selecting a deployed strategy with matching wrapper underlying, implementing deposit and redemption recovery, testing strategy loss and unavailable liquidity, and independently auditing the resulting contracts. Until then, product copy and submission material must say “sponsor-funded prize reserve,” not “yield.”
