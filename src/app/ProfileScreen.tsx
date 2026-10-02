"use client";
/**
 * Perfil: avatar com moldura da faixa, nome e título, nível/XP, estatísticas, baralho equipado,
 * clã e conquistas. Mantém foto (câmera/galeria) e apelido (troca a cada 30 dias).
 * Também exporta NicknameSetup (primeiro login) e Avatar (compatibilidade com page.tsx).
 */
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/googleAuth";
import { Avatar as DsAvatar, Button, Chip, Icon, Input, LevelBadge, Modal, Panel, PlayingCard, ProgressBar, useToast } from "@/design";
import { useProgressOptional } from "@/lib/progress/useProgress";
import { TIERS, levelFromXp, nextTier, tierForLevel } from "@/data/progression";
import { ACHIEVEMENTS } from "@/data/missions";
import { DECK_BY_ID } from "@/data/decks";
import { OFFICIAL_CLAN_BY_ID } from "@/data/clans";
import { FramedAvatar, TierName } from "@/screens/common";

/** Lado da foto salva (px). Pequena para caber no banco e carregar rápido. */
const AVATAR_SIZE = 256;
const NICK_MAX = 16;

/** Compatibilidade: a mesa usa <Avatar src name size /> */
export function Avatar(props: { src?: string; name?: string; size: number }) {
  return <DsAvatar src={props.src} name={props.name} size={props.size} />;
}

function squareJpeg(source: CanvasImageSource, w: number, h: number): string {
  const side = Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function fileToSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(squareJpeg(img, img.naturalWidth, img.naturalHeight));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa imagem"));
    };
    img.src = url;
  });
}

async function postJson(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  return { ok: r.ok, data: j as { user?: AuthUser; error?: string } | null };
}

function formatWait(ms: number): string {
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days > 1) return `${days} dias`;
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return hours > 1 ? `${hours} horas` : "1 hora";
}

/** Câmera ao vivo (getUserMedia). Devolve a foto já cortada via onCapture. */
function CameraModal(props: { onCapture: (dataUrl: string) => void; onClose: () => void; onUnavailable: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const unavailableRef = useRef(props.onUnavailable);
  useEffect(() => {
    unavailableRef.current = props.onUnavailable;
  });
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      unavailableRef.current();
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        if (!cancelled) unavailableRef.current();
      });
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);
  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    props.onCapture(squareJpeg(v, v.videoWidth, v.videoHeight));
  }
  return (
    <div className="bf-backdrop bf-backdrop--center" style={{ zIndex: 1100 }}>
      <div className="bf-modal" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: "min(70vw, 300px)", aspectRatio: "1", borderRadius: "50%", overflow: "hidden", background: "#111" }}>
          <video ref={videoRef} playsInline muted onLoadedData={() => setReady(true)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        </div>
        <div className="bf-row">
          <Button variant="secondary" onClick={props.onClose}>Cancelar</Button>
          <Button variant="primary" icon="camera" onClick={capture} disabled={!ready}>Tirar foto</Button>
        </div>
      </div>
    </div>
  );
}

/** Primeira vez após o login: escolher o apelido fixo. */
export function NicknameSetup(props: { user: AuthUser; onUser: (u: AuthUser) => void; onLogout: () => void }) {
  const [nick, setNick] = useState(props.user.googleName.slice(0, NICK_MAX));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function save() {
    setBusy(true);
    setErr("");
    const r = await postJson("/api/profile/nickname", "POST", { nickname: nick });
    setBusy(false);
    if (r.ok && r.data && r.data.user) props.onUser(r.data.user);
    else setErr((r.data && r.data.error) || "Não foi possível salvar");
  }
  return (
    <Panel pad="lg" tone="raised" className="bf-anim-scale-in" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <DsAvatar src={props.user.picture} name={props.user.googleName} size={72} ring="accent" />
      </div>
      <div className="bf-h2" style={{ textAlign: "center" }}>Escolha seu nome no jogo</div>
      <p className="bf-body-sm" style={{ color: "var(--bf-text-2)", textAlign: "center" }}>É assim que os outros jogadores vão te ver. Depois de escolher, você só pode trocar a cada 30 dias.</p>
      <Input value={nick} maxLength={NICK_MAX} onChange={(e) => setNick(e.target.value.replace(/\s+/g, " ").replace(/^\s+/, ""))} placeholder="Seu nome no jogo" style={{ textAlign: "center", fontSize: 18, fontWeight: 700 }} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} invalid={!!err} />
      {err ? <div className="bf-field__error" style={{ textAlign: "center" }}>{err}</div> : null}
      <Button variant="primary" size="lg" block loading={busy} onClick={() => void save()}>Confirmar nome</Button>
      <Button variant="ghost" onClick={props.onLogout}>Sair</Button>
    </Panel>
  );
}

/** Tela de perfil completa. */
export default function ProfileScreen(props: { user: AuthUser; onUser: (u: AuthUser) => void; onBack: () => void; onLogout: () => void }) {
  const u = props.user;
  const prog = useProgressOptional();
  const toast = useToast();
  const [nick, setNick] = useState(u.nickname || "");
  const [nickBusy, setNickBusy] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [camera, setCamera] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const waitMs = u.nextNicknameChangeAt ? u.nextNicknameChangeAt - now : 0;
  const nickLocked = waitMs > 0;

  const p = prog?.progress || null;
  const level = p ? p.level : 1;
  const lf = levelFromXp(p ? p.xp : 0);
  const tier = tierForLevel(level);
  const nt = nextTier(level);
  const deck = p ? DECK_BY_ID[p.decks.equipped] : undefined;
  const clan = p && p.clanId ? OFFICIAL_CLAN_BY_ID[p.clanId] : null;
  const achDone = p ? Object.values(p.missions.achievements).filter((a) => a.done).length : 0;
  const stats = p ? p.stats : {};
  const winRate = p && p.matches ? Math.round((p.wins / p.matches) * 100) : 0;

  async function saveNick() {
    setNickBusy(true);
    setNickMsg(null);
    const r = await postJson("/api/profile/nickname", "POST", { nickname: nick });
    setNickBusy(false);
    if (r.data && r.data.user) props.onUser(r.data.user);
    if (r.ok) {
      setNickMsg({ ok: true, text: "Nome atualizado!" });
      toast.show({ text: "Nome atualizado!", tone: "success", icon: "check" });
    } else setNickMsg({ ok: false, text: (r.data && r.data.error) || "Não foi possível salvar" });
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setPhotoErr("");
    try {
      setPreview(await fileToSquareJpeg(f));
    } catch (er) {
      setPhotoErr(er instanceof Error ? er.message : "Não foi possível abrir essa imagem");
    }
  }
  async function savePhoto() {
    if (!preview) return;
    setPhotoBusy(true);
    setPhotoErr("");
    const r = await postJson("/api/profile/avatar", "POST", { image: preview });
    setPhotoBusy(false);
    if (r.ok && r.data && r.data.user) {
      props.onUser(r.data.user);
      setPreview(null);
      toast.show({ text: "Foto salva!", tone: "success", icon: "check" });
    } else setPhotoErr((r.data && r.data.error) || "Não foi possível salvar a foto");
  }
  async function resetPhoto() {
    setPhotoBusy(true);
    setPhotoErr("");
    const r = await postJson("/api/profile/avatar", "DELETE");
    setPhotoBusy(false);
    if (r.ok && r.data && r.data.user) props.onUser(r.data.user);
    else setPhotoErr((r.data && r.data.error) || "Não foi possível remover a foto");
  }

  const statRows: { label: string; value: number | string; icon: React.ComponentProps<typeof Icon>["name"] }[] = [
    { label: "Partidas", value: p ? p.matches : 0, icon: "cards" },
    { label: "Vitórias", value: p ? p.wins : 0, icon: "trophy" },
    { label: "Aproveitamento", value: `${winRate}%`, icon: "target" },
    { label: "Melhor sequência", value: p ? p.bestStreak : 0, icon: "fire" },
    { label: "Vazas com corte", value: stats.trump_tricks || 0, icon: "sword" },
    { label: "Capotes", value: stats.capotes || 0, icon: "bolt" },
    { label: "Réles", value: stats.reles || 0, icon: "spark" },
    { label: "Com amigos", value: stats.played_friends || 0, icon: "people" },
  ];

  return (
    <div className="bf-screen bf-section">
      <header className="bf-topbar">
        <Button variant="ghost" size="sm" icon="arrow-left" iconOnly aria-label="Voltar" onClick={props.onBack} />
        <div className="bf-topbar__title">Meu perfil</div>
        <Button variant="secondary" size="sm" icon="gear" onClick={() => setEditOpen(true)}>Editar</Button>
      </header>
      <main className="bf-container bf-section__body">
        <div className="bf-stack bf-stack--lg">
          {/* cabeçalho */}
          <Panel pad="lg" tone="raised" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <FramedAvatar src={preview || u.picture} name={u.name} size={112} frame={tier.frame} />
            <div>
              <div className="bf-title"><TierName name={u.name} level={level} /></div>
              <div className="bf-caption" style={{ color: tier.nameColor, fontWeight: 700 }}>{tier.title}</div>
            </div>
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
              <LevelBadge level={level} size="lg" />
              <div style={{ flex: 1 }}>
                <div className="bf-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="bf-label" style={{ color: "var(--bf-accent-3)" }}>Nível {level}</span>
                  <span className="bf-caption bf-num">{lf.into} / {lf.need} XP</span>
                </div>
                <ProgressBar value={lf.into} max={lf.need || 1} shine />
                {nt ? <div className="bf-caption" style={{ marginTop: 4 }}>Próxima faixa: <b style={{ color: nt.nameColor }}>{nt.name}</b> no nível {nt.minLevel}</div> : null}
              </div>
            </div>
            <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {clan ? <Chip tone="accent" icon="shield">{clan.short}</Chip> : <Chip icon="shield">Sem clã</Chip>}
              <Chip tone="gold" icon="medal">{achDone} conquistas</Chip>
            </div>
          </Panel>

          {/* estatísticas */}
          <div>
            <div className="bf-label" style={{ marginBottom: 8 }}>Estatísticas</div>
            <div className="bf-grid-2" style={{ gap: 8 }}>
              {statRows.map((s) => (
                <Panel key={s.label} pad="none" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bf-accent-soft)", color: "var(--bf-accent-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
                  <span style={{ minWidth: 0 }}>
                    <div className="bf-h3 bf-num" style={{ lineHeight: 1.1 }}>{s.value}</div>
                    <div className="bf-caption">{s.label}</div>
                  </span>
                </Panel>
              ))}
            </div>
          </div>

          {/* baralho equipado */}
          {deck ? (
            <Panel style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="bf-row" style={{ gap: 4 }}>
                <PlayingCard back size="sm" deck={deck} />
                <PlayingCard card={{ s: "copas", v: "A" }} size="sm" deck={deck} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bf-label">Baralho em uso</div>
                <div className="bf-h3">{deck.name}</div>
                <div className="bf-caption">{p ? p.decks.unlocked.length : 1} baralhos desbloqueados</div>
              </div>
            </Panel>
          ) : null}

          {/* faixas */}
          <div>
            <div className="bf-label" style={{ marginBottom: 8 }}>Faixas de nível</div>
            <div className="bf-stack" style={{ gap: 6 }}>
              {TIERS.map((t) => {
                const reached = level >= t.minLevel;
                return (
                  <Panel key={t.id} pad="none" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, opacity: reached ? 1 : 0.55, borderColor: t.id === tier.id ? t.nameColor + "88" : undefined }}>
                    <span className={`bf-frame bf-frame--${t.frame}`} style={{ width: 28, height: 28 }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bf-bg-2)" }} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontFamily: "var(--bf-font-display)", color: t.nameColor, fontSize: 14 }}>{t.name} <span className="bf-caption">· nível {t.minLevel}+</span></div>
                      <div className="bf-caption">{t.description}</div>
                    </span>
                    {reached ? <Icon name="check" size={18} style={{ color: "var(--bf-success)" }} /> : <Icon name="lock" size={16} style={{ color: "var(--bf-text-4)" }} />}
                  </Panel>
                );
              })}
            </div>
          </div>

          {/* conquistas recentes */}
          <div>
            <div className="bf-label" style={{ marginBottom: 8 }}>Conquistas</div>
            <div className="bf-row" style={{ gap: 6, flexWrap: "wrap" }}>
              {ACHIEVEMENTS.filter((a) => p && p.missions.achievements[a.id]?.done).slice(0, 12).map((a) => (
                <Chip key={a.id} tone="gold" icon={a.icon} size="sm">{a.title}</Chip>
              ))}
              {achDone === 0 ? <span className="bf-caption">Nenhuma ainda. Jogue uma partida para começar.</span> : null}
            </div>
          </div>

          <div className="bf-caption" style={{ textAlign: "center" }}>
            Conta Google: {u.email} · <a href="/privacidade" style={{ color: "var(--bf-info)" }}>Privacidade</a>
          </div>
          <Button variant="outline-danger" block icon="logout" onClick={() => setLogoutOpen(true)}>Sair da conta</Button>
        </div>
      </main>

      {/* editar foto e nome */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setPreview(null); }} title="Editar perfil">
        <div className="bf-stack bf-stack--lg">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <DsAvatar src={preview || u.picture} name={u.name} size={110} ring="accent" />
            {preview ? (
              <div className="bf-row">
                <Button variant="secondary" onClick={() => setPreview(null)} disabled={photoBusy}>Cancelar</Button>
                <Button variant="primary" loading={photoBusy} onClick={() => void savePhoto()}>Salvar foto</Button>
              </div>
            ) : (
              <div className="bf-row" style={{ flexWrap: "wrap", justifyContent: "center" }}>
                <Button variant="secondary" size="sm" icon="camera" onClick={() => setCamera(true)}>Tirar foto</Button>
                <Button variant="secondary" size="sm" icon="image" onClick={() => galleryRef.current && galleryRef.current.click()}>Escolher imagem</Button>
                {u.hasCustomAvatar ? <Button variant="ghost" size="sm" loading={photoBusy} onClick={() => void resetPhoto()}>Usar foto do Google</Button> : null}
              </div>
            )}
            {photoErr ? <div className="bf-field__error">{photoErr}</div> : null}
            <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void onFile(e)} />
            <input ref={captureRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={(e) => void onFile(e)} />
          </div>
          <div className="bf-field">
            <label className="bf-label" htmlFor="pf-nick">Nome no jogo</label>
            <Input id="pf-nick" value={nick} maxLength={NICK_MAX} disabled={nickLocked} onChange={(e) => { setNick(e.target.value.replace(/\s+/g, " ").replace(/^\s+/, "")); setNickMsg(null); }} />
            {nickLocked ? (
              <div className="bf-field__hint" style={{ color: "var(--bf-warning)" }}>Você poderá trocar o nome em {formatWait(waitMs)}.</div>
            ) : (
              <>
                <div className="bf-field__hint">Depois de trocar, só poderá mudar de novo em 30 dias.</div>
                <Button variant="accent" loading={nickBusy} disabled={nick.trim() === (u.nickname || "")} onClick={() => void saveNick()}>Salvar nome</Button>
              </>
            )}
            {nickMsg ? <div className={nickMsg.ok ? "bf-field__hint" : "bf-field__error"} style={nickMsg.ok ? { color: "var(--bf-success)" } : undefined}>{nickMsg.text}</div> : null}
          </div>
        </div>
      </Modal>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} center title="Sair da conta?" actions={<><Button variant="secondary" onClick={() => setLogoutOpen(false)}>Ficar</Button><Button variant="danger" icon="logout" onClick={props.onLogout}>Sair</Button></>}>
        Seu progresso fica guardado na conta. Você volta a vê-lo ao entrar de novo.
      </Modal>

      {camera ? (
        <CameraModal
          onClose={() => setCamera(false)}
          onCapture={(d) => {
            setCamera(false);
            setPreview(d);
            setEditOpen(true);
          }}
          onUnavailable={() => {
            setCamera(false);
            setPhotoErr('Não foi possível abrir a câmera. Use "Escolher imagem" (no celular dá para escolher Câmera).');
            if (captureRef.current) captureRef.current.click();
          }}
        />
      ) : null}
    </div>
  );
}
