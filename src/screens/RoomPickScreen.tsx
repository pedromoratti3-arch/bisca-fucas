"use client";
/**
 * Escolha da mesa (sala temática). Ícones originais de cada sala (ver roomMarks.js) e um fundo
 * elegante por sala: gradiente da sala + textura discreta + brilho suave atrás do ícone.
 */
import type { ReactNode } from "react";
import { Button } from "@/design";
import { SectionShell } from "./common";
import { FlorestaMark, FucasMark, HubMark, TerrafeLogo } from "./roomMarks";

export type RoomInfo = {
  id: string;
  name: string;
  color: string;
  bg: string;
  glow: string;
  tagline: string;
  /** textura discreta por cima do gradiente */
  texture: string;
  icon: () => ReactNode;
};

export const ROOMS: RoomInfo[] = [
  {
    id: "terrafe",
    name: "Terrafé",
    color: "#c9956a",
    bg: "linear-gradient(160deg,#3a2a18 0%,#241810 55%,#140d06 100%)",
    glow: "rgba(201,149,106,.55)",
    tagline: "Cafezinho e bisca na mesa de madeira",
    // veios de madeira
    texture: "repeating-linear-gradient(100deg, rgba(255,220,180,.05) 0 2px, transparent 2px 11px, rgba(0,0,0,.08) 11px 13px, transparent 13px 24px)",
    icon: () => TerrafeLogo(56, "#e8c9a0"),
  },
  {
    id: "hub",
    name: "HUB Fucape",
    color: "#60a5fa",
    bg: "linear-gradient(160deg,#141c42 0%,#0c1030 55%,#070818 100%)",
    glow: "rgba(96,165,250,.5)",
    tagline: "Luz azul, grade tecnológica, ritmo rápido",
    // pontos finos (painel)
    texture: "radial-gradient(rgba(147,197,253,.16) 0.8px, transparent 1.2px)",
    icon: () => HubMark(84),
  },
  {
    id: "floresta",
    name: "Floresta",
    color: "#6ee7b7",
    bg: "linear-gradient(160deg,#17382a 0%,#0f2419 55%,#071209 100%)",
    glow: "rgba(110,231,183,.45)",
    tagline: "Verde, folhas e sombra fresca",
    // folhagem difusa
    texture: "radial-gradient(ellipse 60% 45% at 20% 100%, rgba(74,222,128,.14), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 0%, rgba(74,222,128,.1), transparent 70%)",
    icon: () => <span style={{ color: "#86efac" }}>{FlorestaMark(52)}</span>,
  },
  {
    id: "sala",
    name: "Sala de Aula",
    color: "#fb7185",
    bg: "linear-gradient(160deg,#4a0c0c 0%,#2c0707 55%,#160303 100%)",
    glow: "rgba(196,18,48,.55)",
    tagline: "Onde tudo começou: vermelho Fucas",
    // linhas de caderno bem leves
    texture: "repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 18px)",
    icon: () => FucasMark(50),
  },
];

export const ROOM_BY_ID: Record<string, RoomInfo> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export function RoomPickScreen(props: { onBack: () => void; onSelect: (id: string) => void; forCreate?: boolean; error?: string; busy?: boolean }) {
  return (
    <SectionShell title={props.forCreate ? "Escolha a mesa da sala" : "Escolha a mesa"} icon="cards" onBack={props.onBack} subtitle={props.forCreate ? "Todos na sala verão o mesmo cenário." : "Cada mesa tem seu clima. As regras são as mesmas."}>
      <div className="bf-stack bf-stack--lg">
        {props.error ? (
          <div className="bf-panel bf-panel--pad" role="alert" style={{ borderColor: "rgba(248,113,113,.45)", color: "var(--bf-danger)", fontSize: 13 }}>
            {props.error}
          </div>
        ) : null}
        <div className="bf-grid-2" style={{ gap: 12 }}>
          {ROOMS.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="bf-panel bf-panel--interactive bf-anim-fade-up bf-roomcard"
              disabled={props.busy}
              onClick={() => props.onSelect(r.id)}
              style={{
                animationDelay: `${i * 60}ms`,
                background: `${r.texture}, ${r.bg}`,
                backgroundSize: r.id === "hub" ? "9px 9px, auto" : undefined,
                borderColor: r.color + "66",
                ["--room" as string]: r.color,
                ["--room-glow" as string]: r.glow,
              }}
            >
              <span className="bf-roomcard__glow" />
              <span className="bf-roomcard__icon">{r.icon()}</span>
              <span className="bf-roomcard__text">
                <span className="bf-roomcard__name" style={{ color: r.color }}>{r.name}</span>
                <span className="bf-roomcard__tag">{r.tagline}</span>
              </span>
            </button>
          ))}
        </div>
        {props.busy ? <div className="bf-caption" style={{ textAlign: "center" }}>Criando a sala…</div> : null}
        <Button variant="ghost" block icon="arrow-left" onClick={props.onBack}>Voltar</Button>
      </div>
    </SectionShell>
  );
}
