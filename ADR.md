# Architecture Decision Record (ADR) — Stellar Shield

- **ADR ID:** ADR-001
- **Title:** Choice of ZK Stack and MVP Scope for Stellar Shield
- **Status:** Approved
- **Date:** June 30, 2026
- **Author:** [Your Name]

## Context

The Stellar Hacks: Real-World ZK hackathon requires meaningful zero-knowledge technology with proofs verified inside Stellar Soroban smart contracts. The three officially supported options are RISC Zero, Noir, and Circom (Groth16).

We want to build a focused, polished platform (Stellar Shield) that demonstrates all three ZK frameworks across three real-world flows — while remaining fully deliverable within the hackathon timeline.

**Scoping Decision:** After evaluating a broader 5-module super app concept, we scoped the MVP down to 3 core flows for depth over breadth:

1. **ZK Credentials & Identity** (Noir)
2. **Private Payroll** (RISC Zero + Noir)
3. **Private DAO Voting** (Circom)

Lending/RWA flows are deferred to post-hackathon as future extensions.

## Decision

We will use a hybrid multi-framework ZK architecture with a central Soroban Orchestrator contract, delivering exactly one polished flow per ZK framework.

### Chosen Approach

#### Flow 1 — ZK Credentials & Identity (Noir)
- **Use for:** Proof-of-balance, eligibility checks, DAO membership proofs, KYC-lite credentials.
- **Reason:** Noir's Rust-like syntax makes credential circuits expressive and auditable. Credential nullifiers are reused across all other flows, making this the foundational identity layer.
- **Verifier:** `rs-soroban-ultrahonk`

#### Flow 2 — Private Payroll (RISC Zero + Noir)
- **Use for:** Batch payroll validation (RISC Zero) + shielded per-employee transfers (Noir).
- **Reason:** RISC Zero handles complex off-chain computation (budget validation, compliance rules) that doesn't fit in a circuit. Noir handles the per-transfer privacy layer. Using both in a single flow maximises technical differentiation.
- **Verifier:** `stellar-risc0-verifier` + `rs-soroban-ultrahonk`

#### Flow 3 — Private DAO Voting (Circom + Groth16)
- **Use for:** Sealed voting circuits, nullifier-based double-vote prevention.
- **Reason:** Circom Groth16 proofs are the smallest and cheapest to verify on-chain — ideal for per-vote proof submission. Reuses the Noir membership credential from Flow 1.
- **Verifier:** Official Groth16 Soroban verifier

#### Central Orchestrator Pattern
A main `shield_orchestrator` Soroban contract routes actions to the appropriate module contracts, each of which calls its own ZK verifier(s).

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
| :--- | :--- | :--- | :--- |
| **Single Framework** (e.g. only Noir) | Simpler development | Doesn't demonstrate full ZK breadth | Not competitive enough — judges expect all 3 frameworks |
| **5-module super app** | Maximum feature surface | High delivery risk, risk of 5 shallow flows | Depth beats breadth for judging; lending deferred |
| **Only RISC Zero** | Powerful computation | Less efficient for simple privacy proofs | Higher verification cost for basic ops |
| **Pure Circom** | Cheapest verification | Hard to express complex credential logic | Poor developer experience for credential layer |
| **No Orchestrator** | Fewer contracts | Hard to maintain modular code | Reduces reusability and architectural story |

## Rationale for 3-Flow Scoped Approach

- **One flow per ZK framework** — judges see RISC Zero, Noir, and Circom each doing what they do best.
- **Shared credential layer** — credential proofs from Flow 1 are reused in Flows 2 and 3, demonstrating system composability.
- **Progressive complexity** — Circom (cheapest/simplest) → Noir (expressive) → RISC Zero (most powerful). The architecture tells a coherent story.
- **Fully deliverable** — 3 polished flows are achievable in the hackathon window; 5 rough ones are not.

## Consequences

### Positive
- Strong technical depth across all three ZK frameworks.
- Shared credential layer demonstrates architectural maturity.
- Each flow is independently demoable in under 60 seconds.
- Cheapest-to-verify path (Circom) used where appropriate — shows cost awareness.

### Negative / Trade-offs
- Lending/RWA flow not in MVP (deferred to future extension).
- Three toolchains = more setup complexity.
- RISC Zero proof generation time may be slow client-side.

### Mitigation
- Start with Flow 1 (Noir credential) as the foundation — unlocks Flows 2 and 3.
- Use a proving server or pre-generated proofs for the demo if RISC Zero is slow.
- Use official verifiers directly (James Bachini tutorials as reference).
- Document lending/RWA as a clearly articulated future extension to show vision.

## Build Priority Order

| Day | Focus |
| :--- | :--- |
| **Day 1** | Noir credential circuit + `zk_credential` contract + basic frontend |
| **Day 2** | Circom voting circuit + `private_governance` contract |
| **Day 3** | RISC Zero payroll guest program + `private_treasury` contract |
| **Day 4** | Noir shielded transfers + orchestrator wiring + full flow integration |
| **Day 5** | Frontend polish, Freighter integration, end-to-end testing |
| **Final Day** | Demo video, README finalization, testnet deployment |

## Implementation Notes

- All proofs generated off-chain (client-side where possible; proving server fallback for RISC Zero).
- Verifier contracts deployed separately and called via `try_call` or direct invocation from module contracts.
- Use `no_std` compatible code where required for Soroban.
- Credential nullifiers stored on-chain to prevent reuse attacks.

## Related ADRs

- **ADR-002:** Selective Disclosure & View Key Mechanism (future)
- **ADR-003:** Frontend Proof Generation Strategy (client-side vs. proving server)

---

**Approved by:** [Your Name]
**Reviewers:** [Optional]