"use client";
/**
 * Abertura do jogo: cinco cartas sobem do baralho, viram, se abrem em leque e voam para fora,
 * enquanto o logo entra com um brilho. Dura ~2,6 s e só aparece uma vez por sessão.
 * Com "reduzir movimento": mostra o logo por 0,8 s e segue.
 */
import { useEffect, useState } from "react";
import { PlayingCard, prefersReducedMotion, SuitGlyph } from "@/design";
import type { CardLike } from "@/design";
import { useProgressOptional } from "@/lib/progress/useProgress";

const KEY = "bf_intro_seen_v1";
const CARDS: CardLike[] = [
  { s: "espadas", v: "A" },
  { s: "copas", v: "7" },
  { s: "paus", v: "K" },
  { s: "ouros", v: "A" },
  { s: "copas", v: "Q" },
];

export function shouldShowIntro(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

export function IntroSplash(props: { onDone: () => void; deckId?: string }) {
  const [leaving, setLeaving] = useState(false);
  const prog = useProgressOptional();
  const deckId = props.deckId || (prog ? prog.equippedDeck.id : undefined);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const reduce = prefersReducedMotion();
    const t1 = setTimeout(() => setLeaving(true), reduce ? 800 : 2650);
    const t2 = setTimeout(props.onDone, reduce ? 900 : 3250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={["bf-intro", leaving ? "is-leaving" : ""].join(" ")} aria-hidden onClick={() => setLeaving(true)}>
      <div className="bf-intro__shine" />
      <div className="bf-intro__stage">
        {CARDS.map((c, i) => (
          <div key={i} className="bf-intro__card">
            <div className="bf-intro__card-inner">
              <div className="bf-intro__face">
                <PlayingCard card={c} size="md" deck={deckId} />
              </div>
              <div className="bf-intro__face bf-intro__face--back">
                <PlayingCard back size="md" deck={deckId} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bf-intro__logo">
        <div className="bf-row" style={{ gap: 6 }}>
          <SuitGlyph suit="espadas" size={16} tone="gold" />
          <SuitGlyph suit="copas" size={16} tone="red" />
          <SuitGlyph suit="paus" size={16} tone="gold" />
          <SuitGlyph suit="ouros" size={16} tone="red" />
        </div>
        <div className="bf-hero">BISCA FUCAS</div>
        <div className="bf-home__sub">Jogo de baralho · Online</div>
      </div>
    </div>
  );
}
