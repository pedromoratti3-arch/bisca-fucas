"use client";
/** Clãs: oficiais em destaque, criados por jogadores abaixo. Entrar, sair, criar, ver membros e pontuação. */
import { useCallback, useEffect, useState } from "react";
import { Avatar, Button, Chip, ClanEmblem, Field, Icon, Input, Modal, Panel, useToast } from "@/design";
import { PLAYER_CLAN_COLORS, PLAYER_CLAN_EMBLEMS, type ClanEmblemKind } from "@/data/clans";
import { useProgress } from "@/lib/progress/useProgress";
import { normalizeProgress } from "@/lib/progress/engine";
import { EmptyState, SectionShell } from "./common";
import { PlayerProfileModal } from "./PlayerProfileModal";

type ClanSummary = { id: string; name: string; short: string; tag: string; emblem: ClanEmblemKind; color: string; color2: string; fg: string; official: boolean; score: number; memberCount: number; motto?: string; logo?: string; ownerUid: string | null };
type ClanFull = ClanSummary & { members: Record<string, { name: string; picture: string; joinedAt: number; level: number }> };

export function ClanScreen(props: { onBack: () => void }) {
  const prog = useProgress();
  const toast = useToast();
  const [clans, setClans] = useState<ClanSummary[] | null>(null);
  const [detail, setDetail] = useState<ClanFull | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", emblem: "shield" as ClanEmblemKind, color: PLAYER_CLAN_COLORS[2] });
  const [err, setErr] = useState("");
  const myClanId = prog.progress?.clanId || null;
  const logged = !!prog.loggedUid && prog.source === "server";

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/clans", { cache: "no-store" });
      const j = await r.json();
      setClans(Array.isArray(j.clans) ? j.clans : []);
    } catch {
      setClans([]);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function openDetail(id: string) {
    try {
      const r = await fetch(`/api/clans/${id}`, { cache: "no-store" });
      const j = await r.json();
      if (j.clan) setDetail(j.clan);
    } catch {
      /* ignore */
    }
  }

  async function join(id: string) {
    if (!logged) {
      toast.show({ text: "Entre com Google para participar de um clã", tone: "accent", icon: "info" });
      return;
    }
    setBusy(true);
    const r = await fetch(`/api/clans/${id}/join`, { method: "POST" });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (!r.ok) return toast.show({ text: (j && j.error) || "Não foi possível entrar", tone: "danger", icon: "x" });
    if (j.progress) prog.setProgress(normalizeProgress(j.progress, Date.now()));
    toast.show({ text: "Você entrou no clã!", tone: "success", icon: "shield" });
    setDetail(j.clan || null);
    void load();
  }

  async function leave() {
    setBusy(true);
    const r = await fetch(`/api/clans/${myClanId}/leave`, { method: "POST" });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (!r.ok) return toast.show({ text: (j && j.error) || "Não foi possível sair", tone: "danger", icon: "x" });
    if (j.progress) prog.setProgress(normalizeProgress(j.progress, Date.now()));
    setDetail(null);
    void load();
  }

  async function create() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/clans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (!r.ok) {
      setErr((j && j.error) || "Não foi possível criar");
      return;
    }
    if (j.progress) prog.setProgress(normalizeProgress(j.progress, Date.now()));
    setCreateOpen(false);
    toast.show({ text: "Clã criado!", tone: "success", icon: "shield" });
    void load();
  }

  const mine = clans?.find((c) => c.id === myClanId) || null;
  const officials = (clans || []).filter((c) => c.official);
  const players = (clans || []).filter((c) => !c.official);

  function card(c: ClanSummary) {
    const isMine = c.id === myClanId;
    return (
      <div key={c.id} className={["bf-panel bf-panel--interactive", c.official ? "bf-panel--gold" : ""].join(" ")} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderColor: isMine ? "var(--bf-accent)" : undefined }} role="button" tabIndex={0} onClick={() => void openDetail(c.id)} onKeyDown={(e) => { if (e.key === "Enter") void openDetail(c.id); }}>
        <ClanEmblem kind={c.emblem} color={c.color} color2={c.color2} fg={c.fg} logo={c.logo} size={50} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", rowGap: 4 }}>
            <span style={{ fontFamily: "var(--bf-font-display)", fontWeight: 800, fontSize: 15, minWidth: 0 }}>{c.short}</span>
            <Chip size="sm">{c.tag}</Chip>
            {c.official ? <Chip size="sm" tone="gold" icon="crown">Oficial</Chip> : null}
            {isMine ? <Chip size="sm" tone="accent" icon="check">Meu clã</Chip> : null}
          </div>
          <div className="bf-caption" style={{ marginTop: 3 }}>{c.memberCount} {c.memberCount === 1 ? "membro" : "membros"} · <b className="bf-num" style={{ color: "var(--bf-gold-2)" }}>{c.score}</b> pts</div>
        </div>
        <Icon name="chevron-right" size={20} style={{ color: "var(--bf-text-4)" }} />
      </div>
    );
  }

  return (
    <SectionShell title="Clãs" icon="shield" onBack={props.onBack} right={logged && !myClanId ? <Button variant="accent" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>Criar</Button> : null}>
      <div className="bf-stack bf-stack--lg">
        {!logged ? (
          <Panel tone="accent" style={{ fontSize: 13, color: "var(--bf-text-2)" }}>Para entrar ou criar um clã, entre com Google na tela inicial. Você pode ver os clãs mesmo assim.</Panel>
        ) : null}
        {mine ? (
          <div>
            <div className="bf-label" style={{ marginBottom: 8 }}>Meu clã</div>
            {card(mine)}
          </div>
        ) : null}
        <div>
          <div className="bf-label" style={{ marginBottom: 8 }}>Clubes oficiais</div>
          {clans === null ? <div className="bf-skeleton" style={{ height: 74 }} /> : <div className="bf-stack">{officials.map(card)}</div>}
        </div>
        <div>
          <div className="bf-label" style={{ marginBottom: 8 }}>Clãs dos jogadores</div>
          {clans === null ? null : players.length ? <div className="bf-stack">{players.map(card)}</div> : <EmptyState icon="shield" title="Nenhum clã criado ainda" text="Seja o primeiro: crie o seu e chame os amigos." action={logged && !myClanId ? <Button variant="accent" icon="plus" onClick={() => setCreateOpen(true)}>Criar clã</Button> : null} />}
        </div>
      </div>

      {/* Detalhe do clã */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.short : ""} wide>
        {detail ? (
          <div className="bf-stack">
            <div className="bf-row" style={{ gap: 14 }}>
              <ClanEmblem kind={detail.emblem} color={detail.color} color2={detail.color2} fg={detail.fg} logo={detail.logo} size={72} />
              <div style={{ flex: 1 }}>
                <div className="bf-h3">{detail.name}</div>
                {detail.motto ? <div className="bf-caption" style={{ fontStyle: "italic" }}>“{detail.motto}”</div> : null}
                <div className="bf-row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <Chip size="sm">{detail.tag}</Chip>
                  <Chip size="sm" icon="people">{Object.keys(detail.members).length} membros</Chip>
                  <Chip size="sm" tone="gold" icon="star">{detail.score} pts</Chip>
                </div>
              </div>
            </div>
            <div className="bf-label">Membros</div>
            {Object.keys(detail.members).length === 0 ? (
              <div className="bf-caption">Ainda sem membros. Seja o primeiro!</div>
            ) : (
              <div className="bf-stack" style={{ gap: 6 }}>
                {Object.entries(detail.members)
                  .sort((a, b) => b[1].level - a[1].level)
                  .map(([uid, m]) => (
                    <button key={uid} type="button" className="bf-row bf-memberrow" style={{ gap: 10, padding: "8px 8px", width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 12, color: "var(--bf-text)", cursor: "pointer" }} onClick={() => setProfileUid(uid)} aria-label={"Ver perfil de " + m.name}>
                      <Avatar src={`/api/avatar/${uid}`} name={m.name} size={32} />
                      <span style={{ flex: 1, fontWeight: 700 }}>{m.name}{detail.ownerUid === uid ? <Chip size="sm" tone="gold" style={{ marginLeft: 6 }}>Líder</Chip> : null}</span>
                      <Chip size="sm" tone="accent">Nível {m.level}</Chip>
                      <Icon name="chevron-right" size={16} style={{ color: "var(--bf-text-4)" }} />
                    </button>
                  ))}
              </div>
            )}
            <div className="bf-modal__actions" style={{ marginTop: 6 }}>
              {myClanId === detail.id ? (
                <Button variant="outline-danger" loading={busy} onClick={() => void leave()}>Sair do clã</Button>
              ) : (
                <Button variant="primary" icon="shield" loading={busy} disabled={!!myClanId} onClick={() => void join(detail.id)}>
                  {myClanId ? "Saia do seu clã para entrar" : "Entrar neste clã"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <PlayerProfileModal uid={profileUid} onClose={() => setProfileUid(null)} clanName={detail ? detail.short : undefined} />

      {/* Criar clã */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Criar clã"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={busy} onClick={() => void create()}>Criar</Button>
          </>
        }
      >
        <div className="bf-stack">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ClanEmblem kind={form.emblem} color={form.color} color2={form.color === "#f4f1ea" ? "#9ca3af" : "#0a0a12"} fg={form.color === "#f4f1ea" ? "#15161c" : "#fff"} size={72} />
          </div>
          <Field label="Nome" htmlFor="clan-name" error={err || undefined}>
            <Input id="clan-name" value={form.name} maxLength={24} placeholder="Ex.: Os Encartados" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Tag (2–4 letras)" htmlFor="clan-tag">
            <Input id="clan-tag" code value={form.tag} maxLength={4} placeholder="ENC" onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
          </Field>
          <Field label="Emblema">
            <div className="bf-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {PLAYER_CLAN_EMBLEMS.map((k) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, emblem: k })} style={{ padding: 4, borderRadius: 12, border: `2px solid ${form.emblem === k ? "var(--bf-accent-2)" : "transparent"}`, background: "transparent", cursor: "pointer" }} aria-label={k}>
                  <ClanEmblem kind={k} color={form.color} color2="#0a0a12" fg={form.color === "#f4f1ea" ? "#15161c" : "#fff"} size={40} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Cor">
            <div className="bf-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {PLAYER_CLAN_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} aria-label={c} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: `3px solid ${form.color === c ? "#fff" : "transparent"}`, boxShadow: "0 0 0 1px rgba(0,0,0,.5)", cursor: "pointer" }} />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </SectionShell>
  );
}
