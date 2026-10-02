"use client";
/**
 * Padrões de movimento em JavaScript (para sequências que o CSS sozinho não faz:
 * esperar uma animação acabar, encadear etapas, respeitar "reduzir movimento").
 * Os mesmos valores estão em tokens.css como --bf-dur-* e --bf-ease-*.
 */
import { useEffect, useState } from "react";

export const DUR = {
  xs: 120,
  sm: 180,
  md: 320,
  lg: 500,
  xl: 900,
} as const;

export const EASE = {
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  inOut: "cubic-bezier(0.45, 0, 0.2, 1)",
  card: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

const QUERY = "(prefers-reduced-motion: reduce)";

/** Lê a preferência do sistema uma vez (fora de React). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Hook: true quando o jogador pediu menos movimento. Atualiza se ele mudar a configuração. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Duração efetiva: 0 quando o movimento está reduzido. Use em setTimeout de sequências. */
export function dur(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/** Espera `ms` (ou nada, com movimento reduzido). */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, dur(ms)));
}
