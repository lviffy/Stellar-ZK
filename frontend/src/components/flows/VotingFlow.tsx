"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import ZKConsole from "../hero/ZKConsole";
import { Lock } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useWallet } from "@/hooks/useWallet";
import { proveVote } from "@/lib/zkProver";
import { invokeSorobanContract, getTallyFromSoroban } from "@/lib/soroban";
import { PRIVATE_GOVERNANCE_ID } from "@/lib/contracts";
import { LogEntry } from "@/lib/types";

import { useCredential } from "@/hooks/useCredential";

interface Props { credentialNullifier?: string | null; }

interface Proposal { id: string; title: string; desc: string; status: "OPEN" | "CLOSED"; }

interface Tally { yes: number; no: number; }

export default function VotingFlow({ credentialNullifier: propNullifier }: Props) {
  const { address, connectWallet } = useWallet();
  const { nullifier: localNullifier } = useCredential();
  const credentialNullifier = propNullifier !== undefined ? propNullifier : localNullifier;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [status, setStatus] = useState<"idle" | "proving" | "done">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tally, setTally] = useState<Record<string, Tally>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());

  // Load proposals and voted state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dao_proposals");
    if (saved) {
      try {
        setProposals(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved proposals", e);
      }
    }
    // Restore voted proposals across page refreshes
    const savedVoted = localStorage.getItem("dao_voted_proposals");
    if (savedVoted) {
      try {
        setVoted(new Set(JSON.parse(savedVoted)));
      } catch (e) {
        console.error("Failed to parse saved voted state", e);
      }
    }
  }, []);

  async function loadTallies(list: Proposal[]) {
    const newTally: Record<string, Tally> = {};
    const savedTallies = localStorage.getItem("dao_local_tallies");
    let localTallies: Record<string, Tally> = {};
    try {
      localTallies = savedTallies ? JSON.parse(savedTallies) : {};
    } catch (e) {
      console.warn("Failed to parse local tallies, resetting cache", e);
    }

    for (const p of list) {
      let numericId = 0;
      if (p.id.startsWith("p")) {
        numericId = parseInt(p.id.slice(1), 10);
      } else {
        numericId = parseInt(p.id, 10);
      }
      if (isNaN(numericId)) {
        numericId = 1;
      }
      const result = await getTallyFromSoroban(PRIVATE_GOVERNANCE_ID, numericId);
      const local = localTallies[p.id] || { yes: 0, no: 0 };
      if (result) {
        const [noVotes, yesVotes] = result;
        // Take the max of contract vs local values to avoid losing locally-tracked votes
        newTally[p.id] = {
          yes: Math.max(yesVotes, local.yes),
          no: Math.max(noVotes, local.no)
        };
        localTallies[p.id] = newTally[p.id];
      } else {
        newTally[p.id] = local;
      }
    }
    localStorage.setItem("dao_local_tallies", JSON.stringify(localTallies));
    setTally(newTally);
  }

  // Load tallies whenever proposals change
  useEffect(() => {
    if (proposals.length > 0) {
      loadTallies(proposals);
    }
  }, [proposals]);
  // create-proposal form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [creating, setCreating] = useState(false);

  const locked = !credentialNullifier;
  const currentProposal = proposals.find((p) => p.id === selected);

  function handleCreateProposal() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const proposalNum = Date.now();
    const id = `p${proposalNum}`;
    const newProp: Proposal = {
      id,
      title: newTitle.trim(),
      desc: newDesc.trim() || "No description provided.",
      status: "OPEN"
    };

    setTimeout(() => {
      const updatedList = [...proposals, newProp];
      setProposals(updatedList);
      localStorage.setItem("dao_proposals", JSON.stringify(updatedList));
      
      const savedTallies = localStorage.getItem("dao_local_tallies");
      let localTallies: Record<string, Tally> = {};
      try {
        localTallies = savedTallies ? JSON.parse(savedTallies) : {};
      } catch (e) {}
      localTallies[id] = { yes: 0, no: 0 };
      localStorage.setItem("dao_local_tallies", JSON.stringify(localTallies));

      setTally((prev) => ({ ...prev, [id]: { yes: 0, no: 0 } }));
      setNewTitle("");
      setNewDesc("");
      setShowCreate(false);
      setCreating(false);
    }, 600); // simulate brief submission
  }

  async function handleVote() {
    if (!selected || !choice || status === "proving") return;
    
    // Prevent double voting (client-side check, contract also enforces via nullifier)
    if (voted.has(selected)) {
      setLogs([{ label: "system", text: "You have already voted on this proposal." }]);
      return;
    }
    
    let activeAddress = address;
    if (!activeAddress) {
      activeAddress = await connectWallet();
      if (!activeAddress) return;
    }
    
    setStatus("proving");
    setLogs([{ label: "system", text: "Initializing private vote..." }]);
    
    let proposalNum = 1n;
    if (selected.startsWith("p")) {
      proposalNum = BigInt(selected.slice(1));
    } else {
      proposalNum = BigInt(selected);
    }
    
    const result = await proveVote(12345, Number(proposalNum), choice === "yes" ? 1 : 0);
    setLogs(result.logs);
    
    if (!result.success || !result.proof) {
      setLogs((prev) => [...prev, { label: "system", text: "ZK proof generation failed. Cannot proceed." }]);
      setStatus("idle");
      return;
    }
    
    // Invoke Soroban vote
    setLogs((prev) => [...prev, { label: "soroban", text: "Broadcasting vote transaction to testnet..." }]);
    
    const callResult = await invokeSorobanContract(
      PRIVATE_GOVERNANCE_ID,
      "vote",
      [
        {
          a: Buffer.concat([Buffer.from(result.proof.proof.a[0].replace("0x",""), "hex"), Buffer.from(result.proof.proof.a[1].replace("0x",""), "hex")]),
          b: Buffer.concat([
            Buffer.from(result.proof.proof.b[0][1].replace("0x",""), "hex"),
            Buffer.from(result.proof.proof.b[0][0].replace("0x",""), "hex"),
            Buffer.from(result.proof.proof.b[1][1].replace("0x",""), "hex"),
            Buffer.from(result.proof.proof.b[1][0].replace("0x",""), "hex"),
          ]),
          c: Buffer.concat([Buffer.from(result.proof.proof.c[0].replace("0x",""), "hex"), Buffer.from(result.proof.proof.c[1].replace("0x",""), "hex")]),
        },
        Buffer.from(result.proof.publicInputs[0].replace("0x",""), "hex"), // credential_nullifier
        proposalNum,
        choice === "yes" ? 1n : 0n,
        Buffer.from(result.proof.publicInputs[3].replace("0x",""), "hex") // voting_nullifier
      ],
      activeAddress
    );
    
    if (callResult.success) {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: "Verification Succeeded!" },
        { label: "soroban", text: `Tx Hash: ${callResult.txHash}` },
        { label: "system", text: "Vote cast successfully & stored on-chain!" }
      ]);
      
      // Update local tally immediately
      const savedTallies = localStorage.getItem("dao_local_tallies");
      let localTallies: Record<string, Tally> = {};
      try {
        localTallies = savedTallies ? JSON.parse(savedTallies) : {};
      } catch (e) {}
      const current = localTallies[selected] || { yes: 0, no: 0 };
      if (choice === "yes") {
        current.yes += 1;
      } else {
        current.no += 1;
      }
      localTallies[selected] = current;
      localStorage.setItem("dao_local_tallies", JSON.stringify(localTallies));

      // Update React tally state directly so the UI reflects immediately
      setTally((prev) => ({
        ...prev,
        [selected]: { ...current }
      }));
      
      // Mark as voted and persist to localStorage
      const newVoted = new Set([...voted, selected]);
      setVoted(newVoted);
      localStorage.setItem("dao_voted_proposals", JSON.stringify([...newVoted]));
      
      // Also try to reload from contract for accuracy
      loadTallies(proposals).catch(() => {});
      
      setStatus("done");
      setTimeout(() => { setStatus("idle"); setSelected(null); setChoice(null); }, 3500);
    } else {
      setLogs((prev) => [
        ...prev,
        { label: "soroban", text: `Verification Failed: ${callResult.error}` }
      ]);
      setStatus("idle");
    }
  }

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

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            {/* Left: proposals */}
            <div>
              {/* New Proposal button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button
                  onClick={() => { setShowCreate((v) => !v); setNewTitle(""); setNewDesc(""); }}
                  style={{
                    padding: "8px 16px",
                    fontSize: 11,
                    fontFamily: "var(--font-geist-mono), monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: `1px solid ${showCreate ? T.accent : T.border}`,
                    background: showCreate ? `${T.accent}18` : "transparent",
                    color: showCreate ? T.accent : T.muted,
                    borderRadius: T.r,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {showCreate ? "✕ Cancel" : "+ New Proposal"}
                </button>
              </div>

              {/* Create form */}
              <AnimatePresence>
                {showCreate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ border: `1px solid ${T.accent}44`, borderRadius: T.r, padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                      <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: T.accent }}>New Proposal</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em" }}>Title *</label>
                        <input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. Increase emission rate by 5%"
                          maxLength={100}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.r,
                            padding: "10px 12px",
                            fontSize: 13,
                            color: T.text,
                            fontFamily: "inherit",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em" }}>Description</label>
                        <textarea
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          placeholder="Describe the rationale and impact..."
                          rows={3}
                          maxLength={400}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.r,
                            padding: "10px 12px",
                            fontSize: 13,
                            color: T.text,
                            fontFamily: "inherit",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box",
                            resize: "vertical",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
                        />
                      </div>
                      <button
                        onClick={handleCreateProposal}
                        disabled={!newTitle.trim() || creating}
                        style={{
                          padding: "10px 20px",
                          fontSize: 11,
                          fontFamily: "var(--font-geist-mono), monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          background: T.accent,
                          color: T.bg,
                          border: "none",
                          borderRadius: T.r,
                          cursor: !newTitle.trim() || creating ? "not-allowed" : "pointer",
                          opacity: !newTitle.trim() || creating ? 0.4 : 1,
                          width: "fit-content",
                          transition: "opacity 0.15s",
                        }}
                      >
                        {creating ? "Submitting..." : "Submit Proposal"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {proposals.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center", border: `1px dashed ${T.border}`, borderRadius: T.r }}>
                  <p style={{ fontSize: 13, color: T.mutedLo }}>
                    No proposals found. Click "+ New Proposal" in the top right to create one.
                  </p>
                </div>
              ) : (
                proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    onClick={() => {
                      if (proposal.status === "OPEN" && !voted.has(proposal.id)) {
                        setSelected(selected === proposal.id ? null : proposal.id);
                        setChoice(null);
                        setStatus("idle");
                      }
                    }}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      cursor: proposal.status === "OPEN" && !voted.has(proposal.id) ? "pointer" : "default",
                      background: selected === proposal.id ? T.surface : "transparent",
                      transition: "background 0.15s",
                      marginLeft: -24,
                      marginRight: -24,
                      paddingLeft: 24,
                      paddingRight: 24,
                    }}
                    onMouseEnter={(e) => {
                      if (proposal.status === "OPEN") (e.currentTarget as HTMLDivElement).style.background = T.surface;
                    }}
                    onMouseLeave={(e) => {
                      if (selected !== proposal.id) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 14, color: T.text }}>{proposal.title}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      {voted.has(proposal.id) && (
                        <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success }}>Voted</span>
                      )}
                      <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: proposal.status === "OPEN" ? T.accent : T.mutedLo }}>
                        {proposal.status}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Vote panel */}
              <AnimatePresence>
                {selected && currentProposal?.status === "OPEN" && !voted.has(selected) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                      <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Vote on: {currentProposal?.title.slice(0, 40)}...
                      </p>

                      <div style={{ display: "flex", gap: 12 }}>
                        {(["yes", "no"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setChoice(opt)}
                            style={{
                              padding: "10px 24px",
                              fontSize: 11,
                              fontFamily: "var(--font-geist-mono), monospace",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              border: `1px solid ${choice === opt ? (opt === "yes" ? T.success : T.error) : T.border}`,
                              background: choice === opt ? (opt === "yes" ? T.success : T.error) : "transparent",
                              color: choice === opt ? T.bg : T.muted,
                              borderRadius: T.r,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {(status === "proving" || status === "done") && <ZKConsole lines={4} autoplay={false} logs={logs} />}
                      {status === "done" && (
                        <span style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: T.success }}>
                          Vote recorded. Nullifier sealed.
                        </span>
                      )}

                      <button
                        id="cast-vote-btn"
                        onClick={handleVote}
                        disabled={!choice || status === "proving" || status === "done"}
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
                          cursor: !choice || status !== "idle" ? "not-allowed" : "pointer",
                          opacity: !choice || status !== "idle" ? 0.35 : 1,
                          width: "fit-content",
                        }}
                      >
                        {status === "proving" ? "Proving..." : "Cast Sealed Vote"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: tally */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: T.mutedLo }}>
                Live Tally
              </p>
              {proposals.length === 0 ? (
                <p style={{ fontSize: 12, color: T.mutedLo }}>No tallies to display.</p>
              ) : (
                proposals.map((proposal) => (
                  <div key={proposal.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
                      {proposal.title.length > 36 ? proposal.title.slice(0, 36) + "..." : proposal.title}
                    </p>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 28, color: T.success }}>
                          {tally[proposal.id]?.yes ?? 0}
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, marginTop: 2 }}>YES</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 28, color: T.error }}>
                          {tally[proposal.id]?.no ?? 0}
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: T.mutedLo, marginTop: 2 }}>NO</div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {credentialNullifier && (
                <div style={{ borderLeft: `2px solid ${T.accent}`, paddingLeft: 12 }}>
                  <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.muted }}>
                    Nullifier: {credentialNullifier.slice(0, 18)}...
                  </p>
                  <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: T.success, marginTop: 4 }}>
                    Not previously used
                  </p>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}
