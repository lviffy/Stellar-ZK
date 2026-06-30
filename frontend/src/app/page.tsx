"use client";

import Navbar from "@/components/nav/Navbar";
import Hero from "@/components/hero/Hero";
import TrustStrip from "@/components/trust/TrustStrip";
import HowItWorks from "@/components/steps/HowItWorks";
import TechStack from "@/components/stack/TechStack";
import Footer from "@/components/footer/Footer";
import { useCredential } from "@/hooks/useCredential";
import Link from "next/link";
import { ArrowRight, Lock, CheckCircle, Shield, IdentificationCard, Coins, LockOpen } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";

export default function Home() {
  const { credential, loading } = useCredential();

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* 1. Nav */}
      <Navbar />

      {/* 2. Hero — Asymmetric split */}
      <Hero />

      {/* 3. Trust strip — logo rail */}
      <TrustStrip />

      {/* 4. How it works — vertical steps */}
      <HowItWorks />

      {/* 5. Flows Showcase Section */}
      <section
        id="flows"
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: "80px 0",
          backgroundColor: T.bg,
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          {/* Header */}
          <div style={{ maxWidth: 640, marginBottom: 48 }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: T.text,
                marginBottom: 16,
              }}
            >
              ZK Application Suite
            </h2>
            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: "55ch" }}>
              Explore privacy-preserving features verified on-chain via Soroban smart contracts. Start by generating a ZK credential.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Credentials */}
            <div
              style={{
                border: `1px solid ${T.border}`,
                padding: "32px 24px",
                borderRadius: T.r,
                background: T.surface,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                transition: "border-color 0.2s ease",
              }}
              className="hover:border-accent group"
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <IdentificationCard size={32} style={{ color: T.accent }} />
                  {loading ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>LOADING...</span>
                  ) : credential ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle size={12} weight="fill" /> VERIFIED
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>SETUP REQUIRED</span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 12 }}>ZK Credentials</h3>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 24 }}>
                  Generate and verify your membership and eligibility limits without exposing private balance data. Uses Noir circuits.
                </p>
              </div>
              <Link
                href="/credentials"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: T.accent,
                  textDecoration: "none",
                  marginTop: "auto",
                }}
              >
                Enter Flow <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 2: Payroll */}
            <div
              style={{
                border: `1px solid ${T.border}`,
                padding: "32px 24px",
                borderRadius: T.r,
                background: T.surface,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                transition: "border-color 0.2s ease",
              }}
              className="hover:border-accent group"
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <Coins size={32} style={{ color: credential ? T.accent : T.mutedLo }} />
                  {loading ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>LOADING...</span>
                  ) : credential ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <LockOpen size={12} weight="fill" /> UNLOCKED
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.error, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Lock size={12} weight="fill" /> LOCKED
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 12 }}>Private Payroll</h3>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 24 }}>
                  Validate compliance of batch transfers via RISC Zero. Keep individual recipient amounts sealed using Noir proofs.
                </p>
              </div>
              <Link
                href="/payroll"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: credential ? T.accent : T.mutedLo,
                  pointerEvents: credential ? "auto" : "none",
                  opacity: credential ? 1 : 0.5,
                  textDecoration: "none",
                  marginTop: "auto",
                }}
              >
                {credential ? "Enter Flow" : "Locked"} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 3: Voting */}
            <div
              style={{
                border: `1px solid ${T.border}`,
                padding: "32px 24px",
                borderRadius: T.r,
                background: T.surface,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                transition: "border-color 0.2s ease",
              }}
              className="hover:border-accent group"
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <Shield size={32} style={{ color: credential ? T.accent : T.mutedLo }} />
                  {loading ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>LOADING...</span>
                  ) : credential ? (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <LockOpen size={12} weight="fill" /> UNLOCKED
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.error, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Lock size={12} weight="fill" /> LOCKED
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 12 }}>Private DAO Voting</h3>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 24 }}>
                  Cast secure, anonymous ballots for DAO governance proposals. Authenticated with Groth16 zk-SNARK verifiers on Soroban.
                </p>
              </div>
              <Link
                href="/voting"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: credential ? T.accent : T.mutedLo,
                  pointerEvents: credential ? "auto" : "none",
                  opacity: credential ? 1 : 0.5,
                  textDecoration: "none",
                  marginTop: "auto",
                }}
              >
                {credential ? "Enter Flow" : "Locked"} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Tech Stack — gap-px fact grid */}
      <TechStack />

      {/* 7. Footer — 2-col */}
      <Footer />
    </div>
  );
}
