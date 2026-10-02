"use client";
/**
 * Fim de partida — ritmo de jogo publicado: IMPACTO → CELEBRAÇÃO → RECOMPENSAS.
 *  1. Impacto: o título entra com força (cresce, bate e assenta) com um tremor curto de tela e um clarão;
 *     raios de luz giram devagar atrás do título.
 *  2. Celebração (cresce com a faixa do jogador): 1 brilho · 2 confete · 3 cartas do baralho equipado explodindo
 *     + fichas caindo · 4 chuva de naipes dourados · 5 tudo + aura holográfica. Partículas na cor do baralho.
 *  3. Recompensas: placar e pontos da última mão, "+XP" contando para cima com a barra enchendo,
 *     subiu de nível (com tremor) e baralho novo (pacote), um de cada vez.
 * Com "reduzir movimento": sem tremor, sem partículas, tudo aparece direto.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip, LevelBadge, PlayingCard, ProgressBar, SuitGlyph, prefersReducedMotion } from "@/design";
import { DECK_BY_ID, DEFAULT_DECK } from "@/data/decks";
import { levelFromXp, tierForLevel } from "@/data/progression";
import type { ProgressEvents } from "@/lib/progress/types";
import { useProgressOptional } from "@/lib/progress/useProgress";
import { CountUp } from "./common";
import { DeckUnlockOverlay } from "./CollectionScreen";

type Stage = "impact" | "celebrate" | "xp" | "level" | "deck" | "done";

export function ResultScreen(props: {
  won: boolean;
  myTeam: 0 | 1;
  finalPts: number[];
  names: string[];
  setWins: number[];
  /** linhas da última mão (como o resumo antigo mostrava os pontos) */
  summary?: string[];
  events: ProgressEvents | null;
  level: number;
  /** XP total da conta depois da partida (para a barra encher do valor antigo ao novo) */
  xpAfter?: number;
  deckId: string;
  isOnline: boolean;
  isRoomHost: boolean;
  onNext: () => void;
  onHome: () => void;
}) {
  const { won, events } = props;
  const prog = useProgressOptional();
  const reduce = prefersReducedMotion();
  const tier = tierForLevel(props.level);
  const fx = won ? tier.victoryFx : 0;
  const deck = DECK_BY_ID[props.deckId] || DEFAULT_DECK;
  const deckColor = deck.effects?.glow || deck.back.border;
  const [stage, setStage] = useState<Stage>("impact");
  const [shake, setShake] = useState(false);
  const [deckQueue, setDeckQueue] = useState<string[]>(events ? events.decksUnlocked : []);
  const [barXp, setBarXp] = useState<number | null>(null);
  const deckQueueRef = useRef(deckQueue);
  deckQueueRef.current = deckQueue;

  // quando os eventos chegam depois (servidor), atualiza a fila de baralhos
  useEffect(() => {
    if (events && events.decksUnlocked.length) setDeckQueue((q) => Array.from(new Set([...q, ...events.decksUnlocked])));
  }, [events]);

  // XP antes/depois para a barra
  const xpAfter = typeof props.xpAfter === "number" ? props.xpAfter : null;
  const xpBefore = events && xpAfter !== null ? Math.max(0, xpAfter - events.xpGained) : null;
  const lfBefore = levelFromXp(xpBefore ?? 0);
  const lfAfter = levelFromXp(xpAfter ?? 0);
  const leveledUp = !!events && events.levelAfter > events.levelBefore;

  function kickShake(ms = 420) {
    if (reduce) return;
    setShake(true);
    setTimeout(() => setShake(false), ms);
  }

  // sequência
  useEffect(() => {
    if (reduce) {
      setStage("xp");
      return;
    }
    kickShake(380);
    const t1 = setTimeout(() => setStage("celebrate"), 700);
    const t2 = setTimeout(() => setStage("xp"), fx >= 3 ? 2300 : 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // barra de XP enche do valor antigo ao novo; depois: nível → baralho → botões
  useEffect(() => {
    if (stage !== "xp" || !events) return;
    if (xpBefore === null || xpAfter === null) {
      const t = setTimeout(() => setStage(leveledUp ? "level" : deckQueueRef.current.length ? "deck" : "done"), reduce ? 0 : 1600);
      return () => clearTimeout(t);
    }
    setBarXp(xpBefore);
    const t0 = setTimeout(() => setBarXp(xpAfter), reduce ? 0 : 350);
    const t1 = setTimeout(() => {
      if (leveledUp) {
        setStage("level");
        kickShake(360);
      } else setStage(deckQueueRef.current.length ? "deck" : "done");
    }, reduce ? 0 : 1900);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, events]);

  // confete (faixa 2+)
  useEffect(() => {
    if (!won || fx < 2 || reduce || stage !== "celebrate") return;
    let cancelled = false;
    void import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const palette = [deckColor, "#fde68a", "#f0d078", "#ffffff", fx >= 4 ? "#a78bfa" : "#22c55e"];
      confetti({ particleCount: 70 + fx * 35, spread: 78 + fx * 8, startVelocity: 50, origin: { y: 0.5, x: 0.5 }, colors: palette, zIndex: 270, ticks: 340, disableForReducedMotion: true });
      if (fx >= 3) {
        setTimeout(() => {
          if (cancelled) return;
          confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.55 }, colors: palette, zIndex: 270, disableForReducedMotion: true });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.55 }, colors: palette, zIndex: 270, disableForReducedMotion: true });
        }, 450);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [won, fx, reduce, stage, deckColor]);

  const completed = useMemo(() => (events ? events.missionsCompleted.length : 0), [events]);
  const d0 = props.finalPts[0] ?? 0;
  const d1 = props.finalPts[1] ?? 0;
  const showFx = won && stage !== "impact" && !reduce;
  const burstCards = fx >= 3 ? ["A", "7", "K", "A", "7", "Q", "3", "J"] : [];
  const suits = ["copas", "espadas", "ouros", "paus"] as const;

  return (
    <div
      className={["bf-result", shake ? "bf-shake-screen" : "", fx >= 5 ? "bf-result--aura" : ""].filter(Boolean).join(" ")}
      style={{ ["--res-glow" as string]: won ? (fx >= 5 ? "rgba(168,85,247,.32)" : "rgba(227,183,74,.26)") : "rgba(100,116,139,.18)", ["--deck-c" as string]: deckColor }}
      role="dialog"
      aria-label={won ? "Vitória" : "Derrota"}
    >
      {/* raios atrás do título + clarão de impacto */}
      {won && !reduce ? <div className="bf-result__rays" /> : null}
      {!reduce ? <div className="bf-result__flash" /> : null}

      {/* celebração por faixa */}
      {showFx && fx >= 3
        ? burstCards.map((v, i) => (
            <div key={`c${i}`} className="bf-result__burst" style={{ ["--a" as string]: `${(i / burstCards.length) * 360}deg`, ["--d" as string]: `${0.05 + i * 0.05}s`, ["--dist" as string]: `${210 + (i % 3) * 70}px` }}>
              <PlayingCard card={{ s: suits[i % 4], v: v as "A" }} size="sm" deck={props.deckId} />
            </div>
          ))
        : null}
      {showFx && fx >= 3
        ? Array.from({ length: fx >= 5 ? 16 : 10 }).map((_, i) => (
            <span key={`coin${i}`} className="bf-result__coin" style={{ left: `${6 + ((i * 53) % 88)}%`, ["--d" as string]: `${0.3 + ((i * 0.23) % 1.4)}s`, ["--sz" as string]: `${12 + (i % 3) * 4}px` }} />
          ))
        : null}
      {showFx && fx >= 4
        ? Array.from({ length: fx >= 5 ? 18 : 12 }).map((_, i) => (
            <span key={`rain${i}`} className="bf-result__rain" style={{ left: `${(i * 37) % 100}%`, ["--d" as string]: `${(i * 0.37) % 3}s` }}>
              <SuitGlyph suit={suits[i % 4]} size={22} tone={i % 2 ? "gold" : "red"} />
            </span>
          ))
        : null}
      {showFx && fx >= 2
        ? Array.from({ length: 14 }).map((_, i) => (
            <span key={`p${i}`} className="bf-result__particle" style={{ ["--a" as string]: `${(i / 14) * 360 + 10}deg`, ["--d" as string]: `${0.1 + (i % 5) * 0.08}s` }} />
          ))
        : null}

      <div className="bf-result__card">
        <div className="bf-result__banner">
          <div className="bf-result__kicker">{props.isOnline ? "Partida online" : "Partida contra a IA"}</div>
          <div className={`bf-result__title ${won ? "bf-result__title--win" : "bf-result__title--loss"}`}>{won ? "VITÓRIA" : "DERROTA"}</div>
          <div className="bf-caption">{won ? `Dupla ${props.myTeam === 0 ? "A" : "B"} fechou a partida` : "Fica para a próxima"}</div>
        </div>

        {stage !== "impact" ? (
          <div className="bf-panel bf-panel--pad bf-anim-scale-in">
            <div className="bf-result__score">
              <div className="bf-result__team">
                <span className="bf-result__teamlbl" style={{ color: "var(--bf-team-a)" }}>Dupla A</span>
                <CountUp to={d0} durationMs={700} />
              </div>
              <span style={{ color: "var(--bf-text-4)", fontWeight: 400 }}>×</span>
              <div className="bf-result__team">
                <span className="bf-result__teamlbl" style={{ color: "var(--bf-team-b)" }}>Dupla B</span>
                <CountUp to={d1} durationMs={700} />
              </div>
            </div>
            <div className="bf-caption" style={{ textAlign: "center", marginTop: 6 }}>
              {props.names[0]} & {props.names[2]} · {props.names[1]} & {props.names[3]} · Partidas: A {props.setWins[0] || 0} — B {props.setWins[1] || 0}
            </div>
            {props.summary && props.summary.length ? (
              <div className="bf-result__hand">
                <div className="bf-label" style={{ marginBottom: 4 }}>Última mão</div>
                {props.summary.slice(0, 4).map((s, i) => (
                  <div key={i} className="bf-caption" style={{ color: "var(--bf-text-2)" }}>{s}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {(stage === "xp" || stage === "level" || stage === "deck" || stage === "done") ? (
          events ? (
            <div className="bf-panel bf-panel--accent bf-panel--pad bf-anim-pop bf-result__xpbox">
              <div className="bf-result__xpbig">
                <span className="bf-gold-text"><CountUp to={events.xpGained} durationMs={1100} prefix="+" suffix=" XP" /></span>
              </div>
              {barXp !== null ? (
                <div className="bf-row" style={{ gap: 10, marginTop: 8 }}>
                  <LevelBadge level={barXp >= (xpAfter ?? 0) ? lfAfter.level : lfBefore.level} />
                  <ProgressBar value={levelFromXp(barXp).into} max={levelFromXp(barXp).need || 1} shine style={{ flex: 1 }} label="XP" />
                  <span className="bf-caption bf-num" style={{ minWidth: 70, textAlign: "right" }}>{levelFromXp(barXp).into}/{levelFromXp(barXp).need}</span>
                </div>
              ) : null}
              {completed > 0 ? (
                <div className="bf-caption" style={{ textAlign: "center", marginTop: 8 }}>
                  <Chip size="sm" tone="gold" icon="target">{completed} {completed === 1 ? "missão concluída" : "missões concluídas"} · resgate em Missões</Chip>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bf-caption" style={{ textAlign: "center" }}>calculando experiência…</div>
          )
        ) : null}

        {stage === "level" && events ? (
          <div className="bf-panel bf-panel--gold bf-panel--pad bf-anim-pop bf-result__levelup" style={{ textAlign: "center" }}>
            <div className="bf-label" style={{ color: "var(--bf-gold-2)" }}>Subiu de nível!</div>
            <div className="bf-result__lvl">{events.levelAfter}</div>
            {events.tierChanged ? <div className="bf-caption" style={{ marginTop: 4 }}>Nova faixa: <b style={{ color: tierForLevel(events.levelAfter).nameColor }}>{tierForLevel(events.levelAfter).name}</b></div> : null}
            <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setStage(deckQueueRef.current.length ? "deck" : "done")}>Continuar</Button>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="bf-stack bf-anim-fade-up">
            {props.isOnline && !props.isRoomHost ? (
              <div className="bf-caption" style={{ textAlign: "center" }}>Só o anfitrião inicia a próxima partida. Aguarde…</div>
            ) : (
              <Button variant="primary" size="lg" block icon="refresh" onClick={props.onNext}>Jogar de novo</Button>
            )}
            <Button variant="secondary" block icon="home" onClick={props.onHome}>Voltar ao início</Button>
          </div>
        ) : null}
      </div>

      {stage === "deck" && deckQueue.length ? (
        <DeckUnlockOverlay
          deck={DECK_BY_ID[deckQueue[0]]}
          onShown={() => void prog?.markSeen([deckQueue[0]])}
          onDone={() => {
            const rest = deckQueue.slice(1);
            setDeckQueue(rest);
            if (!rest.length) setStage("done");
          }}
        />
      ) : null}
    </div>
  );
}

/** Resumo de uma mão (quando a partida ainda não acabou). */
export function RoundSummary(props: { summary: string[]; mPts: number[]; setWins: number[]; canNext: boolean; onNext: () => void; waitingText?: string }) {
  return (
    <div className="bf-backdrop bf-backdrop--center" style={{ position: "absolute", zIndex: 200 }}>
      <div className="bf-modal" role="dialog" aria-label="Resultado da mão">
        <div className="bf-modal__head">
          <div className="bf-modal__title">Resultado da mão</div>
          <Chip size="sm" tone="accent" icon="cards">partida a 4</Chip>
        </div>
        <div className="bf-stack" style={{ gap: 6 }}>
          {props.summary.map((s, i) => (
            <div key={i} className="bf-body-sm bf-anim-fade-up" style={{ color: "var(--bf-text-2)", padding: "6px 0", borderBottom: i < props.summary.length - 1 ? "1px solid var(--bf-glass-border)" : undefined, animationDelay: `${i * 80}ms` }}>
              {s}
            </div>
          ))}
        </div>
        <div className="bf-result__score" style={{ marginTop: 14, fontSize: 28 }}>
          <div className="bf-result__team"><span className="bf-result__teamlbl" style={{ color: "var(--bf-team-a)" }}>A</span><CountUp to={props.mPts[0] || 0} durationMs={500} /></div>
          <span style={{ color: "var(--bf-text-4)", fontWeight: 400 }}>×</span>
          <div className="bf-result__team"><span className="bf-result__teamlbl" style={{ color: "var(--bf-team-b)" }}>B</span><CountUp to={props.mPts[1] || 0} durationMs={500} /></div>
        </div>
        <div className="bf-caption" style={{ textAlign: "center", marginTop: 4 }}>Partidas vencidas: A {props.setWins[0] || 0} — B {props.setWins[1] || 0}</div>
        <div className="bf-modal__actions">
          {props.canNext ? <Button variant="primary" size="lg" icon="play" onClick={props.onNext}>Próxima mão</Button> : <div className="bf-caption" style={{ textAlign: "center", padding: 10 }}>{props.waitingText || "Aguardando o anfitrião…"}</div>}
        </div>
      </div>
    </div>
  );
}
