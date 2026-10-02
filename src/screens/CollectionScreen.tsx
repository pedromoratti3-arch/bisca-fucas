"use client";
/**
 * Coleção de baralhos: todos os baralhos por raridade; desbloqueados em destaque, bloqueados com cadeado
 * e o requisito. Tocar em um desbloqueado = equipar (salvo na conta). Baralhos novos abrem com animação de pacote.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Icon, Modal, PlayingCard, Segmented, SuitGlyph } from "@/design";
import { DECKS, DECK_BY_ID, RARITY_INFO, unlockLabel, type DeckDef, type DeckRarity } from "@/data/decks";
import { OFFICIAL_CLAN_BY_ID } from "@/data/clans";
import { useProgress } from "@/lib/progress/useProgress";
import { SectionShell } from "./common";

const RARITIES: DeckRarity[] = ["comum", "raro", "epico", "lendario"];

export function CollectionScreen(props: { onBack: () => void }) {
  const prog = useProgress();
  const p = prog.progress;
  const [filter, setFilter] = useState<"all" | DeckRarity>("all");
  const [preview, setPreview] = useState<DeckDef | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<string[]>([]);

  // baralhos novos (ainda não vistos) → animação de pacote, um por vez
  useEffect(() => {
    if (p && p.decks.unseen.length && unlockQueue.length === 0) setUnlockQueue(p.decks.unseen.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.decks.unseen.join(",")]);

  const unlocked = useMemo(() => new Set(p ? p.decks.unlocked : ["classico"]), [p]);
  const equipped = p ? p.decks.equipped : "classico";
  const list = DECKS.filter((d) => filter === "all" || d.rarity === filter);
  const counts = RARITIES.map((r) => ({ r, have: DECKS.filter((d) => d.rarity === r && unlocked.has(d.id)).length, total: DECKS.filter((d) => d.rarity === r).length }));

  return (
    <SectionShell
      title="Coleção"
      icon="deck"
      onBack={props.onBack}
      right={<Chip size="sm" tone="gold" icon="deck">{unlocked.size}/{DECKS.length}</Chip>}
      wide
    >
      <div className="bf-stack bf-stack--lg">
        <Segmented
          block
          value={filter}
          onChange={setFilter}
          options={[{ value: "all", label: "Todos" }, ...RARITIES.map((r) => ({ value: r, label: <span style={{ color: filter === r ? undefined : RARITY_INFO[r].color }}>{RARITY_INFO[r].label}</span> }))]}
        />
        <div className="bf-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {counts.map((c) => (
            <Chip key={c.r} size="sm" style={{ color: RARITY_INFO[c.r].color2, borderColor: RARITY_INFO[c.r].color + "66", background: RARITY_INFO[c.r].color + "1f" }}>
              {RARITY_INFO[c.r].label} {c.have}/{c.total}
            </Chip>
          ))}
        </div>
        <div className="bf-deckgrid">
          {list.map((d) => {
            const has = unlocked.has(d.id);
            const isEq = equipped === d.id;
            const isNew = p ? p.decks.unseen.includes(d.id) : false;
            const cls = ["bf-panel bf-deckcard", has ? "" : "bf-deckcard--locked", isEq ? "bf-deckcard--equipped" : "", isNew ? "bf-deckcard--new" : ""].filter(Boolean).join(" ");
            return (
              <div key={d.id} className={cls} role="button" tabIndex={0} onClick={() => setPreview(d)} onKeyDown={(e) => { if (e.key === "Enter") setPreview(d); }} style={{ borderColor: RARITY_INFO[d.rarity].color + "55" }}>
                <div className="bf-deckcard__cards">
                  <PlayingCard back size="sm" deck={d} />
                  <PlayingCard card={{ s: "copas", v: "A" }} size="sm" deck={d} />
                  <PlayingCard card={{ s: "espadas", v: "K" }} size="sm" deck={d} />
                </div>
                <div className="bf-deckcard__name">{d.name}</div>
                <div className="bf-deckcard__req" style={{ color: has ? RARITY_INFO[d.rarity].color : undefined }}>
                  {has ? (isEq ? "Em uso" : RARITY_INFO[d.rarity].label) : unlockLabel(d.unlock)}
                </div>
                {!has ? <span className="bf-deckcard__lock"><Icon name="lock" /></span> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhe / equipar */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? preview.name : ""}
        actions={
          preview && unlocked.has(preview.id) ? (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)}>Fechar</Button>
              <Button variant="primary" icon="check" disabled={equipped === preview.id} onClick={() => { void prog.equip(preview.id); setPreview(null); }}>
                {equipped === preview.id ? "Em uso" : "Usar este baralho"}
              </Button>
            </>
          ) : (
            <Button variant="secondary" block onClick={() => setPreview(null)}>Fechar</Button>
          )
        }
      >
        {preview ? (
          <div className="bf-stack" style={{ alignItems: "center", textAlign: "center" }}>
            <Chip size="sm" style={{ color: RARITY_INFO[preview.rarity].color2, borderColor: RARITY_INFO[preview.rarity].color + "88", background: RARITY_INFO[preview.rarity].color + "22" }}>{RARITY_INFO[preview.rarity].label}</Chip>
            <div className="bf-row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <PlayingCard back size="lg" deck={preview} />
              <PlayingCard card={{ s: "copas", v: "A" }} size="lg" deck={preview} />
              <PlayingCard card={{ s: "espadas", v: "7" }} size="lg" deck={preview} />
              <PlayingCard card={{ s: "ouros", v: "K" }} size="lg" deck={preview} />
            </div>
            <p className="bf-body-sm" style={{ color: "var(--bf-text-2)" }}>{preview.description}</p>
            {!unlocked.has(preview.id) ? (
              <Chip icon="lock" tone="warning">{unlockLabel(preview.unlock)}</Chip>
            ) : null}
            {preview.unlock.type === "clan" ? (
              <div className="bf-caption">Entre no clã {OFFICIAL_CLAN_BY_ID[preview.unlock.clanId]?.short} na tela Clã.</div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {unlockQueue.length ? (
        <DeckUnlockOverlay
          deck={DECK_BY_ID[unlockQueue[0]]}
          onDone={() => {
            const id = unlockQueue[0];
            void prog.markSeen([id]);
            setUnlockQueue((q) => q.slice(1));
          }}
        />
      ) : null}
    </SectionShell>
  );
}

/** Abertura de pacote: toque para abrir; a carta sai com brilho proporcional à raridade. */
export function DeckUnlockOverlay(props: { deck: DeckDef | undefined; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const d = props.deck;
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(props.onDone, d && (d.rarity === "lendario" || d.rarity === "epico") ? 3800 : 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!d) return null;
  const ri = RARITY_INFO[d.rarity];
  const sparks = d.rarity === "lendario" ? 26 : d.rarity === "epico" ? 18 : d.rarity === "raro" ? 10 : 6;
  return (
    <div className={["bf-unlock", open ? "is-open" : ""].join(" ")} style={{ ["--ray" as string]: ri.color + "26", ["--pk1" as string]: ri.color, ["--pk2" as string]: "#0b0b14", ["--pk3" as string]: ri.color2 }} onClick={() => setOpen(true)}>
      <div className="bf-unlock__rays" />
      <div className="bf-label" style={{ color: ri.color2 }}>Baralho novo · {ri.label}</div>
      <div className="bf-unlock__pack" role="button" aria-label="Abrir pacote">
        <div className="bf-unlock__packface">
          <SuitGlyph suit="espadas" size={44} tone="gold" />
          <span style={{ fontSize: 12 }}>BISCA FUCAS</span>
        </div>
        <div className="bf-unlock__card">
          <PlayingCard back size="xl" deck={d} glow={d.rarity === "lendario" ? "gold" : d.rarity === "epico" ? "accent" : "none"} />
        </div>
        <div className="bf-unlock__sparks">
          {Array.from({ length: sparks }).map((_, i) => {
            const a = (i / sparks) * Math.PI * 2;
            const r = 110 + (i % 3) * 40;
            return <span key={i} className="bf-unlock__spark" style={{ ["--dx" as string]: `${Math.cos(a) * r}px`, ["--dy" as string]: `${Math.sin(a) * r}px`, ["--sp" as string]: i % 2 ? ri.color2 : "#fff" }} />;
          })}
        </div>
      </div>
      <div className="bf-unlock__title">
        <div className="bf-title" style={{ color: ri.color2 }}>{d.name}</div>
        <div className="bf-caption" style={{ marginTop: 4 }}>{d.description}</div>
      </div>
      <div className="bf-unlock__hint">Toque para abrir</div>
    </div>
  );
}
