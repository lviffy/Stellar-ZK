"use client";

import { useState, useEffect } from "react";
import ZKConsole from "../hero/ZKConsole";
import { Lock, Play, Pause, Calendar, ArrowClockwise, Clock, Gear } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useWallet } from "@/hooks/useWallet";
import { provePayroll } from "@/lib/zkProver";
import { invokeSorobanContract } from "@/lib/soroban";
import { PRIVATE_TREASURY_ID } from "@/lib/contracts";
import { LogEntry } from "@/lib/types";

import { useCredential } from "@/hooks/useCredential";

interface Props { credentialNullifier?: string | null; }

const DEMO_CSV = `GBWVWI4DQ5ECDYSMG7PMJC47ZDM3XKDSZFCZAHMEJSMK5IQPJWSNKZX, 850
GBZXN7PIRZGNMHGA7S4GS4E5RJVL7DWD5GVPXHMJVVVQ3DXEAADGXY, 1200
GDSVO7GGKJNVKGCPGKIXBXPHZXAXMVYXMPNMJK7JXFXMM4E7BKGYKWK, 650`;

type ScheduleType = "manual" | "weekly" | "monthly" | "quarterly";

export default function PayrollFlow({ credentialNullifier: propNullifier }: Props) {
  const { address, connectWallet } = useWallet();
  const { nullifier: localNullifier } = useCredential();
  const credentialNullifier = propNullifier !== undefined ? propNullifier : localNullifier;
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<"idle" | "proving" | "done">("idle");
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const locked = !credentialNullifier;

  // Scheduling & Dashboard Config states
  const [schedule, setSchedule] = useState<ScheduleType>("manual");
  const [isCronActive, setIsCronActive] = useState<boolean>(true);
  const [budgetCap, setBudgetCap] = useState<number>(5000);
  
  // Custom intervals for demo (in seconds)
  const [weeklyInterval, setWeeklyInterval] = useState<number>(20);
  const [monthlyInterval, setMonthlyInterval] = useState<number>(45);
  const [quarterlyInterval, setQuarterlyInterval] = useState<number>(90);

  // Scheduler progress
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Sync timer when schedule type or customized intervals change
  useEffect(() => {
    if (schedule === "manual") {
      setTimeLeft(0);
      return;
    }
    const currentInterval = 
      schedule === "weekly" ? weeklyInterval :
      schedule === "monthly" ? monthlyInterval :
      quarterlyInterval;
    setTimeLeft(currentInterval);
  }, [schedule, weeklyInterval, monthlyInterval, quarterlyInterval]);

  // Automated scheduler execution loop
  useEffect(() => {
    if (schedule === "manual" || !isCronActive || status === "proving" || locked) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Trigger automated run
          handleRun(true);
          
          // Reset countdown to the current interval setting
          const nextInterval = 
            schedule === "weekly" ? weeklyInterval :
            schedule === "monthly" ? monthlyInterval :
            quarterlyInterval;
          return nextInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [schedule, isCronActive, status, weeklyInterval, monthlyInterval, quarterlyInterval, address, locked]);

  async function handleRun(isAuto = false) {
    let activeAddress = address;
    if (!activeAddress) {
      if (isAuto) {
        // Fallback demo address for automated runs to bypass wallet popup
        activeAddress = "GBDEMOAUTORUNFALLBACKADDRESSxxxxxxxxxxxxxxxxxxxxxxx";
      } else {
        activeAddress = await connectWallet();
        if (!activeAddress) return;
      }
    }
    
    setStatus("proving");
    setLogs([{ label: "system", text: `[${isAuto ? "AUTO" : "MANUAL"}] Initializing private payroll batch...` }]);
    
    const inputCsv = csv.trim() || DEMO_CSV;
    const sum = inputCsv.split("\n")
      .map((l) => Number(l.split(",")[1]?.trim()))
      .filter((n) => !isNaN(n))
      .reduce((a, b) => a + b, 0);
    setTotal(sum);
    
    const result = await provePayroll(inputCsv, budgetCap);
    setLogs(result.logs);
    
    if (!result.success || !result.proof) {
      setStatus("idle");
      return;
    }
    
    // Invoke Soroban execute_payroll
    setLogs((prev) => [...prev, { label: "soroban", text: "Broadcasting execute_payroll transaction to testnet..." }]);
    
    const callResult = await invokeSorobanContract(
      PRIVATE_TREASURY_ID,
      "execute_payroll",
      [
        Buffer.from(result.proof.risc0Receipt.replace("0x", ""), "hex"),
        Buffer.from("00".repeat(80), "hex"), // 80 bytes journal
        result.proof.noirTransferProofs.map(p => Buffer.from(p.replace("0x", ""), "hex"))
      ],
      activeAddress
    );
    
    if (callResult.success) {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: "Verification Succeeded!" },
        { label: "soroban", text: `Tx Hash: ${callResult.txHash}` },
        { label: "system", text: "Confidential payroll batch fully processed!" }
      ]);
      setStatus("done");
      setLastRun(new Date());
    } else {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: `Verification Failed: ${callResult.error}` }
      ]);
      setStatus("idle");
    }
  }

  const recipients = csv.split("\n").filter(Boolean);

  return (
    <div style={{ position: "relative", opacity: locked ? 0.35 : 1, pointerEvents: locked ? "none" : "auto" }}>
      {locked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "rgba(9, 9, 11, 0.7)",
            backdropFilter: "blur(4px)",
            border: `1px dashed ${T.border}`,
            borderRadius: T.r,
          }}
        >
          <Lock size={24} style={{ color: T.muted }} />
          <p style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.muted }}>
            Complete ZK Credentials verification to unlock
          </p>
        </div>
      )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Scheduling Control Panel */}
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: T.r,
                  padding: 16,
                  background: T.surface,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-geist-mono), monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: T.muted,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Calendar size={14} /> Schedule Type
                  </span>
                  
                  {schedule !== "manual" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-geist-mono), monospace",
                          background: isCronActive ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)",
                          color: isCronActive ? T.success : T.error,
                          padding: "2px 6px",
                          borderRadius: T.r,
                        }}
                      >
                        {isCronActive ? "● Active" : "Paused"}
                      </span>
                      <button
                        onClick={() => setIsCronActive(!isCronActive)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: T.muted,
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title={isCronActive ? "Pause execution" : "Resume execution"}
                      >
                        {isCronActive ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Button Selector */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {(["manual", "weekly", "monthly", "quarterly"] as ScheduleType[]).map((type) => {
                    const active = schedule === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSchedule(type);
                          if (type !== "manual") {
                            setIsCronActive(true); // Default auto-activate when scheduling
                          }
                        }}
                        style={{
                          padding: "8px 4px",
                          fontSize: 10,
                          fontFamily: "var(--font-geist-mono), monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          background: active ? T.accent : "transparent",
                          color: active ? T.bg : T.muted,
                          border: `1px solid ${active ? T.accent : T.border}`,
                          borderRadius: T.r,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>

                {/* Automated Schedule Stats & Override controls */}
                {schedule !== "manual" && (
                  <div
                    style={{
                      borderTop: `1px solid ${T.border}`,
                      paddingTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> Next run in:
                      </span>
                      <span style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace", color: T.text, fontWeight: 600 }}>
                        {timeLeft}s
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: "100%", height: 3, background: T.border, borderRadius: T.r, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${(timeLeft / (schedule === "weekly" ? weeklyInterval : schedule === "monthly" ? monthlyInterval : quarterlyInterval)) * 100}%`,
                          height: "100%",
                          background: isCronActive ? T.accent : T.mutedLo,
                          transition: "width 1s linear",
                        }}
                      />
                    </div>

                    {/* Actions & Config details */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <button
                        onClick={() => setShowConfig(!showConfig)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: showConfig ? T.accent : T.mutedLo,
                          fontSize: 10,
                          fontFamily: "var(--font-geist-mono), monospace",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        <Gear size={12} /> {showConfig ? "Hide Config" : "Setup Parameters"}
                      </button>

                      <button
                        onClick={() => handleRun(false)}
                        disabled={status === "proving"}
                        style={{
                          background: "rgba(229, 255, 71, 0.1)",
                          color: T.accent,
                          border: `1px solid ${T.accent}`,
                          borderRadius: T.r,
                          fontSize: 10,
                          fontFamily: "var(--font-geist-mono), monospace",
                          textTransform: "uppercase",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Run Now (Override)
                      </button>
                    </div>
                  </div>
                )}

                {/* Configuration Fields for Cron */}
                {showConfig && schedule !== "manual" && (
                  <div
                    style={{
                      borderTop: `1px dashed ${T.border}`,
                      paddingTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 10, color: T.mutedLo, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase" }}>
                          Interval (secs)
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={300}
                          value={schedule === "weekly" ? weeklyInterval : schedule === "monthly" ? monthlyInterval : quarterlyInterval}
                          onChange={(e) => {
                            const val = Math.max(2, Number(e.target.value));
                            if (schedule === "weekly") setWeeklyInterval(val);
                            else if (schedule === "monthly") setMonthlyInterval(val);
                            else setQuarterlyInterval(val);
                          }}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            color: T.text,
                            padding: "4px 8px",
                            borderRadius: T.r,
                            fontSize: 11,
                            fontFamily: "var(--font-geist-mono), monospace",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 10, color: T.mutedLo, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase" }}>
                          Budget Cap (XLM)
                        </label>
                        <input
                          type="number"
                          min={100}
                          value={budgetCap}
                          onChange={(e) => setBudgetCap(Math.max(100, Number(e.target.value)))}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            color: T.text,
                            padding: "4px 8px",
                            borderRadius: T.r,
                            fontSize: 11,
                            fontFamily: "var(--font-geist-mono), monospace",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Show details for last run */}
                {lastRun && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, display: "flex", justifyContent: "space-between" }}>
                    <span>Last run:</span>
                    <span>{lastRun.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="payroll-csv"
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: T.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Payroll CSV (address, amount_xlm)
                </label>
                <textarea
                  id="payroll-csv"
                  rows={6}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  placeholder={DEMO_CSV}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    color: T.mono,
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 12,
                    padding: "12px 16px",
                    borderRadius: T.r,
                    outline: "none",
                    resize: "none",
                    width: "100%",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
                />
              </div>

              <button
                id="run-payroll-btn"
                onClick={() => handleRun(false)}
                disabled={!csv.trim() || status === "proving" || schedule !== "manual"}
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
                  cursor: !csv.trim() || status === "proving" || schedule !== "manual" ? "not-allowed" : "pointer",
                  opacity: !csv.trim() || status === "proving" || schedule !== "manual" ? 0.35 : 1,
                  width: "fit-content",
                }}
              >
                {status === "proving" ? "Processing..." : schedule !== "manual" ? `Auto-Running (${schedule})` : "Run Payroll Batch"}
              </button>

              {credentialNullifier && (
                <div style={{ borderLeft: `2px solid ${T.accent}`, paddingLeft: 12, fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>
                  Using nullifier: {credentialNullifier.slice(0, 18)}...
                </div>
              )}
            </div>

            {/* Output */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {status === "idle" && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "32px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo }}>
                    No batch submitted yet.
                  </p>
                </div>
              )}

              {(status === "proving" || status === "done") && <ZKConsole lines={6} autoplay={false} logs={logs} />}

              {status === "done" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* RISC Zero */}
                  <div style={{ border: `1px solid ${T.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: T.mutedLo }}>
                        RISC Zero Receipt
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success }}>VALID</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: T.mono }}>
                      Batch size: {recipients.length} recipients
                    </span>
                    <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: T.mono }}>
                      Budget constraint: satisfied
                    </span>
                  </div>

                  {/* Noir proofs */}
                  <div style={{ border: `1px solid ${T.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: T.mutedLo }}>
                        Noir Transfer Proofs
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success }}>VERIFIED</span>
                    </div>
                    {recipients.map((_, i) => (
                      <span key={i} style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: T.mono }}>
                        Transfer {i + 1}: amount shielded - proof 2.8 kb
                      </span>
                    ))}
                  </div>

                  {/* Public total */}
                  <div style={{ borderTop: `2px solid ${T.accent}`, paddingTop: 16 }}>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      Public Event: Total Disbursed
                    </div>
                    <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 40, color: T.text }}>
                      {total.toLocaleString()}{" "}
                      <span style={{ fontSize: 20, color: T.muted }}>XLM</span>
                    </div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, marginTop: 4 }}>
                      Individual amounts permanently sealed.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}
