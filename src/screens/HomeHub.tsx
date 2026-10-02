"use client";
/**
 * TELA PRINCIPAL (hub) — padrão de jogo mobile:
 * topo: jogador (avatar com moldura, nome, nível, XP) + configurações;
 * centro: logo + botão JOGAR grande (abre as opções: Solo, Criar sala, Entrar com código);
 * baixo: atalhos para Missões, Coleção, Clã, Ranking, Perfil e Convidar, com bolinha vermelha.
 * No notebook vira três colunas (perfil · jogar · atalhos).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Button, Chip, CountBadge, Divider, Icon, Input, LevelBadge, Modal, ProgressBar, SuitBackdrop, useToast, type IconName } from "@/design";
import { GoogleSignInButton, type AuthUser } from "@/lib/googleAuth";
import { NicknameSetup } from "@/app/ProfileScreen";
import { useProgress } from "@/lib/progress/useProgress";
import { levelFromXp, nextTier, tierForLevel } from "@/data/progression";
import { FramedAvatar, PlayerStrip, TierName } from "./common";
import { InviteSheet } from "./InviteSheet";

export type HomeSection = "missions" | "collection" | "clan" | "ranking" | "profile" | "settings";

export type HomeHubProps = {
  authUser: AuthUser | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string;
  loggedUid: string | null;
  guestMode: boolean;
  onGuest: () => void;
  onGoogleCredential: (c: string) => void;
  onLogout: () => void;
  onUser: (u: AuthUser) => void;
  onSolo: (name: string) => void;
  onCreateRoom: (name: string) => void;
  onJoinCode: (code: string, name: string) => Promise<string | null>;
  onOpen: (s: HomeSection) => void;
  topPad?: number;
  /** barra inferior cuida das seções: esconde os atalhos */
  hideTiles?: boolean;
  /** incrementa para abrir as opções de jogo (botão JOGAR da barra) */
  playRequest?: number;
  /** código vindo do link de convite (?sala=ABCD): entra direto na sala */
  pendingJoinCode?: string | null;
  onPendingJoinConsumed?: () => void;
};

const GUEST_NAME_KEY = "bf_guest_name_v1";
const NAME_MAX = 16;

function cleanName(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

export function HomeHub(P: HomeHubProps) {
  const prog = useProgress();
  const toast = useToast();
  const [playOpen, setPlayOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const n = localStorage.getItem(GUEST_NAME_KEY);
        if (n) setName(n);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const user = P.authUser;
  const fixedName = user && user.nickname ? cleanName(user.nickname) : "";
  const playReq = P.playRequest || 0;
  // Convite por link: com nome pronto entra direto; sem nome abre a janela do código já preenchida.
  const pending = P.pendingJoinCode || "";
  useEffect(() => {
    if (!pending || !P.authReady) return;
    if (user && !user.nickname) return; // primeiro escolhe o apelido
    const t = setTimeout(() => {
      const n = fixedName || cleanName(name);
      setCode(pending.toUpperCase());
      if (n) {
        setBusy(true);
        void P.onJoinCode(pending.toUpperCase(), n).then((e) => {
          setBusy(false);
          if (e) {
            setErr(e);
            setJoinOpen(true);
          }
          P.onPendingJoinConsumed?.();
        });
      } else {
        setJoinOpen(true);
        setErr("Digite seu nome para entrar na sala");
        P.onPendingJoinConsumed?.();
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, P.authReady, user && user.nickname, fixedName]);
  useEffect(() => {
    if (!playReq) return;
    const t = setTimeout(() => {
      const n = fixedName || cleanName(name);
      if (n) setPlayOpen(true);
      else setErr("Digite seu nome para jogar");
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playReq]);
  const playName = fixedName || cleanName(name);
  const p = prog.progress;
  const level = p ? p.level : 1;
  const tier = tierForLevel(level);
  const lf = levelFromXp(p ? p.xp : 0);
  const nt = nextTier(level);

  function requireName(): string | null {
    const n = playName;
    if (!n) {
      setErr("Digite seu nome para jogar");
      return null;
    }
    try {
      if (!fixedName) localStorage.setItem(GUEST_NAME_KEY, n);
    } catch {
      /* ignore */
    }
    return n;
  }

  async function join() {
    const n = requireName();
    if (!n) return;
    if (code.length !== 4) {
      setErr("O código tem 4 letras");
      return;
    }
    setBusy(true);
    setErr("");
    const e = await P.onJoinCode(code, n);
    setBusy(false);
    if (e) setErr(e);
  }

  // ── Porta de entrada: login ou convidado ──
  if (!user && !P.guestMode) {
    return (
      <div className="bf-home bf-live-bg" style={{ paddingTop: P.topPad || 0 }}>
        <SuitBackdrop />
        <div className="bf-home__body">
          <Logo />
          <div className="bf-stack" style={{ width: "100%", maxWidth: 340, alignItems: "stretch" }}>
            {pending ? (
              <div className="bf-panel bf-panel--gold bf-panel--pad" style={{ textAlign: "center" }}>
                <div className="bf-label">Convite para a sala</div>
                <div className="bf-display bf-gold-text" style={{ letterSpacing: ".3em" }}>{pending.toUpperCase()}</div>
                <div className="bf-caption">Entre com Google ou como convidado para ir direto para a sala.</div>
              </div>
            ) : null}
            <div className="bf-h3" style={{ textAlign: "center" }}>Entre para jogar</div>
            {P.authReady ? (
              <GoogleSignInButton onCredential={P.onGoogleCredential} width={320} />
            ) : (
              <div style={{ minHeight: 44 }} />
            )}
            {P.authError ? <div className="bf-field__error" style={{ textAlign: "center" }}>{P.authError}</div> : null}
            {P.authBusy ? <div className="bf-caption" style={{ textAlign: "center" }}>Entrando…</div> : null}
            <Divider label="ou" />
            <Button variant="secondary" size="lg" block icon="user" onClick={P.onGuest}>
              Jogar como convidado
            </Button>
            <p className="bf-caption" style={{ textAlign: "center" }}>Como convidado seu progresso fica só neste aparelho. Entrando com Google, ele vai para a sua conta.</p>
            <a href="/privacidade" className="bf-caption" style={{ textAlign: "center", color: "var(--bf-info)" }}>Política de Privacidade</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Primeiro login: escolher apelido ──
  if (user && !user.nickname) {
    return (
      <div className="bf-home bf-live-bg" style={{ paddingTop: P.topPad || 0 }}>
        <SuitBackdrop intensity={0.7} />
        <div className="bf-home__body">
          <Logo />
          <div style={{ width: "100%", maxWidth: 340 }}>
            <NicknameSetup user={user} onUser={P.onUser} onLogout={P.onLogout} />
          </div>
        </div>
      </div>
    );
  }

  const displayName = fixedName || playName || "Convidado";
  const picture = user ? user.picture : null;

  const tiles: { id: HomeSection | "invite"; label: string; icon: IconName; tone: string; badge?: number }[] = [
    { id: "missions", label: "Missões", icon: "target", tone: "", badge: prog.claimable },
    { id: "collection", label: "Coleção", icon: "deck", tone: "bf-tile--gold", badge: prog.unseenDecks.length },
    { id: "clan", label: "Clã", icon: "shield", tone: "bf-tile--red" },
    { id: "ranking", label: "Ranking", icon: "trophy", tone: "bf-tile--blue" },
    { id: "profile", label: "Perfil", icon: "user", tone: "bf-tile--green" },
    { id: "invite", label: "Convidar", icon: "share", tone: "bf-tile--pink" },
  ];

  return (
    <div className={"bf-home bf-live-bg" + (P.hideTiles ? " bf-home--nav" : "")} style={{ paddingTop: P.topPad || 0 }}>
      <SuitBackdrop />
      <div className="bf-home__top">
        <PlayerStrip name={displayName} picture={picture} progress={p} onClick={() => P.onOpen("profile")} compact />
        <Button variant="secondary" icon="gear" iconOnly aria-label="Configurações" onClick={() => P.onOpen("settings")} />
      </div>

      <div className="bf-home__body">
        {/* coluna esquerda (só notebook): cartão do jogador */}
        <aside className="bf-home__side">
          <div className="bf-panel bf-panel--pad-lg" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <FramedAvatar src={picture} name={displayName} size={96} frame={tier.frame} />
            <div>
              <div className="bf-title"><TierName name={displayName} level={level} /></div>
              <div className="bf-caption" style={{ color: tier.nameColor }}>{tier.title}</div>
            </div>
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
              <LevelBadge level={level} />
              <div style={{ flex: 1 }}>
                <ProgressBar value={lf.into} max={lf.need || 1} shine label="XP" />
                <div className="bf-caption bf-num" style={{ marginTop: 4, textAlign: "right" }}>{lf.into} / {lf.need} XP</div>
              </div>
            </div>
            {nt ? <div className="bf-caption">Próxima faixa: <b style={{ color: nt.nameColor }}>{nt.name}</b> no nível {nt.minLevel}</div> : <div className="bf-caption">Faixa máxima alcançada</div>}
            <div className="bf-row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Chip icon="cards" size="sm">{p ? p.matches : 0} partidas</Chip>
              <Chip icon="trophy" size="sm" tone="gold">{p ? p.wins : 0} vitórias</Chip>
            </div>
            {!user ? (
              <div style={{ width: "100%" }}>
                <Divider label="conta" style={{ marginBottom: 10 }} />
                <GoogleSignInButton onCredential={P.onGoogleCredential} width={240} />
              </div>
            ) : null}
          </div>
        </aside>

        <div className="bf-home__center">
          <Logo />
          <div className="bf-home__play">
            {!fixedName ? (
              <Input
                value={name}
                maxLength={NAME_MAX}
                placeholder="Seu nome"
                aria-label="Seu nome"
                autoComplete="nickname"
                onChange={(e) => {
                  setName(e.target.value.replace(/\s+/g, " ").replace(/^\s+/, ""));
                  if (err) setErr("");
                }}
                style={{ textAlign: "center", fontWeight: 700 }}
              />
            ) : null}
            <Button variant="primary" size="lg" block icon="play" pulse onClick={() => { if (requireName()) setPlayOpen(true); }}>
              Jogar
            </Button>
            {err ? <div className="bf-field__error" role="alert" style={{ textAlign: "center" }}>{err}</div> : null}
            {!user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }} className="bf-home__guestlogin">
                <GoogleSignInButton onCredential={P.onGoogleCredential} width={300} />
              </div>
            ) : null}
          </div>
        </div>

        {P.hideTiles ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Button variant="ghost" icon="share" onClick={() => setInviteOpen(true)}>Convidar amigos</Button>
          </div>
        ) : null}
        {P.hideTiles ? null : <div className="bf-home__tiles">
          {tiles.map((t) => (
            <button key={t.id} type="button" className={`bf-tile ${t.tone}`} onClick={() => (t.id === "invite" ? setInviteOpen(true) : P.onOpen(t.id))}>
              <span className="bf-tile__icon"><Icon name={t.icon} /></span>
              <span>{t.label}</span>
              <CountBadge count={t.badge || 0} />
            </button>
          ))}
        </div>}
      </div>

      {/* Opções de jogo */}
      <Modal open={playOpen} onClose={() => setPlayOpen(false)} title="Como você quer jogar?">
        <div className="bf-stack">
          <PlayOption icon="robot" title="Solo contra a IA" desc="Você e um parceiro bot contra dois bots. Rende 70% do XP." onClick={() => { setPlayOpen(false); P.onSolo(playName); }} />
          <PlayOption icon="people" title="Criar sala com amigos" desc="Gera um código de 4 letras. Quem faltar, a IA completa." onClick={() => { setPlayOpen(false); P.onCreateRoom(playName); }} />
          <PlayOption icon="search" title="Entrar com código" desc="Recebeu um código? Entre na mesa dos seus amigos." onClick={() => { setPlayOpen(false); setJoinOpen(true); }} />
        </div>
      </Modal>

      <Modal
        open={joinOpen}
        onClose={() => { setJoinOpen(false); setErr(""); }}
        title="Entrar em uma sala"
        actions={
          <>
            <Button variant="secondary" onClick={() => setJoinOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={busy} onClick={() => void join()}>Entrar</Button>
          </>
        }
      >
        <div className="bf-stack">
          {!fixedName ? (
            <Input value={name} maxLength={NAME_MAX} placeholder="Seu nome" aria-label="Seu nome" autoComplete="nickname" onChange={(e) => { setName(e.target.value.replace(/s+/g, " ").replace(/^s+/, "")); if (err) setErr(""); }} style={{ textAlign: "center", fontWeight: 700 }} />
          ) : null}
          <Input code placeholder="ABCD" value={code} maxLength={4} autoFocus={!!fixedName} aria-label="Código da sala" onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)); if (err) setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") void join(); }} />
          {err ? <div className="bf-field__error" role="alert">{err}</div> : <div className="bf-field__hint">Peça o código de 4 letras para quem criou a sala.</div>}
        </div>
      </Modal>

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} onCreateRoom={() => { setInviteOpen(false); if (requireName()) P.onCreateRoom(playName); }} onCopied={() => toast.show({ text: "Link copiado!", tone: "success", icon: "check" })} />
    </div>
  );
}

function Logo() {
  return (
    <div className="bf-home__logo">
      <div className="bf-hero">BISCA FUCAS</div>
      <div className="bf-home__sub">Jogo de baralho · Online</div>
    </div>
  );
}

function PlayOption(props: { icon: IconName; title: string; desc: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="bf-playopt" onClick={props.onClick}>
      <span className="bf-playopt__icon"><Icon name={props.icon} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div className="bf-playopt__title">{props.title}</div>
        <div className="bf-playopt__desc">{props.desc}</div>
      </span>
      <Icon name="chevron-right" size={20} style={{ color: "var(--bf-text-4)" }} />
    </button>
  );
}
