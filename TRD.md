# Stellar Shield — Technical Requirements & Design Document

- **Project:** Stellar Shield
- **Hackathon:** Stellar Hacks: Real-World ZK
- **Version:** 1.1 (Scoped MVP)
- **Date:** June 30, 2026

## 1. Executive Summary

Stellar Shield is a privacy-first finance and governance platform on Stellar. The MVP delivers three polished, independently demoable flows — ZK Credentials, Private Payroll, and Private DAO Voting — using all three officially supported ZK frameworks (Noir, RISC Zero, Circom) with on-chain proof verification via Soroban smart contracts.

**Core Objective:** Demonstrate deep, meaningful use of all three Stellar ZK primitives across real-world financial flows, with a shared identity layer and a central orchestrator proving architectural coherence.

**Scope Decision:** Lending/RWA flows are explicitly deferred post-hackathon to ensure the three core flows are polished and fully functional.

## 2. Objectives & Alignment with Hackathon

- Strictly follow the requirement: ZK technology + on-chain proof verification in Soroban smart contracts.
- Use all three officially supported ZK frameworks, each matched to its optimal use case.
- Deliver a coherent platform with a shared credential identity layer — not isolated demos.
- Show end-to-end user journeys with clear privacy + compliance balance.

### Success Criteria

- All three flows protected by on-chain ZK proof verification.
- All three verifiers (RISC Zero, Noir/Ultrahonk, Groth16) deployed and called on Testnet.
- Shared credential nullifier reused across Flow 2 and Flow 3.
- Working demo on Stellar Testnet with a 2-3 min video.

## 3. MVP Scope — 3 Core Flows

### Flow 1 — ZK Credentials & Identity *(Noir)*

**Goal:** User proves eligibility attributes without revealing underlying values.

- Noir circuit proves: balance ≥ threshold AND membership in allowlist AND age ≥ 18.
- Proof verified by `zk_credential` contract via `rs-soroban-ultrahonk`.
- Contract stores a credential nullifier on-chain (reusable, non-double-spendable).
- Selective disclosure: user chooses which attributes to reveal to which parties.

**Key contracts:** `zk_credential.wasm`
**ZK Framework:** Noir → `rs-soroban-ultrahonk` verifier

---

### Flow 2 — Private Payroll *(RISC Zero + Noir)*

**Goal:** Employer pays team privately; anyone can verify the total was correct without seeing individual salaries.

- **RISC Zero guest program:** validates batch payroll data off-chain (total ≤ budget, all recipients credentialed) → generates receipt.
- **Noir circuit:** generates shielded transfer proof per employee (individual amount hidden).
- `private_treasury` contract calls RISC Zero verifier → Noir verifier sequentially.
- On success: executes private distributions + emits public total event only.

**Key contracts:** `private_treasury.wasm`, `shield_orchestrator.wasm`
**ZK Frameworks:** RISC Zero → `stellar-risc0-verifier` + Noir → `rs-soroban-ultrahonk`

---

### Flow 3 — Private DAO Voting *(Circom + Groth16)*

**Goal:** DAO members vote privately; results are tallied and published on-chain without revealing individual votes.

- Voter reuses credential nullifier from Flow 1 to prove membership.
- **Circom circuit:** encodes sealed vote choice + nullifier (prevents double-voting).
- `private_governance` contract verifies Groth16 proof per vote, accumulates tally.
- On voting close: tally is published on-chain; individual votes remain hidden.

**Key contracts:** `private_governance.wasm`
**ZK Framework:** Circom → Official Groth16 Soroban verifier

---

### Deferred (Future Extensions)

- Confidential lending & RWA settlement (RISC Zero risk scoring + oracle proofs)
- Private cross-border remittance with fiat ramps
- Recursive proof aggregation for scalability

## 4. Technical Architecture

### 4.1 High-Level Component Flow

```
User (Browser)
    │
    ├─► Proof Generation (client-side)
    │       ├── Noir (credential / transfer circuits)
    │       ├── RISC Zero (payroll guest program)
    │       └── Circom (voting circuit)
    │
    └─► Stellar Transaction (Freighter)
            │
            └─► shield_orchestrator (Soroban)
                    ├─► zk_credential       → rs-soroban-ultrahonk
                    ├─► private_treasury    → stellar-risc0-verifier
                    │                       → rs-soroban-ultrahonk
                    └─► private_governance  → Groth16 verifier
```

### 4.2 ZK Stack

| Flow | Framework | Purpose | Verifier Contract |
| :--- | :--- | :--- | :--- |
| **Credentials** | Noir | Balance/eligibility proofs, selective disclosure | `rs-soroban-ultrahonk` |
| **Payroll (batch)** | RISC Zero | Budget validation, compliance rules, off-chain computation | `stellar-risc0-verifier` |
| **Payroll (transfers)** | Noir | Shielded per-employee amounts | `rs-soroban-ultrahonk` |
| **Voting** | Circom (Groth16) | Sealed vote encoding, nullifier, double-vote prevention | Official Groth16 verifier |

### 4.3 Smart Contracts (Soroban - Rust)

| Contract | Role |
| :--- | :--- |
| `shield_orchestrator.wasm` | Main entry point; routes to module contracts |
| `zk_credential.wasm` | Issues credentials; stores nullifiers |
| `private_treasury.wasm` | Payroll logic; calls RISC Zero + Noir verifiers |
| `private_governance.wasm` | Voting logic; calls Groth16 verifier |

Each contract imports and calls the appropriate ZK verifier directly.

## 5. Data Flows

### 5.1 Credential Issuance (Flow 1)

1. User connects Freighter wallet.
2. Client-side: Noir circuit proves `balance ≥ X` and `membership ∈ allowlist`.
3. Noir proof sent to `zk_credential` contract.
4. Contract calls `rs-soroban-ultrahonk` verifier → success.
5. Credential nullifier stored on-chain. UI shows "Credential Issued ✓".

### 5.2 Private Payroll (Flow 2)

1. Employer uploads payroll CSV (recipient addresses + amounts).
2. Client-side: RISC Zero guest validates totals & compliance → generates receipt.
3. Client-side: Noir circuit generates shielded proof per employee.
4. Single Soroban transaction submitted to `private_treasury` via orchestrator.
5. Contract: RISC Zero verifier called → Noir verifier called → distributions execute.
6. Public event emits total only. Individual salaries never on-chain in plaintext.

### 5.3 Private Voting (Flow 3)

1. Voter presents credential nullifier (from Flow 1) to prove membership.
2. Client-side: Circom circuit encodes sealed vote + anti-double-vote nullifier.
3. Groth16 proof submitted to `private_governance` contract.
4. Contract verifies proof + checks nullifier not previously used → records vote.
5. On proposal close: tally emitted publicly. Individual votes permanently sealed.

## 6. Non-Functional Requirements

- **Performance:** Proof verification must be affordable on Stellar. Circom/Groth16 preferred for per-action proofs. RISC Zero reserved for batch operations.
- **Security:** Standard Soroban security practices + ZK soundness. Nullifiers prevent replay attacks.
- **Usability:** Simple frontend; Noir/Circom proof generation < 10 seconds. RISC Zero < 60 seconds (proving server fallback if needed).
- **Environment:** Testnet only for hackathon.
- **Open Source:** Full code public on GitHub.

## 7. Tech Stack Details

- **Blockchain:** Stellar Soroban (Testnet)
- **Languages:**
  - Rust (Soroban contracts + RISC Zero guest programs)
  - Noir (credential & transfer circuits)
  - Circom (voting circuit)
  - TypeScript (frontend)
- **Frontend:** Next.js, Tailwind CSS, Freighter Wallet
- **Tools:** Stellar CLI, `soroban` CLI, `nargo`, RISC Zero toolchain, `snarkjs`

## 8. Dependencies & References

- **RISC Zero Stellar Verifier:** https://github.com/NethermindEth/stellar-risc0-verifier/
- **Noir Soroban Verifier:** https://github.com/yugocabrio/rs-soroban-ultrahonk
- **Groth16 Examples:** https://github.com/stellar/soroban-examples/tree/main/groth16_verifier
- **Tutorials:** James Bachini's E2E guides (RISC Zero, Noir, Circom on Stellar)

## 9. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| RISC Zero proof generation too slow client-side | Use pre-generated demo proofs or a proving server for hackathon demo |
| Noir Ultrahonk proof size is large | Acceptable for payroll (low frequency); Circom used for high-frequency voting |
| Three toolchains = complex setup | Implement flows sequentially (Flow 1 → 2 → 3); each is independently testable |
| Mock data in demo | Clearly documented in README; on-chain verification is real |
| Time overrun | Flow 1 is buildable in Day 1; Flows 2-3 build on top — cut features not flows |

## 10. Deliverables

- Full open-source GitHub repo with all 3 flows functional on Testnet
- 2–3 minute demo video showing each flow end-to-end
- This TRD + ADR + Architecture diagrams
- Working on-chain proof verification (all 3 verifiers called in live transactions)

## 11. Hackathon Build Timeline

| Day | Focus |
| :--- | :--- |
| **Day 1** | Noir credential circuit + `zk_credential` contract + basic frontend shell |
| **Day 2** | Circom voting circuit + `private_governance` contract |
| **Day 3** | RISC Zero payroll guest program + `private_treasury` contract (RISC Zero path) |
| **Day 4** | Noir shielded transfers + orchestrator wiring + credential reuse across flows |
| **Day 5** | Frontend polish, Freighter integration, full end-to-end Testnet testing |
| **Final Day** | Demo video recording, README finalization, submission |

---

**Approved by:** [Your Name]
**Status:** Ready for Implementation