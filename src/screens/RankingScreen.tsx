"use client";
/**
 * Tabela de Atributos — Bisca 25 (ranking oficial). Dados fixos em src/data/tabela-atributos.json.
 * Celular: lista (posição, nome, clube, OVR); tocar abre a carta de jogador estilo Ultimate Team.
 * Notebook: tabela completa com os 7 atributos.
 */
import { useMemo, useState } from "react";
import { ATTRIBUTE_ICONS, Chip, ClanEmblem, Icon, Modal, Panel, rarityFromOvr, type IconName, type Rarity } from "@/design";
import tabela from "@/data/tabela-atributos.json";
import { CLAN_ID_BY_TABLE_NAME, OFFICIAL_CLAN_BY_ID } from "@/data/clans";
import { SectionShell } from "./common";

type Attr = { key: string; nome: string };
type Row = { nome: string; clube: string; ovr: number; contaUid: string | null } & Record<string, unknown>;

const ATTRS = tabela.atributos as Attr[];
const ROWS = tabela.jogadores as Row[];

/** Posição com empates (1, 1, 3, …). */
function positions(rows: Row[]): number[] {
  const sorted = rows.slice().sort((a, b) => b.ovr - a.ovr);
  const pos: number[] = [];
  sorted.forEach((r, i) => {
    pos.push(i > 0 && sorted[i - 1].ovr === r.ovr ? pos[i - 1] : i + 1);
  });
  return pos;
}

export function RankingScreen(props: { onBack: () => void }) {
  const [sel, setSel] = useState<Row | null>(null);
  const rows = useMemo(() => ROWS.slice().sort((a, b) => b.ovr - a.ovr), []);
  const pos = useMemo(() => positions(rows), [rows]);

  return (
    <SectionShell title="Tabela de Atributos" icon="trophy" onBack={props.onBack} subtitle={tabela.descricao} wide>
      <div className="bf-stack bf-stack--lg">
        <div className="bf-rank">
          <div className="bf-rank__head">
            <span style={{ width: 28 }}>#</span>
            <span style={{ flex: 1 }}>Jogador</span>
            <span style={{ display: "flex", gap: 6 }}>
              {ATTRS.map((a) => (
                <span key={a.key} style={{ width: 36, textAlign: "center" }}>{a.key}</span>
              ))}
            </span>
            <span style={{ minWidth: 34, textAlign: "right" }}>OVR</span>
          </div>
          {rows.map((r, i) => {
            const p = pos[i];
            const clanId = CLAN_ID_BY_TABLE_NAME[r.clube];
            const clan = clanId ? OFFICIAL_CLAN_BY_ID[clanId] : null;
            const rar = rarityFromOvr(r.ovr);
            return (
              <div key={r.nome} className={`bf-panel bf-panel--interactive bf-rankrow bf-rankrow--${p <= 3 ? p : "n"}`} role="button" tabIndex={0} onClick={() => setSel(r)} onKeyDown={(e) => { if (e.key === "Enter") setSel(r); }}>
                <span className="bf-rankrow__pos">{p}</span>
                {clan ? <ClanEmblem kind={clan.emblem} color={clan.color} color2={clan.color2} fg={clan.fg} logo={clan.logo} size={34} /> : <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={18} style={{ color: "var(--bf-text-4)" }} /></span>}
                <span className="bf-rankrow__name">
                  <span style={{ fontFamily: "var(--bf-font-display)", fontWeight: 800, fontSize: 15 }}>{r.nome}</span>
                  <span className="bf-rankrow__club">{clan ? clan.short : r.clube}</span>
                </span>
                <span className="bf-rankrow__attrs">
                  {ATTRS.map((a) => (
                    <span key={a.key} className="bf-rankrow__attr">{String(r[a.key])}</span>
                  ))}
                </span>
                <span className={`bf-rankrow__ovr bf-rar--${rar}`} style={{ color: "var(--rar-2)" }}>{r.ovr}</span>
              </div>
            );
          })}
        </div>

        <Panel>
          <div className="bf-label" style={{ marginBottom: 10 }}>Legenda dos atributos</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {ATTRS.map((a) => (
              <div key={a.key} className="bf-row" style={{ gap: 8, fontSize: 13 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--bf-accent-soft)", color: "var(--bf-accent-3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={ATTRIBUTE_ICONS[a.key as keyof typeof ATTRIBUTE_ICONS] as IconName} size={16} />
                </span>
                <span><b>{a.key}</b> <span className="bf-muted">{a.nome}</span></span>
              </div>
            ))}
          </div>
          <div className="bf-row" style={{ gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {(["special", "gold", "silver", "bronze"] as Rarity[]).map((r) => (
              <Chip key={r} size="sm" rarity={r}>{r === "special" ? "90+ Especial" : r === "gold" ? "80–89 Ouro" : r === "silver" ? "70–79 Prata" : "< 70 Bronze"}</Chip>
            ))}
          </div>
          <p className="bf-caption" style={{ marginTop: 10 }}>OVR = média dos 7 atributos, arredondada. Empates dividem a posição.</p>
        </Panel>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} center hideClose>
        {sel ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <PlayerCard row={sel} position={pos[rows.indexOf(sel)]} />
            <button type="button" className="bf-btn bf-btn--secondary" onClick={() => setSel(null)}>Fechar</button>
          </div>
        ) : null}
      </Modal>
    </SectionShell>
  );
}

/** Carta de jogador estilo Ultimate Team com animação de revelação. */
export function PlayerCard(props: { row: Row; position: number }) {
  const r = props.row;
  const rar = rarityFromOvr(r.ovr);
  const clanId = CLAN_ID_BY_TABLE_NAME[r.clube];
  const clan = clanId ? OFFICIAL_CLAN_BY_ID[clanId] : null;
  return (
    <div className="bf-pcard-wrap">
      <div className={`bf-pcard bf-pcard--${rar}`}>
        <div className="bf-pcard__shine" />
        <div className="bf-pcard__top">
          <div className="bf-pcard__ovr">{r.ovr}</div>
          <div className="bf-pcard__pos">{props.position}º</div>
        </div>
        <div className="bf-pcard__emblem">
          {clan ? <ClanEmblem kind={clan.emblem} color={clan.color} color2={clan.color2} fg={clan.fg} logo={clan.logo} size={44} /> : <Icon name="user" size={28} style={{ opacity: 0.6 }} />}
        </div>
        <div className="bf-pcard__avatar">{r.nome.charAt(0)}</div>
        <div className="bf-pcard__name">{r.nome}</div>
        <div className="bf-pcard__club">{clan ? clan.short : r.clube}</div>
        <div className="bf-pcard__stats">
          {ATTRS.map((a) => (
            <span key={a.key} className="bf-pcard__stat">
              <Icon name={ATTRIBUTE_ICONS[a.key as keyof typeof ATTRIBUTE_ICONS] as IconName} />
              <small>{a.key}</small> {String(r[a.key])}
            </span>
          ))}
          <span className="bf-pcard__stat" style={{ gridColumn: "span 1" }} />
        </div>
      </div>
    </div>
  );
}
