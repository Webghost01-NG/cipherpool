# Veylott Demo Script

Target runtime: approximately 3 minutes 20 seconds. The generated video uses the live public interface and already-verified Sepolia evidence. It does not simulate a wallet, signature, KMS response, or newly confirmed transaction.

## Slide 1 — Introduction

Veylott is private prize savings built on Zama fhEVM. It protects balances and ticket weights while keeping custody and settlement independently verifiable. The current deployment is research software on Ethereum Sepolia.

## Slide 2 — Problem

Public ledgers make financial state easy to inspect. A savings balance, ticket weight, and transaction timing can expose intent or make high-value users easy to track. Veylott is designed to preserve auditability without publishing every private position.

## Slide 3 — Solution

A deposit transfers confidential cUSDC, and the pool credits only the token-returned encrypted result. Balances and draw weights remain encrypted. A saver can reveal a balance locally only after signing a wallet authorization.

## Slide 4 — Architecture

The React application reads Ethereum Sepolia and sends explicit wallet-signed transactions. The pool owns encrypted accounting and prize liabilities, while sponsors fund the encrypted testnet prize reserve. Zama’s relayer and KMS prepare decryption evidence. The public indexer stores durable checkpoints in PostgreSQL.

## Slide 5 — Live product

This is the production interface captured from Vercel. A disconnected session shows only Connect wallet—an address appears only after the provider returns one. Public protocol status remains visible, and deployment bindings are verified before writes can proceed.

## Slide 6 — User journey

The journey has four explicit steps: wrap test USDC into official cUSDC, deposit an encrypted amount, fund or monitor a KMS-verified prize round, and withdraw cUSDC directly. Every transaction still requires wallet confirmation.

## Slide 7 — Security controls

The contracts bind encrypted credit to the token-returned transfer, consume sponsor-funded reserves when awarding prizes, and add winner credits to both the position and aggregate liability. Draw proofs are bound to stored aggregate and reserve handles. Anyone can release a stale draw lock after 24 hours. Sepolia does not claim generated yield.

## Slide 8 — Verified transaction evidence

This is not a simulated transaction. On a documented predecessor deployment, a real encrypted 0.5 cUSDC deposit entered draw one. Zama KMS finalized the encrypted winner selection, the winner privately detected and claimed the prize through an ordinary withdrawal, and the remaining principal was withdrawn. Every historical receipt and the authorized post-settlement KMS verification are linked in the repository.

## Slide 9 — Engineering proof

Reproducible validation covers Solidity invariants, backend API and indexer behavior, the client encryption adapter, and frontend UX. The frontend runs on Vercel, the read-only indexer API on Render, and PostgreSQL storage allows the indexer to resume from its saved checkpoint after a restart.

## Slide 10 — Close

Veylott demonstrates that private savings can remain usable and verifiable. Open the live research app, inspect the active Sepolia contracts, and review every security decision and test in the public repository.
