"use client";
/**
 * Perfil público de outro jogador (abre ao tocar no nome em clãs, sala de espera e mesa).
 * Busca /api/player/{uid} e mostra foto com moldura da faixa, nome, título, nível/XP, clã,
 * estatísticas, baralho em uso e conquistas.
 */
import { useEffect, useState } from "react";
import { Button, Chip, ClanEmblem, Icon, LevelBadge, Modal, Panel, PlayingCard, ProgressBar } from "@/design";
import { OFFICIAL_CLAN_BY_ID } from "@/data/clans";
import { DECK_BY_ID } from "@/data/decks";
import { ACHIEVEMENTS } from "@/data/missions";
import { tierForLevel } from "@/data/progression";
import { FramedAvatar, TierName } from "./common";

export type PublicPlayer = {
  uid: string;
  name: string;
  picture: string;
  level: number;
  tier: string;
  xpInto: number;
  xpNeed: number;
  clanId: string | null;
  matches: number;
  wins: number;
  bestStreak: number;
  stats: { trump_tricks: number; capotes: number; reles: number; played_friends: number };
  equippedDeck: string;
  decksUnlocked: number;
  achievements: string[];
  since: number;
};

const cache = new Map<string, PublicPlayer>();

export function PlayerProfileModal(props: { uid: string | null; onClose: () => void; clanName?: string }) {
  const [data, setData] = useState<PublicPlayer | null>(null);
  const [err, setErr] = useState("");
  const uid = props.uid;

  useEffect(() => {
    if (!uid) return;
    setErr("");
    const cached = cache.get(uid);
    if (cached) {
      setData(cached);
      return;
    }
    setData(null);
    let alive = true;
    fetch(`/api/player/${uid}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falhou"))))
      .then((j: PublicPlayer) => {
        if (!alive) return;
        cache.set(uid, j);
        setData(j);
      })
      .catch(() => alive && setErr("Não foi possível carregar o perfil."));
    return () => {
      alive = false;
    };
  }, [uid]);

  const tier = data ? tierForLevel(data.level) : null;
  const clan = data && data.clanId ? OFFICIAL_CLAN_BY_ID[data.clanId] : null;
  const deck = data ? DECK_BY_ID[data.equippedDeck] : null;
  const winRate = data && data.matches ? Math.round((data.wins / data.matches) * 100) : 0;
  const ach = data ? ACHIEVEMENTS.filter((a) => data.achievements.includes(a.id)) : [];

  return (
    <Modal open={!!uid} onClose={props.onClose} title="Perfil do jogador">
      {!data && !err ? (
        <div className="bf-stack" style={{ alignItems: "center", padding: 16 }}>
          <div className="bf-skeleton" style={{ width: 96, height: 96, borderRadius: "50%" }} />
          <div className="bf-skeleton" style={{ width: 160, height: 18 }} />
          <div className="bf-skeleton" style={{ width: "100%", height: 10 }} />
        </div>
      ) : err ? (
        <div className="bf-caption" style={{ textAlign: "center", padding: 16 }}>{err}</div>
      ) : data && tier ? (
        <div className="bf-stack">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
            <FramedAvatar src={data.picture} name={data.name} size={96} frame={tier.frame} />
            <div className="bf-title"><TierName name={data.name} level={data.level} /></div>
            <div className="bf-caption" style={{ color: tier.nameColor, fontWeight: 700 }}>{tier.title}</div>
            <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {clan ? (
                <Chip tone="accent" icon="shield">
                  <ClanEmblem kind={clan.emblem} color={clan.color} color2={clan.color2} fg={clan.fg} logo={clan.logo} size={14} /> {clan.short}
                </Chip>
              ) : props.clanName ? <Chip icon="shield">{props.clanName}</Chip> : <Chip icon="shield">Sem clã</Chip>}
              <Chip tone="gold" icon="medal">{data.achievements.length} conquistas</Chip>
            </div>
          </div>

          <div className="bf-row" style={{ gap: 10 }}>
            <LevelBadge level={data.level} />
            <div style={{ flex: 1 }}>
              <div className="bf-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                <span className="bf-label" style={{ color: "var(--bf-accent-3)" }}>Nível {data.level}</span>
                <span className="bf-caption bf-num">{data.xpInto} / {data.xpNeed} XP</span>
              </div>
              <ProgressBar value={data.xpInto} max={data.xpNeed || 1} />
            </div>
          </div>

          <div className="bf-grid-2" style={{ gap: 8 }}>
            {[
              { l: "Partidas", v: data.matches, i: "cards" as const },
              { l: "Vitórias", v: data.wins, i: "trophy" as const },
              { l: "Aproveitamento", v: `${winRate}%`, i: "target" as const },
              { l: "Melhor sequência", v: data.bestStreak, i: "fire" as const },
              { l: "Vazas com corte", v: data.stats.trump_tricks, i: "sword" as const },
              { l: "Capotes", v: data.stats.capotes, i: "bolt" as const },
            ].map((s) => (
              <Panel key={s.l} pad="none" tone="solid" style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bf-accent-soft)", color: "var(--bf-accent-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={s.i} size={14} /></span>
                <span style={{ minWidth: 0 }}>
                  <div className="bf-h3 bf-num" style={{ fontSize: 15, lineHeight: 1.1 }}>{s.v}</div>
                  <div className="bf-caption" style={{ fontSize: 11 }}>{s.l}</div>
                </span>
              </Panel>
            ))}
          </div>

          {deck ? (
            <Panel tone="solid" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="bf-row" style={{ gap: 4 }}>
                <PlayingCard back size="sm" deck={deck} />
                <PlayingCard card={{ s: "copas", v: "A" }} size="sm" deck={deck} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bf-label">Baralho em uso</div>
                <div className="bf-h3" style={{ fontSize: 14 }}>{deck.name}</div>
                <div className="bf-caption">{data.decksUnlocked} baralhos desbloqueados</div>
              </div>
            </Panel>
          ) : null}

          {ach.length ? (
            <div>
              <div className="bf-label" style={{ marginBottom: 6 }}>Conquistas</div>
              <div className="bf-row" style={{ gap: 6, flexWrap: "wrap" }}>
                {ach.slice(0, 10).map((a) => (
                  <Chip key={a.id} tone="gold" icon={a.icon} size="sm">{a.title}</Chip>
                ))}
                {ach.length > 10 ? <Chip size="sm">+{ach.length - 10}</Chip> : null}
              </div>
            </div>
          ) : null}

          <Button variant="secondary" block onClick={props.onClose}>Fechar</Button>
        </div>
      ) : null}
    </Modal>
  );
}
