"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { fbAuth } from "@/lib/firebase";

export type AuthUser = { uid: string; name: string; email: string; picture: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gsiPromise = null;
        reject(new Error("Falha ao carregar Google Identity Services"));
      };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

async function syncFirebase(uid: string | null, firebaseToken: string | null | undefined) {
  if (!fbAuth) return;
  await fbAuth.authStateReady();
  const cur = fbAuth.currentUser;
  if (uid && firebaseToken && (!cur || cur.uid !== uid)) {
    await signInWithCustomToken(fbAuth, firebaseToken);
  } else if (!uid && cur) {
    await signOut(fbAuth);
  }
}

/**
 * Estado de login com Google.
 * `loggedUid` só é preenchido quando a sessão do servidor E o Firebase concordam no mesmo uid —
 * é esse o id a usar como playerId nas salas (as regras do Firebase exigem auth.uid igual).
 */
export function useGoogleAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fbUid, setFbUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fbAuth) return;
    return onAuthStateChanged(fbAuth, (u) => setFbUid(u ? u.uid : null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (j) => {
        if (cancelled) return;
        const u: AuthUser | null = j && j.user ? j.user : null;
        setUser(u);
        await syncFirebase(u ? u.uid : null, j && j.firebaseToken);
      })
      .catch(() => void 0)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithCredential = useCallback(async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.user) throw new Error((j && j.error) || "Falha no login");
      await syncFirebase(j.user.uid, j.firebaseToken);
      setUser(j.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no login");
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      void 0;
    }
    try {
      await syncFirebase(null, null);
    } catch {
      void 0;
    }
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {
      void 0;
    }
    setUser(null);
    setError("");
    setBusy(false);
  }, []);

  const loggedUid = user && fbUid === user.uid ? user.uid : null;
  return { user, loggedUid, ready, busy, error, loginWithCredential, logout };
}

/** Botão oficial "Entrar com Google" (Google Identity Services). */
export function GoogleSignInButton(props: { onCredential: (credential: string) => void; width?: number }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cbRef = useRef(props.onCredential);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    cbRef.current = props.onCredential;
  });
  const width = props.width || 320;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !boxRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: { credential?: string }) => {
            if (resp && resp.credential) cbRef.current(resp.credential);
          },
          ux_mode: "popup",
        });
        // Limpa antes de desenhar: em dev o React roda o efeito duas vezes e o botão duplicaria.
        boxRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(boxRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "pill",
          locale: "pt-BR",
          width: width,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [width]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{ fontSize: 12, color: "#fbbf24", textAlign: "center", lineHeight: 1.4 }}>
        Login com Google ainda não configurado (falta NEXT_PUBLIC_GOOGLE_CLIENT_ID).
      </div>
    );
  }
  if (failed) {
    return (
      <div style={{ fontSize: 12, opacity: 0.6, textAlign: "center" }}>
        Não foi possível carregar o login do Google.
      </div>
    );
  }
  return <div ref={boxRef} style={{ display: "flex", justifyContent: "center", minHeight: 44, colorScheme: "light" }} />;
}
