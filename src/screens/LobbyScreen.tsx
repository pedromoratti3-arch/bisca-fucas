"use client";
/**
 * Sala de espera viva: código grande para compartilhar, assentos da mesa com quem entrou
 * (avatar, status, reconectando), cartas "embaralhando" enquanto espera, dicas rotativas e convite.
 */
import { useEffect, useState } from "react";
import { Avatar, Button, Chip, Icon, PlayingCard, StatusDot, SuitBackdrop, useToast } from "@/design";
import { useProgress } from "@/lib/progress/useProgress";
import { ROOM_BY_ID } from "./RoomPickScreen";
import { InviteSheet } from "./InviteSheet";
import { SectionShell } from "./common";

export type LobbyPlayer = { id: string; name: string; seat: number; team: "A" | "B" | null; isBot?: boolean };
export type LobbyRoom = { code: string; hostId: string; players: LobbyPlayer[]; themeId?: string };

const TIPS = [
  "O 7 de corte precisa sair antes do Ás de corte — a regra que mais pega calouro.",
  "Capote: se o adversário fizer menos de 30 pontos na mão, vale +1 ponto extra.",
  "Réle: jogar o Ás de corte logo depois do 7 de corte vale ponto de partida.",
  "Copas batido: quem corta pode bater e a mão passa a valer 2 pontos.",
  "Vazas com Ás (11) e 7 (10) decidem a mão. Conte as biscas que já saíram.",
  "Jogando com 2 ou mais amigos na mesa, você ganha XP extra.",
];

export function LobbyScreen(props: {
  room: LobbyRoom;
  myId: string;
  onlineById: Record<string, boolean>;
  reconnectingById: Record<string, { name: string; deadlineAt: number } | undefined>;
  now: number;
  serverConnected: boolean | null;
  onLeave: () => void;
  onToggleTeam: (team: "A" | "B") => void;
  onStart: () => void;
}) {
  const { room, myId } = props;
  const prog = useProgress();
  const toast = useToast();
  const [invite, setInvite] = useState(false);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);
  const isHost = room.hostId === myId;
  const humans = room.players.filter((p) => !p.isBot);
  const me = humans.find((p) => p.id === myId);
  const tA = humans.filter((p) => p.team === "A");
  const tB = humans.filter((p) => p.team === "B");
  const allHaveTeam = humans.length > 0 && humans.every((p) => p.team === "A" || p.team === "B");
  const canStart = isHost && humans.length >= 1 && humans.length <= 4 && allHaveTeam && tA.length <= 2 && tB.length <= 2;
  const theme = ROOM_BY_ID[room.themeId || "sala"] || ROOM_BY_ID.sala;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.show({ text: "Código copiado!", tone: "success", icon: "check" });
    } catch {
      /* ignore */
    }
  }

  function seat(team: "A" | "B", idx: number) {
    const list = team === "A" ? tA : tB;
    const p = list[idx];
    const color = team === "A" ? "var(--bf-team-a)" : "var(--bf-team-b)";
    if (!p) {
      return (
        <div key={`${team}${idx}`} className="bf-panel" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderStyle: "dashed", opacity: 0.7 }}>
          <span style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px dashed ${color}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color }}>
            <Icon name="robot" size={18} />
          </span>
          <span className="bf-caption">Vaga livre · a IA completa</span>
        </div>
      );
    }
    const online = props.onlineById[p.id] !== false;
    const rc = props.reconnectingById[p.id];
    const secLeft = rc ? Math.max(0, Math.ceil((rc.deadlineAt - props.now) / 1000)) : 0;
    return (
      <div key={p.id} className="bf-panel bf-anim-scale-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderColor: p.id === myId ? "var(--bf-accent)" : `${color}55` }}>
        <span style={{ position: "relative" }}>
          <Avatar src={p.id.indexOf("g_") === 0 ? `/api/avatar/${p.id}` : undefined} name={p.name} size={36} />
          <StatusDot online={online} style={{ position: "absolute", bottom: 0, right: 0 }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}{p.id === myId ? " (você)" : ""}</div>
          <div className="bf-caption">
            {p.id === room.hostId ? "Anfitrião · " : ""}
            {!online && rc && secLeft > 0 ? <span style={{ color: "var(--bf-warning)" }}>reconectando ({secLeft}s)</span> : online ? "na mesa" : <span style={{ color: "var(--bf-warning)" }}>fora da rede</span>}
          </div>
        </span>
      </div>
    );
  }

  return (
    <SectionShell
      title="Sala de espera"
      icon="people"
      onBack={props.onLeave}
      right={props.serverConnected === false ? <Chip tone="danger" size="sm" icon="x">Sem conexão</Chip> : props.serverConnected ? <Chip tone="success" size="sm"><StatusDot online pulse />online</Chip> : null}
      className="bf-lobby bf-live-bg"
    >
      <div style={{ position: "relative" }}>
        <div className="bf-stack bf-stack--lg" style={{ position: "relative", zIndex: 1 }}>
          {/* código */}
          <div className="bf-panel bf-panel--gold bf-panel--pad" style={{ textAlign: "center", background: `${theme.pattern}, ${theme.bg}` }}>
            <div className="bf-label">Código da sala · {theme.name}</div>
            <button type="button" onClick={() => void copyCode()} className="bf-display bf-gold-text" style={{ letterSpacing: ".35em", fontSize: 44, border: 0, cursor: "pointer", marginTop: 4, padding: 0, filter: "drop-shadow(0 0 14px rgba(227,183,74,.35))" }} title="Copiar código">
              {room.code}
            </button>
            <div className="bf-row" style={{ justifyContent: "center", gap: 8, marginTop: 6 }}>
              <Button variant="secondary" size="sm" icon="copy" onClick={() => void copyCode()}>Copiar</Button>
              <Button variant="accent" size="sm" icon="share" onClick={() => setInvite(true)}>Convidar</Button>
            </div>
          </div>

          {/* mesa viva: cartas embaralhando */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "4px 0" }} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ animation: `bf-float ${3.2 + i * 0.5}s ease-in-out ${i * -0.8}s infinite` }}>
                <PlayingCard back size="sm" deck={prog.equippedDeck} style={{ transform: `rotate(${(i - 1.5) * 8}deg)` }} />
              </div>
            ))}
          </div>

          {/* quem ainda não escolheu dupla */}
          {humans.filter((p) => !p.team).length ? (
            <div className="bf-panel bf-panel--accent bf-panel--pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="bf-label" style={{ color: "var(--bf-accent-3)" }}>Na sala, ainda sem dupla</div>
              <div className="bf-row" style={{ flexWrap: "wrap", gap: 8 }}>
                {humans.filter((p) => !p.team).map((p) => (
                  <Chip key={p.id} tone={p.id === myId ? "accent" : "neutral"} icon="user">{p.name}{p.id === myId ? " (você)" : ""}{p.id === room.hostId ? " · anfitrião" : ""}</Chip>
                ))}
              </div>
              {me && !me.team ? <div className="bf-caption">Escolha a Dupla A ou B abaixo para poder começar.</div> : null}
            </div>
          ) : null}

          {/* duplas */}
          <div className="bf-grid-2" style={{ gap: 12 }}>
            <div className="bf-stack" style={{ gap: 8 }}>
              <div className="bf-row" style={{ justifyContent: "space-between" }}>
                <span className="bf-label" style={{ color: "var(--bf-team-a)" }}>Dupla A</span>
                <Chip size="sm" tone="team-a">{tA.length}/2</Chip>
              </div>
              {seat("A", 0)}
              {seat("A", 1)}
              <Button variant={me?.team === "A" ? "primary" : "secondary"} size="sm" block onClick={() => props.onToggleTeam("A")} disabled={tA.length >= 2 && me?.team !== "A"}>
                {me?.team === "A" ? "Na dupla A" : "Entrar na A"}
              </Button>
            </div>
            <div className="bf-stack" style={{ gap: 8 }}>
              <div className="bf-row" style={{ justifyContent: "space-between" }}>
                <span className="bf-label" style={{ color: "var(--bf-team-b)" }}>Dupla B</span>
                <Chip size="sm" tone="team-b">{tB.length}/2</Chip>
              </div>
              {seat("B", 0)}
              {seat("B", 1)}
              <Button variant={me?.team === "B" ? "primary" : "secondary"} size="sm" block onClick={() => props.onToggleTeam("B")} disabled={tB.length >= 2 && me?.team !== "B"}>
                {me?.team === "B" ? "Na dupla B" : "Entrar na B"}
              </Button>
            </div>
          </div>

          {/* dica */}
          <div className="bf-panel bf-panel--pad" key={tip} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "bf-fade-up .4s var(--bf-ease-out) both" }}>
            <Icon name="info" size={18} style={{ color: "var(--bf-accent-3)", flexShrink: 0, marginTop: 1 }} />
            <span className="bf-body-sm" style={{ color: "var(--bf-text-2)" }}>{TIPS[tip]}</span>
          </div>

          {isHost ? (
            <div className="bf-stack" style={{ gap: 8 }}>
              <Button variant="primary" size="lg" block icon="play" pulse={canStart} disabled={!canStart} onClick={props.onStart}>Iniciar partida</Button>
              <div className="bf-caption" style={{ textAlign: "center" }}>{canStart ? "Quem faltar, a IA completa a mesa." : "Todos precisam escolher uma dupla (máx. 2 por lado)."}</div>
            </div>
          ) : (
            <div className="bf-panel bf-panel--accent bf-panel--pad" style={{ textAlign: "center" }}>
              <div className="bf-row" style={{ justifyContent: "center", gap: 10 }}>
                <span className="bf-spinner" style={{ width: 18, height: 18, color: "var(--bf-accent-3)" }} />
                <span className="bf-body-sm">Aguardando o anfitrião iniciar…</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <InviteSheet open={invite} onClose={() => setInvite(false)} roomCode={room.code} onCopied={() => toast.show({ text: "Convite copiado!", tone: "success", icon: "check" })} />
      <SuitBackdrop intensity={0.5} showCard={false} />
    </SectionShell>
  );
}
