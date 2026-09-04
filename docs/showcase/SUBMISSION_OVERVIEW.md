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
4. The owner requests a draw, anchoring publicly decryptable aggregate weight and reserve handles while balance mutations are locked.
5. A KMS proof verifies both aggregate handles. `FHE.randEuint64` and encrypted cumulative intervals award the prize without revealing the winning address.
6. A saver withdraws directly with an encrypted amount; CipherPool and cUSDC update both sides using the actual encrypted transfer result.

## Evidence

- The active runtime is 18,516 bytes and matches hash `0xbc5984bbcc66d3f24893ec880973aa268989bcce76e6c485b3f39c33bb047f51`.
- A real encrypted 1 cUSDC deposit and withdrawal completed on Sepolia.
- Authorized KMS decryption after settlement verified a zero pool position and restored 10 cUSDC wallet balance.
- Full transaction evidence is recorded in [the Sepolia operations guide](../operations/sepolia-deployment.md).

## Submission Readiness

Contract custody is ERC-7984-native. The next protocol milestone is [verifiable external yield](https://github.com/Webghost01-NG/fhevm-pooltogether-security/issues/118), followed by the final UI audit, screenshots, and a new human-presented demo. Existing presentation binaries predate this migration and must not be submitted as current evidence.
