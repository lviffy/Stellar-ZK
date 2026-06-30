"use client";

import { useState } from "react";
import Navbar from "@/components/nav/Navbar";
import VotingFlow from "@/components/flows/VotingFlow";
import Footer from "@/components/footer/Footer";
import { useWallet } from "@/hooks/useWallet";
import { useCredential } from "@/hooks/useCredential";
import { T } from "@/lib/tokens";
import { PRIVATE_GOVERNANCE_ID, ZK_CREDENTIAL_ID, PRIVATE_TREASURY_ID } from "@/lib/contracts";
import { CheckCircle, Lock, LockOpen, Copy, LinkSimple, Wallet } from "@phosphor-icons/react";

export default function VotingPage() {
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const { credential, clearCredential } = useCredential();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const hasCredential = !!credential;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#09090b]">
      <Navbar />

      <main className="flex-grow pt-12 pb-24">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* ── Left Column: Config & Management ── */}
            <div className="lg:col-span-1 flex flex-col gap-8">

              {/* Page header */}
              <div>
                <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", color: T.text, marginBottom: 16 }}>
                  Private DAO Voting
                </h1>
                <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
                  Your credential nullifier proves membership. A Circom Groth16 proof seals your vote. The tally publishes on-chain — individual votes are permanently sealed.
                </p>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, border: `1px solid ${T.border}`, padding: "4px 8px", color: T.mutedLo, borderRadius: T.r }}>
                  CIRCOM / Groth16 Soroban Verifier
                </span>
              </div>

              {/* Card 1: Wallet */}
              <div style={{ border: `1px solid ${T.border}`, padding: 24, borderRadius: T.r, background: T.surface }}>
                <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Wallet size={16} /> Wallet Connection
                </h3>
                {address ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.success }}>
                      <CheckCircle size={14} weight="fill" />
                      <span>Connected to Freighter</span>
                    </div>
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: "8px 12px", borderRadius: T.r, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mono }}>
                        {address.slice(0, 8)}...{address.slice(-8)}
                      </span>
                      <button
                        onClick={() => handleCopy(address, "address")}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: T.mutedLo }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = T.mutedLo)}
                        title="Copy address"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      style={{ padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.15em", backgroundColor: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: T.r, cursor: "pointer", width: "100%" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.color = T.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 12, color: T.mutedLo, lineHeight: 1.5 }}>
                      Connect your Freighter wallet to cast votes on Soroban testnet.
                    </p>
                    <button
                      onClick={connectWallet}
                      disabled={connecting}
                      style={{ padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.15em", backgroundColor: T.accent, border: "none", color: T.bg, borderRadius: T.r, cursor: "pointer", width: "100%" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.accentH)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.accent)}
                    >
                      {connecting ? "Connecting..." : "Connect Wallet"}
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: ZK Credential */}
              <div style={{ border: `1px solid ${T.border}`, padding: 24, borderRadius: T.r, background: T.surface }}>
                <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  {hasCredential
                    ? <LockOpen size={16} style={{ color: T.success }} />
                    : <Lock size={16} style={{ color: T.muted }} />}
                  ZK Credential
                </h3>
                {hasCredential ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.success }}>
                      <CheckCircle size={14} weight="fill" />
                      <span>Nullifier Active — Voting Unlocked</span>
                    </div>
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: "8px 12px", borderRadius: T.r, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mono }}>
                        {credential.nullifier.slice(0, 10)}...{credential.nullifier.slice(-10)}
                      </span>
                      <button
                        onClick={() => handleCopy(credential.nullifier, "nullifier")}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: T.mutedLo }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = T.mutedLo)}
                        title="Copy Nullifier"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>
                      Issued: {credential.issuedAt}
                    </div>
                    <button
                      onClick={clearCredential}
                      style={{ padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.15em", backgroundColor: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: T.r, cursor: "pointer", width: "100%" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.color = T.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                    >
                      Reset Credential
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 12, color: T.mutedLo, lineHeight: 1.5 }}>
                      No active ZK credential found. You must prove membership before voting.
                    </p>
                    <a
                      href="/credentials"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.15em", backgroundColor: "transparent", border: `1px solid ${T.accent}`, color: T.accent, borderRadius: T.r, cursor: "pointer", textDecoration: "none", width: "100%", textAlign: "center" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = T.accent; e.currentTarget.style.color = T.bg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = T.accent; }}
                    >
                      Generate ZK Credential
                    </a>
                  </div>
                )}
              </div>

              {/* Card 3: Contract Registry */}
              <div style={{ border: `1px solid ${T.border}`, padding: 24, borderRadius: T.r, background: T.surface }}>
                <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <LinkSimple size={16} /> Deployed Contracts
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Private Governance", id: PRIVATE_GOVERNANCE_ID },
                    { label: "ZK Credential Verifier", id: ZK_CREDENTIAL_ID },
                    { label: "Private Treasury", id: PRIVATE_TREASURY_ID },
                  ].map((contract) => (
                    <div key={contract.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: T.mutedLo, textTransform: "uppercase", fontFamily: "var(--font-geist-mono), monospace" }}>
                        {contract.label}
                      </span>
                      <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: "6px 10px", borderRadius: T.r, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mono }}>
                          {contract.id.slice(0, 10)}...{contract.id.slice(-6)}
                        </span>
                        <button
                          onClick={() => handleCopy(contract.id, contract.label)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: T.mutedLo }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = T.mutedLo)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {copiedItem && (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.success, textAlign: "right" }}>
                      Copied {copiedItem}!
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* ── Right Column: Voting Console ── */}
            <div className="lg:col-span-2">
              <div style={{ border: `1px solid ${T.border}`, padding: "40px 32px", borderRadius: T.r, background: T.surface, minHeight: "100%" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8 }}>
                  Governance Console
                </h2>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>
                  Select an open proposal and cast a sealed Groth16 ballot. Your membership is proven by your nullifier — no address linkage, no double-votes.
                </p>
                <VotingFlow />
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
