"use client";
/** Escolha da mesa (sala temática). Cada sala com identidade própria: cor, textura e ícone. */
import { Button, Icon, SuitGlyph, type IconName } from "@/design";
import { SectionShell } from "./common";

export type RoomInfo = { id: string; name: string; color: string; bg: string; glow: string; icon: IconName; tagline: string; pattern: string };

export const ROOMS: RoomInfo[] = [
  { id: "terrafe", name: "Terrafé", color: "#c9956a", bg: "linear-gradient(160deg,#3a2a18 0%,#1a1208 100%)", glow: "rgba(201,149,106,.45)", icon: "home", tagline: "Cafezinho e bisca na mesa de madeira", pattern: "radial-gradient(circle at 20% 30%, rgba(201,149,106,.18) 0 12px, transparent 13px), radial-gradient(circle at 80% 70%, rgba(201,149,106,.12) 0 18px, transparent 19px)" },
  { id: "hub", name: "HUB Fucape", color: "#60a5fa", bg: "linear-gradient(160deg,#121a3a 0%,#080818 100%)", glow: "rgba(96,165,250,.45)", icon: "bolt", tagline: "Luz azul, grade tecnológica, ritmo rápido", pattern: "repeating-linear-gradient(0deg, rgba(96,165,250,.08) 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, rgba(96,165,250,.08) 0 1px, transparent 1px 14px)" },
  { id: "floresta", name: "Floresta", color: "#6ee7b7", bg: "linear-gradient(160deg,#143022 0%,#0a1a0e 100%)", glow: "rgba(110,231,183,.4)", icon: "clover", tagline: "Verde, folhas e sombra fresca", pattern: "radial-gradient(ellipse at 15% 85%, rgba(74,222,128,.16) 0 40px, transparent 41px), radial-gradient(ellipse at 85% 15%, rgba(74,222,128,.1) 0 30px, transparent 31px)" },
  { id: "sala", name: "Sala de Aula", color: "#fb7185", bg: "linear-gradient(160deg,#4a0c0c 0%,#1a0404 100%)", glow: "rgba(196,18,48,.5)", icon: "book", tagline: "Onde tudo começou: vermelho Fucas", pattern: "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px)" },
];

export const ROOM_BY_ID: Record<string, RoomInfo> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export function RoomPickScreen(props: { onBack: () => void; onSelect: (id: string) => void; forCreate?: boolean; error?: string; busy?: boolean }) {
  return (
    <SectionShell title={props.forCreate ? "Escolha a mesa da sala" : "Escolha a mesa"} icon="cards" onBack={props.onBack} subtitle={props.forCreate ? "Todos na sala verão o mesmo cenário." : "Cada mesa tem seu clima. As regras são as mesmas."}>
      <div className="bf-stack bf-stack--lg">
        {props.error ? <div className="bf-panel bf-panel--pad" role="alert" style={{ borderColor: "rgba(248,113,113,.45)", color: "var(--bf-danger)", fontSize: 13 }}>{props.error}</div> : null}
        <div className="bf-grid-2" style={{ gap: 12 }}>
          {ROOMS.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="bf-panel bf-panel--interactive bf-anim-fade-up"
              disabled={props.busy}
              onClick={() => props.onSelect(r.id)}
              style={{ animationDelay: `${i * 60}ms`, background: `${r.pattern}, ${r.bg}`, borderColor: r.color + "55", padding: 0, overflow: "hidden", textAlign: "left", color: "var(--bf-text)", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: props.busy ? "wait" : "pointer" }}
            >
              <span style={{ position: "absolute", right: -10, top: -10, opacity: 0.12, transform: "rotate(-12deg)" }}>
                <SuitGlyph suit={i % 2 ? "espadas" : "copas"} size={110} tone={i % 2 ? "gold" : "red"} />
              </span>
              <span style={{ position: "absolute", left: 14, top: 14, width: 42, height: 42, borderRadius: 13, background: "rgba(0,0,0,.35)", border: `1px solid ${r.color}66`, display: "flex", alignItems: "center", justifyContent: "center", color: r.color, boxShadow: `0 0 18px ${r.glow}` }}>
                <Icon name={r.icon} size={22} />
              </span>
              <span style={{ padding: "14px 14px 12px", background: "linear-gradient(180deg, transparent, rgba(0,0,0,.45))", width: "100%" }}>
                <span style={{ display: "block", fontFamily: "var(--bf-font-display)", fontWeight: 800, fontSize: 17, color: r.color }}>{r.name}</span>
                <span className="bf-caption" style={{ display: "block", marginTop: 2 }}>{r.tagline}</span>
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
