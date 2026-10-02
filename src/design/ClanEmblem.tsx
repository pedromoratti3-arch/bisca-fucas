"use client";
/**
 * Emblema de clã. Tenta o logo oficial (public/assets/clubes/*.png) em segundo plano;
 * só troca o desenho SVG pela imagem quando ela realmente existir (sem ícone de imagem quebrada).
 */
import { useEffect, useState, type CSSProperties } from "react";
import type { ClanEmblemKind } from "@/data/clans";

/** Resultado da verificação de cada logo (compartilhado entre todos os emblemas). */
const logoCache = new Map<string, boolean>();
const logoWaiters = new Map<string, Array<(ok: boolean) => void>>();
function probeLogo(src: string, cb: (ok: boolean) => void) {
  const cached = logoCache.get(src);
  if (cached !== undefined) return cb(cached);
  const list = logoWaiters.get(src);
  if (list) return void list.push(cb);
  logoWaiters.set(src, [cb]);
  const img = new Image();
  const done = (ok: boolean) => {
    logoCache.set(src, ok);
    (logoWaiters.get(src) || []).forEach((f) => f(ok));
    logoWaiters.delete(src);
  };
  img.onload = () => done(img.naturalWidth > 0);
  img.onerror = () => done(false);
  img.src = src;
}

function EmblemArt(props: { kind: ClanEmblemKind; color: string; color2: string; fg: string }) {
  const { color, color2, fg } = props;
  const gid = `ce-${props.kind}-${color.replace("#", "")}`;
  const bgDefs = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={color} />
        <stop offset="1" stopColor={color2} />
      </linearGradient>
    </defs>
  );
  switch (props.kind) {
    case "club-arrow":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <circle cx="32" cy="32" r="30" fill={`url(#${gid})`} />
          <circle cx="32" cy="32" r="27" fill="none" stroke={fg} strokeOpacity=".35" strokeWidth="1.5" />
          <g fill={fg}>
            <circle cx="32" cy="22" r="8.5" />
            <circle cx="22" cy="33" r="8.5" />
            <circle cx="42" cy="33" r="8.5" />
            <path d="M29.5 31c.6 5-1 9-5 13h15c-4-4-5.6-8-5-13z" />
          </g>
          <path d="M32 50l-5-6h3.2V38h3.6v6H37z" fill={color2} stroke={fg} strokeWidth="1.2" />
        </svg>
      );
    case "cards-crown":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <circle cx="32" cy="32" r="30" fill={`url(#${gid})`} />
          <g transform="rotate(-12 32 38)"><rect x="19" y="26" width="18" height="26" rx="2.5" fill={fg} opacity=".55" /></g>
          <g transform="rotate(10 32 38)"><rect x="27" y="24" width="18" height="26" rx="2.5" fill={fg} /></g>
          <path d="M20 22l-2-9 6.5 4.5L32 9l7.5 8.5L46 13l-2 9z" fill="#ffd166" stroke={color2} strokeWidth="1.2" />
          <circle cx="32" cy="12" r="1.8" fill="#fff" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <rect x="4" y="4" width="56" height="56" rx="10" fill={`url(#${gid})`} />
          <rect x="11" y="11" width="42" height="42" rx="6" fill="none" stroke={fg} strokeOpacity=".5" strokeWidth="2" />
          <path d="M21 42V22h5.5v15h9V42z" fill={fg} />
          <circle cx="42" cy="24" r="3" fill="#ffd166" />
        </svg>
      );
    case "grad-cap":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <circle cx="32" cy="32" r="30" fill={`url(#${gid})`} />
          <path d="M8 27l24-10 24 10-24 10z" fill={fg} />
          <path d="M18 31v10c0 3.5 6.3 6 14 6s14-2.5 14-6V31l-14 6z" fill={fg} opacity=".75" />
          <path d="M53 28v12" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" />
          <circle cx="53" cy="42" r="2.4" fill="#ffd166" />
        </svg>
      );
    case "club-crown":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <circle cx="32" cy="32" r="30" fill={`url(#${gid})`} />
          <circle cx="32" cy="32" r="27" fill="none" stroke={fg} strokeOpacity=".3" strokeWidth="1.5" />
          <path d="M19 24l-2-9 6.5 4.5L32 11l8.5 8.5L47 15l-2 9z" fill="#d4a843" stroke={fg} strokeOpacity=".4" strokeWidth="1" />
          <g fill={fg}>
            <circle cx="32" cy="32" r="7" />
            <circle cx="24" cy="41" r="7" />
            <circle cx="40" cy="41" r="7" />
            <path d="M30 40c.5 4-.8 7.5-4 11h12c-3.2-3.5-4.5-7-4-11z" />
          </g>
        </svg>
      );
    case "club-bbc":
      // Provisório: escudo hexagonal escuro, paus dourado e as letras BBC. Diferente do Reis de Paus (círculo branco com coroa).
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          {bgDefs}
          <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill={`url(#${gid})`} />
          <path d="M32 9l20 11.6v22.8L32 55 12 43.4V20.6z" fill="none" stroke={fg} strokeOpacity=".55" strokeWidth="1.5" />
          <g fill={fg}>
            <circle cx="32" cy="22" r="6.2" />
            <circle cx="24.6" cy="30.5" r="6.2" />
            <circle cx="39.4" cy="30.5" r="6.2" />
            <path d="M30.2 29c.4 3.6-.5 6.6-2.6 9.4h8.8c-2.1-2.8-3-5.8-2.6-9.4z" />
          </g>
          <text x="32" y="50" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="9" fill={fg} letterSpacing="1.5">BBC</text>
        </svg>
      );
    case "star":
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<circle cx="32" cy="32" r="30" fill={`url(#${gid})`} /><path d="M32 12l6 13 14 1.6-10.5 9.6 3 14L32 43l-12.5 7.2 3-14L12 26.6 26 25z" fill={fg} /></svg>;
    case "bolt":
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<circle cx="32" cy="32" r="30" fill={`url(#${gid})`} /><path d="M35 10L18 36h12l-3 18 19-28H34z" fill={fg} /></svg>;
    case "flame":
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<circle cx="32" cy="32" r="30" fill={`url(#${gid})`} /><path d="M32 10c4 8 12 13 12 24a12 12 0 0 1-24 0c0-4 1.5-7 3.5-9.5 1 3 3 5 6 5 0-7-2-12 2.5-19.5z" fill={fg} /></svg>;
    case "spade":
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<circle cx="32" cy="32" r="30" fill={`url(#${gid})`} /><path d="M32 10c6 9 20 18 20 28 0 6-4.5 10-10 10-3 0-5.5-1-7.5-3 .5 4 2.5 7.5 6 10.5h-17c3.5-3 5.5-6.5 6-10.5-2 2-4.5 3-7.5 3-5.5 0-10-4-10-10 0-10 14-19 20-28z" fill={fg} /></svg>;
    case "heart":
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<circle cx="32" cy="32" r="30" fill={`url(#${gid})`} /><path d="M32 54S10 40 10 25c0-7 5-12 11.5-12 4.5 0 8 2.5 10.5 6.5C34.5 15.5 38 13 42.5 13 49 13 54 18 54 25c0 15-22 29-22 29z" fill={fg} /></svg>;
    case "shield":
    default:
      return <svg viewBox="0 0 64 64" width="100%" height="100%">{bgDefs}<path d="M32 6l22 8v16c0 14-9.5 24-22 28C19.5 54 10 44 10 30V14z" fill={`url(#${gid})`} /><path d="M32 12l16 6v12c0 10.5-7 18.5-16 21.5C23 48.5 16 40.5 16 30V18z" fill="none" stroke={fg} strokeOpacity=".45" strokeWidth="2" /><path d="M24 33l6 6 11-13" fill="none" stroke={fg} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

export function ClanEmblem(props: { kind: ClanEmblemKind; color: string; color2?: string; fg?: string; logo?: string; size?: number | string; style?: CSSProperties; className?: string; title?: string }) {
  const [logoOk, setLogoOk] = useState(false);
  const logo = props.logo;
  useEffect(() => {
    if (!logo) return;
    let alive = true;
    probeLogo(logo, (ok) => {
      if (alive) setLogoOk(ok);
    });
    return () => {
      alive = false;
    };
  }, [logo]);
  const s = props.size ?? 48;
  return (
    <span className={props.className} title={props.title} style={{ display: "inline-block", width: s, height: s, flexShrink: 0, lineHeight: 0, ...props.style }}>
      {logo && logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      ) : (
        <EmblemArt kind={props.kind} color={props.color} color2={props.color2 ?? props.color} fg={props.fg ?? "#fff"} />
      )}
    </span>
  );
}
