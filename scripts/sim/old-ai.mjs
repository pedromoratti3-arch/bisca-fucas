/* Bot ANTIGO (commit 6260132), congelado só para comparar no torneio. Não é usado no jogo. */
import { RNK, parseSeat, cPts, cRnk, pTm, beats, getWin, legalCards, trickPts } from '../../src/lib/bisca/rules.mjs';
import { cloneState, applyPlay, roundOver, stateValue, searchExact } from '../../src/lib/bisca/engine.mjs';

var AI_ROLLOUT_RANDOM = 0.08;

/** Mão do parceiro vista na revelação do início da mão: { [seat]: { key, ids } } */
var partnerSeen = {};
function roundKey(pv){
  var fd = Array.isArray(pv.fd) ? pv.fd : [];
  return fd.slice(0, 8).map(function(c){ return c ? c.id : '-'; }).join(',') + '|' + pv.trump;
}

/**
 * O que o bot sabe: cartas com dono conhecido (pinned), cartas que não vê (unknown) e quantas faltam
 * sortear para cada jogador e para o baralho.
 */
function buildWorldSpec(pv, seat){
  var mate = (seat + 2) % 4;
  var pinned = [[], [], [], []];
  var pinnedIds = {};
  function pin(s, c){ pinned[s].push(c); pinnedIds[c.id] = true; }

  // Parceiro: mão mostrada no início da mão e de novo na 8.ª vaza (trickN 7).
  var key = roundKey(pv);
  var mateHand = (pv.hands[mate] || []).filter(Boolean);
  if(pv.trickN === 0){
    var ids0 = {};
    mateHand.forEach(function(c){ ids0[c.id] = true; });
    partnerSeen[seat] = { key: key, ids: ids0 };
  }
  var seen = partnerSeen[seat];
  mateHand.forEach(function(c){
    if(pv.trickN >= 7 || (seen && seen.key === key && seen.ids[c.id])) pin(mate, c);
  });

  // Carta de corte: no fundo do baralho ou com quem a comprou (posição pública).
  var deck = (pv.deck || []).filter(Boolean);
  var tcBottom = null;
  if(pv.tc && deck.length && deck[deck.length - 1].id === pv.tc.id){
    tcBottom = deck[deck.length - 1];
    pinnedIds[tcBottom.id] = true;
  } else if(pv.tc){
    for(var s=0;s<4;s++){
      if(s === seat || s === mate) continue;
      if((pv.hands[s] || []).some(function(c){ return c && c.id === pv.tc.id; })) pin(s, pv.tc);
    }
  }
  // Ás de corte revelado com o 7 como 4.ª carta.
  if(pv.aceReveal && pv.aceReveal.ace && pv.aceReveal.seat !== seat){
    var rs = pv.aceReveal.seat;
    var ac = (pv.hands[rs] || []).find(function(c){ return c && c.id === pv.aceReveal.ace.id; });
    if(ac && !pinnedIds[ac.id]) pin(rs, ac);
  }

  var unknown = [];
  var need = [0, 0, 0, 0];
  for(var o=0;o<4;o++){
    if(o === seat) continue;
    var h = (pv.hands[o] || []).filter(Boolean);
    need[o] = h.length - pinned[o].length;
    h.forEach(function(c){ if(!pinnedIds[c.id]) unknown.push(c); });
  }
  deck.forEach(function(c){ if(!pinnedIds[c.id]) unknown.push(c); });
  return { pinned: pinned, need: need, unknown: unknown, deckNeed: deck.length - (tcBottom ? 1 : 0), tcBottom: tcBottom };
}

function shuffleInPlace(a){
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function sampleWorld(pv, seat, spec){
  var pool = shuffleInPlace(spec.unknown.slice());
  var k = 0;
  var hands = [[], [], [], []];
  for(var o=0;o<4;o++){
    if(o === seat){ hands[o] = (pv.hands[seat] || []).filter(Boolean); continue; }
    hands[o] = spec.pinned[o].slice();
    for(var n=0;n<spec.need[o];n++) hands[o].push(pool[k++]);
  }
  var deck = pool.slice(k, k + spec.deckNeed);
  if(spec.tcBottom) deck.push(spec.tcBottom);
  var st = parseSeat(pv.starter);
  return { hands: hands, deck: deck, trick: (pv.trick || []).slice(), cur: seat, trickN: pv.trickN || 0,
    sevenOut: !!pv.trumpSevenOut, tPts: (pv.tPts || [0, 0]).slice(), ev: [0, 0], starter: isNaN(st) ? 2 : st, trump: pv.trump };
}

function aiShedCost(c, trump){
  if(c.s === trump) return 6 + cRnk(c) * 1.2 + cPts(c);
  return cPts(c) + cRnk(c) * 0.1;
}
function aiWinCost(c, trump){
  if(c.s === trump) return 5 + cRnk(c) + cPts(c) * 0.3;
  return cRnk(c) * 0.1 - cPts(c) * 0.5;
}
function aiMinBy(cards, f){
  var best = null, bv = Infinity;
  for(var i=0;i<cards.length;i++){ var v = f(cards[i]); if(v < bv){ bv = v; best = cards[i]; } }
  return best;
}
function aiQuickPick(S, p){
  var T = S.trump;
  var legal = legalCards(S.hands[p], S.trick, T, S.sevenOut, S.trickN);
  if(legal.length <= 1) return legal[0];
  if(Math.random() < AI_ROLLOUT_RANDOM) return legal[Math.floor(Math.random() * legal.length)];
  var shed = function(c){ return aiShedCost(c, T); };
  if(!S.trick.length) return aiMinBy(legal, shed);
  var lead = S.trick[0].card.s;
  var cw = getWin(S.trick, T);
  var mt = pTm(p);
  var last = S.trick.length === 3;
  if(pTm(cw.player) === mt){
    var safe = last || (cw.card.s === T && cRnk(cw.card) >= RNK.K) || (cw.card.s !== T && cw.card.v === 'A');
    if(safe){
      var give = aiMinBy(legal, function(c){ return c.s === T ? 50 + cRnk(c) : -cPts(c); });
      if(give && give.s !== T) return give;
    }
    return aiMinBy(legal, shed);
  }
  var pts = trickPts(S.trick);
  var wins = legal.filter(function(c){ return beats(c, cw.card, lead, T); });
  if(wins.length){
    var best = aiMinBy(wins, function(c){ return aiWinCost(c, T); });
    var gain = pts + cPts(best);
    if(best.s !== T || gain >= 10 || (last && gain >= 4) || (S.trickN >= 7 && gain >= 2)) return best;
  }
  return aiMinBy(legal, shed);
}
function aiRollout(S, mt, base, tieBonus){
  var guard = 0;
  while(!roundOver(S) && guard++ < 60){
    var c = aiQuickPick(S, S.cur);
    if(!c) break;
    applyPlay(S, c);
  }
  return stateValue(S, mt, base, tieBonus);
}

/** opts.samples: nº fixo de sorteios por decisão (no navegador o antigo fazia 24–600 em 220 ms). */
export function chooseCardOld(pv, seat, opts){
  var hand = (pv.hands[seat] || []).filter(Boolean);
  if(!hand.length) return null;
  var cands = legalCards(hand, pv.trick || [], pv.trump, !!pv.trumpSevenOut, pv.trickN || 0);
  if(cands.length === 1) return cands[0];
  var mt = pTm(seat);
  var base = pv.batido && pv.trump === 'copas' ? 2 : 1;
  var tieBonus = pv.tieBonus || 0;
  var spec = buildWorldSpec(pv, seat);
  var exact = !(pv.deck || []).filter(Boolean).length;
  var totals = cands.map(function(){ return 0; });
  var N = (opts && opts.samples) || 60;
  for(var n=0;n<N;n++){
    var W = sampleWorld(pv, seat, spec);
    for(var i=0;i<cands.length;i++){
      var S = cloneState(W);
      applyPlay(S, cands[i]);
      totals[i] += exact ? searchExact(S, mt, base, tieBonus, -Infinity, Infinity) : aiRollout(S, mt, base, tieBonus);
    }
  }
  var best = 0;
  for(var b=1;b<cands.length;b++){
    var d = totals[b] - totals[best];
    if(d > 1e-9 * N || (Math.abs(d) <= 1e-9 * N && aiShedCost(cands[b], pv.trump) < aiShedCost(cands[best], pv.trump))) best = b;
  }
  return cands[best];
}
