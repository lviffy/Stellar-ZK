# Stellar Shield — Privacy-First Finance & Governance on Stellar

**Real-World ZK Hackathon Submission**

A privacy-preserving platform on Stellar combining ZK credentials, confidential payroll, and private DAO governance — all with zero-knowledge proofs verified on-chain via Soroban smart contracts.

---

## 🎯 Project Overview

**Stellar Shield** is a privacy-first finance and governance platform built on Stellar. It enables organizations, DAOs, and individuals to handle real-world financial operations while keeping sensitive data private and maintaining regulatory compliance through selective disclosure.

> **Note:** ZK is load-bearing. Every sensitive action is protected by zero-knowledge proofs generated off-chain and verified inside Soroban smart contracts using all three official Stellar ZK options.

### Important Links

* **Live Demo:** [Link to deployed frontend]
* **Testnet Contract Addresses:** [Add after deployment]
* **Video Walkthrough:** [2-3 minute demo video link]

---

## ✨ Key Features & Alignment with Hackathon Ideas

| Complexity Level | Features Implemented |
| :--- | :--- |
| **🟢 Mild Foundations** | Proof-of-balance, age/eligibility checks, private allowlist membership. |
| **🟡 Medium Core Flows** | Confidential payroll with shielded transfers, compliant view keys, proof-of-reserves. |
| **🟠 Spicy Integrations** | Private sealed-bid DAO voting, Sybil-resistant ZK identity, compliant privacy pools. |
| **🔴 Wild Ambition** | All three ZK frameworks (RISC Zero + Noir + Circom) verified on-chain via a single orchestrator contract. |

---

## 🛠️ Architecture

### ZK Technology Stack (All Verified On-Chain)

| Framework | Flow | Purpose | Verifier Contract |
| :--- | :--- | :--- | :--- |
| **Noir** | Credentials & Payroll | ZK credentials, shielded transfers, selective disclosure | [rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk) |
| **RISC Zero** | Payroll | Batch payroll validation, compliance rules, off-chain computation | [Stellar RISC Zero Verifier](https://github.com/NethermindEth/stellar-risc0-verifier/) |
| **Circom** (Groth16) | Governance | Efficient voting circuits, cheapest on-chain verification | [Official Groth16 Examples](https://github.com/stellar/soroban-examples/tree/main/groth16_verifier) |

### Smart Contracts (Soroban)

| Contract | Responsibility |
| :--- | :--- |
| **`shield_orchestrator`** | Main entry point; routes actions to the appropriate ZK verifier. |
| **`zk_credential`** | Issues and verifies ZK credentials (balance, eligibility, membership). |
| **`private_treasury`** | Handles confidential payroll — calls RISC Zero + Noir verifiers. |
| **`private_governance`** | Manages sealed voting and DAO membership via Circom proofs. |

### Frontend

* Next.js + TypeScript + Tailwind CSS
* Freighter Wallet integration
* Client-side proof generation (Noir / RISC Zero)
* Shared credential layer reused across all three flows

---

## 🚀 How It Works — 3 Core Flows

### Flow 1 — ZK Credentials & Identity *(Noir)*

> *"Prove who you are without revealing anything."*

1. User connects Freighter wallet.
2. Noir circuit proves balance ≥ threshold **and** KYC eligibility — without revealing actual values.
3. Proof is verified by `zk_credential` contract on Soroban.
4. User receives a credential nullifier reusable across other flows.

### Flow 2 — Private Payroll *(RISC Zero + Noir)*

> *"Pay your team privately, prove it was done correctly."*

1. Employer uploads a batch payroll CSV off-chain.
2. **RISC Zero** guest program validates total ≤ budget cap and all recipients are credentialed → generates receipt.
3. **Noir** circuit generates shielded transfer proofs per employee (individual amounts hidden).
4. Frontend submits one Soroban transaction to `private_treasury`.
5. Contract calls RISC Zero verifier → Noir verifier → executes private distributions.
6. Public event emits only the total disbursed — no individual salaries revealed.

### Flow 3 — Private DAO Voting *(Circom)*

> *"Vote privately, tally publicly."*

1. Voter proves DAO membership using credential from Flow 1 (Noir proof reused).
2. **Circom** Groth16 circuit encodes the sealed vote + nullifier (prevents double-voting).
3. `private_governance` contract verifies Groth16 proof on-chain.
4. Once voting closes, tally is published on-chain — individual votes remain private.

---

## 🧪 Tech Stack

* **Blockchain:** Stellar Soroban (Testnet)
* **ZK Frameworks:** RISC Zero, Noir, Circom (Groth16)
* **Languages:** Rust (contracts + RISC Zero guests), Noir, Circom, TypeScript
* **Frontend:** Next.js, TypeScript, Tailwind CSS, Freighter

---

## 📁 Repository Structure

```text
stellar-shield/
├── contracts/              # Soroban contracts (Rust)
│   ├── shield_orchestrator/
│   ├── zk_credential/
│   ├── private_treasury/
│   └── private_governance/
├── circuits/               # Noir + Circom circuits
│   ├── noir/               # Credential & transfer circuits
│   └── circom/             # Voting circuit
├── risczero/               # RISC Zero guest program (payroll validation)
├── frontend/               # Next.js app
├── proofs/                 # Example proof generation scripts
├── docs/                   # Architecture diagrams
└── README.md
```

---

## 📹 Demo Video

[Link to 2-3 minute video]

The video demonstrates:
- ZK credential creation and on-chain verification
- Private payroll batch processing (RISC Zero + Noir, two verifiers in one tx)
- Private DAO vote casting and sealed tally reveal

---

## 🔮 Future Extensions

- Confidential lending & RWA settlement (RISC Zero risk scoring + oracle proofs)
- Fully shielded stablecoin wallet experience
- Recursive proof aggregation for better scalability
- Private cross-border remittance corridor with fiat ramps
- Deeper Confidential Token standard integration

---

## ⚠️ Current Status & Limitations

- Built on Stellar Testnet
- Proof generation is client-side (may be slow on low-end devices)
- View-key selective disclosure implemented for auditors only
- Lending/RWA flow deferred to post-hackathon

---

## 🏗️ Setup & Run Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/stellar-shield.git

# Install frontend dependencies
cd frontend && npm install && npm run dev
```

> **Note:** See `docs/setup.md` for full contract & circuit setup instructions.

---

## 📜 License

MIT License

## 🙏 Acknowledgments

- Stellar Development Foundation for ZK primitives (Protocol 25/26)
- James Bachini for excellent RISC Zero, Noir, and Circom tutorials
- Official verifier repositories and Soroban examples
- Hackathon organizers for the inspiring idea spectrum

---

Built with ❤️ for Stellar Hacks: Real-World ZK