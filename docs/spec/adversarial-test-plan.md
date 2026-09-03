# Adversarial Test Plan & Exploit Simulation Specifications

**Issue Reference:** [#6 — spec(adversarial): Design adversarial test plan and exploit simulation specifications](https://github.com/Webghost01-NG/fhevm-pooltogether-security/issues/6)  
**Milestone:** Phase 3 — Core Protocol & Smart Contract Implementation  
**Protocol:** CipherPool  
**Author:** Security Research Team  
**Status:** Complete & Ready for Review  

---

## 1. Executive Summary & Objective

This specification formalizes the adversarial testing regime for **CipherPool**. It defines structured test vectors, exploit simulations, and invariant fuzzing campaigns designed to stress-test the protocol against sophisticated economic, cryptographic, and state-machine attack vectors on Zama fhEVM.

The plan validates that the protocol adheres to its fundamental security promises:
1. **Confidentiality:** Zero leakage of user balances, lottery ticket allocations, or winner identities.
2. **Replay & Substitution Invariance:** Cryptographic impossibility of cross-contract, cross-user, or sequential proof reuse.
3. **No-Loss Solvency:** Principal balances are conserved across all adversarial interleavings.

---

## 2. Adversarial Test Vector Matrix

The matrix below establishes 14 primary exploit test vectors spanning all core contract interactions:

| Vector ID | Category | Target Method | Exploit Hypothesis | Expected Failure / Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **ADV-01** | Handle Injection | `finalizeWithdrawal` | Attacker supplies arbitrary chosen handle in calldata to steal pool assets. | Rejected at ABI boundary; function signature reads handle strictly from storage. |
| **ADV-02** | Cross-User Replay | `finalizeWithdrawal` | Eve intercepts Alice's valid KMS proof $\Pi_A$ and calls finalize as Eve. | Reverts with `InvalidKMSSignatures()` because Eve's storage handle mismatches $\Pi_A$. |
| **ADV-03** | Double Spend | `finalizeWithdrawal` | Alice calls finalize twice with the same valid proof $\Pi_A$ within the same block. | First call succeeds; second call reverts with `NoActiveWithdrawalRequest(Alice)`. |
| **ADV-04** | Premature Cancel | `cancelWithdrawal` | Alice attempts to cancel her withdrawal immediately after requesting it ($\Delta t < 24\text{h}$). | Reverts with `WithdrawalNotStale(elapsed, cancellationDelay)`. |
| **ADV-05** | Delayed Proof Post-Cancel | `finalizeWithdrawal` | Attacker submits a valid KMS proof after the user already cancelled the request. | Reverts with `NoActiveWithdrawalRequest(user)` due to atomic storage zeroing. |
| **ADV-06** | Cleartext Inflation | `finalizeWithdrawal` | User receives KMS proof for $1,000$ USDC but submits $M^* = 10,000$ in calldata. | Reverts with `InvalidDecryptedAmount(10000, 1000)` before KMS verification. |
| **ADV-07** | Sufficiency Bit Flip | `finalizeWithdrawal` | User with insufficient balance receives KMS proof for $0$ but submits $M = \text{requested}$. | Reverts in `FHE.checkSignatures` because digest encodes tampered cleartext. |
| **ADV-08** | Callback Re-Entrancy | `finalizeWithdrawal` | Malicious ERC-777 custody token attempts to re-enter `finalizeWithdrawal` during payout. | Reverts via `nonReentrant` lock and `!req.active` CEI state deletion. |
| **ADV-09** | Empty Pool Draw | `draw` | Attacker triggers `draw(1000)` when `totalDepositsPlain == 0`. | Reverts with `EmptyPool()`. |
| **ADV-10** | Vault Principal Overdraw | `withdrawFromStrategy` | Pool or owner attempts to withdraw more assets than `principalDeposited`. | Reverts with `InsufficientCustodyBalance(requested, principal)`. |
| **ADV-11** | Circuit Breaker Ingress | `deposit`, `requestWithdrawal` | User attempts to deposit or request withdrawal while contract is paused. | Reverts with `EnforcedPause()`. |
| **ADV-12** | Paused Escape Valve | `finalizeWithdrawal`, `cancelWithdrawal` | User attempts to finalize pending KMS proof or cancel stale request while paused. | **ALLOWED (BY DESIGN)** to preserve non-custodial asset escape rights. |
| **ADV-13** | Deposit Credit Inflation | `deposit` | Attacker invokes the removed three-argument selector with an encrypted value larger than the custody amount. | Rejected at the ABI boundary; the sole `amount` now drives custody, plaintext accounting, and encrypted credit. |
| **ADV-14** | Repeated Prize Allocation | `draw` | Owner executes multiple draws against the same custody yield. | Each draw increments `reservedPrizesPlain`; requests above `availableYieldPlain` revert with `InsufficientPrizeYield`. |

---

## 3. Invariant Fuzzing Specifications

The following invariants MUST be modeled as stateful property tests in Foundry:

### Invariant 1: Total Custody Solvency
At all times across arbitrary sequences of deposits, withdrawals, cancellations, and draws:

$$\text{custodyAsset.balanceOf}(\text{pool}) + \text{vault.principalDeposited}() \ge \text{pool.totalDepositsPlain}()$$

### Invariant 2: Mutually Exclusive Terminal States
For any user address $U$:

$$\text{pendingWithdrawals}[U].\text{active} \implies (\text{userWithdrawalNonces}[U] > 0 \land \text{pendingWithdrawals}[U].\text{timestamp} > 0)$$

And upon terminal completion or cancellation:

$$\neg \text{pendingWithdrawals}[U].\text{active} \implies (\text{pendingWithdrawals}[U].\text{handle} = 0 \land \text{pendingWithdrawals}[U].\text{requestHash} = 0)$$

### Invariant 3: Strictly Monotonic Nonces
For any account $U$, each successful call to `requestWithdrawal`:

$$\text{nonce}_{k+1} = \text{nonce}_k + 1 \quad \forall k \ge 0$$

### Invariant 4: No Direct Prize Dilution
Harvested yield transfers to the pool MUST strictly satisfy:

$$\text{vault.harvestYield}() \le \text{vault.totalManagedAssets}() - \text{vault.principalDeposited}()$$

### Invariant 5: Prize Liability Solvency

At every successful draw boundary, principal and allocated prizes cannot exceed pool custody:

$$\text{totalDepositsPlain} + \text{reservedPrizesPlain} \le \text{custodyAsset.balanceOf(pool)}$$

---

## 4. Exploit Simulation Test Vectors

### Simulation A: Cross-User Mempool Front-Running
```solidity
function test_ExploitSimulation_CrossUserMempoolIntercept() public {
    // 1. Alice initiates withdrawal for 500 USDC
    // 2. Mock KMS generates proof Pi_Alice for Alice's handle H_Alice
    // 3. Eve observes Pi_Alice in mempool and broadcasts finalizeWithdrawal(500, Pi_Alice)
    // 4. Assert that Eve's transaction reverts with InvalidKMSSignatures or NoActiveWithdrawalRequest
    // 5. Alice's transaction executes successfully
}
```

### Simulation B: Malicious ERC-777 Token Re-Entrancy
```solidity
function test_ExploitSimulation_CallbackReentrancy() public {
    // 1. Deploy MaliciousERC777 hook implementing tokensReceived
    // 2. Hook calls pool.finalizeWithdrawal during transfer
    // 3. Assert that re-entrant call reverts deterministically without state corruption
}
```

### Simulation C: Liveness Black Swan & Self-Sovereign Escape
```solidity
function test_ExploitSimulation_KMSOutageEscape() public {
    // 1. Alice requests withdrawal of 10,000 USDC
    // 2. KMS goes permanently offline (no proof ever generated)
    // 3. Fast forward time by 24 hours + 1 second (vm.warp)
    // 4. Alice executes cancelWithdrawal()
    // 5. Assert that request is cleared, Alice's balance remains 10,000 USDC, and pool remains solvent
}
```

---

## 5. Phase 3 & Phase 6 Quality Gate

- All 12 adversarial test vectors (`ADV-01` through `ADV-12`) are formally specified.
- The invariant fuzzing suite is ready for continuous automated evaluation.
- This completes the Phase 3 protocol specification suite, fully unblocking **Phase 4 (Backend & Relayer Infrastructure)**.
