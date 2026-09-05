# Independent Auditor Engagement Brief

## Objective

Veylott is seeking an independent security review of its deployed confidential prize-savings contract. The review must assess solvency, encrypted accounting, Zama FHE permissions and proof verification, participant admission/removal, draw liveness, winner selection, and recovery controls. Repository maintainers and AI-assisted contributors are not independent auditors for this engagement.

## Immutable Review Target

- Source commit: [`92a51ab869e706a3b53e3be63d411b01eb06ac09`](https://github.com/Webghost01-NG/veylott/tree/92a51ab869e706a3b53e3be63d411b01eb06ac09)
- Download: [`veylott-92a51ab.tar.gz`](https://github.com/Webghost01-NG/veylott/archive/92a51ab869e706a3b53e3be63d411b01eb06ac09.tar.gz)
- Machine-readable scope: [`scope.json`](scope.json)
- Sepolia pool: [`0x2150…d424`](https://sepolia.etherscan.io/address/0x2150d7D82117b927Dd3253935E34f67D8B37d424)
- Runtime code hash: `0x38dcfee7fcbecb12f8be9c4d73c596e7f9bc1b0a3d910e49cc8d8a3cc7af4ed4`

The source commit, runtime, constructor input, compiler settings, dependencies, and exclusions must be confirmed before analysis begins. Findings against a different revision must identify that revision explicitly.

## Reviewer Requirements

The reviewer should demonstrate Solidity/EVM audit experience and familiarity with asynchronous oracle or cryptographic-proof systems. Prior fhEVM, ERC-7984, confidential-token, or homomorphic-encryption work is strongly preferred. The report must identify the individual or firm and disclose conflicts, financial relationships, automated tools used, and any unreviewed areas.

## Minimum Review Procedure

1. Run every reproduction command in the [audit package](README.md) and independently confirm the deployed runtime through at least two RPC providers.
2. Manually trace each custody and liability mutation, including encrypted-zero transfers and integer-width boundaries.
3. Test stale/replayed KMS proofs, ACL misuse, callback spoofing, draw timeout/cancellation, pause behavior, participant capacity, swap-and-pop removal, and owner/keeper failure.
4. Evaluate confidentiality claims separately from solvency and liveness; document metadata and readiness-bit leakage.
5. Review external trust assumptions around the Zama protocol and upgradeable custody token without implying those dependencies were audited in scope.

## Finding and Delivery Format

Each finding must include severity, affected source lines, preconditions, impact, reproducible proof or test, and remediation guidance. Use `Critical`, `High`, `Medium`, `Low`, or `Informational`, and explain the likelihood and impact behind the rating.

Deliver a signed or independently verifiable public report containing reviewer identity, methodology, exact scope commit, deployment correspondence, findings, remediation status, and residual risks. Submit privately exploitable findings to the repository owner before publication. Use [issue #148](https://github.com/Webghost01-NG/veylott/issues/148) for engagement coordination, not for undisclosed vulnerability details.

Veylott may link the report only after every finding is triaged, fixes are reviewed in separate pull requests, tests pass, and the final deployed runtime is re-verified. Until then, the project remains explicitly **unaudited**.
