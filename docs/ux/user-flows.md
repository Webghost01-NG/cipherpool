# CipherPool User Flows

## Confidential Deposit

1. Connect a wallet to Ethereum Sepolia.
2. Obtain USDCMock and wrap it with the official Zama cUSDCMock wrapper.
3. Enter a deposit amount. The browser encrypts it for cUSDC with the Zama Relayer SDK.
4. Confirm one `confidentialTransferAndCall` transaction.
5. cUSDC invokes the pool with the actual encrypted transfer result; only that ciphertext is credited.
6. Reveal the position only when needed by signing an EIP-712 user-decryption request.

The interface must never display a public cUSDC balance as if it were plaintext. Transaction errors must distinguish proof generation, wallet rejection, broadcast, and receipt failure.

## Confidential Withdrawal

1. Enter the amount to withdraw.
2. The browser encrypts it for the pool contract.
3. Confirm `withdraw(encryptedAmount, inputProof)`.
4. The pool selects the requested amount or encrypted zero based on encrypted sufficiency.
5. cUSDC transfers the encrypted approved amount and returns the actual result.
6. The pool debits the saved position, prize counter, and aggregate liability by that returned ciphertext.

This is one transaction. The active pool has no plaintext withdrawal request, backend KMS proof endpoint, or public payout amount.

## Private Balance Reveal

1. Read the user’s ciphertext handle from `getBalanceHandle(address)`.
2. Generate an ephemeral client keypair.
3. Ask the connected wallet to sign the Zama EIP-712 decryption authorization.
4. Send the authorized request to the Zama relayer.
5. Decrypt locally and keep the result only in transient UI state.
6. Hide the value on disconnect or explicit concealment.

## Weighted Draw

1. The owner submits a public prize size with `requestDraw`.
2. The pool marks aggregate position and reserve handles publicly decryptable and locks deposits and withdrawals.
3. The client asks the Zama KMS to decrypt those two aggregates.
4. The owner submits `finalizeDraw(total, reserve, proof)`.
5. The pool verifies both stored handles, creates a bounded encrypted random ticket, and evaluates encrypted cumulative balance intervals.
6. Exactly one encrypted interval receives the encrypted prize credit; the reserve is reduced homomorphically.
7. If KMS settlement stalls beyond 24 hours, anyone may call `cancelDraw` to release the lock.

Only aggregate weight, reserve, prize size, timestamp, and participant count become public. Individual balances, prize counters, and the winner remain encrypted.

## Accessibility and Responsive Requirements

- Support keyboard-only operation and visible focus states.
- Associate every input with a label and expose asynchronous errors through `aria-live`.
- Keep actionable controls at least 44px high.
- Use a single-column layout from 320px and avoid horizontal scrolling.
- Respect `prefers-reduced-motion`.
