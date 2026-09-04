# CipherPool Submission Overview

## Product

CipherPool is a confidential prize-savings prototype on Zama fhEVM. It keeps each saver’s cUSDC deposit, position, withdrawal, prize counter, and winning outcome encrypted while selecting a winner over encrypted balance weights.

- Application: [cipherpool-beta.vercel.app](https://cipherpool-beta.vercel.app)
- Pool: [`0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0`](https://sepolia.etherscan.io/address/0x9c939b82a1B23b77746f934A1Ff2b9a5bCf191e0)
- Official cUSDCMock: [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639)
- Network: Ethereum Sepolia

## Core Flow

1. A wallet encrypts a `uint64` deposit for the official cUSDC contract.
2. `confidentialTransferAndCall` moves cUSDC and passes the actual encrypted result to CipherPool.
3. CipherPool updates the user position and aggregate liability homomorphically.
4. A sponsor contributes encrypted cUSDC to the Sepolia prize reserve; this is explicitly not presented as generated yield.
5. The owner requests a draw, anchoring publicly decryptable aggregate weight and reserve handles while balance mutations are locked.
6. A KMS proof verifies both aggregate handles. `FHE.randEuint64` and encrypted cumulative intervals award the prize without revealing the winning address.
7. Each saver can privately reveal only their own prize counter; a winner claims through the same encrypted withdrawal path as principal, so the public call does not identify whether withdrawn value was winnings or savings.
8. A saver withdraws directly with an encrypted amount; CipherPool and cUSDC update both sides using the actual encrypted transfer result.

## Evidence

- The active runtime is 19,509 bytes and matches hash `0x5f642b23de77a3c7e20735fb0f43ab4e23f346d41624b7eef0565ecfeb35f8c7`.
- The corrected active pool completed a real encrypted 0.5 cUSDC deposit, KMS-finalized weighted draw, private winner check, indistinguishable prize claim, and principal withdrawal.
- Draw 1 finalized with verified weight and prize of 500,000 base units; authorized post-settlement KMS decryption returned a zero private position and zero prize counter.
- Full transaction evidence is recorded in [the Sepolia operations guide](../operations/sepolia-deployment.md).

## Data Integrity

The chain ID, reviewed contract addresses, deployment block, runtime hash, token metadata, and explorer URL are intentionally pinned deployment identifiers—not simulated application data. Live pool state comes from the verified contract or read-only indexer, and unavailable sources remain visibly unavailable rather than falling back to sample balances. Synthetic addresses appear only in automated tests. RPC, database, signing, and deployment credentials stay in ignored environment files or external secret stores.

## Submission Readiness

Contract custody is ERC-7984-native. The placeholder vault that mislabeled donated tokens as yield has been removed. Sepolia prizes use the truthful sponsor-reserve fallback documented in [the funding model](../operations/reserve-funding.md); production yield requires a compatible audited confidential batcher route. The current screenshot, presentation, and captioned walkthrough were refreshed against the active deployment on 4 September 2026. A final human-presented walkthrough is still recommended for bounty submission so judges can see wallet prompts and receipts without any simulated interaction.
