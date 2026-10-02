"use client";
/**
 * Painel de vidro escuro (card), chips, divisórias, medalhão de nível, bolinha de status.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type Rarity = "bronze" | "silver" | "gold" | "special";

/** Raridade a partir de uma nota 0–99 (mesma regra das cartas de jogador). */
export function rarityFromOvr(ovr: number): Rarity {
  if (ovr >= 90) return "special";
  if (ovr >= 80) return "gold";
  if (ovr >= 70) return "silver";
  return "bronze";
}
export const RARITY_LABEL: Record<Rarity, string> = { bronze: "Bronze", silver: "Prata", gold: "Ouro", special: "Especial" };

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "glass" | "solid" | "raised" | "accent" | "gold";
  pad?: "none" | "md" | "lg";
  interactive?: boolean;
  children?: ReactNode;
};

export function Panel({ tone = "glass", pad = "md", interactive, className, children, ...rest }: PanelProps) {
  const cls = [
    "bf-panel",
    tone !== "glass" ? `bf-panel--${tone}` : "",
    pad === "md" ? "bf-panel--pad" : pad === "lg" ? "bf-panel--pad-lg" : "",
    interactive ? "bf-panel--interactive" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined} {...rest}>
      {children}
    </div>
  );
}

export function Divider(props: { label?: string; style?: CSSProperties }) {
  if (props.label) {
    return (
      <div className="bf-divider--text" style={props.style}>
        {props.label}
      </div>
    );
  }
  return <hr className="bf-divider" style={props.style} />;
}

export type ChipTone = "neutral" | "accent" | "gold" | "success" | "warning" | "danger" | "info" | "team-a" | "team-b";

export function Chip(props: { tone?: ChipTone; rarity?: Rarity; icon?: IconName; size?: "sm" | "md"; children?: ReactNode; style?: CSSProperties; title?: string }) {
  const cls = [
    "bf-chip",
    props.size === "sm" ? "bf-chip--sm" : "",
    props.rarity ? `bf-chip--rarity bf-rar--${props.rarity}` : props.tone && props.tone !== "neutral" ? `bf-chip--${props.tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={props.style} title={props.title}>
      {props.icon ? <Icon name={props.icon} /> : null}
      {props.children}
    </span>
  );
}

export function StatusDot(props: { online: boolean; pulse?: boolean; title?: string; style?: CSSProperties }) {
  const cls = ["bf-dot", props.online ? "bf-dot--online" : "", props.pulse && props.online ? "bf-dot--pulse" : ""].filter(Boolean).join(" ");
  return <span className={cls} title={props.title ?? (props.online ? "Online" : "Offline")} style={props.style} />;
}

export function LevelBadge(props: { level: number; size?: "sm" | "md" | "lg"; style?: CSSProperties }) {
  const cls = ["bf-level", props.size && props.size !== "md" ? `bf-level--${props.size}` : ""].filter(Boolean).join(" ");
  return (
    <span className={cls} style={props.style} aria-label={`Nível ${props.level}`}>
      {props.level}
    </span>
  );
}

export function CountBadge(props: { count: number; max?: number }) {
  if (!props.count) return null;
  const max = props.max ?? 99;
  return <span className="bf-badge-count">{props.count > max ? `${max}+` : props.count}</span>;
}
