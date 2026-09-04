# CipherPool Demo Script

Target runtime: approximately 2 minutes 40 seconds. The generated video uses the live public interface and already-verified Sepolia evidence. It does not simulate a wallet, signature, KMS response, or newly confirmed transaction.

## Slide 1 — Introduction

CipherPool is private prize savings built on Zama fhEVM. It protects balances and ticket weights while keeping custody and settlement independently verifiable. The current deployment is research software on Ethereum Sepolia.

## Slide 2 — Problem

Public ledgers make financial state easy to inspect. A savings balance, ticket weight, and transaction timing can expose intent or make high-value users easy to track. CipherPool is designed to preserve auditability without publishing every private position.

## Slide 3 — Solution

A deposit transfers a public custody amount, then the pool itself derives an equal encrypted credit. Balances and draw weights remain encrypted. A saver can reveal a balance locally only after signing a wallet authorization.

## Slide 4 — Architecture

The React application reads Ethereum Sepolia and sends explicit wallet-signed transactions. The pool owns encrypted accounting and prize liabilities, while the vault isolates strategy custody. Zama’s relayer and KMS prepare decryption evidence. The public indexer stores durable checkpoints in PostgreSQL.

## Slide 5 — Live product

This is the production interface captured from Vercel. A disconnected session shows only Connect wallet—an address appears only after the provider returns one. Public protocol status remains visible, and deployment bindings are verified before writes can proceed.

## Slide 6 — User journey

The journey has four explicit steps: deposit testnet USDC, participate in an encrypted weighted draw, request a private withdrawal, and submit the KMS-backed finalization from the same requesting wallet. Every transaction still requires a wallet confirmation.

## Slide 7 — Security controls

The current contracts bind encrypted credit to transferred assets, reserve yield when awarding prizes, and include compounded prizes in aggregate liabilities. Withdrawal requests anchor their encrypted handle in storage. On-chain signature verification and a cancellation timeout protect settlement.

## Slide 8 — Verified transaction evidence

This is not a simulated transaction. A real one-USDC Sepolia cycle completed through deposit, withdrawal request, and KMS-proof finalization. The three transaction hashes are linked in the repository, and the final state returned wallet funds while pool custody and accounted principal reached zero.

## Slide 9 — Engineering proof

The project currently passes 113 automated checks across Solidity contracts, backend services, client adapters, and frontend behavior. The frontend runs on Vercel, the backend on Render, and free Neon PostgreSQL storage allows the indexer to resume from its saved checkpoint after a restart.

## Slide 10 — Close

CipherPool demonstrates that private savings can remain usable and verifiable. Open the live research app, inspect the active Sepolia contracts, and review every security decision and test in the public repository.
