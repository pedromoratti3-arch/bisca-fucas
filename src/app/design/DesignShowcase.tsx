"use client";
/**
 * Página /design — vitrine viva do design system. Serve para conferir cores, tipografia,
 * botões em todos os estados, cards, modais, ícones, barra de XP, cartas e animações.
 * Não aparece em nenhum menu do jogo.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { DECKS, RARITY_INFO, unlockLabel, type DeckDef } from "@/data/decks";
import { ResultScreen } from "@/screens/ResultScreen";
import { DeckUnlockOverlay } from "@/screens/CollectionScreen";
import {
  Avatar, BottomNav, Button, Chip, Divider, Field, FlipCard, ICON_NAMES, Icon, Input, LevelBadge, LoadingOverlay, Modal, Panel, PlayingCard, ProgressBar,
  RARITY_LABEL, Segmented, SuitBackdrop, SuitLoader, ToastProvider, XpBar, rarityFromOvr, useReducedMotion, useToast, type Rarity,
} from "@/design";

const COLORS: { name: string; v: string; text?: string }[] = [
  { name: "bg-0", v: "var(--bf-bg-0)" },
  { name: "bg-1", v: "var(--bf-bg-1)" },
  { name: "bg-2", v: "var(--bf-bg-2)" },
  { name: "bg-3", v: "var(--bf-bg-3)" },
  { name: "accent", v: "var(--bf-accent)" },
  { name: "accent-2", v: "var(--bf-accent-2)" },
  { name: "accent-deep", v: "var(--bf-accent-deep)" },
  { name: "gold", v: "var(--bf-gold)", text: "#231a05" },
  { name: "gold-2", v: "var(--bf-gold-2)", text: "#231a05" },
  { name: "gold-3", v: "var(--bf-gold-3)" },
  { name: "brand-red", v: "var(--bf-brand-red)" },
  { name: "success", v: "var(--bf-success)", text: "#052e16" },
  { name: "warning", v: "var(--bf-warning)", text: "#231a05" },
  { name: "danger", v: "var(--bf-danger)", text: "#2a0505" },
  { name: "info", v: "var(--bf-info)", text: "#0c1a3a" },
  { name: "team-a", v: "var(--bf-team-a)", text: "#052e16" },
  { name: "team-b", v: "var(--bf-team-b)", text: "#231a05" },
];

const RARITIES: Rarity[] = ["bronze", "silver", "gold", "special"];

const CLASSIC = DECKS[0];
const CARD_PROPOSALS: { title: string; font: string; hint: string; default?: boolean; deck: DeckDef }[] = [
  { title: "Clássico", font: "Cinzel", hint: "naipes contados como em baralho real, figuras com moldura", default: true, deck: CLASSIC },
  { title: "Moderno", font: "Outfit", hint: "número grande no centro com o naipe atrás; o mais legível em cartas pequenas", deck: { ...CLASSIC, id: "prop-moderno", front: { ...CLASSIC.front, font: "outfit", face: "index" } } },
  { title: "Minimal", font: "Inter", hint: "só o naipe no centro; limpo e elegante", deck: { ...CLASSIC, id: "prop-minimal", front: { ...CLASSIC.front, font: "inter", face: "minimal" } } },
];

function Section(props: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={props.id} style={{ scrollMarginTop: 72 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 className="bf-h2">{props.title}</h2>
        {props.hint ? <p className="bf-caption" style={{ marginTop: 4 }}>{props.hint}</p> : null}
      </div>
      {props.children}
    </section>
  );
}

function Showcase() {
  const toast = useToast();
  const reduced = useReducedMotion();
  const [modal, setModal] = useState<null | "sheet" | "center">(null);
  const [seg, setSeg] = useState<"drag" | "tap">("drag");
  const [nav, setNav] = useState<"home" | "missions" | "ranking" | "profile">("home");
  const [xp, setXp] = useState(320);
  const [flipped, setFlipped] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [code, setCode] = useState("");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [resultDemo, setResultDemo] = useState<{ won: boolean; level: number } | null>(null);
  const [unlockDemo, setUnlockDemo] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bf-screen bf-has-nav">
      <header className="bf-topbar">
        <Link href="/" className="bf-btn bf-btn--ghost bf-btn--sm bf-btn--icon" aria-label="Voltar ao jogo">
          <Icon name="arrow-left" />
        </Link>
        <div className="bf-topbar__title">Design System</div>
        <Chip tone="accent" icon="spark" size="sm">
          Fase 2
        </Chip>
      </header>

      <main className="bf-container bf-container--wide" style={{ display: "flex", flexDirection: "column", gap: 40, paddingTop: 8, paddingBottom: 40 }}>
        <div className="bf-anim-fade-up" style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <div className="bf-label" style={{ marginBottom: 8 }}>Guia visual</div>
          <h1 className="bf-hero">BISCA FUCAS</h1>
          <p className="bf-body" style={{ color: "var(--bf-text-2)", marginTop: 10, maxWidth: 520, marginInline: "auto" }}>
            Tudo que o jogo usa para parecer um só: cores, letras, espaços, botões, cards, modais, ícones e os tempos das animações.
            {reduced ? " Você está com “reduzir movimento” ligado: as animações ficam instantâneas." : ""}
          </p>
        </div>

        {/* Índice rápido */}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }} aria-label="Seções">
          {[
            ["cores", "Cores"], ["tipografia", "Tipografia"], ["espacos", "Espaços"], ["botoes", "Botões"], ["cards", "Cards"], ["inputs", "Inputs"],
            ["chips", "Chips e raridades"], ["xp", "XP e nível"], ["cartas", "Cartas"], ["baralhos", "Baralhos"], ["resultado", "Fim de partida"], ["modais", "Modais e avisos"], ["icones", "Ícones"], ["movimento", "Movimento"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="bf-chip" style={{ textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </nav>

        <Section id="cores" title="Cores" hint="Fundo escuro, roxo como destaque, dourado para o que é especial. Vermelho só na marca e em perigo.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
            {COLORS.map((c) => (
              <div key={c.name} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--bf-glass-border)" }}>
                <div style={{ height: 56, background: c.v, display: "flex", alignItems: "flex-end", padding: 6, color: c.text || "#fff", fontSize: 10, fontWeight: 700 }} />
                <div className="bf-caption" style={{ padding: "6px 8px", background: "var(--bf-bg-2)", fontFamily: "var(--bf-font-mono)", fontSize: 11 }}>
                  --bf-{c.name}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 14 }}>
            {RARITIES.map((r) => (
              <div key={r} className={`bf-rar--${r} ${r === "special" ? "bf-holo" : ""}`} style={{ borderRadius: 14, padding: 14, background: r === "special" ? "var(--bf-rar-special-gradient)" : `linear-gradient(145deg, var(--rar-2), var(--rar) 55%, var(--rar-deep))`, color: r === "silver" || r === "gold" ? "#1a1408" : "#fff", textAlign: "center", fontFamily: "var(--bf-font-display)", fontWeight: 800 }}>
                <div style={{ fontSize: 28 }}>{r === "special" ? 93 : r === "gold" ? 85 : r === "silver" ? 74 : 67}</div>
                <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85 }}>{RARITY_LABEL[r]}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="tipografia" title="Tipografia" hint="Outfit para títulos, botões e números; Inter para textos. Tamanhos fixos para tudo parecer da mesma família.">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="bf-hero">Hero 34–48</div>
            <div className="bf-display">Display 26–34</div>
            <div className="bf-title">Título 22</div>
            <div className="bf-h2">Subtítulo 18</div>
            <div className="bf-h3">Seção 16</div>
            <div className="bf-body">Corpo 15. Quem tem o 7 de corte precisa jogá-lo antes do Ás. Esta é a regra da casa que mais confunde quem chega.</div>
            <div className="bf-body-sm" style={{ color: "var(--bf-text-2)" }}>Corpo pequeno 14, para listas e descrições secundárias.</div>
            <div className="bf-caption">Legenda 12, para dicas e horários.</div>
            <div className="bf-label">Rótulo em caixa alta 11</div>
            <div className="bf-display bf-num bf-gold-text">1.250 XP</div>
          </Panel>
        </Section>

        <Section id="espacos" title="Espaços e raios" hint="Tudo múltiplo de 4px. Alvo mínimo de toque: 44px. Margem lateral: 16px no celular, 24px no notebook.">
          <Panel style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
            {[4, 8, 12, 16, 20, 24, 32, 40, 48].map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <div style={{ width: s, height: s, background: "var(--bf-accent)", borderRadius: 3, margin: "0 auto 6px" }} />
                <div className="bf-caption bf-num">{s}</div>
              </div>
            ))}
            <div style={{ flexBasis: "100%", height: 0 }} />
            {[
              ["sm", 8], ["md", 12], ["lg", 16], ["xl", 22], ["pill", 999],
            ].map(([n, r]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 36, border: "2px solid var(--bf-gold)", borderRadius: Number(r), margin: "0 auto 6px" }} />
                <div className="bf-caption">r-{n}</div>
              </div>
            ))}
          </Panel>
        </Section>

        <Section id="botoes" title="Botões" hint="Dourado = a ação principal da tela (só um por tela). Roxo = ação importante secundária. Vidro = o resto. Passe o mouse, pressione e veja o desabilitado.">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              <Button variant="primary" icon="play" pulse>Jogar</Button>
              <Button variant="accent" icon="people">Criar sala</Button>
              <Button variant="secondary" icon="gear">Configurações</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger" icon="logout">Sair</Button>
              <Button variant="outline-danger">Sair da mesa</Button>
            </div>
            <Divider label="Estados" />
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              <Button variant="primary">Normal</Button>
              <Button variant="primary" disabled>Desabilitado</Button>
              <Button variant="primary" loading>Carregando</Button>
              <Button variant="accent" loading>Carregando</Button>
              <Button variant="secondary" disabled>Desabilitado</Button>
            </div>
            <Divider label="Tamanhos" />
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              <Button variant="primary" size="sm">Pequeno</Button>
              <Button variant="primary">Médio</Button>
              <Button variant="primary" size="lg" icon="play">Grande</Button>
              <Button variant="secondary" icon="gear" iconOnly aria-label="Configurações" />
              <Button variant="accent" icon="plus" iconOnly size="sm" aria-label="Adicionar" />
              <Button variant="primary" icon="trophy" iconOnly size="lg" aria-label="Ranking" />
            </div>
            <Divider label="Largura total (celular)" />
            <div style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
              <Button variant="primary" size="lg" block icon="play" pulse>Jogar agora</Button>
              <Button variant="secondary" block icon="robot">Solo contra a IA</Button>
            </div>
          </Panel>
        </Section>

        <Section id="cards" title="Cards e painéis" hint="Vidro escuro com uma linha de luz no topo. Os clicáveis sobem um pouco no hover e encolhem ao toque.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            <Panel><div className="bf-h3">Vidro</div><p className="bf-body-sm bf-muted" style={{ marginTop: 6 }}>Padrão para listas e blocos de conteúdo.</p></Panel>
            <Panel tone="solid"><div className="bf-h3">Sólido</div><p className="bf-body-sm bf-muted" style={{ marginTop: 6 }}>Sem desfoque: mais leve, bom em listas longas.</p></Panel>
            <Panel tone="raised"><div className="bf-h3">Elevado</div><p className="bf-body-sm bf-muted" style={{ marginTop: 6 }}>Modais, menus e cartões em destaque.</p></Panel>
            <Panel tone="accent"><div className="bf-h3" style={{ color: "var(--bf-accent-3)" }}>Roxo</div><p className="bf-body-sm bf-muted" style={{ marginTop: 6 }}>Item selecionado, missão em andamento.</p></Panel>
            <Panel tone="gold"><div className="bf-h3 bf-gold-text">Dourado</div><p className="bf-body-sm bf-muted" style={{ marginTop: 6 }}>Recompensa, 1.º lugar, conquista.</p></Panel>
            <Panel interactive onClick={() => toast.show({ text: "Card clicável tocado", icon: "check", tone: "success" })}>
              <div className="bf-row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="bf-h3">Clicável</div>
                  <p className="bf-body-sm bf-muted" style={{ marginTop: 4 }}>Toque para testar</p>
                </div>
                <Icon name="chevron-right" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="inputs" title="Campos e seletores">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
            <Field label="Seu nome" hint="Até 16 caracteres" htmlFor="ds-name">
              <Input id="ds-name" placeholder="Como quer ser chamado?" maxLength={16} />
            </Field>
            <Field label="Código da sala" error={code.length > 0 && code.length < 4 ? "O código tem 4 letras" : undefined} htmlFor="ds-code">
              <Input id="ds-code" code placeholder="ABCD" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} invalid={code.length > 0 && code.length < 4} />
            </Field>
            <Field label="Desabilitado">
              <Input disabled value="Não dá para editar" readOnly />
            </Field>
            <Field label="Como jogar a carta">
              <Segmented value={seg} onChange={setSeg} block options={[{ value: "drag", label: "Arrastar" }, { value: "tap", label: "Tocar" }]} />
            </Field>
          </Panel>
        </Section>

        <Section id="chips" title="Chips, status e raridades">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              <Chip>Neutro</Chip>
              <Chip tone="accent" icon="spark">Roxo</Chip>
              <Chip tone="gold" icon="crown">Dourado</Chip>
              <Chip tone="success" icon="check">Sucesso</Chip>
              <Chip tone="warning" icon="clock">Aviso</Chip>
              <Chip tone="danger" icon="x">Erro</Chip>
              <Chip tone="info" icon="info">Info</Chip>
              <Chip tone="team-a">Dupla A</Chip>
              <Chip tone="team-b">Dupla B</Chip>
              <Chip size="sm" tone="accent">Pequeno</Chip>
            </div>
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              {RARITIES.map((r) => (
                <Chip key={r} rarity={r} icon={r === "special" ? "spark" : r === "gold" ? "crown" : "medal"}>
                  {RARITY_LABEL[r]}
                </Chip>
              ))}
              <span className="bf-caption">(ex.: OVR 93 → {RARITY_LABEL[rarityFromOvr(93)]}, OVR 71 → {RARITY_LABEL[rarityFromOvr(71)]})</span>
            </div>
            <div className="bf-row" style={{ flexWrap: "wrap", gap: 18 }}>
              <Avatar name="Pedro" size={44} online />
              <Avatar name="Ana" size={44} ring="accent" online={false} />
              <Avatar name="Lorenzo" size={44} ring="gold" online />
              <Avatar name="João" size={44} ring="special" />
              <LevelBadge level={3} size="sm" />
              <LevelBadge level={12} />
              <LevelBadge level={27} size="lg" />
            </div>
          </Panel>
        </Section>

        <Section id="xp" title="XP e nível" hint="A barra enche com animação; toque em “Ganhar XP” para ver.">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
            <XpBar level={7} xp={xp} xpToNext={500} />
            <XpBar level={7} xp={xp} xpToNext={500} compact />
            <ProgressBar value={3} max={5} tone="gold" label="Missão" />
            <ProgressBar value={0.72} tone="success" size="lg" shine label="Progresso" />
            <div className="bf-row">
              <Button variant="accent" icon="bolt" onClick={() => setXp((v) => (v + 90 > 500 ? 40 : v + 90))}>Ganhar XP</Button>
              <Button variant="secondary" onClick={() => setXp(0)}>Zerar</Button>
            </div>
          </Panel>
        </Section>

        <Section id="cartas" title="Cartas" hint="Padrão de baralho profissional: só o valor nos cantos (na cor do naipe), centro limpo. Três estilos de frente; o Clássico é o padrão. Cada baralho colecionável escolhe estilo, fonte e cores.">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {CARD_PROPOSALS.map((p) => (
              <div key={p.deck.id}>
                <div className="bf-row" style={{ marginBottom: 10, gap: 8 }}>
                  <span className="bf-h3">{p.title}</span>
                  <Chip size="sm" tone={p.default ? "gold" : "neutral"}>{p.default ? "padrão" : p.font}</Chip>
                  <span className="bf-caption">{p.hint}</span>
                </div>
                <div className="bf-row" style={{ flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
                  {(["A", "2", "7", "K"] as const).map((v) => (
                    <PlayingCard key={v} card={{ s: "copas", v }} size="lg" deck={p.deck} />
                  ))}
                  <PlayingCard card={{ s: "espadas", v: "Q" }} size="lg" deck={p.deck} />
                  <PlayingCard card={{ s: "paus", v: "J" }} size="md" deck={p.deck} />
                  <PlayingCard card={{ s: "ouros", v: "5" }} size="md" deck={p.deck} />
                  <PlayingCard card={{ s: "copas", v: "A" }} size="sm" deck={p.deck} />
                  <PlayingCard card={{ s: "espadas", v: "7" }} size="sm" deck={p.deck} />
                  <PlayingCard card={{ s: "ouros", v: "K" }} size="xs" deck={p.deck} />
                  <PlayingCard card={{ s: "paus", v: "3" }} size="xs" deck={p.deck} />
                </div>
              </div>
            ))}
            <Divider label="Estados na mesa" />
            <div className="bf-row" style={{ flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
              <PlayingCard card={{ s: "copas", v: "7" }} size="md" glow="gold" title="Corte em destaque" />
              <PlayingCard card={{ s: "ouros", v: "2" }} size="md" selected title="Carta levantada" />
              <PlayingCard card={{ s: "paus", v: "4" }} size="md" dim title="Jogada bloqueada" />
              <PlayingCard back size="md" />
              <div style={{ marginLeft: "auto" }} className="bf-row">
                <FlipCard card={{ s: "espadas", v: "A" }} flipped={flipped} size="lg" glow="gold" />
                <Button variant="secondary" size="sm" icon="refresh" onClick={() => { setFlipped(false); setTimeout(() => setFlipped(true), 350); }}>Virar</Button>
              </div>
            </div>
          </Panel>
        </Section>

        <Section id="baralhos" title="Coleção de baralhos" hint="Cada baralho muda verso, frente, fonte e acabamento. Dourado e Holográfico têm reflexo em CSS (passe o mouse).">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {DECKS.map((d) => (
              <Panel key={d.id} pad="none" style={{ padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderColor: RARITY_INFO[d.rarity].color + "55" }}>
                <div className="bf-row" style={{ gap: 6 }}>
                  <PlayingCard back size="sm" deck={d} />
                  <PlayingCard card={{ s: "copas", v: "A" }} size="sm" deck={d} />
                  <PlayingCard card={{ s: "espadas", v: "K" }} size="sm" deck={d} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="bf-h3" style={{ fontSize: 13 }}>{d.name}</div>
                  <div className="bf-caption" style={{ color: RARITY_INFO[d.rarity].color, fontWeight: 700 }}>{RARITY_INFO[d.rarity].label} · {unlockLabel(d.unlock)}</div>
                </div>
              </Panel>
            ))}
          </div>
        </Section>

        <Section id="carregamento" title="Carregamento e fundo vivo" hint="O carregamento só aparece se demorar mais de 300 ms e fica pelo menos um ciclo. O fundo tem três camadas com parallax (mexa o mouse).">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <Panel pad="lg" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, minHeight: 220, justifyContent: "center" }}>
              <SuitLoader size={40} label="Entrando na sala" />
              <div className="bf-row">
                <Button variant="accent" icon="refresh" onClick={() => { setLoadingDemo(true); setTimeout(() => setLoadingDemo(false), 2600); }}>Simular carregamento (2,6 s)</Button>
                <Button variant="secondary" onClick={() => { setLoadingDemo(true); setTimeout(() => setLoadingDemo(false), 120); }}>Rápido (120 ms: não pisca)</Button>
              </div>
            </Panel>
            <Panel pad="none" style={{ position: "relative", minHeight: 260, overflow: "hidden" }}>
              <SuitBackdrop />
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 260, gap: 14, padding: 16 }}>
                <div className="bf-hero" style={{ fontSize: 30 }}>BISCA FUCAS</div>
                <Button variant="primary" size="lg" icon="play" pulse>Jogar</Button>
              </div>
            </Panel>
          </div>
          <LoadingOverlay active={loadingDemo} label="Carregando" />
        </Section>

        <Section id="resultado" title="Fim de partida e celebrações" hint="A vitória cresce com a faixa do jogador: 1 brilho · 2 confete · 3 cartas voando · 4 chuva de naipes · 5 tudo + aura. Escolha o nível e veja.">
          <Panel pad="lg" className="bf-row" style={{ flexWrap: "wrap" }}>
            {[1, 5, 20, 30, 40].map((lv) => (
              <Button key={lv} variant={lv >= 30 ? "accent" : "primary"} icon="trophy" onClick={() => setResultDemo({ won: true, level: lv })}>
                Vitória nível {lv}
              </Button>
            ))}
            <Button variant="secondary" icon="x" onClick={() => setResultDemo({ won: false, level: 12 })}>Derrota</Button>
            <Button variant="secondary" icon="deck" onClick={() => setUnlockDemo("holografico")}>Abrir pacote lendário</Button>
            <Button variant="secondary" icon="deck" onClick={() => setUnlockDemo("azul-royal")}>Abrir pacote comum</Button>
          </Panel>
          {resultDemo ? (
            <ResultScreen
              won={resultDemo.won}
              myTeam={0}
              finalPts={resultDemo.won ? [4, 2] : [1, 4]}
              names={["Você", "IA 1", "Parceiro", "IA 2"]}
              setWins={[1, 0]}
              level={resultDemo.level}
              deckId="classico"
              isOnline={false}
              isRoomHost
              events={{
                xpGained: 148,
                xpLines: [
                  { label: "Partida jogada", xp: 40 },
                  { label: "Vitória", xp: 60 },
                  { label: "3 mãos vencidas", xp: 18 },
                  { label: "1 capote", xp: 15 },
                  { label: "1 Réle", xp: 25 },
                  { label: "Contra bots (70%)", xp: -47 },
                ],
                levelBefore: resultDemo.level,
                levelAfter: resultDemo.level + (resultDemo.won ? 1 : 0),
                tierChanged: resultDemo.level === 4 || resultDemo.level === 9,
                missionsCompleted: ["d_win_1"],
                missionsProgressed: ["d_win_1", "w_win_7", "ach_win_10"],
                decksUnlocked: resultDemo.level === 1 ? ["azul-royal"] : [],
              }}
              onNext={() => setResultDemo(null)}
              onHome={() => setResultDemo(null)}
            />
          ) : null}
          {unlockDemo ? <DeckUnlockOverlay deck={DECKS.find((d) => d.id === unlockDemo)} onDone={() => setUnlockDemo(null)} /> : null}
        </Section>

        <Section id="modais" title="Modais e avisos" hint="No celular o modal sobe como uma folha; no notebook aparece no centro. Avisos (toasts) somem sozinhos.">
          <Panel pad="lg" className="bf-row" style={{ flexWrap: "wrap" }}>
            <Button variant="accent" onClick={() => setModal("sheet")}>Abrir modal</Button>
            <Button variant="secondary" onClick={() => setModal("center")}>Confirmação curta</Button>
            <Button variant="secondary" icon="check" onClick={() => toast.show({ text: "Nome atualizado!", tone: "success", icon: "check" })}>Toast sucesso</Button>
            <Button variant="secondary" icon="trophy" onClick={() => toast.show({ text: <span><b>Missão concluída:</b> Vença 3 partidas · +150 XP</span>, tone: "gold", icon: "trophy" })}>Toast recompensa</Button>
            <Button variant="secondary" icon="x" onClick={() => toast.show({ text: "Sala não encontrada", tone: "danger", icon: "x" })}>Toast erro</Button>
          </Panel>
          <Modal
            open={modal === "sheet"}
            onClose={() => setModal(null)}
            title="Sair da mesa?"
            actions={
              <>
                <Button variant="secondary" onClick={() => setModal(null)}>Ficar</Button>
                <Button variant="danger" icon="logout" onClick={() => setModal(null)}>Sair</Button>
              </>
            }
          >
            Se você sair agora, a IA assume o seu lugar e a partida continua para os outros. Você pode voltar pelo código da sala enquanto ela existir.
          </Modal>
          <Modal open={modal === "center"} onClose={() => setModal(null)} center title="Apagar a foto?" actions={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button variant="primary" onClick={() => setModal(null)}>Apagar</Button></>}>
            Vamos voltar a usar a foto da sua conta Google.
          </Modal>
        </Section>

        <Section id="icones" title="Ícones" hint="Traço fino, 24px, herdam a cor do texto. Os sete atributos da tabela: livro, cérebro, calculadora, espada, peça de xadrez, raio e trevo.">
          <Panel pad="lg">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
              {ICON_NAMES.map((n) => (
                <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: 10, background: "rgba(255,255,255,.04)" }}>
                  <Icon name={n} />
                  <span className="bf-caption" style={{ fontSize: 10, fontFamily: "var(--bf-font-mono)" }}>{n}</span>
                </div>
              ))}
            </div>
          </Panel>
        </Section>

        <Section id="movimento" title="Movimento" hint="Durações e curvas fixas. Só transform e opacity. Com “reduzir movimento” ligado no sistema, tudo vira instantâneo.">
          <Panel pad="lg" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th className="bf-label" style={{ padding: "6px 8px" }}>Token</th>
                    <th className="bf-label" style={{ padding: "6px 8px" }}>Duração</th>
                    <th className="bf-label" style={{ padding: "6px 8px" }}>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["xs", "120 ms", "botão pressionado, toggle"],
                    ["sm", "180 ms", "hover, foco, chips"],
                    ["md", "320 ms", "transição de tela, carta jogada"],
                    ["lg", "500 ms", "recolher vaza, abrir modal"],
                    ["xl", "900 ms", "celebração (nível, vitória)"],
                  ].map(([t, d, u]) => (
                    <tr key={t} style={{ borderTop: "1px solid var(--bf-glass-border)" }}>
                      <td style={{ padding: "8px", fontFamily: "var(--bf-font-mono)" }}>--bf-dur-{t}</td>
                      <td style={{ padding: "8px" }} className="bf-num">{d}</td>
                      <td style={{ padding: "8px", color: "var(--bf-text-2)" }}>{u}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Divider label="Demonstração" />
            <div className="bf-row" style={{ flexWrap: "wrap" }}>
              <Button variant="accent" icon="refresh" onClick={() => setPopKey((k) => k + 1)}>Repetir animações</Button>
            </div>
            <div key={popKey} className="bf-row" style={{ flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
              <Panel className="bf-anim-fade-up" style={{ minWidth: 120 }}><div className="bf-caption">fade-up</div><div className="bf-h3">Entrada</div></Panel>
              <Panel className="bf-anim-scale-in" style={{ minWidth: 120 }}><div className="bf-caption">scale-in</div><div className="bf-h3">Modal</div></Panel>
              <Panel tone="gold" className="bf-anim-pop" style={{ minWidth: 120 }}><div className="bf-caption">pop (spring)</div><div className="bf-h3 bf-gold-text">+150 XP</div></Panel>
              <Panel className="bf-anim-shake" style={{ minWidth: 120, borderColor: "rgba(248,113,113,.4)" }}><div className="bf-caption">shake</div><div className="bf-h3" style={{ color: "var(--bf-danger)" }}>Erro</div></Panel>
            </div>
            <div key={`st-${popKey}`} className="bf-stagger" style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
              {["Lorenzo", "João", "Ruivo", "Gustavo"].map((n, i) => (
                <Panel key={n} pad="none" style={{ padding: "10px 14px" }} className="bf-row">
                  <span className="bf-h3 bf-num" style={{ width: 24, color: i < 2 ? "var(--bf-gold-2)" : i === 2 ? "var(--bf-rar-bronze-2)" : "var(--bf-text-3)" }}>{i < 2 ? 1 : i + 1}</span>
                  <Avatar name={n} size={32} ring={i < 2 ? "gold" : "none"} />
                  <span style={{ flex: 1, fontWeight: 700 }}>{n}</span>
                  <Chip tone={i < 2 ? "gold" : "neutral"} size="sm">em cascata</Chip>
                </Panel>
              ))}
            </div>
            <div className="bf-row" style={{ gap: 20, flexWrap: "wrap" }}>
              <div className="bf-skeleton" style={{ width: 140, height: 16 }} />
              <div className="bf-skeleton" style={{ width: 40, height: 40, borderRadius: "50%" }} />
              <span className="bf-caption">esqueleto de carregamento</span>
            </div>
          </Panel>
        </Section>
      </main>

      <BottomNav
        current={nav}
        onChange={(id) => { setNav(id); toast.show({ text: `Aba: ${id}`, tone: "accent", icon: "info", durationMs: 1200 }); }}
        items={[
          { id: "home", label: "Início", icon: "home" },
          { id: "missions", label: "Missões", icon: "target", badge: 2 },
          { id: "ranking", label: "Ranking", icon: "trophy" },
          { id: "profile", label: "Perfil", icon: "user" },
        ]}
      />
    </div>
  );
}

export default function DesignShowcase() {
  return (
    <ToastProvider>
      <Showcase />
    </ToastProvider>
  );
}
