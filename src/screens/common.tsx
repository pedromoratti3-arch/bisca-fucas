"use client";
/**
 * Peças compartilhadas pelas telas: moldura de nível no avatar, cabeçalho de seção,
 * cartão do jogador (nome colorido pela faixa), número animado.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, Button, Icon, LevelBadge, ProgressBar, type IconName } from "@/design";
import { tierForLevel, type Tier, type TierFrame } from "@/data/progression";
import { levelFromXp } from "@/data/progression";
import type { ProgressState } from "@/lib/progress/types";

/** Avatar com a moldura da faixa de nível (bronze, prata, ouro, roxo, holográfica). */
export function FramedAvatar(props: { src?: string | null; name?: string; size?: number; frame?: TierFrame; level?: number; online?: boolean | null; style?: CSSProperties }) {
  const s = props.size ?? 56;
  const frame = props.frame ?? (props.level ? tierForLevel(props.level).frame : "none");
  return (
    <span className={`bf-frame bf-frame--${frame}`} style={{ width: s, height: s, ...props.style }}>
      <Avatar src={props.src} name={props.name} size={s - (frame === "none" ? 0 : 8)} online={props.online} />
      {frame === "holo" ? <span className="bf-frame__holo" aria-hidden /> : null}
    </span>
  );
}

/** Nome do jogador com a cor da faixa. */
export function TierName(props: { name: string; level: number; style?: CSSProperties; className?: string }) {
  const t = tierForLevel(props.level);
  const fx = t.frame === "holo" ? "bf-tiername--holo" : t.frame === "purple" ? "bf-tiername--purple" : t.frame === "gold" || t.frame === "silver" ? "bf-tiername--sheen" : "";
  const cls = ["bf-tiername", fx, props.className || ""].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ color: t.nameColor, ["--tn" as string]: t.nameColor, ...props.style }}>
      {props.name}
    </span>
  );
}

/** Cabeçalho + conteúdo de uma seção que abre por cima da home (com botão de voltar). */
export function SectionShell(props: { title: ReactNode; subtitle?: ReactNode; onBack: () => void; right?: ReactNode; children: ReactNode; wide?: boolean; icon?: IconName; className?: string; /** fundo animado atrás da seção inteira (largura total) */ backdrop?: ReactNode }) {
  return (
    <div className={["bf-screen bf-section", props.className || ""].filter(Boolean).join(" ")}>
      {props.backdrop}
      <header className="bf-topbar">
        <Button variant="ghost" size="sm" icon="arrow-left" iconOnly aria-label="Voltar" onClick={props.onBack} />
        <div className="bf-topbar__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {props.icon ? <Icon name={props.icon} size={20} style={{ color: "var(--bf-accent-3)" }} /> : null}
          <span>{props.title}</span>
        </div>
        {props.right}
      </header>
      {props.subtitle ? (
        <div className={props.wide ? "bf-container bf-container--wide" : "bf-container"} style={{ paddingTop: 2, paddingBottom: 10 }}>
          <p className="bf-caption">{props.subtitle}</p>
        </div>
      ) : null}
      <main className={[props.wide ? "bf-container bf-container--wide" : "bf-container", "bf-section__body"].join(" ")}>{props.children}</main>
    </div>
  );
}

/** Linha compacta: avatar + nome + nível + barra de XP. */
export function PlayerStrip(props: { name: string; picture?: string | null; progress: ProgressState | null; onClick?: () => void; compact?: boolean }) {
  const p = props.progress;
  const level = p ? p.level : 1;
  const lf = levelFromXp(p ? p.xp : 0);
  const t: Tier = tierForLevel(level);
  return (
    <button type="button" className="bf-playerstrip" onClick={props.onClick} aria-label="Abrir perfil">
      <FramedAvatar src={props.picture} name={props.name} size={props.compact ? 40 : 48} frame={t.frame} />
      <span className="bf-playerstrip__text">
        <span className="bf-playerstrip__name">
          <TierName name={props.name} level={level} />
        </span>
        <span className="bf-playerstrip__bar">
          <LevelBadge level={level} size="sm" />
          <ProgressBar value={lf.into} max={lf.need || 1} size="sm" shine style={{ flex: 1 }} label={`XP: ${lf.into} de ${lf.need}`} />
        </span>
      </span>
    </button>
  );
}

/** Número que "sobe" até o valor (para XP e placares). */
export function CountUp(props: { to: number; from?: number; durationMs?: number; prefix?: string; suffix?: string; className?: string; style?: CSSProperties }) {
  const [v, setV] = useState(props.from ?? 0);
  const raf = useRef(0);
  useEffect(() => {
    const from = props.from ?? 0;
    const to = props.to;
    const dur = props.durationMs ?? 900;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || dur <= 0) {
      raf.current = requestAnimationFrame(() => setV(to));
      return () => cancelAnimationFrame(raf.current);
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(from + (to - from) * e));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [props.to, props.from, props.durationMs]);
  return (
    <span className={["bf-num", props.className || ""].join(" ")} style={props.style}>
      {props.prefix}
      {v}
      {props.suffix}
    </span>
  );
}

export function EmptyState(props: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--bf-text-3)" }}>
      <Icon name={props.icon} size={40} style={{ margin: "0 auto 10px", color: "var(--bf-text-4)" }} />
      <div className="bf-h3" style={{ color: "var(--bf-text-2)" }}>{props.title}</div>
      {props.text ? <p className="bf-body-sm" style={{ marginTop: 6 }}>{props.text}</p> : null}
      {props.action ? <div style={{ marginTop: 14 }}>{props.action}</div> : null}
    </div>
  );
}
