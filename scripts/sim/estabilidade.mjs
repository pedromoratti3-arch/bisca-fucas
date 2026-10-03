/* Estabilidade da decisão: com as opções reais da mesa (tempo padrão), o bot escolhe a mesma carta
 * se decidir duas vezes na mesma situação? Mede quanto "ruído" há na simulação.
 * Uso: node scripts/sim/estabilidade.mjs [posições=60] '[opts JSON]'
 */
import { TORD, mkDk } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard, proFilter } from '../../src/lib/bisca/ai.mjs';
import { legalCards } from '../../src/lib/bisca/rules.mjs';

var NPOS = parseInt(process.argv[2] || '60', 10);
var OPTS = process.argv[3] ? JSON.parse(process.argv[3]) : {};
var FAST = { endMs: 0, endMin: 30, endMax: 30, rollMs: 0, rollMin: 80, rollMax: 80 };
var N = { ouros:'♦', copas:'♥', espadas:'♠', paus:'♣' };
function cs(c){ return c.v + N[c.s]; }
function shuffled(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0]; deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random()*4)] };
}
var tested = 0, same = 0, leadT = 0, leadS = 0, respT = 0, respS = 0, ms = 0, flips = [];
while(tested < NPOS){
  var deal = makeDeal();
  var deck = deal.deck.slice(), hands = [[],[],[],[]];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si+k)%4]].push(deck.shift());
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false, tPts: [0,0], ev: [0,0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8), tc = deal.tc;
  while(!roundOver(S) && tested < NPOS){
    var seat = S.cur;
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: S.trump, tc: tc, tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var card;
    var legal = legalCards(S.hands[seat], S.trick, S.trump, S.sevenOut, S.trickN);
    var cands = proFilter(pv, seat, legal);
    if(S.deck.length && cands.length > 1 && Math.random() < 0.35){
      var t0 = Date.now();
      var a = chooseCard(pv, seat, OPTS);
      var b = chooseCard(pv, seat, OPTS);
      ms += Date.now() - t0;
      tested++;
      var eq = a.id === b.id;
      if(eq) same++;
      if(S.trick.length){ respT++; if(eq) respS++; } else { leadT++; if(eq) leadS++; }
      if(!eq && flips.length < 8) flips.push((S.trick.length ? 'resposta' : 'saída') + ' corte ' + N[S.trump] + ' | mesa: ' + (S.trick.map(function(x){ return cs(x.card); }).join(' ') || '—') + ' | mão: ' + S.hands[seat].map(cs).join(' ') + ' → ' + cs(a) + ' / ' + cs(b));
      card = a;
    } else card = chooseCard(pv, seat, FAST);
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
  process.stderr.write('.');
}
console.log('\nPosições: ' + tested + '  mesma carta nas duas decisões: ' + same + ' (' + (100*same/tested).toFixed(0) + '%)');
console.log('  saídas: ' + leadS + '/' + leadT + '   respostas: ' + respS + '/' + respT);
console.log('  tempo médio por decisão: ' + (ms / (2*tested)).toFixed(0) + 'ms');
console.log('Exemplos de mudança:'); flips.forEach(function(f){ console.log('  ' + f); });
