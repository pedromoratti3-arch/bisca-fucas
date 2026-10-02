"use client";
/**
 * Barra de progresso e barra de XP.
 * A barra enche animando `transform: scaleX` (não largura), para rodar liso.
 */
import type { CSSProperties, ReactNode } from "react";
import { LevelBadge } from "./Panel";

export function ProgressBar(props: { value: number; max?: number; tone?: "accent" | "gold" | "success"; size?: "sm" | "md" | "lg"; shine?: boolean; style?: CSSProperties; label?: string }) {
  const max = props.max ?? 1;
  const p = max > 0 ? Math.max(0, Math.min(1, props.value / max)) : 0;
  const cls = ["bf-bar", props.size && props.size !== "md" ? `bf-bar--${props.size}` : "", props.tone && props.tone !== "accent" ? `bf-bar--${props.tone}` : ""].filter(Boolean).join(" ");
  return (
    <div className={cls} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={props.value} aria-label={props.label} style={props.style}>
      <div className="bf-bar__fill" style={{ ["--p" as string]: p }}>
        {props.shine && p > 0.02 ? <div className="bf-bar__shine" /> : null}
      </div>
    </div>
  );
}

/** Nível + barra + "123 / 500 XP". */
export function XpBar(props: { level: number; xp: number; xpToNext: number; compact?: boolean; right?: ReactNode; style?: CSSProperties }) {
  const pct = props.xpToNext > 0 ? Math.round((props.xp / props.xpToNext) * 100) : 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...props.style }}>
      <LevelBadge level={props.level} size={props.compact ? "sm" : "md"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {props.compact ? null : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <span className="bf-label" style={{ color: "var(--bf-accent-3)" }}>
              Nível {props.level}
            </span>
            <span className="bf-caption bf-num">
              {props.xp} / {props.xpToNext} XP
            </span>
          </div>
        )}
        <ProgressBar value={props.xp} max={props.xpToNext} size={props.compact ? "sm" : "md"} shine label={`${pct}% para o próximo nível`} />
      </div>
      {props.right}
    </div>
  );
}
