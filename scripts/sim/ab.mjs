/* Torneio A × B do bot novo com opções diferentes (ex.: com e sem o filtro de regras duras).
 * Uso:  node scripts/sim/ab.mjs [deals=100] '[optsA JSON]' '[optsB JSON]'
 * Padrão: A = {} (filtro ligado), B = {"noFilter":true}. Cada distribuição é jogada duas vezes trocando
 * as duplas (formato duplicado). Mede pontos de partida por distribuição a favor de A.
 */
import { TORD, mkDk, legalCards, roundMatchValue } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';

var DEALS = parseInt(process.argv[2] || '100', 10);
var FAST = { endMs: 0, endMin: 40, endMax: 40, rollMs: 0, rollMin: 120, rollMax: 120 };
var A = Object.assign({}, FAST, process.argv[3] ? JSON.parse(process.argv[3]) : {});
var B = Object.assign({}, FAST, process.argv[4] ? JSON.parse(process.argv[4]) : { noFilter: true });
console.error('A:', JSON.stringify(A), '\nB:', JSON.stringify(B));

function shuffled(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0]; deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random() * 4)] };
}
function playRound(deal, bots, stats){
  var deck = deal.deck.slice(), hands = [[], [], [], []];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si + k) % 4]].push(deck.shift());
  var tc = deal.tc;
  for(var s=0;s<4;s++){
    var i2 = hands[s].findIndex(function(c){ return c.s === deal.trump && c.v === '2'; });
    if(i2 >= 0 && deck.length && deck[deck.length - 1].id === tc.id){
      var two = hands[s][i2]; hands[s][i2] = deck[deck.length - 1]; deck[deck.length - 1] = two; tc = null; break;
    }
  }
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false, tPts: [0, 0], ev: [0, 0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8);
  while(!roundOver(S)){
    var seat = S.cur;
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: S.trump, tc: tc, tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var t0 = Date.now();
    var card = chooseCard(pv, seat, bots[seat] === 'A' ? A : B);
    stats[bots[seat]].ms += Date.now() - t0; stats[bots[seat]].moves++;
    var legal = legalCards(S.hands[seat], S.trick, S.trump, S.sevenOut, S.trickN);
    if(!card || !legal.some(function(c){ return c.id === card.id; })) throw new Error('jogada ilegal do bot ' + bots[seat]);
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
  return { v: roundMatchValue(S.tPts, S.ev, 0, 1, 0), tPts: S.tPts.slice() };
}
var stats = { A: { ms: 0, moves: 0 }, B: { ms: 0, moves: 0 } };
var sum = 0, sumSq = 0, winsA = 0, winsB = 0, ptsA = 0, games = 0, capA = 0, capB = 0;
var t0 = Date.now();
for(var d=0;d<DEALS;d++){
  var deal = makeDeal();
  var r1 = playRound(deal, ['A', 'B', 'A', 'B'], stats);
  var r2 = playRound(deal, ['B', 'A', 'B', 'A'], stats);
  var gain = r1.v - r2.v;
  sum += gain; sumSq += gain * gain;
  [[r1, 0], [r2, 1]].forEach(function(x){
    var R = x[0], t = x[1];
    if(R.tPts[t] > R.tPts[1 - t]) winsA++; else if(R.tPts[t] < R.tPts[1 - t]) winsB++;
    if(R.tPts[1 - t] < 30 && R.tPts[t] > 60) capA++;
    if(R.tPts[t] < 30 && R.tPts[1 - t] > 60) capB++;
    ptsA += R.tPts[t]; games++;
  });
  if((d + 1) % 10 === 0) process.stderr.write('.');
}
var mean = sum / DEALS, sd = Math.sqrt(Math.max(0, sumSq / DEALS - mean * mean)), se = sd / Math.sqrt(DEALS);
console.log('\nDistribuições: ' + DEALS + ' (x2 = ' + games + ' mãos)  tempo: ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('Pontos de partida de A por distribuição (2 mãos): ' + mean.toFixed(3) + ' ± ' + (1.96 * se).toFixed(3) + ' (IC 95%)');
console.log('Mãos ganhas — A: ' + winsA + '  B: ' + winsB + '  (' + (100 * winsA / Math.max(1, winsA + winsB)).toFixed(1) + '% de A)');
console.log('Média de pontos de carta de A por mão: ' + (ptsA / games).toFixed(1) + ' / 120');
console.log('Capotes — A deu: ' + capA + '  A levou: ' + capB);
console.log('Tempo médio por jogada — A: ' + (stats.A.ms / stats.A.moves).toFixed(1) + 'ms  B: ' + (stats.B.ms / stats.B.moves).toFixed(1) + 'ms');
