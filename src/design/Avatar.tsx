"use client";
/**
 * Foto do jogador com anel opcional (roxo, dourado ou especial) e bolinha de status.
 * Se a imagem falhar, mostra a inicial do nome.
 */
import { useState, type CSSProperties } from "react";
import { StatusDot } from "./Panel";

export function Avatar(props: { src?: string | null; name?: string; size?: number; ring?: "none" | "accent" | "gold" | "special"; online?: boolean | null; style?: CSSProperties }) {
  const [broken, setBroken] = useState(false);
  const s = props.size ?? 40;
  const ring = props.ring && props.ring !== "none" ? `bf-avatar--ring${props.ring === "accent" ? "" : ` bf-avatar--ring-${props.ring}`}` : "";
  const cls = ["bf-avatar", ring].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ width: s, height: s, ...props.style }}>
      {props.src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bf-avatar__img" src={props.src} alt="" width={s} height={s} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <span className="bf-avatar__fallback" style={{ fontSize: Math.round(s * 0.42) }}>
          {String(props.name || "?").charAt(0).toUpperCase()}
        </span>
      )}
      {props.online === true || props.online === false ? <StatusDot online={props.online} style={{ position: "absolute", bottom: 0, right: 0 }} /> : null}
    </span>
  );
}
