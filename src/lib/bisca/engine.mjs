/* Motor de simulação de uma mão (estado compacto) — usado pelo bot e pelo simulador de torneios. */
import { TORD, nxt, pTm, getWin, legalCards, trickPts, roundMatchValue } from './rules.mjs';

/**
 * Estado compacto: { hands[4], deck, trick, cur, trickN, sevenOut, tPts[2], ev[2], starter, trump }
 * ev = pontos de partida por eventos (Réle, 7 de abertura).
 */
export function cloneState(S){
  return {
    hands: [S.hands[0].slice(), S.hands[1].slice(), S.hands[2].slice(), S.hands[3].slice()],
    deck: S.deck.slice(),
    trick: S.trick.slice(),
    cur: S.cur,
    trickN: S.trickN,
    sevenOut: S.sevenOut,
    tPts: S.tPts.slice(),
    ev: S.ev.slice(),
    starter: S.starter,
    trump: S.trump,
  };
}

/** Aplica uma jogada (muta S). Fecha a vaza e compra cartas como na mesa real (bfResolveEndTrick). */
export function applyPlay(S, card){
  var p = S.cur, T = S.trump;
  var h = S.hands[p];
  for(var i=0;i<h.length;i++){ if(h[i].id === card.id){ h.splice(i, 1); break; } }
  var prev = S.trick.length ? S.trick[S.trick.length - 1].card : null;
  if(prev && prev.s === T && prev.v === '7' && card.s === T && card.v === 'A') S.ev[pTm(p)]++; // Réle
  S.trick.push({ player: p, card: card });
  if(S.trick.length < 4){ S.cur = nxt(p); return; }
  var w = getWin(S.trick, T);
  S.tPts[pTm(w.player)] += trickPts(S.trick);
  var t0 = S.trick[0];
  if(S.trickN === 0 && t0.player === S.starter && t0.card.s === T && t0.card.v === '7'){
    var ot = 1 - pTm(t0.player);
    if(!S.trick.some(function(x){ return x.card.s === T && x.card.v === 'A' && pTm(x.player) === ot; })) S.ev[pTm(t0.player)]++;
  }
  if(S.trick.some(function(x){ return x.card.s === T && x.card.v === '7'; })) S.sevenOut = true;
  var wi = TORD.indexOf(w.player);
  for(var j=0;j<4;j++){
    if(S.deck.length) S.hands[TORD[(wi + j) % 4]].push(S.deck.shift());
  }
  S.trick = [];
  S.trickN++;
  S.cur = w.player;
}

export function roundOver(S){
  return !S.trick.length && !S.hands[0].length && !S.hands[1].length && !S.hands[2].length && !S.hands[3].length;
}

/** Valor final para a dupla mt: pontos de partida + desempate pequeno pela diferença de pontos na mesa. */
export function stateValue(S, mt, base, tieBonus){
  return roundMatchValue(S.tPts, S.ev, mt, base, tieBonus) + 0.004 * (S.tPts[mt] - S.tPts[1 - mt]);
}

/** Minimax exato com cortes alfa-beta (informação perfeita no mundo sorteado); a dupla mt maximiza. */
export function searchExact(S, mt, base, tieBonus, alpha, beta){
  if(roundOver(S)) return stateValue(S, mt, base, tieBonus);
  var moves = legalCards(S.hands[S.cur], S.trick, S.trump, S.sevenOut, S.trickN);
  var maxing = pTm(S.cur) === mt;
  var best = maxing ? -Infinity : Infinity;
  for(var i=0;i<moves.length;i++){
    var N = cloneState(S);
    applyPlay(N, moves[i]);
    var v = searchExact(N, mt, base, tieBonus, alpha, beta);
    if(maxing){ if(v > best) best = v; if(best > alpha) alpha = best; }
    else { if(v < best) best = v; if(best < beta) beta = best; }
    if(beta <= alpha) break;
  }
  return best;
}
