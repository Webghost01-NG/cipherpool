# CipherPool Submission Overview

## Product

CipherPool is a confidential prize-savings prototype on Zama fhEVM. It keeps each saver’s cUSDC deposit, position, withdrawal, prize counter, and winning outcome encrypted while selecting a winner over encrypted balance weights.

- Application: [cipherpool-beta.vercel.app](https://cipherpool-beta.vercel.app)
- Pool: [`0xE47eF44EBB804A507173BEFa5beb2325aA7451AD`](https://sepolia.etherscan.io/address/0xE47eF44EBB804A507173BEFa5beb2325aA7451AD)
- Official cUSDCMock: [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639)
- Network: Ethereum Sepolia

## Core Flow

1. A wallet encrypts a `uint64` deposit for the official cUSDC contract.
2. `confidentialTransferAndCall` moves cUSDC and passes the actual encrypted result to CipherPool.
3. CipherPool updates the user position and aggregate liability homomorphically.
4. A sponsor contributes encrypted cUSDC to the Sepolia prize reserve; this is explicitly not presented as generated yield.
5. The owner requests a draw, anchoring publicly decryptable aggregate weight and reserve handles while balance mutations are locked.
6. A KMS proof verifies both aggregate handles. `FHE.randEuint64` and encrypted cumulative intervals award the prize without revealing the winning address.
7. A saver withdraws directly with an encrypted amount; CipherPool and cUSDC update both sides using the actual encrypted transfer result.

## Evidence

- The active runtime is 18,516 bytes and matches hash `0xbc5984bbcc66d3f24893ec880973aa268989bcce76e6c485b3f39c33bb047f51`.
- A real encrypted 1 cUSDC deposit and withdrawal completed on Sepolia.
- Authorized KMS decryption after settlement verified a zero pool position and restored 10 cUSDC wallet balance.
- Full transaction evidence is recorded in [the Sepolia operations guide](../operations/sepolia-deployment.md).

## Data Integrity

The chain ID, reviewed contract addresses, deployment block, runtime hash, token metadata, and explorer URL are intentionally pinned deployment identifiers—not simulated application data. Live pool state comes from the verified contract or read-only indexer, and unavailable sources remain visibly unavailable rather than falling back to sample balances. Synthetic addresses appear only in automated tests. RPC, database, signing, and deployment credentials stay in ignored environment files or external secret stores.

## Submission Readiness

Contract custody is ERC-7984-native. The placeholder vault that mislabeled donated tokens as yield has been removed. Sepolia prizes use the truthful sponsor-reserve fallback documented in [the funding model](../operations/reserve-funding.md); production yield requires a compatible audited confidential batcher route. The current screenshot, presentation, and captioned walkthrough were refreshed against the active deployment on 4 September 2026. A final human-presented walkthrough is still recommended for bounty submission so judges can see wallet prompts and receipts without any simulated interaction.
