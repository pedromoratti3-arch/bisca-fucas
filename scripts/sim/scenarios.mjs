/* Situações-teste tiradas dos exemplos do Pedro. Cada uma monta a mesa e confere a jogada do bot.
 * Uso: node scripts/sim/scenarios.mjs [repetições=5]
 * Cartas: valor + naipe (o=ouros, c=copas, e=espadas, p=paus). Ex.: 'Ac' = Ás de copas.
 * Ordem da mesa (TORD): 0 → 3 → 2 → 1 → 0. Duplas: {0,2} e {1,3}.
 */
import { mkDk } from '../../src/lib/bisca/rules.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';
import { chooseCardOld } from './old-ai.mjs';
var USE_OLD = process.argv[3] === 'antigo';
var NEW_OPTS = process.argv[4] ? JSON.parse(process.argv[4]) : {};

var REPS = parseInt(process.argv[2] || '5', 10);
var ALL = mkDk();
var SU = { o: 'ouros', c: 'copas', e: 'espadas', p: 'paus' };
var SYM = { ouros: '♦', copas: '♥', espadas: '♠', paus: '♣' };
function C(s){ var v = s.slice(0, -1), su = SU[s.slice(-1)]; var c = ALL.find(function(x){ return x.v === v && x.s === su; }); if(!c) throw new Error('carta? ' + s); return c; }
function cs(c){ return c.v + SYM[c.s]; }
function shuffled(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/**
 * spec: { trump, me, hand, mate?: (mão do parceiro conhecida), trick: [[seat,'carta'],...], played: [...cartas já saídas],
 *         sevenOut, tPts:[a,b], deckLeft (cartas no baralho), trickN }
 * As cartas escondidas são distribuídas ao acaso em cada repetição (o bot não as vê).
 */
function buildPv(sp){
  var used = {};
  function mark(list){ return list.map(function(s){ var c = C(s); if(used[c.id]) throw new Error('repetida ' + s); used[c.id] = 1; return c; }); }
  var hands = [[], [], [], []];
  hands[sp.me] = mark(sp.hand);
  var mate = (sp.me + 2) % 4;
  if(sp.mate) hands[mate] = mark(sp.mate);
  var trick = (sp.trick || []).map(function(t){ return { player: t[0], card: mark([t[1]])[0] }; });
  mark(sp.played || []);
  var rest = shuffled(ALL.filter(function(c){ return !used[c.id]; }));
  // Tamanho das mãos: quem já jogou nesta vaza tem uma carta a menos.
  var size = sp.hand.length + (sp.trick ? 0 : 0);
  var inTrick = {};
  trick.forEach(function(t){ inTrick[t.player] = 1; });
  var k = 0;
  for(var s=0;s<4;s++){
    if(s === sp.me || (sp.mate && s === mate)) continue;
    var n = size - (inTrick[s] ? 1 : 0);
    hands[s] = rest.slice(k, k += n);
  }
  if(sp.mate && inTrick[mate] && hands[mate].length !== size - 1) throw new Error('mão do parceiro com tamanho errado');
  var deck = rest.slice(k, k + (sp.deckLeft || 0));
  // Se faltarem cartas (porque sobraram), entram como já saídas — não importa para o bot.
  return {
    hands: hands, deck: deck, trick: trick, trickN: sp.trickN || 3, trump: SU[sp.trump], tc: null,
    tPts: sp.tPts || [0, 0], trumpSevenOut: !!sp.sevenOut, starter: 0, fd: [], batido: false, tieBonus: 0, aceReveal: null,
  };
}

var SCENARIOS = [
  {
    name: 'Pedro — copas batido: parceiro saiu de 3♠, adv. cortou com 5♥; eu com K♥ e cartas comuns: NÃO sobrecortar com o Rei',
    sp: { trump: 'c', me: 2, hand: ['Kc', '4o', '6p'], trick: [[0, '3e'], [3, '5c']], deckLeft: 28, trickN: 0, tPts: [0, 0] },
    ok: function(c){ return c.id !== 'K_copas'; },
  },
  {
    name: 'Pedro — saída: NÃO sair de Rei/Dama de corte de primeira carta tendo carta comum',
    sp: { trump: 'p', me: 1, hand: ['Kp', 'Qp', '4c'], trick: [], deckLeft: 28, trickN: 1, tPts: [0, 0] },
    ok: function(c){ return c.s !== 'paus'; },
  },
  {
    name: 'Pedro — saída: NÃO sair de bisca de primeira carta tendo carta comum (parceiro desconhecido)',
    sp: { trump: 'p', me: 1, hand: ['Ae', '4c', '6o'], trick: [], deckLeft: 28, trickN: 1, tPts: [0, 0] },
    ok: function(c){ return c.id !== 'A_espadas'; },
  },
  {
    name: 'Pedro — encarte: parceiro (mão conhecida) tem J♣ e J♥; eu com 3♣ 2♦ 4♦ → sair de 3♣ para ele encartar',
    sp: { trump: 'e', me: 0, hand: ['3p', '2o', '4o'], mate: ['Jc', 'Jp', '3c'], trick: [], deckLeft: 28, trickN: 1, tPts: [0, 0] },
    ok: function(c){ return c.id === '3_paus'; },
  },
  {
    name: 'Encarte: parceiro conhecido tem A♣ (topo do naipe) e eu 3♣ 5♦ 6♦ → sair de 3♣',
    sp: { trump: 'e', me: 0, hand: ['3p', '5o', '6o'], mate: ['Ap', '4c', '2c'], trick: [], deckLeft: 28, trickN: 1, tPts: [0, 0] },
    ok: function(c){ return c.id === '3_paus'; },
  },
  {
    name: 'Saída com o maior corte que resta (Ás, 7 já saiu) e parceiro conhecido com bisca: PODE sair do Ás de corte',
    sp: { trump: 'e', me: 0, hand: ['Ae', '5o', '6o'], mate: ['Ac', '4c', '2c'], sevenOut: true, played: ['7e'], trick: [], deckLeft: 24, trickN: 2, tPts: [10, 6] },
    ok: function(){ return true; },
    prefer: function(c){ return c.id === 'A_espadas'; },
  },
  {
    name: 'Ex. 2 — parceira por último com Ás de corte; adversário jogou um Rei: NÃO gastar o Ás',
    sp: { trump: 'c', me: 1, hand: ['Ac', '4e', '5p'], sevenOut: true, played: ['7c'],
      trick: [[0, '3o'], [3, '2e'], [2, 'Ko']], deckLeft: 12, trickN: 4, tPts: [14, 20] },
    ok: function(c){ return c.id !== 'A_copas'; },
  },
  {
    name: 'Ex. 1 — sair de bisca sem corte do parceiro (ele não tem corte): NÃO sair de bisca',
    sp: { trump: 'o', me: 0, hand: ['Ae', '4p', '6c'], mate: ['3p', '5c', '2e'], trick: [], deckLeft: 16, trickN: 3, tPts: [10, 12] },
    ok: function(c){ return c.id !== 'A_espadas'; },
  },
  {
    name: 'Bisca de saída do adversário (Ás ♠), eu em 2.º com corte: cortar (de preferência alto)',
    sp: { trump: 'o', me: 3, hand: ['3o', 'Ko', '5p'], trick: [[0, 'Ae']], deckLeft: 16, trickN: 3, tPts: [10, 10] },
    ok: function(c){ return c.s === 'ouros'; },
    prefer: function(c){ return c.id === 'K_ouros'; },
  },
  {
    name: 'Encarte arriscado: adv. saiu de 3♠; eu e o parceiro SEM corte → não encartar o 7♠',
    sp: { trump: 'o', me: 3, hand: ['7e', '4p', '5c'], mate: ['3p', '6c', '2p'], trick: [[0, '3e']], deckLeft: 16, trickN: 2, tPts: [5, 5],
      played: ['2e', '4e', '5e', '6e', '2c', '3c', '4c', 'Qc', 'Jc', '5p', '6p', 'Qp'] },
    ok: function(c){ return c.id !== '7_espadas'; },
  },
  {
    name: 'Encarte seguro: adv. saiu de 3♠; quase todos os cortes já saíram e o parceiro tem o resto → encartar o 7♠',
    sp: { trump: 'o', me: 3, hand: ['7e', '4p', '5c'], mate: ['Ao', '6c', '2p'], sevenOut: true,
      played: ['7o', 'Ko', 'Jo', 'Qo', '6o', '5o', '4o', '3o', '2o'], trick: [[0, '3e']], deckLeft: 8, trickN: 5, tPts: [30, 30] },
    ok: function(c){ return c.id === '7_espadas'; },
  },
  {
    name: 'Perto do capote (24 pts, fim de baralho), último a jogar: levar a vaza com corte baixo',
    sp: { trump: 'p', me: 1, hand: ['3p', 'Kc', '5o'], trick: [[0, 'Ke'], [3, 'Je'], [2, '4e']], deckLeft: 4, trickN: 6, tPts: [62, 24] },
    ok: function(c){ return c.id === '3_paus'; },
  },
  {
    name: 'Saída na 1.ª vaza (sem 7 de corte): NÃO sair de Valete de corte tendo carta comum',
    sp: { trump: 'p', me: 1, hand: ['Jp', '4c', 'Qe'], trick: [], deckLeft: 28, trickN: 0, tPts: [0, 0] },
    ok: function(c){ return c.s !== 'paus'; },
  },
  {
    name: 'Encarte com chance moderada de corte (cortes já espalhados): pode encartar o Ás',
    sp: { trump: 'o', me: 3, hand: ['Ae', '4p', '5c'], mate: ['Ko', '6c', '2p'], played: ['7o', 'Jo', 'Qo', '6o', '5o', '4o'], sevenOut: true,
      trick: [[0, '3e']], deckLeft: 12, trickN: 4, tPts: [25, 25] },
    ok: function(c){ return c.id === 'A_espadas'; },
  },
  {
    name: 'Início: adv. saiu de 3♠; o meu parceiro (último) tem K de corte → arriscar o encarte com o Ás♠',
    sp: { trump: 'c', me: 3, hand: ['Ae', '4p', '5o'], mate: ['Kc', '2o', '6p'], trick: [[0, '3e']], deckLeft: 28, trickN: 0, tPts: [0, 0] },
    ok: function(c){ return c.id === 'A_espadas'; },
  },
  {
    name: 'Início: adv. saiu de 3♠; o meu parceiro (último) tem K de corte → arriscar o encarte com o 7♠',
    sp: { trump: 'c', me: 3, hand: ['7e', '4p', '5o'], mate: ['Kc', '2o', '6p'], trick: [[0, '3e']], deckLeft: 28, trickN: 0, tPts: [0, 0] },
    ok: function(c){ return c.id === '7_espadas'; },
  },
  {
    name: 'Início: adv. saiu de 3 de corte (♥); NÃO gastar o 7 de corte sem bisca na mesa',
    sp: { trump: 'c', me: 3, hand: ['7c', '4p', '5o'], mate: ['Kc', '2o', '6p'], trick: [[0, '3c']], deckLeft: 28, trickN: 0, tPts: [0, 0] },
    ok: function(c){ return c.id !== '7_copas'; },
  },
];

var pass = 0;
SCENARIOS.forEach(function(sc){
  var picks = {};
  var good = 0, pref = 0;
  for(var r=0;r<REPS;r++){
    var pv = buildPv(sc.sp);
    var card = USE_OLD ? chooseCardOld(pv, sc.sp.me, { samples: 150 }) : chooseCard(pv, sc.sp.me, Object.assign({ knownMate: !!sc.sp.mate }, NEW_OPTS));
    picks[cs(card)] = (picks[cs(card)] || 0) + 1;
    if(sc.ok(card)) good++;
    if(sc.prefer && sc.prefer(card)) pref++;
  }
  var okAll = good === REPS;
  if(okAll) pass++;
  console.log((okAll ? '✔' : '✘') + ' ' + sc.name + '\n    jogou: ' + Object.keys(picks).map(function(k){ return k + '×' + picks[k]; }).join(', ') + (sc.prefer ? '  (preferida: ' + pref + '/' + REPS + ')' : ''));
});
console.log('\n' + pass + '/' + SCENARIOS.length + ' situações certas');
