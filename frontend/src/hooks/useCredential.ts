/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";

interface Credential {
  nullifier: string;
  issuedAt: string;
}

export function useCredential() {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cached = localStorage.getItem("zk_credential");
    if (cached) {
      try {
        setCredential(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached credential", e);
      }
    }
  }, []);

  const saveCredential = (cred: Credential) => {
    localStorage.setItem("zk_credential", JSON.stringify(cred));
    setCredential(cred);
  };

  const clearCredential = () => {
    localStorage.removeItem("zk_credential");
    setCredential(null);
  };

  return {
    credential,
    nullifier: credential?.nullifier ?? null,
    loading: !mounted,
    saveCredential,
    clearCredential,
  };
}
