# Independent Auditor Engagement Brief

## Objective

Veylott is seeking an independent security review of its deployed confidential prize-savings contract. The review must assess solvency, encrypted accounting, Zama FHE permissions and proof verification, participant admission/removal, draw liveness, winner selection, and recovery controls. Repository maintainers and AI-assisted contributors are not independent auditors for this engagement.

## Immutable Review Target

- Source commit: [`4510d62995f17e4fec53e5828075d23271c263c8`](https://github.com/Webghost01-NG/veylott/tree/4510d62995f17e4fec53e5828075d23271c263c8)
- Download: [`veylott-4510d62.tar.gz`](https://github.com/Webghost01-NG/veylott/archive/4510d62995f17e4fec53e5828075d23271c263c8.tar.gz)
- Machine-readable scope: [`scope.json`](scope.json)
- Sepolia pool: [`0x90F7…0AD1`](https://sepolia.etherscan.io/address/0x90F72615Be5f05A2ce9DCA540D756a4415CE0AD1)
- Runtime code hash: `0x633df4b2049aa628ee2395813aeacb8efbc054cc32c1d6dc524f965db661311b`

The source commit, runtime, constructor input, compiler settings, dependencies, and exclusions must be confirmed before analysis begins. Findings against a different revision must identify that revision explicitly.

## Reviewer Requirements

The reviewer should demonstrate Solidity/EVM audit experience and familiarity with asynchronous oracle or cryptographic-proof systems. Prior fhEVM, ERC-7984, confidential-token, or homomorphic-encryption work is strongly preferred. The report must identify the individual or firm and disclose conflicts, financial relationships, automated tools used, and any unreviewed areas.

## Minimum Review Procedure

1. Run every reproduction command in the [audit package](README.md) and independently confirm the deployed runtime through at least two RPC providers.
2. Manually trace each custody and liability mutation, including encrypted-zero transfers and integer-width boundaries.
3. Test stale/replayed KMS proofs, ACL misuse, callback spoofing, draw timeout/cancellation, pause behavior, participant capacity, swap-and-pop removal, and owner/keeper failure.
4. Evaluate confidentiality claims separately from solvency and liveness; document metadata and readiness-bit leakage.
5. Review external trust assumptions around the Zama protocol and upgradeable custody token without implying those dependencies were audited in scope.
6. Check the custody invariant: encrypted custody must cover user liabilities plus unallocated reserve; snapshots are eligibility evidence, not additional liabilities. Test exits before and after settlement, pause, failed KMS proofs, and encrypted overflow boundaries.
7. Analyze admission fairness, rounding, request-time eligibility, and one actor filling all 12 slots. Use the disclosure matrix to assess inference from public fixed awards and singleton rounds.

Application readiness is a separate review covering independent browser-wallet flows, deployed frontend/backend correspondence, RPC failures, and the documented admin-funded Sepolia lifecycle. A contract-only audit does not certify the whole application or a future yield integration.

## Finding and Delivery Format

Each finding must include severity, affected source lines, preconditions, impact, reproducible proof or test, and remediation guidance. Use `Critical`, `High`, `Medium`, `Low`, or `Informational`, and explain the likelihood and impact behind the rating.

Deliver a signed or independently verifiable public report containing reviewer identity, methodology, exact scope commit, deployment correspondence, findings, remediation status, and residual risks. Submit privately exploitable findings to the repository owner before publication. Use [issue #148](https://github.com/Webghost01-NG/veylott/issues/148) for engagement coordination, not for undisclosed vulnerability details.

Veylott may link the report only after every finding is triaged, fixes are reviewed in separate pull requests, tests pass, and the final deployed runtime is re-verified. Until then, the project remains explicitly **unaudited**.
