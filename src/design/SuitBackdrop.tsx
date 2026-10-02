"use client";
/**
 * Fundo vivo da tela principal (não interativo).
 * Camadas, do fundo para a frente:
 *  1. luz ambiente: um brilho dourado/roxo que se desloca devagar (opacity + transform);
 *  2. naipes em três profundidades, surgindo e sumindo com suavidade, com deriva e rotação lentas;
 *  3. poeira dourada: pontinhos flutuando e piscando;
 *  4. baralho no canto que se abre em leque e se junta de tempos em tempos (embaralhamento);
 *  5. cartas distribuídas que deslizam pela tela de vez em quando.
 * Todas as cartas usam o baralho equipado (ou o passado em `deckId`).
 * Pausa com a aba oculta ou um modal aberto (data-bf-hidden / data-bf-paused no <html>); "reduzir movimento" para tudo.
 * Só transform e opacity animam.
 */
import { useEffect } from "react";
import { SuitGlyph } from "./Suit";
import { PlayingCard } from "./PlayingCard";
import { useProgressOptional } from "@/lib/progress/useProgress";
import type { Suit } from "./PlayingCard";

type Item = { suit: Suit; x: number; y: number; size: number; rot: number; dur: number; delay: number; depth: 1 | 2 | 3; dx: number; dy: number; tone: "red" | "gold" };

/* Posições fixas para o fundo ficar sempre equilibrado e longe do centro (botões). */
const ITEMS: Item[] = [
  { suit: "espadas", x: 4, y: 6, size: 220, rot: -14, dur: 46, delay: -10, depth: 3, dx: 30, dy: 22, tone: "gold" },
  { suit: "copas", x: 78, y: 2, size: 200, rot: 12, dur: 52, delay: -24, depth: 3, dx: -26, dy: 28, tone: "red" },
  { suit: "ouros", x: -6, y: 64, size: 240, rot: 8, dur: 58, delay: -35, depth: 3, dx: 24, dy: -26, tone: "red" },
  { suit: "paus", x: 80, y: 68, size: 210, rot: -9, dur: 50, delay: -5, depth: 3, dx: -28, dy: -20, tone: "gold" },
  { suit: "copas", x: 18, y: 30, size: 92, rot: 18, dur: 34, delay: -8, depth: 2, dx: 18, dy: -14, tone: "red" },
  { suit: "paus", x: 86, y: 34, size: 84, rot: -22, dur: 38, delay: -19, depth: 2, dx: -16, dy: 18, tone: "gold" },
  { suit: "espadas", x: 60, y: 86, size: 96, rot: 10, dur: 40, delay: -27, depth: 2, dx: 14, dy: -16, tone: "gold" },
  { suit: "ouros", x: 34, y: 92, size: 78, rot: -6, dur: 36, delay: -14, depth: 2, dx: -12, dy: -18, tone: "red" },
  { suit: "espadas", x: 90, y: 54, size: 70, rot: 24, dur: 42, delay: -31, depth: 2, dx: -14, dy: -10, tone: "gold" },
  { suit: "ouros", x: 10, y: 48, size: 38, rot: 0, dur: 26, delay: -3, depth: 1, dx: 10, dy: 12, tone: "red" },
  { suit: "paus", x: 70, y: 20, size: 34, rot: 15, dur: 28, delay: -12, depth: 1, dx: -10, dy: 10, tone: "gold" },
  { suit: "copas", x: 46, y: 10, size: 30, rot: -10, dur: 30, delay: -21, depth: 1, dx: 8, dy: 14, tone: "red" },
  { suit: "espadas", x: 26, y: 76, size: 36, rot: 20, dur: 27, delay: -17, depth: 1, dx: 12, dy: -10, tone: "gold" },
  { suit: "copas", x: 84, y: 88, size: 32, rot: -18, dur: 31, delay: -9, depth: 1, dx: -10, dy: -12, tone: "red" },
];

const DUST = [
  { x: 12, y: 20, s: 3, d: 18, dl: 0 }, { x: 30, y: 70, s: 2, d: 22, dl: -6 }, { x: 55, y: 15, s: 2.5, d: 20, dl: -11 },
  { x: 72, y: 60, s: 3, d: 24, dl: -3 }, { x: 88, y: 28, s: 2, d: 19, dl: -14 }, { x: 40, y: 45, s: 2, d: 26, dl: -8 },
  { x: 64, y: 82, s: 2.5, d: 21, dl: -17 }, { x: 20, y: 90, s: 2, d: 23, dl: -5 }, { x: 50, y: 60, s: 1.8, d: 25, dl: -12 }, { x: 8, y: 36, s: 2.2, d: 20, dl: -9 },
];

export type BackdropParts = { lights?: boolean; suits?: boolean; dust?: boolean; shuffle?: boolean; deal?: boolean };
export function SuitBackdrop(props: { intensity?: number; showCard?: boolean; deckId?: string; showShuffle?: boolean; showDeal?: boolean; parts?: BackdropParts }) {
  const parts = { lights: true, suits: true, dust: true, shuffle: props.showShuffle !== false, deal: props.showDeal !== false && props.showCard !== false, ...(props.parts || {}) };
  const prog = useProgressOptional();
  const deck = props.deckId || (prog ? prog.equippedDeck.id : "classico");

  // Pausa quando a aba está escondida (os modais marcam data-bf-paused sozinhos).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) document.documentElement.setAttribute("data-bf-hidden", "1");
      else document.documentElement.removeAttribute("data-bf-hidden");
    };
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const intensity = props.intensity ?? 1;
  return (
    <div className="bf-bd" aria-hidden style={{ ["--bd-i" as string]: intensity }}>
      {/* 1. luz ambiente */}
      {parts.lights ? <div className="bf-bd__light bf-bd__light--gold" /> : null}
      {parts.lights ? <div className="bf-bd__light bf-bd__light--purple" /> : null}

      {/* 2. naipes por profundidade */}
      {parts.suits ? [3, 2, 1].map((depth) => (
        <div key={depth} className="bf-bd__layer" data-depth={depth}>
          {ITEMS.filter((it) => it.depth === depth).map((it, i) => (
            <span
              key={`${depth}-${i}`}
              className={`bf-bd__suit bf-bd__suit--${it.tone}`}
              style={{
                ["--x" as string]: `${it.x}%`,
                ["--y" as string]: `${it.y}%`,
                ["--s" as string]: `${it.size}px`,
                ["--r" as string]: `${it.rot}deg`,
                ["--dur" as string]: `${it.dur}s`,
                ["--dl" as string]: `${it.delay}s`,
                ["--dx" as string]: `${it.dx}px`,
                ["--dy" as string]: `${it.dy}px`,
                ["--fade" as string]: `${18 + (i % 3) * 7}s`,
              }}
            >
              <SuitGlyph suit={it.suit} size="100%" tone={it.tone} gradient />
            </span>
          ))}
        </div>
      )) : null}

      {/* 3. poeira dourada */}
      {parts.dust ? <div className="bf-bd__dust">
        {DUST.map((d, i) => (
          <span key={i} className="bf-bd__mote" style={{ ["--x" as string]: `${d.x}%`, ["--y" as string]: `${d.y}%`, ["--s" as string]: `${d.s}px`, ["--d" as string]: `${d.d}s`, ["--dl" as string]: `${d.dl}s` }} />
        ))}
      </div> : null}

      {/* 4. baralho que embaralha no canto (leque abre e fecha) */}
      {parts.shuffle ? (
        <div className="bf-bd__shuffle">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bf-bd__shuffle-card" style={{ ["--i" as string]: i }}>
              <PlayingCard back size="sm" deck={deck} />
            </div>
          ))}
        </div>
      ) : null}

      {/* 5. cartas distribuídas deslizando pela tela */}
      {parts.deal ? (
        <div className="bf-bd__deal">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bf-bd__deal-card" style={{ ["--i" as string]: i }}>
              <PlayingCard back size="sm" deck={deck} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
