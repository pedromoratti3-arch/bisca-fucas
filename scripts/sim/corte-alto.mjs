/* Diagnóstico: com que frequência o bot gasta corte para pegar vaza pobre (sem bisca na mesa).
 * Uso: node scripts/sim/corte-alto.mjs [deals=30] [exemplos=10] [opts JSON]
 * Todos os quatro assentos são o bot novo. Conta só jogadas com o baralho ainda por acabar.
 */
import { TORD, mkDk, pTm, cPts, cRnk, beats, getWin, legalCards, trickPts, RNK } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';

var DEALS = parseInt(process.argv[2] || '30', 10);
var SHOW = parseInt(process.argv[3] || '10', 10);
var OPTS = Object.assign({ endMs: 0, endMin: 40, endMax: 40, rollMs: 0, rollMin: 120, rollMax: 120 }, process.argv[4] ? JSON.parse(process.argv[4]) : {});
function shuffled(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
var N = { ouros:'♦', copas:'♥', espadas:'♠', paus:'♣' };
function cs(c){ return c.v + N[c.s]; }
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0]; deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random()*4)] };
}
var cnt = {}, ex = [];
function rec(k, desc){ cnt[k] = (cnt[k] || 0) + 1; if(desc && ex.length < SHOW) ex.push(k + ' :: ' + desc); }
var moves = 0, cuts = 0;

for(var d=0;d<DEALS;d++){
  var deal = makeDeal();
  var deck = deal.deck.slice(), hands = [[],[],[],[]];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si+k)%4]].push(deck.shift());
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false, tPts: [0,0], ev: [0,0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8), tc = deal.tc;
  while(!roundOver(S)){
    var seat = S.cur, T = S.trump;
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: T, tc: tc, tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var hand = S.hands[seat].slice(), trick = S.trick.slice();
    var card = chooseCard(pv, seat, OPTS);
    if(S.deck.length && trick.length){
      moves++;
      var legal = legalCards(hand, trick, T, S.sevenOut, S.trickN);
      var cw = getWin(trick, T), L = trick[0].card.s, pts = trickPts(trick);
      var oppWin = pTm(cw.player) !== pTm(seat);
      var last = trick.length === 3;
      var isCut = card.s === T && L !== T && beats(card, cw.card, L, T);
      var prev = trick[trick.length-1].card;
      var rele = card.s === T && card.v === 'A' && prev.s === T && prev.v === '7';
      if(isCut && !rele){
        cuts++;
        var lowerWins = legal.filter(function(c){ return c.s === T && c.id !== card.id && cRnk(c) < cRnk(card) && beats(c, cw.card, L, T); });
        var tier = card.v === 'A' || card.v === '7' ? 'A/7' : cRnk(card) >= RNK.Q ? 'K/J/Q' : 'baixo';
        var desc = 'mão ' + (S.trickN+1) + ' corte ' + N[T] + ' | mesa: ' + trick.map(function(x){ return cs(x.card) + (pTm(x.player)===pTm(seat)?'(parc)':'(adv)'); }).join(' ') + ' | mão: ' + hand.map(cs).join(' ') + ' → ' + cs(card) + (last ? ' [último]' : '') + (oppWin ? '' : ' [parceiro já ganhava]');
        if(pts < 10){
          rec('corte ' + tier + ' em vaza pobre (' + (pts < 5 ? '0-4' : '5-9') + ' pts)' + (lowerWins.length ? ' tendo corte menor que ganhava' : '') + (!oppWin ? ' com o parceiro já ganhando' : ''), tier !== 'baixo' || !oppWin ? desc : null);
        } else if(lowerWins.length && last){
          rec('sobrecorte desnecessário sendo o último (bisca na mesa)', desc);
        }
      }
      // Outros erros grosseiros.
      var winsNow = legal.filter(function(c){ return beats(c, cw.card, L, T); });
      var cardWins = beats(card, cw.card, L, T);
      var junk2 = legal.filter(function(c){ return c.s !== T && cPts(c) === 0; });
      var cheap2 = legal.filter(function(c){ return c.s !== T && cPts(c) < 10; });
      var desc2 = 'mão ' + (S.trickN+1) + ' corte ' + N[T] + ' | mesa: ' + trick.map(function(x){ return cs(x.card) + (pTm(x.player)===pTm(seat)?'(parc)':'(adv)'); }).join(' ') + ' | mão: ' + hand.map(cs).join(' ') + ' → ' + cs(card) + (last ? ' [último]' : '');
      if(oppWin && last && pts >= 10 && winsNow.length && !cardWins) rec('último: deixou bisca para o adversário podendo ganhar', desc2);
      if(oppWin && !cardWins && cPts(card) >= 10 && cheap2.length) rec('deu bisca de presente ao adversário tendo carta barata', desc2);
      if(oppWin && last && !cardWins && cPts(card) > 0 && junk2.length) rec('último: deu pontos tendo lixo', desc2);
      if(!oppWin && last && card.s === T && legal.some(function(c){ return c.s !== T; })) rec('último com parceiro ganhando: gastou corte', desc2);
      if(!oppWin && last && card.s !== T && legal.some(function(c){ return c.s !== T && cPts(c) > cPts(card); })) rec('último com parceiro ganhando: não carregou os pontos', desc2);
    }
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
  process.stderr.write('.');
}
console.log('\nJogadas de resposta com baralho: ' + moves + '  cortes: ' + cuts);
Object.keys(cnt).sort().forEach(function(k){ console.log('  ' + cnt[k] + '× ' + k); });
console.log('\nExemplos:'); ex.forEach(function(e){ console.log('  ' + e); });
