"use client";
/**
 * Carregamento com os quatro naipes.
 * - <SuitLoader />: os naipes surgem um a um (espadas, copas, paus, ouros) com brilho, e o ciclo recomeça.
 * - <LoadingOverlay active label />: tela cheia. Só aparece se o carregamento passar de 300 ms,
 *   e quando aparece fica pelo menos um ciclo completo (2 s). Na saída os naipes se espalham e somem.
 * - useDelayedVisible(): a mesma regra "não piscar" para outros usos.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SuitGlyph, SUIT_ORDER } from "./Suit";
import { prefersReducedMotion } from "./motion";

export const SUIT_LOADER_CYCLE_MS = 2000;
export const LOADER_SHOW_DELAY_MS = 300;
const EXIT_MS = 520;

export function SuitLoader(props: { size?: number; leaving?: boolean; label?: ReactNode }) {
  const s = props.size ?? 40;
  return (
    <div className={["bf-suitloader", props.leaving ? "is-leaving" : ""].filter(Boolean).join(" ")} role="status" aria-live="polite" aria-label="Carregando">
      <div className="bf-suitloader__row">
        {SUIT_ORDER.map((suit, i) => (
          <span key={suit} className={`bf-suitloader__suit bf-suitloader__suit--${suit}`} style={{ ["--i" as string]: i, width: s, height: s }}>
            <SuitGlyph suit={suit} size={s} tone={suit === "copas" || suit === "ouros" ? "red" : "gold"} />
          </span>
        ))}
      </div>
      {props.label ? <div className="bf-suitloader__label">{props.label}</div> : null}
    </div>
  );
}

/**
 * true só depois de `active` ficar true por `delayMs`; e, uma vez visível, fica no mínimo `minMs`.
 * Evita piscar em carregamentos rápidos.
 */
export function useDelayedVisible(active: boolean, delayMs = LOADER_SHOW_DELAY_MS, minMs = SUIT_LOADER_CYCLE_MS): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (active) {
      if (!visible) {
        t = setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, delayMs);
      }
    } else if (visible) {
      const left = Math.max(0, shownAt.current + minMs - Date.now());
      t = setTimeout(() => setVisible(false), prefersReducedMotion() ? 0 : left);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [active, visible, delayMs, minMs]);
  return visible;
}

/** Tela de carregamento inteira. `active` liga/desliga; o componente cuida do atraso, do ciclo mínimo e da saída. */
export function LoadingOverlay(props: { active: boolean; label?: ReactNode; delayMs?: number; minMs?: number; onHidden?: () => void; children?: ReactNode }) {
  const visible = useDelayedVisible(props.active, props.delayMs, props.minMs);
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const onHidden = useRef(props.onHidden);
  onHidden.current = props.onHidden;

  useEffect(() => {
    if (visible) {
      setLeaving(false);
      setMounted(true);
      return;
    }
    if (!mounted) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
      onHidden.current?.();
    }, prefersReducedMotion() ? 0 : EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  return (
    <div className={["bf-loading", leaving ? "is-leaving" : ""].filter(Boolean).join(" ")} aria-busy="true">
      <SuitLoader size={44} leaving={leaving} label={props.label} />
      {props.children}
    </div>
  );
}
