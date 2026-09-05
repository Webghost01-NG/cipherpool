# Veylott Presentation Content

## 1. Private prize savings, built for verification

Veylott is confidential prize savings on Zama fhEVM. Principal remains withdrawable while balances and draw weights stay encrypted. This is unaudited research software on Ethereum Sepolia.

## 2. Public ledgers expose financial context

- Visible balances expose positions and history.
- Public ticket weights reveal relative winning odds.
- Transaction timing can reveal intent around a prize round.

## 3. Public custody, confidential accounting

The official cUSDC token passes the actual encrypted transfer result to Veylott. The pool stores positions and draw weights as `euint64`; only the owner can authorize a private balance reveal.

## 4. Architecture

The React client submits wallet-signed Sepolia transactions. `ConfidentialPool` owns encrypted accounting and liabilities. Sponsors fund the encrypted testnet reserve without a false yield claim. Zama’s relayer/KMS returns proof-bound predicates. A Node indexer exposes public state and persists checkpoints in PostgreSQL.

## 5. The product is live

The white-and-blue console exposes public health without exposing private positions. An address appears only after a provider returns an account. Chain, bytecode, and custody bindings must pass before writes are enabled.

## 6. One coherent user journey

1. Wrap test USDC into official confidential cUSDC.
2. Deposit an encrypted amount; credit follows the token-returned result.
3. Activate a participant slot with a proof of a positive encrypted position, then run a readiness-verified weighted draw.
4. Privately reveal and claim a prize or withdraw principal through the same encrypted path.

## 7. Security controls

- Deposits and withdrawals follow token-returned encrypted custody amounts.
- Every award consumes the sponsor reserve and enters aggregate liabilities.
- The KMS reveals only a request-bound readiness bit; aggregate weight and reserve remain encrypted.
- Any keeper can finalize a valid request, and anyone can cancel a stale lock after 24 hours.
- Fixed cadence/prize policy and a 12-participant cap bound discretion and computation.

## 8. Verified active-pool lifecycle

- Three encrypted deposits: [`A`](https://sepolia.etherscan.io/tx/0x5fcdac841c699f4353e90d29b62509bf243af48e1fbbc2ee642b4778cbb7c676), [`B`](https://sepolia.etherscan.io/tx/0xfd5a430a141883ba45c07c06a275bd1e1af138a2d775c204e5dd5c5a62b6c962), [`C`](https://sepolia.etherscan.io/tx/0xce756c038c7a334f084e5b75df0bafe4404e28a667fe7780215ccd5eb82b4e97)
- Draw request: [`0x7d4913…bf54`](https://sepolia.etherscan.io/tx/0x7d49133e11b8685a080ee3303ecedbd3ebd4441b5631922c4ba6ad87cc56bf54)
- KMS finalization: [`0x0970ff…b320`](https://sepolia.etherscan.io/tx/0x0970fff858788dcbf926730c495fac1bd9ded55114d730aeae0c20b9d642b320)
- Private winner claim: [`0xb8f291…d50a`](https://sepolia.etherscan.io/tx/0xb8f29170094ac40f14df409838a08b5303265d6a3b6988a49a7f796db33fd50a)

The fixed 0.5 cUSDC prize was sponsor-funded. All principals exited and zero-position proofs returned the participant count to zero. The three wallets used separate keys but were operated for protocol evidence, not by three independent testers.

## 9. Engineering evidence

The 163-test suite covers Foundry invariants, backend/indexer behavior, the encryption adapter, and frontend UX. A reproducible audit-scope verifier binds source, creation input, runtime hash, custody, and policy across independent RPCs. No external audit is claimed.

## 10. Inspect the evidence

Open the [canonical app](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/), inspect pool [`0x2150d7D82117b927Dd3253935E34f67D8B37d424`](https://sepolia.etherscan.io/address/0x2150d7D82117b927Dd3253935E34f67D8B37d424), and review the [source repository](https://github.com/Webghost01-NG/veylott).
