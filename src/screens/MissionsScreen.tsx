"use client";
/** Missões: diárias (renovam à meia-noite), semanais (segunda) e conquistas. Concluída → "Resgatar" dá o XP. */
import { useEffect, useState } from "react";
import { Button, Chip, Icon, Panel, ProgressBar, Segmented } from "@/design";
import { ACHIEVEMENTS, MISSION_BY_ID, type MissionDef } from "@/data/missions";
import { DECK_BY_ID } from "@/data/decks";
import { nextDayResetAt } from "@/data/progression";
import { achievementVisible } from "@/lib/progress/engine";
import type { MissionProgress } from "@/lib/progress/types";
import { useProgress } from "@/lib/progress/useProgress";
import { EmptyState, SectionShell } from "./common";

type Tab = "daily" | "weekly" | "achievements";

function fmtLeft(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function MissionsScreen(props: { onBack: () => void }) {
  const prog = useProgress();
  const [tab, setTab] = useState<Tab>("daily");
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const p = prog.progress;

  const dailyReset = nextDayResetAt(now) - now;

  async function claim(id: string) {
    setBusyId(id);
    await prog.claim(id);
    setBusyId(null);
  }

  function row(mp: MissionProgress) {
    const def = MISSION_BY_ID[mp.id];
    if (!def) return null;
    const deck = def.reward?.deckId ? DECK_BY_ID[def.reward.deckId] : null;
    const cls = ["bf-panel bf-mission", mp.done ? "bf-mission--done" : "", mp.claimed ? "bf-mission--claimed" : ""].filter(Boolean).join(" ");
    return (
      <div key={mp.id} className={cls}>
        <span className="bf-mission__icon"><Icon name={mp.claimed ? "check" : def.icon} /></span>
        <div className="bf-mission__body">
          <div className="bf-mission__title">
            {def.title}
            <Chip size="sm" tone="accent" icon="bolt">+{def.xp} XP</Chip>
            {deck ? <Chip size="sm" tone="gold" icon="deck">{deck.name}</Chip> : null}
          </div>
          <div className="bf-mission__desc">{def.description}</div>
          <div className="bf-row" style={{ gap: 8 }}>
            <ProgressBar value={mp.progress} max={def.target} size="sm" tone={mp.done ? "gold" : "accent"} style={{ flex: 1 }} label={`${mp.progress} de ${def.target}`} />
            <span className="bf-caption bf-num" style={{ minWidth: 44, textAlign: "right" }}>{Math.min(mp.progress, def.target)}/{def.target}</span>
          </div>
        </div>
        {mp.done && !mp.claimed ? (
          <Button variant="primary" size="sm" loading={busyId === mp.id} onClick={() => void claim(mp.id)}>Resgatar</Button>
        ) : mp.claimed ? (
          <Chip size="sm" tone="success" icon="check">Feito</Chip>
        ) : null}
      </div>
    );
  }

  const claimable = (list: MissionProgress[]) => list.filter((m) => m.done && !m.claimed).length;

  let body: React.ReactNode;
  if (!p) body = <EmptyState icon="target" title="Carregando missões…" />;
  else if (tab === "daily") {
    body = (
      <>
        <div className="bf-row" style={{ justifyContent: "space-between" }}>
          <span className="bf-caption">Renovam em <b className="bf-num">{fmtLeft(dailyReset)}</b></span>
          <Chip size="sm" icon="clock">3 por dia</Chip>
        </div>
        {p.missions.daily.map(row)}
      </>
    );
  } else if (tab === "weekly") {
    body = (
      <>
        <div className="bf-row" style={{ justifyContent: "space-between" }}>
          <span className="bf-caption">Renovam toda segunda-feira</span>
          <Chip size="sm" icon="clock">3 por semana</Chip>
        </div>
        {p.missions.weekly.map(row)}
      </>
    );
  } else {
    const visible = ACHIEVEMENTS.filter((m: MissionDef) => achievementVisible(p, m));
    const list = visible.map((m) => p.missions.achievements[m.id] || { id: m.id, progress: 0, done: false, claimed: false });
    list.sort((a, b) => Number(b.done && !b.claimed) - Number(a.done && !a.claimed) || Number(a.claimed) - Number(b.claimed));
    body = (
      <>
        <div className="bf-caption">Conquistas permanentes. Algumas têm etapas que aparecem depois da anterior.</div>
        {list.map(row)}
      </>
    );
  }

  const dC = p ? claimable(p.missions.daily) : 0;
  const wC = p ? claimable(p.missions.weekly) : 0;
  const aC = p ? claimable(Object.values(p.missions.achievements)) : 0;

  return (
    <SectionShell title="Missões" icon="target" onBack={props.onBack}>
      <div className="bf-stack">
        <Segmented
          block
          value={tab}
          onChange={setTab}
          options={[
            { value: "daily", label: <>Diárias{dC ? <span className="bf-badge-count" style={{ position: "static", marginLeft: 6 }}>{dC}</span> : null}</> },
            { value: "weekly", label: <>Semanais{wC ? <span className="bf-badge-count" style={{ position: "static", marginLeft: 6 }}>{wC}</span> : null}</> },
            { value: "achievements", label: <>Conquistas{aC ? <span className="bf-badge-count" style={{ position: "static", marginLeft: 6 }}>{aC}</span> : null}</> },
          ]}
        />
        {body}
        {prog.source === "local" ? (
          <Panel tone="accent" style={{ fontSize: 13, color: "var(--bf-text-2)" }}>
            Você está como convidado: o progresso fica só neste aparelho. Entre com Google na tela inicial para guardar tudo na sua conta.
          </Panel>
        ) : null}
      </div>
    </SectionShell>
  );
}
