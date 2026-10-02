"use client";
/**
 * Fim de partida: VITÓRIA / DERROTA com placar, XP linha a linha (números subindo), missões que avançaram,
 * subiu de nível e baralho novo. A intensidade da animação de vitória cresce com a faixa do jogador:
 *   1 brilho · 2 confete · 3 cartas voando · 4 chuva de naipes dourados · 5 tudo + aura holográfica.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Icon, PlayingCard, SuitGlyph, prefersReducedMotion } from "@/design";
import { MISSION_BY_ID } from "@/data/missions";
import { DECK_BY_ID } from "@/data/decks";
import { tierForLevel } from "@/data/progression";
import type { ProgressEvents } from "@/lib/progress/types";
import { CountUp } from "./common";
import { DeckUnlockOverlay } from "./CollectionScreen";

export function ResultScreen(props: {
  won: boolean;
  myTeam: 0 | 1;
  finalPts: number[];
  names: string[];
  setWins: number[];
  events: ProgressEvents | null;
  level: number;
  deckId: string;
  isOnline: boolean;
  isRoomHost: boolean;
  onNext: () => void;
  onHome: () => void;
}) {
  const { won, events } = props;
  const tier = tierForLevel(props.level);
  const fx = won ? tier.victoryFx : 0;
  const [stage, setStage] = useState<"banner" | "xp" | "level" | "deck" | "done">("banner");
  const [deckQueue, setDeckQueue] = useState<string[]>(events ? events.decksUnlocked : []);
  const reduce = prefersReducedMotion();

  // sequência: banner → XP → (subiu de nível) → (baralho) → botões
  useEffect(() => {
    const t = setTimeout(() => setStage("xp"), reduce ? 0 : 900);
    return () => clearTimeout(t);
  }, [reduce]);
  useEffect(() => {
    if (stage !== "xp") return;
    const t = setTimeout(() => setStage(events && events.levelAfter > events.levelBefore ? "level" : deckQueue.length ? "deck" : "done"), reduce ? 0 : 1200 + (events ? events.xpLines.length * 160 : 0));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // confete (níveis 2+)
  useEffect(() => {
    if (!won || fx < 2 || reduce) return;
    let cancelled = false;
    void import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const palette = fx >= 4 ? ["#fde68a", "#f0d078", "#a78bfa", "#f0abfc", "#ffffff"] : ["#fde68a", "#facc15", "#fffbeb", "#22c55e", "#f87171"];
      confetti({ particleCount: 90 + fx * 40, spread: 80 + fx * 8, startVelocity: 48, origin: { y: 0.55, x: 0.5 }, colors: palette, zIndex: 270, ticks: 360, disableForReducedMotion: true });
      if (fx >= 3) {
        setTimeout(() => {
          if (cancelled) return;
          confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors: palette, zIndex: 270, disableForReducedMotion: true });
          confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors: palette, zIndex: 270, disableForReducedMotion: true });
        }, 500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [won, fx, reduce]);

  const total = events ? events.xpGained : 0;
  const missions = useMemo(() => (events ? Array.from(new Set([...events.missionsCompleted, ...events.missionsProgressed])) : []), [events]);
  const d0 = props.finalPts[0] ?? 0;
  const d1 = props.finalPts[1] ?? 0;

  const flyCards = fx >= 3 ? [{ s: "copas", v: "A" }, { s: "espadas", v: "7" }, { s: "ouros", v: "K" }, { s: "paus", v: "A" }, { s: "copas", v: "7" }, { s: "espadas", v: "Q" }] : [];

  return (
    <div className="bf-result" style={{ ["--res-glow" as string]: won ? (fx >= 5 ? "rgba(168,85,247,.3)" : "rgba(227,183,74,.24)") : "rgba(100,116,139,.18)" }} role="dialog" aria-label={won ? "Vitória" : "Derrota"}>
      {/* efeitos por faixa */}
      {won && fx >= 3 && !reduce
        ? flyCards.map((c, i) => (
            <div key={i} className="bf-result__fly" style={{ ["--fx" as string]: `${(i - 2.5) * 110}px`, ["--fy" as string]: `${-220 - (i % 3) * 60}px`, ["--fr" as string]: `${(i - 2.5) * 40}deg`, ["--d" as string]: `${0.2 + i * 0.08}s` }}>
              <PlayingCard card={{ s: c.s as "copas", v: c.v as "A" }} size="sm" deck={props.deckId} />
            </div>
          ))
        : null}
      {won && fx >= 4 && !reduce
        ? Array.from({ length: fx >= 5 ? 18 : 12 }).map((_, i) => (
            <span key={i} className="bf-result__rain" style={{ left: `${(i * 37) % 100}%`, ["--d" as string]: `${(i * 0.37) % 3}s`, color: fx >= 5 && i % 3 === 0 ? "#f0abfc" : undefined }}>
              <SuitGlyph suit={(["espadas", "copas", "paus", "ouros"] as const)[i % 4]} size={22} tone={i % 2 ? "gold" : "red"} />
            </span>
          ))
        : null}

      <div className="bf-result__card">
        <div className="bf-result__banner">
          <div className="bf-result__kicker">{props.isOnline ? "Partida online" : "Partida contra a IA"}</div>
          <div className={`bf-result__title ${won ? "bf-result__title--win" : "bf-result__title--loss"}`}>{won ? "VITÓRIA" : "DERROTA"}</div>
          <div className="bf-caption">{won ? "Dupla " + (props.myTeam === 0 ? "A" : "B") + " fechou a partida" : "Fica para a próxima"}</div>
        </div>

        <div className="bf-panel bf-panel--pad">
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
          <div className="bf-caption" style={{ textAlign: "center", marginTop: 8 }}>
            {props.names[0]} & {props.names[2]} · {props.names[1]} & {props.names[3]}
            <br />
            Partidas vencidas: A {props.setWins[0] || 0} — B {props.setWins[1] || 0}
          </div>
        </div>

        {events && stage !== "banner" ? (
          <div className="bf-panel bf-panel--accent bf-panel--pad bf-anim-fade-up">
            <div className="bf-label" style={{ color: "var(--bf-accent-3)", marginBottom: 8 }}>Experiência</div>
            <div className="bf-result__xp">
              {events.xpLines.map((l, i) => (
                <div key={i} className="bf-result__line" style={{ animationDelay: `${i * 140}ms` }}>
                  <span>{l.label}</span>
                  <b>{l.xp >= 0 ? "+" : ""}{l.xp} XP</b>
                </div>
              ))}
              <div className="bf-result__total">
                <span>Total</span>
                <span className="bf-gold-text"><CountUp to={total} durationMs={900 + events.xpLines.length * 120} prefix="+" suffix=" XP" /></span>
              </div>
            </div>
            {missions.length ? (
              <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {missions.map((id) => {
                  const m = MISSION_BY_ID[id];
                  if (!m) return null;
                  const done = events.missionsCompleted.includes(id);
                  return <Chip key={id} size="sm" tone={done ? "gold" : "neutral"} icon={done ? "check" : m.icon}>{m.title}{done ? " · concluída" : ""}</Chip>;
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {stage === "level" && events ? (
          <div className="bf-panel bf-panel--gold bf-panel--pad bf-anim-pop" style={{ textAlign: "center" }}>
            <div className="bf-label" style={{ color: "var(--bf-gold-2)" }}>Subiu de nível!</div>
            <div className="bf-display bf-gold-text">Nível {events.levelAfter}</div>
            {events.tierChanged ? <div className="bf-caption" style={{ marginTop: 4 }}>Nova faixa: <b style={{ color: tierForLevel(events.levelAfter).nameColor }}>{tierForLevel(events.levelAfter).name}</b></div> : null}
            <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setStage(deckQueue.length ? "deck" : "done")}>Continuar</Button>
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
        ) : stage !== "level" ? (
          <div className="bf-caption" style={{ textAlign: "center" }}>
            <Icon name="spark" size={14} style={{ display: "inline-block", verticalAlign: "-2px" }} /> contando…
          </div>
        ) : null}
      </div>

      {stage === "deck" && deckQueue.length ? (
        <DeckUnlockOverlay
          deck={DECK_BY_ID[deckQueue[0]]}
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
