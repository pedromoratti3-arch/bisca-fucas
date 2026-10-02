/* Estilo de jogo: com que frequência cada bot faz certas jogadas (novo × antigo, mesmas distribuições).
 * Uso: node scripts/sim/style.mjs [deals=60]
 */
import { TORD, mkDk, pTm, cPts, cRnk, beats, getWin, legalCards, RNK } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';
import { chooseCardOld } from './old-ai.mjs';

var DEALS = parseInt(process.argv[2] || '60', 10);
var SHOW = process.argv[3] === 'exemplos';
function shuffled(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
var N = { ouros:'♦', copas:'♥', espadas:'♠', paus:'♣' };
function cs(c){ return c.v + N[c.s]; }
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0]; deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random()*4)] };
}
// [situações, vezes que fez]
var st = { new: {}, old: {} };
var ex = [];
function rec(bot, k, did, desc){
  var o = st[bot][k] || (st[bot][k] = [0, 0]);
  o[0]++; if(did) o[1]++;
  if(SHOW && did && bot === 'new' && ex.length < 12) ex.push(k + ': ' + desc);
}

function playRound(deal, bots){
  var deck = deal.deck.slice(), hands = [[],[],[],[]];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si+k)%4]].push(deck.shift());
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false, tPts: [0,0], ev: [0,0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8), tc = deal.tc;
  while(!roundOver(S)){
    var seat = S.cur, T = S.trump, bot = bots[seat];
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: T, tc: tc, tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var hand = S.hands[seat].slice(), trick = S.trick.slice();
    var card = bot === 'new' ? chooseCard(pv, seat, { endMs: 0, endMin: 100, endMax: 100, rollMs: 0, rollMin: 150, rollMax: 150 }) : chooseCardOld(pv, seat, { samples: 150 });
    var legal = legalCards(hand, trick, T, S.sevenOut, S.trickN);
    var desc = 'mão ' + (S.trickN+1) + ' corte ' + N[T] + ' | mesa: ' + (trick.map(function(x){ return cs(x.card) + (pTm(x.player)===pTm(seat)?'(parc)':'(adv)'); }).join(' ') || '—') + ' | mão: ' + hand.map(cs).join(' ') + ' → ' + cs(card);
    var early = S.deck.length >= 8;
    if(!trick.length && early && !(S.trickN === 0 && seat === S.starter)){
      var hasNonTrumpNonBisca = legal.some(function(c){ return c.s !== T && cPts(c) < 10; });
      if(hasNonTrumpNonBisca) rec(bot, 'saiu de corte (tendo outra opção), início', card.s === T, desc);
      if(hasNonTrumpNonBisca) rec(bot, 'saiu de bisca (tendo outra opção), início', card.s !== T && cPts(card) >= 10, desc);
    }
    if(trick.length){
      var cw = getWin(trick, T), L = trick[0].card.s;
      var mateWin = pTm(cw.player) === pTm(seat);
      var biscas = legal.filter(function(c){ return c.s !== T && cPts(c) >= 10; });
      // Último, parceiro a ganhar, tenho bisca fora do corte: carregar é ponto garantido.
      if(trick.length === 3 && mateWin && biscas.length) rec(bot, 'último c/ parceiro ganhando: carregou bisca', cPts(card) >= 10 && card.s !== T, desc);
      // Encarte: tenho bisca do naipe de saída que ganha a vaza, adversário ainda joga depois.
      var enc = biscas.filter(function(c){ return c.s === L && beats(c, cw.card, L, T); });
      if(!mateWin && trick.length < 3 && enc.length) rec(bot, 'encarte possível (adv. joga depois): encartou', enc.some(function(c){ return c.id === card.id; }), desc);
      if(!mateWin && trick.length === 3 && enc.length) rec(bot, 'encarte sendo o último (seguro): encartou', enc.some(function(c){ return c.id === card.id; }), desc);
      // Bisca na mesa do adversário e tenho corte que ganha.
      var tw = legal.filter(function(c){ return c.s === T && beats(c, cw.card, L, T); });
      var biscaOnTable = trick.some(function(x){ return pTm(x.player) !== pTm(seat) && cPts(x.card) >= 10; }) || trick.reduce(function(s, x){ return s + cPts(x.card); }, 0) >= 10;
      if(!mateWin && biscaOnTable && tw.length) rec(bot, 'bisca na mesa e tenho corte que ganha: cortou', card.s === T && beats(card, cw.card, L, T), desc);
    }
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
}
for(var d=0;d<DEALS;d++){
  var deal = makeDeal();
  playRound(deal, ['new','old','new','old']);
  playRound(deal, ['old','new','old','new']);
}
console.log('Situação — % das vezes que fez (novo | antigo)  [nº de situações]');
var keys = {}; Object.keys(st.new).concat(Object.keys(st.old)).forEach(function(k){ keys[k] = 1; });
Object.keys(keys).forEach(function(k){
  var a = st.new[k] || [0,0], b = st.old[k] || [0,0];
  function pc(x){ return x[0] ? (100*x[1]/x[0]).toFixed(0) + '%' : '-'; }
  console.log('  ' + k + ':  novo ' + pc(a) + ' [' + a[0] + ']  |  antigo ' + pc(b) + ' [' + b[0] + ']');
});
if(SHOW){ console.log('\nExemplos (novo):'); ex.forEach(function(e){ console.log('  ' + e); }); }
