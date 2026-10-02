# Fase 2 — Design system

Tudo que faz o jogo parecer "uma coisa só". Vive em `src/design/` e pode ser visto ao vivo em **/design** (ex.: `http://localhost:3000/design` ou `https://seu-site/design`).

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `src/design/tokens.css` | As "regras" em variáveis CSS: cores, fontes, tamanhos de letra, espaçamentos, raios, sombras, camadas e tempos de animação. Mudou aqui, mudou no jogo inteiro. |
| `src/design/components.css` | A aparência de botões, painéis, chips, inputs, modais, barra de XP, navegação e as animações utilitárias. |
| `src/design/fonts.ts` | As duas fontes (Outfit para títulos/botões, Inter para textos), servidas pelo próprio site. |
| `src/design/motion.ts` | Os mesmos tempos de animação para o JavaScript + detecção de "reduzir movimento". |
| `src/design/icons.tsx` | Os ícones (SVG de traço). Inclui os 7 ícones dos atributos da tabela. |
| `src/design/*.tsx` | Os componentes: `Button`, `Panel`, `Chip`, `Modal`, `XpBar`, `Input`, `Toast`, `BottomNav`, `Avatar`, `PlayingCard`. |
| `src/app/design/` | A página de demonstração. |

## Decisões

**Cores.** Fundo escuro (o mesmo `#0a0a12` de hoje), **roxo** como cor de destaque e **dourado** para o que é especial (botão principal, 1.º lugar, recompensas). Vermelho continua só na marca Fucas, na Sala de Aula e em ações de perigo. Isso segue a identidade da tabela de atributos que você gostou.

**Raridades.** Bronze, Prata, Ouro e Especial (roxo-rosa holográfico). Regra única usada nas cartas de jogador e nos baralhos: 90+ especial, 80–89 ouro, 70–79 prata, abaixo de 70 bronze.

**Botões.** Um dourado por tela (a ação principal). Roxo para a segunda ação importante. Vidro escuro para o resto. Todos com 44px de altura mínima (dedão), estados de hover, pressionado (encolhe 3%), desabilitado (45% de opacidade) e carregando (spinner).

**Painéis.** Vidro escuro com uma linha de luz no topo, como o estilo "piano glass" do Marvel Snap. Variações: sólido, elevado, roxo, dourado e clicável.

**Modal.** No celular sobe como uma folha de baixo (mais natural com uma mão); no notebook aparece no centro. Fecha com Esc, toque fora ou X.

**Tipografia.** Outfit (títulos, botões, números grandes) + Inter (textos). Escala fixa: hero 34–48, display 26–34, título 22, subtítulo 18, corpo 15, legenda 12, rótulo 11.

**Espaços.** Múltiplos de 4px. Margem lateral 16px (celular) e 24px (notebook). Largura "coluna de celular" de 420px para telas de menu; conteúdo largo até 1080px no notebook.

**Movimento.** Cinco durações (120, 180, 320, 500, 900 ms) e cinco curvas. Só `transform` e `opacity`. Com "reduzir movimento" ligado no celular, todas as durações viram zero e as animações contínuas (brilhos, pulsos) desligam.

## Como usar (para quem for mexer no código)

```tsx
import { Button, Panel, Chip, Modal, XpBar, useToast } from "@/design";

<Button variant="primary" size="lg" block icon="play">Jogar</Button>
<Panel tone="accent">…</Panel>
<Chip rarity="gold" icon="crown">Ouro</Chip>
<XpBar level={7} xp={320} xpToNext={500} />
```

## O que ainda não mudou

As telas atuais do jogo continuam iguais: esta fase só cria as peças. Na Fase 3 cada tela é refeita usando estas peças.
