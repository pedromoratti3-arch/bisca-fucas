"use client";
/**
 * Progresso no navegador.
 * - Logado (Google): vem do servidor (/api/progress) e toda mudança passa pelo servidor.
 * - Convidado: o mesmo motor roda no aparelho e salva em localStorage (bf_progress_guest_v1).
 *   Ao entrar com Google pela primeira vez, o progresso de convidado é importado para a conta.
 * Também guarda a fila de "celebrações" (XP ganho, subiu de nível, baralho novo) para as telas mostrarem.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DECK_BY_ID, DEFAULT_DECK, type DeckDef } from "@/data/decks";
import { tierForLevel, type Tier } from "@/data/progression";
import { applyMatch, claimMission, claimableCount, createInitialProgress, equipDeck, markDecksSeen, normalizeProgress, refreshRotations } from "./engine";
import { emptyEvents, type MatchReport, type ProgressEvents, type ProgressState } from "./types";

const GUEST_KEY = "bf_progress_guest_v1";

export type Celebration = { id: number; kind: "match" | "claim" | "clan"; events: ProgressEvents; report?: MatchReport };

type Ctx = {
  progress: ProgressState | null;
  loading: boolean;
  source: "server" | "local";
  loggedUid: string | null;
  equippedDeck: DeckDef;
  tier: Tier;
  claimable: number;
  unseenDecks: string[];
  celebrations: Celebration[];
  reportMatch: (r: MatchReport) => Promise<ProgressEvents>;
  claim: (id: string) => Promise<ProgressEvents | null>;
  equip: (deckId: string) => Promise<void>;
  markSeen: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  setProgress: (p: ProgressState) => void;
  pushCelebration: (c: Omit<Celebration, "id">) => void;
  popCelebration: (id: number) => void;
};

const ProgressCtx = createContext<Ctx | null>(null);

function readGuest(): ProgressState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return normalizeProgress(raw ? JSON.parse(raw) : null, now);
  } catch {
    return createInitialProgress(now);
  }
}
function writeGuest(p: ProgressState) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(p));
  } catch {
    /* sem espaço / modo privado */
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => null)) as T | null;
    return r.ok ? j : j;
  } catch {
    return null;
  }
}

export function ProgressProvider(props: { loggedUid: string | null; authReady: boolean; children: ReactNode }) {
  const { loggedUid, authReady } = props;
  const [progress, setProgressState] = useState<ProgressState | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"server" | "local">("local");
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const seq = useRef(0);
  const progRef = useRef<ProgressState | null>(null);
  useEffect(() => {
    progRef.current = progress;
  }, [progress]);

  const setProgress = useCallback((p: ProgressState) => {
    progRef.current = p;
    setProgressState(p);
  }, []);

  const pushCelebration = useCallback((c: Omit<Celebration, "id">) => {
    const id = ++seq.current;
    setCelebrations((cur) => [...cur, { ...c, id }]);
  }, []);
  const popCelebration = useCallback((id: number) => setCelebrations((cur) => cur.filter((c) => c.id !== id)), []);

  const load = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    if (loggedUid) {
      try {
        const r = await fetch("/api/progress", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (r.ok && j && j.progress) {
          let p = normalizeProgress(j.progress, Date.now());
          // importa progresso de convidado uma única vez
          const guest = readGuest();
          if (p.matches === 0 && guest.matches > 0) {
            const imp = await postJson<{ progress: ProgressState; imported: boolean }>("/api/progress/import", { progress: guest });
            if (imp && imp.progress) {
              p = normalizeProgress(imp.progress, Date.now());
              if (imp.imported) {
                try {
                  localStorage.removeItem(GUEST_KEY);
                } catch {
                  /* ignore */
                }
              }
            }
          }
          setSource("server");
          setProgress(p);
          setLoading(false);
          return;
        }
      } catch {
        /* cai para local */
      }
    }
    setSource("local");
    setProgress(readGuest());
    setLoading(false);
  }, [loggedUid, authReady, setProgress]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  // renova diárias/semanais quando o dia vira com o app aberto
  useEffect(() => {
    const t = setInterval(() => {
      const p = progRef.current;
      if (!p) return;
      const n = refreshRotations(p, Date.now());
      if (n !== p) {
        setProgress(n);
        if (source === "local") writeGuest(n);
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [source, setProgress]);

  const reportMatch = useCallback(
    async (r: MatchReport): Promise<ProgressEvents> => {
      const cur = progRef.current || createInitialProgress(Date.now());
      if (source === "server" && loggedUid) {
        const j = await postJson<{ progress: ProgressState; events: ProgressEvents; rejected: string | null }>("/api/progress/match", { report: r });
        if (j && j.progress) {
          const p = normalizeProgress(j.progress, Date.now());
          setProgress(p);
          return j.events || emptyEvents(p.level);
        }
        // sem rede: aplica localmente só para mostrar; o servidor continua a fonte da verdade
        return applyMatch(cur, r).events;
      }
      const out = applyMatch(cur, r);
      setProgress(out.state);
      writeGuest(out.state);
      return out.events;
    },
    [source, loggedUid, setProgress]
  );

  const claim = useCallback(
    async (id: string): Promise<ProgressEvents | null> => {
      const cur = progRef.current;
      if (!cur) return null;
      if (source === "server" && loggedUid) {
        const j = await postJson<{ progress: ProgressState; events: ProgressEvents; error?: string }>("/api/progress/claim", { id });
        if (j && j.progress) setProgress(normalizeProgress(j.progress, Date.now()));
        if (j && j.events) {
          pushCelebration({ kind: "claim", events: j.events });
          return j.events;
        }
        return null;
      }
      const out = claimMission(cur, id, Date.now());
      if (!out.ok) return null;
      setProgress(out.state);
      writeGuest(out.state);
      pushCelebration({ kind: "claim", events: out.events });
      return out.events;
    },
    [source, loggedUid, setProgress, pushCelebration]
  );

  const equip = useCallback(
    async (deckId: string) => {
      const cur = progRef.current;
      if (!cur || !cur.decks.unlocked.includes(deckId)) return;
      const optimistic = equipDeck(cur, deckId);
      setProgress(optimistic);
      if (source === "server" && loggedUid) {
        const j = await postJson<{ progress: ProgressState }>("/api/progress/equip", { deckId });
        if (j && j.progress) setProgress(normalizeProgress(j.progress, Date.now()));
      } else writeGuest(optimistic);
    },
    [source, loggedUid, setProgress]
  );

  const markSeen = useCallback(
    async (ids: string[]) => {
      const cur = progRef.current;
      if (!cur || !ids.length) return;
      const n = markDecksSeen(cur, ids);
      setProgress(n);
      if (source === "server" && loggedUid) void postJson("/api/progress/seen", { deckIds: ids });
      else writeGuest(n);
    },
    [source, loggedUid, setProgress]
  );

  const value = useMemo<Ctx>(() => {
    const p = progress;
    return {
      progress: p,
      loading,
      source,
      loggedUid,
      equippedDeck: p ? DECK_BY_ID[p.decks.equipped] || DEFAULT_DECK : DEFAULT_DECK,
      tier: tierForLevel(p ? p.level : 1),
      claimable: p ? claimableCount(p) : 0,
      unseenDecks: p ? p.decks.unseen : [],
      celebrations,
      reportMatch,
      claim,
      equip,
      markSeen,
      refresh: load,
      setProgress,
      pushCelebration,
      popCelebration,
    };
  }, [progress, loading, source, loggedUid, celebrations, reportMatch, claim, equip, markSeen, load, setProgress, pushCelebration, popCelebration]);

  return <ProgressCtx.Provider value={value}>{props.children}</ProgressCtx.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressCtx);
  if (!ctx) throw new Error("useProgress precisa do <ProgressProvider>");
  return ctx;
}

export function useProgressOptional(): Ctx | null {
  return useContext(ProgressCtx);
}
