# Salas de jogo — referências pesquisadas e o que aplicamos

## O que cada referência faz bem

**Clash Royale — arenas** ([wiki de arenas](https://clashroyale.fandom.com/wiki/Arenas), [estudo de ambiente 3D](https://www.artstation.com/artwork/Xg1qgl), [Supercell no Substance 3D](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html))
- Cada arena tem cenário, paleta e props próprios (Goblin Stadium, Bone Pit, P.E.K.K.A's Playhouse com lava, Spell Valley com rio roxo). O tema aparece em TUDO: chão, bordas, cor da luz.
- A área jogável é sempre a mesma (mesmo layout, mesmas posições), só o cenário muda. O jogador nunca precisa reaprender a tela.
- Formas simples e gradientes limpos; o cenário fica escuro/discreto perto da área de jogo para não competir com as unidades.

**8 Ball Pool — mesas por cidade** ([salas do jogo](https://8ballpool.fandom.com/wiki/Game_rooms), [guia de mesas](https://www.appgamer.com/8ballpool/strategy-guide/all-the-pools-tables))
- Downtown London Pub, Sydney Marina Bar, Tokyo Warrior Hall: cada sala é um "lugar" com pano de mesa, moldura e fundo diferentes; a mesa é sempre o centro iluminado e o fundo fica escuro e desfocado.
- Placar, nomes e avatares ficam em cápsulas no topo, fora da mesa; a informação de turno é um anel/brilho ao redor do avatar de quem joga.

**Hearthstone — tabuleiros** ([guia visual dos tabuleiros](https://gamintafiles.wordpress.com/2013/08/27/a-visual-guide-to-the-interactive-boards-in-hearthstone/), [Battlefield](https://hearthstone.fandom.com/wiki/Battlefield), [por que existem as interações](https://outof.games/news/341-hearthstone-hypothesis-why-do-the-game-board-interactions-exist/))
- Pinturas projetadas em 3D com iluminação e sombras: a mesa parece um objeto físico. Cada tabuleiro tem detalhes vivos nos cantos (animações de ambiente) que nunca invadem a área das cartas.
- Tudo é tátil: cartas com sombra, mesa com relevo, moldura de madeira.

**Marvel Snap — locais e HUD** ([caso Unity](https://unity.com/case-study/marvel-snap), [wireframe do gameplay](https://medium.com/@carol.michelon/marvel-snap-gameplay-wireframe-ed76251eebc5), [Behind the Design, Apple](https://developer.apple.com/news/?id=sosm2p7q))
- As cartas mandam na hierarquia; interface em "vidro preto" com luz projetada. HUD inferior simplificado.
- A borda do local brilha na direção de quem está ganhando: o estado do jogo é comunicado com luz, não com texto.

**Pôquer e baralho mobile** (padrão do gênero: Zynga Poker, Governor of Poker, Truco/Buraco)
- Mesa oval de feltro com brilho central e borda de madeira/couro; avatares redondos com anel de tempo/turno; carta de trunfo e monte de compra sempre no centro com destaque.

## O que aplicamos em cada sala (mantendo o clima que já existia)

| Sala | Cenário e luz | Mesa | Animação de ambiente |
|---|---|---|---|
| **Terrafé** | madeira escura, luz quente de luminária pendente | tampo de madeira com veios e brilho quente | vapor da xícara, luz que oscila levemente, poeira dourada |
| **HUB Fucape** | azul noturno, painel tecnológico | feltro azul com grade fina | varredura de luz, pontos de LED piscando |
| **Floresta** | verde profundo, feixes de luz entre árvores | feltro verde-musgo | folhas caindo, vagalumes, feixes de luz pulsando |
| **Sala de Aula** | quadro vermelho-escuro, giz | tampo bordô com linhas de caderno | pó de giz flutuando, foco de luz varrendo |

Em todas: mesma área de jogo (mão embaixo, mesa no centro, monte e corte ao lado), avatar + nome + nível + emblema do clã em cada assento, carta de corte com brilho dourado, anel de "vez" no assento de quem joga, HUD de placar no topo, entrada na sala com a animação dos naipes. Só `transform`/`opacity` animam; tudo pausa com a aba oculta e para com "reduzir movimento".
