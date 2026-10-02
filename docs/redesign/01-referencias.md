# Fase 1 — Referências visuais e de experiência

Resumo do que vamos aproveitar de cada jogo pesquisado para o redesign do Bisca Fucas.
Linguagem simples, direta ao ponto. Fontes no final.

## O que cada jogo faz bem e o que levamos

| Jogo | O que faz bem | O que levamos para o Bisca Fucas |
|---|---|---|
| **Clash Royale** | Home limpa com UM botão principal gigante ("Battle"), baús/recompensas sempre visíveis com timer, barra de navegação embaixo (alcance do polegar), recompensas destacadas com cor e movimento. | Home com um botão "Jogar" dominante, barra inferior (Home · Missões · Ranking · Perfil), missões/recompensas visíveis na home com indicador de "tem coisa pra pegar". |
| **8 Ball Pool** | Progressão por "cidades"/níveis que desbloqueiam mesas; clubes; personalização de tacos e mesas com itens ganhos. Lição negativa: lobby poluído, tudo com o mesmo peso visual. | Baralhos colecionáveis desbloqueados por nível (equivalente aos tacos); clãs; hierarquia visual clara (uma ação principal por tela, o resto discreto). |
| **Marvel Snap** | As cartas são sempre o centro da hierarquia visual; a interface é "vidro preto" com botões que parecem luz projetada; cartas ganham brilho/parallax/animação conforme raridade. | Estilo "vidro escuro + luz roxa/dourada" (combina com a tabela de atributos atual); carta de jogador EA FC com brilho/parallax leve por raridade; a mesa de jogo sempre dá protagonismo às cartas, não aos painéis. |
| **Hearthstone** | Tudo é físico e tátil: cartas inclinam, a mesa "bate", as caixas abrem com clique. Dois pilares: sequenciamento (uma coisa de cada vez) e dramatização (cada evento tem seu momento). | Animações de carta com peso (comprar, jogar, virar, recolher vaza em sequência, nunca tudo ao mesmo tempo); a Réle e o 7 de abertura como "momentos dramáticos" (já existe o impacto da Réle, vamos padronizar). |
| **Balatro** | O feedback É o jogo: várias camadas empilhadas num só evento (tremor, partículas, número subindo, som). Cartas na mão com inércia e "ímã" ao encaixar. Materiais por raridade (ouro, vidro, holográfico). | Contagem de pontos da vaza/mão com números "subindo"; cartas da mão com leve balanço ao reorganizar; "materiais" de baralho (clássico, ouro, vidro, holográfico) como sistema de raridade dos baralhos colecionáveis. |
| **Legends of Runeterra** | Interface mínima na partida: cartas quase saindo da borda da tela, baralho e mana reduzidos a marcas pequenas; recompensa diária é a PRIMEIRA coisa ao abrir o app, com animação de abrir baú. | Durante a partida, HUD mínimo (placar, trunfo, vez) e cartas grandes; ao abrir o jogo com missão concluída ou nível novo, a celebração aparece antes da home. |
| **EA FC Ultimate Team** | Anatomia da carta: OVR gigante no canto, posição, escudo do clube, nome, 6 atributos em grade; cor por faixa de rating (bronze/prata/ouro) e versões "especiais" com arte diferente e brilho. | Carta de jogador da Tabela de Atributos: OVR em destaque, emblema do clube, 7 atributos, raridade por OVR (90+ especial roxo/holográfico, 80–89 ouro, 70–79 prata, <70 bronze), animação de revelação (carta vira e brilha). |
| **Truco / Buraco / Poker mobile** | Interface simples, animações suaves, modo retrato com cartas na parte de baixo, avatares e emoções dos jogadores na mesa, tutorial para iniciantes. | Mesa em retrato com avatar + nome + dupla de cada assento; reações rápidas na mesa (futuro); manter o texto das regras acessível. |

## Princípios que saem dessa pesquisa

1. **Uma ação principal por tela.** O resto fica menor, mais escuro, mais discreto.
2. **Alcance do polegar.** Navegação e botões de ação na metade de baixo da tela no celular.
3. **Cartas sempre em primeiro plano.** Painéis em vidro escuro, cartas claras e grandes.
4. **Feedback em camadas, mas curto.** Cada evento importante (vaza ganha, Réle, vitória, subir de nível) empilha 2–3 sinais (movimento + brilho + número), em 300–600 ms, sem travar a próxima ação.
5. **Sequenciar, não empilhar.** Comprar → jogar → resolver vaza → recolher → próxima vez, cada passo com seu tempinho.
6. **Celebrar progresso na porta de entrada.** Missão concluída e nível novo aparecem assim que o jogador volta à home.
7. **Performance obrigatória.** Só `transform` e `opacity` nas animações; nada de animar largura/altura/margem; `will-change` com moderação; respeitar `prefers-reduced-motion` (animações viram aparição instantânea).

## Durações e curvas padrão (base para o design system da Fase 2)

| Uso | Duração | Curva |
|---|---|---|
| Microinteração (botão pressionado, toggle) | 120–180 ms | ease-out |
| Transição entre telas | 280–360 ms | cubic-bezier(.2,.8,.2,1) |
| Carta jogada / comprada | 320–420 ms | cubic-bezier(.2,.9,.2,1) |
| Recolher vaza | 450–550 ms | ease-in-out |
| Celebração (nível, vitória) | 900–1400 ms (em etapas) | spring suave |

## Fontes

- Clash Royale: https://watanuxdesign.medium.com/why-clash-royale-has-one-of-the-best-user-experience-design-part-1-fb9c761042c7 · https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale · https://www.gamegrin.com/articles/what-can-online-apps-learn-from-clash-royales-user-interface/
- 8 Ball Pool: https://www.linkedin.com/pulse/miniclips-8-ball-pool-melting-pot-skill-chance-based-2-om-tandon · https://mwm.ai/apps/8-ball-pool/543186831
- Marvel Snap: https://unity.com/case-study/marvel-snap · https://www.michaelcalcada.com/snap.html · https://axisstudiosgroup.com/work/marvel-snap/
- Hearthstone: https://inanage.com/2013/08/29/hearthstones-ui/ · https://medium.com/@matt.tsui/hearthstone-design-thinking-inside-the-box-78dbacb96040 · https://toucharcade.com/2017/04/04/designing-hearthstone-card-packs-animations-iterations-ungoro-and-more-with-art-director-ben-thompson/
- Balatro: https://blakecrosley.com/guides/design/balatro · https://medium.com/@yyh19971004/balatro-design-analysis-visual-packaging-and-interactive-feedback-cc6fa6a65370 · https://80.lv/articles/balatro-s-card-movements-shaders-recreated-in-unity
- Legends of Runeterra: https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/ · https://interfaceingame.com/games/legends-of-runeterra-mobile/ · https://www.isaacgutjahr.com/understanding-the-gaming-experience/opening-card-packs-a-mini-exemplar-collection
- EA FC Ultimate Team: https://fifauteam.com/colours-of-fifa-ultimate-team-cards/ · https://fifauteam.com/fc-25-player-cards-guide/ · https://futgraphics.com/articles/the-evolution-of-fut-cards-a-visual-history-from-fifa-09-to-ea-fc-24
- Truco/Buraco/Poker: https://play.google.com/store/apps/details?id=com.five2.play.truco · https://limeup.io/projects/poker-house/ · https://www.theskinsfactory.com/uiux-design-blog/poker-bang-proof-of-concept-prototype
- Boas práticas mobile e CSS: https://www.linkedin.com/pulse/mobile-game-uiux-top-10-best-practices-troy-dunniway · https://frontendchecklist.io/rules/css/animation-performance · https://cr0x.net/en/css-animations-performance-rules/ · https://blog.pixelfreestudio.com/how-to-optimize-motion-design-for-mobile-performance/
