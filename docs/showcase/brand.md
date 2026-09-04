# Veylott Brand Guide

Veylott combines “veil” with “lot”: private positions entering verifiable prize rounds. The public identity should feel precise and trustworthy rather than casino-like.

## Mark

The asymmetric `V` represents two private positions converging into one prize outcome. Its small aperture and channel suggest an encrypted circuit without using generic lock, coin, fingerprint, or lottery-ball imagery. Use [`veylott-mark.svg`](../../frontend/public/veylott-mark.svg) for product surfaces and `favicon.svg`/`favicon.ico` for browser icons.

Keep clear space equal to one quarter of the mark width. Do not rotate the mark, add shadows, place it over noisy imagery, or change its internal geometry.

## Voice and Color

- Product name: **Veylott**
- Descriptor: **Private prize savings**
- Primary blue: `#3157F6`
- Deep ink: `#172033`
- Light field: `#F4F6FF`
- Page background: `#FFFFFF`

Copy should distinguish cryptographic proof from marketing claims. Never describe testnet sponsor funding as generated yield or show seeded balances as live protocol state.

## Compatibility Names

The deployed Solidity contract remains `ConfidentialPool`. Existing `CIPHERPOOL_*` action domains, the `cipherpool_indexer_checkpoints` table, and the wallet disconnect storage key remain unchanged so the rebrand does not invalidate transactions, runtime evidence, database state, or user disconnect preferences.
