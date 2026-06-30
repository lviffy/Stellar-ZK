"use client";

import { useState } from "react";
import Navbar from "@/components/nav/Navbar";
import CredentialFlow from "@/components/flows/CredentialFlow";
import Footer from "@/components/footer/Footer";
import { useWallet } from "@/hooks/useWallet";
import { useCredential } from "@/hooks/useCredential";
import { T } from "@/lib/tokens";
import { ZK_CREDENTIAL_ID } from "@/lib/contracts";
import { CheckCircle, Copy, LinkSimple, ShieldCheck, Wallet } from "@phosphor-icons/react";

const CHECKS = [
  "Balance threshold proof (Noir circuit)",
  "Allowlist membership gate",
  "Age eligibility check",
  "On-chain nullifier via rs-soroban-ultrahonk",
];

export default function CredentialsPage() {
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const { credential, clearCredential } = useCredential();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

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
                  ZK Credentials
                </h1>
                <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
                  Prove your balance, membership, and eligibility without revealing the underlying values. Your nullifier is stored on-chain and reused across payroll and voting.
                </p>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, border: `1px solid ${T.border}`, padding: "4px 8px", color: T.mutedLo, borderRadius: T.r }}>
                  NOIR / rs-soroban-ultrahonk
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
                      Connect your Freighter wallet to generate a ZK credential on Soroban testnet.
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

              {/* Card 2: What is verified */}
              <div style={{ border: `1px solid ${T.border}`, padding: 24, borderRadius: T.r, background: T.surface }}>
                <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={16} /> What is Proven
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {CHECKS.map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle size={13} weight="bold" style={{ marginTop: 2, flexShrink: 0, color: T.accent }} />
                      <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Active credential */}
              {credential && (
                <div style={{ border: `1px solid ${T.accent}22`, padding: 24, borderRadius: T.r, background: `${T.accent}08` }}>
                  <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.accent, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={16} weight="fill" style={{ color: T.accent }} /> Active Nullifier
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: "8px 12px", borderRadius: T.r, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mono }}>
                        {credential.nullifier.slice(0, 12)}...{credential.nullifier.slice(-10)}
                      </span>
                      <button
                        onClick={() => handleCopy(credential.nullifier, "nullifier")}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: T.mutedLo }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = T.mutedLo)}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>
                      Issued: {credential.issuedAt}
                    </div>
                    <p style={{ fontSize: 11, color: T.success }}>
                      Payroll &amp; Voting flows are unlocked.
                    </p>
                    <button
                      onClick={clearCredential}
                      style={{ padding: "8px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.15em", backgroundColor: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: T.r, cursor: "pointer", width: "100%" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.color = T.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                    >
                      Reset Credential
                    </button>
                  </div>
                </div>
              )}

              {/* Card 4: Contract Address */}
              <div style={{ border: `1px solid ${T.border}`, padding: 24, borderRadius: T.r, background: T.surface }}>
                <h3 style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <LinkSimple size={16} /> Contract Registry
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: T.mutedLo, textTransform: "uppercase", fontFamily: "var(--font-geist-mono), monospace" }}>ZK Credential Verifier</span>
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: "6px 10px", borderRadius: T.r, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mono }}>
                      {ZK_CREDENTIAL_ID.slice(0, 10)}...{ZK_CREDENTIAL_ID.slice(-6)}
                    </span>
                    <button
                      onClick={() => handleCopy(ZK_CREDENTIAL_ID, "Contract ID")}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: T.mutedLo }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = T.mutedLo)}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                {copiedItem && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.success, marginTop: 8, display: "block" }}>
                    Copied {copiedItem}!
                  </span>
                )}
              </div>

            </div>

            {/* ── Right Column: Credential Console ── */}
            <div className="lg:col-span-2">
              <div style={{ border: `1px solid ${T.border}`, padding: "40px 32px", borderRadius: T.r, background: T.surface, minHeight: "100%" }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8 }}>
                  Credential Console
                </h2>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>
                  Enter your balance and generate a zero-knowledge proof. Your nullifier will be anchored on-chain and auto-loaded by payroll and voting flows.
                </p>
                <CredentialFlow />
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
