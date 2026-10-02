/* Diagnóstico: joga mãos NOVO × ANTIGO e conta erros típicos de cada bot.
 * Uso: node scripts/sim/diagnose.mjs [deals=40]
 */
import { TORD, mkDk, pTm, cPts, cRnk, beats, getWin, legalCards, trickPts } from '../../src/lib/bisca/rules.mjs';
import { applyPlay, roundOver } from '../../src/lib/bisca/engine.mjs';
import { chooseCard, scoreCandidates } from '../../src/lib/bisca/ai.mjs';
import { chooseCardOld } from './old-ai.mjs';

var DEALS = parseInt(process.argv[2] || '40', 10);
var SHOW = parseInt(process.argv[3] || '6', 10);
function shuffled(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function makeDeal(){
  var deck = shuffled(mkDk());
  var tcIdx = deck.findIndex(function(c){ return c.v !== 'A' && c.v !== '7'; });
  var tc = deck.splice(tcIdx, 1)[0]; deck.push(tc);
  return { deck: deck, tc: tc, trump: tc.s, starter: TORD[Math.floor(Math.random()*4)] };
}
var N = { ouros:'♦', copas:'♥', espadas:'♠', paus:'♣' };
function cs(c){ return c.v + N[c.s]; }

var errs = { new: {}, old: {} };
var examples = [];
function bump(bot, k, ex){ errs[bot][k] = (errs[bot][k] || 0) + 1; if(ex && bot === 'new' && examples.length < SHOW) examples.push(k + ': ' + ex); }

function playRound(deal, bots){
  var deck = deal.deck.slice(), hands = [[],[],[],[]];
  var si = TORD.indexOf(deal.starter);
  for(var r=0;r<3;r++) for(var k=0;k<4;k++) hands[TORD[(si+k)%4]].push(deck.shift());
  var tc = deal.tc;
  var S = { hands: hands, deck: deck, trick: [], cur: deal.starter, trickN: 0, sevenOut: false, tPts: [0,0], ev: [0,0], starter: deal.starter, trump: deal.trump };
  var fd = deal.deck.slice(0, 8);
  while(!roundOver(S)){
    var seat = S.cur, T = S.trump;
    var pv = { hands: S.hands, deck: S.deck, trick: S.trick, trickN: S.trickN, trump: T, tc: tc, tPts: S.tPts, trumpSevenOut: S.sevenOut, starter: S.starter, fd: fd, batido: false, tieBonus: 0, aceReveal: null };
    var bot = bots[seat];
    var card = bot === 'new' ? chooseCard(pv, seat, { endMs: 0, endMin: 60, endMax: 60 }) : chooseCardOld(pv, seat, { samples: 60 });
    var hand = S.hands[seat].slice();
    var trick = S.trick.slice();
    var desc = 'mão ' + (S.trickN+1) + ' corte ' + N[T] + ' | mesa: ' + (trick.map(function(x){ return cs(x.card) + (pTm(x.player)===pTm(seat)?'(parc)':'(adv)'); }).join(' ') || '—') + ' | mão: ' + hand.map(cs).join(' ') + ' → jogou ' + cs(card);
    if(bot === 'new' && S.deck.length){
      var sc = scoreCandidates(pv, seat, { samples: 160 });
      desc += '  [' + sc.map(function(x){ return cs(x.card) + ':' + x.score.toFixed(1); }).join(' ') + ']';
    }
    if(trick.length){
      var cw = getWin(trick, T), L = trick[0].card.s, pts = trickPts(trick);
      var oppWin = pTm(cw.player) !== pTm(seat);
      var winsNow = legalCards(hand, trick, T, S.sevenOut, S.trickN).filter(function(c){ return beats(c, cw.card, L, T); });
      var cardWins = beats(card, cw.card, L, T);
      if(oppWin && trick.length === 3 && pts >= 10 && winsNow.length && !cardWins) bump(bot, 'último, deixou bisca com o adversário podendo ganhar', desc);
      if(oppWin && !cardWins && cPts(card) >= 10) bump(bot, 'deu bisca de presente ao adversário', desc);
      if(oppWin && trick.length === 3 && !cardWins && cPts(card) > 0 && hand.some(function(c){ return cPts(c) === 0 && c.s !== T; })) bump(bot, 'último, deu pontos tendo lixo', desc);
      if(!oppWin && card.s === T && cardWins === false && cRnk(card) >= 7) bump(bot, 'gastou corte alto com a vaza já nossa', desc);
      if(oppWin && card.s === T && card.v === 'A' && pts + 11 < 18 && S.deck.length > 4) bump(bot, 'Ás de corte em vaza fraca no início', desc);
    } else {
      if(card.s !== T && cPts(card) >= 10 && S.deck.length > 8) bump(bot, 'saiu de bisca no início', desc);
      if(card.s === T && cRnk(card) >= 7 && S.deck.length > 8 && !(S.trickN===0 && card.v==='7')) bump(bot, 'saiu de corte alto no início', desc);
    }
    if(tc && card.id === tc.id) tc = null;
    applyPlay(S, card);
  }
  return S;
}

for(var d=0;d<DEALS;d++){
  var deal = makeDeal();
  playRound(deal, ['new','old','new','old']);
  playRound(deal, ['old','new','old','new']);
}
console.log('Erros típicos em ' + (DEALS*2) + ' mãos (cada bot joga metade das jogadas):');
var keys = {};
Object.keys(errs.new).concat(Object.keys(errs.old)).forEach(function(k){ keys[k] = 1; });
Object.keys(keys).forEach(function(k){ console.log('  ' + k + ' — novo: ' + (errs.new[k]||0) + '  antigo: ' + (errs.old[k]||0)); });
console.log('\nExemplos do novo:');
examples.forEach(function(e){ console.log('  ' + e); });
