"use client";
/**
 * Celebrações fora da mesa: resgate de missão (XP, subiu de nível) e baralhos novos ainda não vistos.
 * Mostra uma de cada vez: subiu de nível → baralho desbloqueado (pacote).
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Chip, useToast } from "@/design";
import { tierForLevel } from "@/data/progression";
import { DECK_BY_ID } from "@/data/decks";
import { useProgress } from "@/lib/progress/useProgress";
import { DeckUnlockOverlay } from "./CollectionScreen";

export function CelebrationOverlay(props: { active: boolean }) {
  const prog = useProgress();
  const toast = useToast();
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [deckQueue, setDeckQueue] = useState<string[]>([]);
  const first = prog.celebrations[0];

  // consome uma celebração por vez
  useEffect(() => {
    if (!props.active || !first) return;
    const ev = first.events;
    if (ev.xpGained > 0) toast.show({ text: <span><b>+{ev.xpGained} XP</b> · {ev.xpLines.map((l) => l.label).join(", ")}</span>, tone: "gold", icon: "bolt" });
    if (ev.levelAfter > ev.levelBefore) setLevelUp({ from: ev.levelBefore, to: ev.levelAfter });
    if (ev.decksUnlocked.length) setDeckQueue((q) => [...q, ...ev.decksUnlocked.filter((d) => !q.includes(d))]);
    prog.popCelebration(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first?.id, props.active]);

  // baralhos não vistos (ex.: desbloqueados por nível em outra sessão)
  const unseenKey = prog.unseenDecks.join(",");
  useEffect(() => {
    if (!props.active || !unseenKey) return;
    const t = setTimeout(() => setDeckQueue((q) => [...q, ...prog.unseenDecks.filter((d) => !q.includes(d))]), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey, props.active]);

  const tier = useMemo(() => (levelUp ? tierForLevel(levelUp.to) : null), [levelUp]);
  const tierChanged = levelUp ? tierForLevel(levelUp.from).id !== tierForLevel(levelUp.to).id : false;

  if (!props.active) return null;
  if (levelUp && tier) {
    return (
      <div className="bf-levelup" role="dialog" aria-label="Subiu de nível">
        <div className="bf-levelup__box">
          <div className="bf-label" style={{ color: "var(--bf-accent-3)" }}>Subiu de nível!</div>
          <div className="bf-levelup__ring">{levelUp.to}</div>
          <div className="bf-title">Nível {levelUp.to}</div>
          {tierChanged ? (
            <div className="bf-panel bf-panel--accent bf-panel--pad bf-anim-fade-up" style={{ width: "100%" }}>
              <div className="bf-label" style={{ color: tier.nameColor }}>Nova faixa</div>
              <div className="bf-h2" style={{ color: tier.nameColor }}>{tier.name}</div>
              <div className="bf-caption" style={{ marginTop: 4 }}>{tier.description}</div>
            </div>
          ) : (
            <div className="bf-caption">Faixa atual: <b style={{ color: tier.nameColor }}>{tier.name}</b></div>
          )}
          <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {deckQueue.map((id) => DECK_BY_ID[id]).filter(Boolean).map((d) => (
              <Chip key={d.id} tone="gold" icon="deck" size="sm">{d.name}</Chip>
            ))}
          </div>
          <Button variant="primary" size="lg" block onClick={() => setLevelUp(null)}>Continuar</Button>
        </div>
      </div>
    );
  }
  if (deckQueue.length) {
    const id = deckQueue[0];
    return (
      <DeckUnlockOverlay
        deck={DECK_BY_ID[id]}
        onDone={() => {
          void prog.markSeen([id]);
          setDeckQueue((q) => q.slice(1));
        }}
      />
    );
  }
  return null;
}
