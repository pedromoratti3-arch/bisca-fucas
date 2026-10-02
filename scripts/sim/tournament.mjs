/* Torneio bot NOVO × bot ANTIGO.
 * Uso:  node scripts/sim/tournament.mjs [deals=200] [oldSamples=60]
 * Cada distribuição é jogada duas vezes trocando as duplas de bot (formato "duplicado"),
 * para a sorte das cartas se anular. Mede pontos de partida por mão a favor do bot novo.
 */
import { SUITS, TORD, mkDk, pTm, legalCards, roundMatchValue } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';
import { chooseCardOld } from './old-ai.mjs';

var DEALS = parseInt(process.argv[2] || '200', 10);
var OLD_SAMPLES = parseInt(process.argv[3] || '60', 10);
var NEW_OPTS = { endMs: 0, endMin: OLD_SAMPLES, endMax: OLD_SAMPLES, rollMs: 0, rollMin: parseInt(process.argv[4] || '60', 10), rollMax: parseInt(process.argv[4] || '60', 10), mode: process.argv[5] || 'rollout', margin: process.argv[6] != null && process.argv[6] !== '-' ? parseFloat(process.argv[6]) : undefined, trickW: process.argv[7] != null ? parseFloat(process.argv[7]) : 0, ruleW: process.argv[8] != null ? parseFloat(process.argv[8]) : 0, samples: 100 };
console.error('novo:', JSON.stringify(NEW_OPTS), ' antigo: samples=' + OLD_SAMPLES);

function shuffled(a){
  a = a.slice();
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}

/** Distribuição: baralho embaralhado, corte (carta virada no fundo, nunca Ás/7), quem começa. */
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0];
  deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random() * 4)] };
}

/** Joga uma mão inteira; bots[seat] = 'new' | 'old'. Devolve pontos de partida da dupla 0 e estatísticas. */
function playRound(deal, bots, stats){
  var deck = deal.deck.slice();
  var hands = [[], [], [], []];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si + k) % 4]].push(deck.shift());
  var tc = deal.tc;
  // Troca do 2 de corte pela carta virada (feita logo, por quem a tiver).
  for(var s=0;s<4;s++){
    var i2 = hands[s].findIndex(function(c){ return c.s === deal.trump && c.v === '2'; });
    if(i2 >= 0 && deck.length && deck[deck.length - 1].id === tc.id){
      var two = hands[s][i2];
      hands[s][i2] = deck[deck.length - 1];
      deck[deck.length - 1] = two;
      tc = null;
      break;
    }
  }
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false,
    tPts: [0, 0], ev: [0, 0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8);
  var guard = 0;
  while(!roundOver(S) && guard++ < 50){
    var seat = S.cur;
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: S.trump, tc: tc,
      tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var t0 = Date.now();
    var card = bots[seat] === 'new' ? chooseCard(pv, seat, NEW_OPTS) : chooseCardOld(pv, seat, { samples: OLD_SAMPLES });
    stats[bots[seat]].ms += Date.now() - t0;
    stats[bots[seat]].moves++;
    var legal = legalCards(S.hands[seat], S.trick, S.trump, S.sevenOut, S.trickN);
    if(!card || !legal.some(function(c){ return c.id === card.id; })) throw new Error('jogada ilegal do bot ' + bots[seat]);
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
  return { v: roundMatchValue(S.tPts, S.ev, 0, 1, 0), tPts: S.tPts.slice(), ev: S.ev.slice() };
}

var stats = { new: { ms: 0, moves: 0 }, old: { ms: 0, moves: 0 } };
var sum = 0, sumSq = 0, newRoundWins = 0, oldRoundWins = 0, capNew = 0, capOld = 0, ptsNew = 0, games = 0;
var t0 = Date.now();
for(var d=0;d<DEALS;d++){
  var deal = makeDeal();
  var A = playRound(deal, ['new', 'old', 'new', 'old'], stats); // dupla 0 = novo
  var B = playRound(deal, ['old', 'new', 'old', 'new'], stats); // dupla 1 = novo
  var gain = A.v - B.v; // pontos de partida do novo nas duas mãos
  sum += gain; sumSq += gain * gain;
  [[A, 0], [B, 1]].forEach(function(x){
    var R = x[0], nt = x[1];
    if(R.tPts[nt] > R.tPts[1 - nt]) newRoundWins++; else if(R.tPts[nt] < R.tPts[1 - nt]) oldRoundWins++;
    if(R.tPts[1 - nt] < 30 && R.tPts[nt] > 60) capNew++;
    if(R.tPts[nt] < 30 && R.tPts[1 - nt] > 60) capOld++;
    ptsNew += R.tPts[nt];
    games++;
  });
  if((d + 1) % 25 === 0) process.stderr.write('.' );
}
var mean = sum / DEALS;
var sd = Math.sqrt(Math.max(0, sumSq / DEALS - mean * mean));
var se = sd / Math.sqrt(DEALS);
console.log('\nDistribuições: ' + DEALS + ' (x2 = ' + games + ' mãos)  tempo: ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('Pontos de partida do NOVO por distribuição (2 mãos): ' + mean.toFixed(3) + '  ± ' + (1.96 * se).toFixed(3) + ' (IC 95%)');
console.log('Mãos ganhas na mesa — novo: ' + newRoundWins + '  antigo: ' + oldRoundWins + '  (' + (100 * newRoundWins / (newRoundWins + oldRoundWins)).toFixed(1) + '% do novo)');
console.log('Média de pontos de carta do novo por mão: ' + (ptsNew / games).toFixed(1) + ' / 120');
console.log('Capotes — o novo deu: ' + capNew + '  o novo levou: ' + capOld);
console.log('Tempo médio por jogada — novo: ' + (stats.new.ms / stats.new.moves).toFixed(1) + 'ms  antigo: ' + (stats.old.ms / stats.old.moves).toFixed(1) + 'ms');
