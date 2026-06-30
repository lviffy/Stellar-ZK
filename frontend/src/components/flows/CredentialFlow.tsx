"use client";

import { useState } from "react";
import ZKConsole from "../hero/ZKConsole";
import { CheckCircle, Lock } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useWallet } from "@/hooks/useWallet";
import { proveCredential } from "@/lib/zkProver";
import { invokeSorobanContract } from "@/lib/soroban";
import { ZK_CREDENTIAL_ID } from "@/lib/contracts";
import { LogEntry } from "@/lib/types";

import { useCredential } from "@/hooks/useCredential";

interface Credential { nullifier: string; issuedAt: string; }
interface Props { onCredentialIssued?: (c: Credential) => void; }

export default function CredentialFlow({ onCredentialIssued }: Props) {
  const { address, connectWallet } = useWallet();
  const { credential, saveCredential, clearCredential, loading } = useCredential();
  const [balance, setBalance] = useState("");
  const [member, setMember] = useState(false);
  const [age, setAge] = useState(false);
  const [status, setStatus] = useState<"idle" | "proving" | "done">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const canProve = balance !== "" && Number(balance) >= 0;

  async function handleGenerate() {
    if (!canProve) return;
    
    let activeAddress = address;
    if (!activeAddress) {
      activeAddress = await connectWallet();
      if (!activeAddress) return;
    }
    
    setStatus("proving");
    setLogs([{ label: "system", text: "Starting ZK Credential generation..." }]);
    
    const result = await proveCredential(Number(balance), age ? 21 : 16, 12345);
    setLogs(result.logs);
    
    if (!result.success || !result.proof) {
      setStatus("idle");
      return;
    }
    
    // Invoke Soroban verify_credential
    setLogs((prev) => [...prev, { label: "soroban", text: "Broadcasting verify_credential call to testnet..." }]);
    
    const callResult = await invokeSorobanContract(
      ZK_CREDENTIAL_ID,
      "verify_credential",
      [
        Buffer.from(result.proof.proofBytes.replace("0x", ""), "hex"),
        Buffer.from(result.proof.publicInputsBytes.replace("0x", ""), "hex"),
        BigInt(balance),
        age ? 18n : 0n
      ],
      activeAddress
    );
    
    if (callResult.success) {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: "Verification Succeeded!" },
        { label: "soroban", text: `Tx Hash: ${callResult.txHash}` },
        { label: "system", text: "Credential successfully registered on-chain!" }
      ]);
      const cred: Credential = {
        nullifier: result.proof.nullifier,
        issuedAt: new Date().toISOString(),
      };
      saveCredential(cred);
      setStatus("done");
      if (onCredentialIssued) {
        onCredentialIssued(cred);
      }
    } else {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: `Verification Failed: ${callResult.error}` }
      ]);
      setStatus("idle");
    }
  }

  const CHECKS = [
    "Balance threshold proof (Noir circuit)",
    "Allowlist membership gate",
    "Age eligibility check",
    "On-chain nullifier via rs-soroban-ultrahonk",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {loading ? (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "32px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>Loading credential...</span>
        </div>
      ) : (!credential && status !== "done") ? (
            <>
              {/* Balance input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="balance-input"
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: T.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Minimum Balance (XLM)
                </label>
                <input
                  id="balance-input"
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 14,
                    padding: "12px 16px",
                    borderRadius: T.r,
                    outline: "none",
                    width: "100%",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { id: "member-check", label: "Allowlist membership verified", val: member, set: setMember },
                  { id: "age-check",    label: "Age eligibility (18+) confirmed",  val: age,    set: setAge    },
                ].map(({ id, label, val, set }) => (
                  <label
                    key={id}
                    htmlFor={id}
                    style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      id={id}
                      checked={val}
                      onChange={(e) => set(e.target.checked)}
                      style={{ position: "absolute", opacity: 0, width: 0 }}
                    />
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: `1px solid ${val ? T.accent : T.border}`,
                        background: val ? T.accent : "transparent",
                        borderRadius: 2,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {val && (
                        <svg viewBox="0 0 10 8" width="10" height="8">
                          <path d="M1 4l2.5 2.5L9 1" stroke={T.bg} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: 14, color: T.muted }}>{label}</span>
                  </label>
                ))}
              </div>

              {status === "proving" && <ZKConsole lines={6} autoplay={false} logs={logs} />}
              {status === "idle" && (
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    padding: "24px 16px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>
                    No credential generated yet.
                  </p>
                </div>
              )}

              <button
                id="generate-credential-btn"
                onClick={handleGenerate}
                disabled={!canProve || status === "proving"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 20px",
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  background: T.accent,
                  color: T.bg,
                  borderRadius: T.r,
                  border: "none",
                  cursor: canProve && status !== "proving" ? "pointer" : "not-allowed",
                  opacity: canProve && status !== "proving" ? 1 : 0.35,
                  transition: "background 0.15s",
                }}
              >
                {status === "proving" ? "Proving..." : "Generate Credential"}
              </button>
            </>
          ) : (
            /* Success state */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ border: `1px solid ${T.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.success, display: "inline-block" }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-geist-mono), monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: T.success,
                    }}
                  >
                    Credential Verified
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Nullifier
                  </span>
                  <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: T.mono, wordBreak: "break-all" }}>
                    {credential?.nullifier}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Issued
                  </span>
                  <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: T.muted }}>
                    {credential?.issuedAt}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.success }}>
                <Lock size={12} weight="bold" />
                Payroll and Voting flows unlocked
              </div>
              <button
                id="reset-credential-btn"
                onClick={clearCredential}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 16px",
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  background: "transparent",
                  color: T.muted,
                  borderRadius: T.r,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  width: "fit-content",
                  marginTop: 8,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = T.error;
                  (e.currentTarget as HTMLElement).style.color = T.error;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = T.border;
                  (e.currentTarget as HTMLElement).style.color = T.muted;
                }}
              >
                Reset Credential
              </button>
            </div>
          )}
    </div>
  );
}
