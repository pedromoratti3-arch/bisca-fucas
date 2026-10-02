"use client";
/**
 * Fundo vivo da tela principal: naipes em três camadas de profundidade.
 * - Longe: grandes, mais transparentes e desfocados. Perto: menores e nítidos.
 * - Deriva lenta em direções diferentes, rotação suave, leve respiração de tamanho.
 * - Parallax: no notebook segue o mouse; no celular segue a inclinação só se o aparelho
 *   não pedir permissão (Android). No iPhone (pede permissão) fica sem.
 * - Pausa quando a aba está escondida ou quando um modal cobre a tela (atributo data-bf-paused no <html>).
 * - "Reduzir movimento": tudo parado.
 * - De vez em quando uma carta passa girando ao fundo e um naipe dá um brilho.
 * Só transform e opacity animam. Poucos elementos (14 naipes + 1 carta).
 */
import { useEffect, useRef } from "react";
import { SuitGlyph } from "./Suit";
import type { Suit } from "./PlayingCard";

type Item = { suit: Suit; x: number; y: number; size: number; rot: number; dur: number; delay: number; depth: 1 | 2 | 3; dx: number; dy: number; tone: "red" | "gold" };

/* Posições fixas (não aleatórias) para o fundo ficar sempre bonito e sem sobreposição com os botões do centro. */
const ITEMS: Item[] = [
  // camada 3 — longe (grandes, desfocados)
  { suit: "espadas", x: 6, y: 8, size: 220, rot: -14, dur: 46, delay: -10, depth: 3, dx: 30, dy: 22, tone: "gold" },
  { suit: "copas", x: 78, y: 4, size: 200, rot: 12, dur: 52, delay: -24, depth: 3, dx: -26, dy: 28, tone: "red" },
  { suit: "ouros", x: -4, y: 66, size: 240, rot: 8, dur: 58, delay: -35, depth: 3, dx: 24, dy: -26, tone: "red" },
  { suit: "paus", x: 80, y: 70, size: 210, rot: -9, dur: 50, delay: -5, depth: 3, dx: -28, dy: -20, tone: "gold" },
  // camada 2 — meio
  { suit: "copas", x: 20, y: 30, size: 92, rot: 18, dur: 34, delay: -8, depth: 2, dx: 18, dy: -14, tone: "red" },
  { suit: "paus", x: 86, y: 36, size: 84, rot: -22, dur: 38, delay: -19, depth: 2, dx: -16, dy: 18, tone: "gold" },
  { suit: "espadas", x: 60, y: 86, size: 96, rot: 10, dur: 40, delay: -27, depth: 2, dx: 14, dy: -16, tone: "gold" },
  { suit: "ouros", x: 36, y: 90, size: 78, rot: -6, dur: 36, delay: -14, depth: 2, dx: -12, dy: -18, tone: "red" },
  { suit: "espadas", x: 90, y: 56, size: 70, rot: 24, dur: 42, delay: -31, depth: 2, dx: -14, dy: -10, tone: "gold" },
  // camada 1 — perto (pequenos, nítidos, mais vivos)
  { suit: "ouros", x: 12, y: 50, size: 38, rot: 0, dur: 26, delay: -3, depth: 1, dx: 10, dy: 12, tone: "red" },
  { suit: "paus", x: 70, y: 22, size: 34, rot: 15, dur: 28, delay: -12, depth: 1, dx: -10, dy: 10, tone: "gold" },
  { suit: "copas", x: 48, y: 12, size: 30, rot: -10, dur: 30, delay: -21, depth: 1, dx: 8, dy: 14, tone: "red" },
  { suit: "espadas", x: 28, y: 76, size: 36, rot: 20, dur: 27, delay: -17, depth: 1, dx: 12, dy: -10, tone: "gold" },
  { suit: "copas", x: 82, y: 88, size: 32, rot: -18, dur: 31, delay: -9, depth: 1, dx: -10, dy: -12, tone: "red" },
];

const PARALLAX_PX: Record<1 | 2 | 3, number> = { 1: 22, 2: 12, 3: 6 };

export function SuitBackdrop(props: { intensity?: number; showCard?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Parallax (mouse no notebook / inclinação no Android, sem pedir permissão) + pausa quando a aba some.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let tx = 0, ty = 0; // alvo -1..1
    let cx = 0, cy = 0; // atual (suavizado)
    const apply = () => {
      raf = 0;
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      root.style.setProperty("--px", cx.toFixed(3));
      root.style.setProperty("--py", cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(apply);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMouse = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 30));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      kick();
    };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reduce) {
      if (fine) window.addEventListener("mousemove", onMouse, { passive: true });
      // iOS exige permissão (requestPermission): aí não usamos. Android não exige.
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
      if (!fine && DOE && typeof DOE.requestPermission !== "function") window.addEventListener("deviceorientation", onTilt, { passive: true });
    }
    const onVis = () => {
      if (document.hidden) document.documentElement.setAttribute("data-bf-hidden", "1");
      else document.documentElement.removeAttribute("data-bf-hidden");
    };
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onTilt);
      document.removeEventListener("visibilitychange", onVis);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const intensity = props.intensity ?? 1;
  return (
    <div ref={rootRef} className="bf-bd" aria-hidden style={{ ["--bd-i" as string]: intensity }}>
      {[3, 2, 1].map((depth) => (
        <div key={depth} className="bf-bd__layer" data-depth={depth} style={{ ["--pp" as string]: `${PARALLAX_PX[depth as 1 | 2 | 3]}px` }}>
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
              }}
            >
              <SuitGlyph suit={it.suit} size="100%" tone={it.tone} gradient />
            </span>
          ))}
        </div>
      ))}
      {props.showCard !== false ? (
        <div className="bf-bd__card" aria-hidden>
          <div className="bf-bd__card-inner" />
        </div>
      ) : null}
    </div>
  );
}
