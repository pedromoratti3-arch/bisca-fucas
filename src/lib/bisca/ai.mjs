/* ═══ IA da Bisca — "jogador profissional" ═══
 *
 * MEMÓRIA (conta cartas): sabe tudo o que já saiu, quais cortes e biscas ainda estão por aí, a mão do
 * parceiro (mostrada no início da mão e de novo na 8.ª vaza) e onde está a carta de corte virada.
 * Nunca espreita as cartas escondidas: só usa o conjunto do que ainda não viu.
 *
 * Para cada carta que pode jogar, a decisão soma três coisas:
 *
 * 1. A MÃO ATÉ AO FIM (scoreByRollout): imagina muitas distribuições possíveis das cartas que não vê e
 *    joga a mão até ao fim com TODOS a seguir regras de mesa (playPolicy: cortar bisca, cobrir com corte
 *    alto, encartar só quando é seguro, Réle, 7 de abertura, descartar lixo). Valor = pontos de partida
 *    (vitória, capote, 61, Réle, 7 de abertura) + diferença de pontos de carta.
 *
 * 2. ESTA VAZA (scoreCandidates, peso TRICK_W): o risco imediato — "se eu encartar este 7, qual a chance
 *    do próximo ter corte?" — e o valor de guardar cada carta gasta (holdValue): corte alto vale muito
 *    enquanto houver biscas para pegar. Sinal estável que reduz o ruído da simulação longa. O placar da
 *    mão muda os pesos: perto do capote valem pontinhos seguros; mão ganha (61+) não arrisca.
 *
 * 3. FREIOS DE PROFISSIONAL (proRulePenalty, peso RULE_W): Ás/7 de corte em vaza pobre, sair de bisca
 *    desprotegida, encarte com adversário que provavelmente corta.
 *
 * Fim da mão (baralho vazio, últimas 3 vazas): busca exata em cada distribuição sorteada.
 * Calibrado com scripts/sim (torneio contra o bot antigo e situações-teste dos exemplos de mesa).
 */
import {
  RNK, TORD, nxt, parseSeat, cPts, cRnk, pTm, beats, getWin, legalCards, trickPts, roundMatchValue,
} from './rules.mjs';
import { cloneState, applyPlay, searchExact, roundOver } from './engine.mjs';

/** 1 ponto de partida (Réle, 7 de abertura) em “pontos de carta” para comparar com o resto. */
var MP_PTS = 25;
/** Distribuições sorteadas por decisão (meio da mão). */
var MID_SAMPLES = 200;
/** Limites da busca exata no fim da mão. */
var END_TIME_MS = 180;
var END_MIN_SAMPLES = 16;
var END_MAX_SAMPLES = 300;

/* ───────── 1. Memória ───────── */

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
export function buildWorldSpec(pv, seat, opts){
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
    if(pv.trickN >= 7 || (opts && opts.knownMate) || (seen && seen.key === key && seen.ids[c.id])) pin(mate, c);
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

/** Uma distribuição possível das cartas escondidas, coerente com o que o bot sabe. */
export function sampleWorld(pv, seat, spec){
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
  return {
    hands: hands,
    deck: deck,
    trick: (pv.trick || []).slice(),
    cur: seat,
    trickN: pv.trickN || 0,
    sevenOut: !!pv.trumpSevenOut,
    tPts: (pv.tPts || [0, 0]).slice(),
    ev: [0, 0],
    starter: isNaN(st) ? 2 : st,
    trump: pv.trump,
  };
}

/**
 * Contagem de cartas do ponto de vista de `seat`: cartas que ainda podem estar com os adversários
 * (não vistas, fora da minha mão e da mão conhecida do parceiro).
 */
function buildCount(pv, seat, spec){
  var mate = (seat + 2) % 4;
  var hidden = spec.unknown.slice();
  for(var s=0;s<4;s++){
    if(s === seat || s === mate) continue;
    hidden = hidden.concat(spec.pinned[s]);
  }
  if(spec.tcBottom) hidden.push(spec.tcBottom);
  var T = pv.trump;
  var hiddenTrumps = hidden.filter(function(c){ return c.s === T; }).length;
  // Fração das cartas escondidas que está com os adversários (o resto está no baralho ou com o parceiro).
  var oppSlots = 0;
  for(var o=0;o<4;o++){ if(o !== seat && o !== mate) oppSlots += (pv.hands[o] || []).filter(Boolean).length; }
  var oppFrac = hidden.length ? Math.min(1, oppSlots / hidden.length) : 0;
  return { hidden: hidden, hiddenTrumps: hiddenTrumps, oppTrumpsExp: hiddenTrumps * oppFrac };
}

/** Quantas cartas escondidas do mesmo naipe batem esta carta (para o corte: cortes maiores ainda fora). */
function higherHidden(c, count){
  var n = 0;
  for(var i=0;i<count.hidden.length;i++){
    var h = count.hidden[i];
    if(h.s === c.s && cRnk(h) > cRnk(c)) n++;
  }
  return n;
}

/* ───────── 3. Valor de guardar uma carta ───────── */

/** Controle que um corte dá no resto da mão (pegar biscas), por valor da carta. */
var TRUMP_CONTROL = { A: 12, '7': 9, K: 7, J: 6, Q: 5 };

/**
 * Quanto esta carta ainda deve render para a nossa dupla se for guardada (pontos de carta).
 * Inclui os próprios pontos (se forem ficar connosco) e o controlo do jogo.
 */
function holdValue(c, ctx){
  var T = ctx.trump;
  var future = Math.min(1, ctx.tricksAfter / 5); // ainda há biscas para pegar?
  if(c.s === T){
    var hi = higherHidden(c, ctx.count);
    var safe = hi === 0 ? 1 : hi === 1 ? 0.75 : 0.55;
    var ctrl = TRUMP_CONTROL[c.v] != null ? TRUMP_CONTROL[c.v] : 3.5 + cRnk(c) * 0.3;
    return cPts(c) * safe + ctrl * future * (0.6 + 0.4 * safe);
  }
  var pts = cPts(c);
  if(!pts) return 0;
  // Bisca / figura fora do corte: pode acabar cortada. Quanto mais cortes os adversários têm, pior.
  var risk = Math.min(1, ctx.count.oppTrumpsExp / 3);
  var beaten = higherHidden(c, ctx.count) > 0;
  var keep = pts >= 10 ? (beaten ? 0.4 : 0.7) - 0.3 * risk : 0.5 - 0.15 * risk;
  return pts * Math.max(0.1, keep);
}

/* ───────── Placar: o que importa agora ───────── */

/** Pesos para pontos nossos e deles nesta vaza, conforme a mão está aberta, ganha, perdida ou perto do capote. */
function scoreWeights(tPts, mt){
  var my = tPts[mt], op = tPts[1 - mt];
  var remaining = 120 - my - op;
  if(my >= 61) return { wMy: 0.15, wOp: op < 30 && op + remaining >= 30 ? 1.3 : 0.15 };
  if(op >= 61) return { wMy: my < 30 ? 1.5 : 0.15, wOp: 0.15 };
  var wMy = 1, wOp = 1;
  // Perto do capote: pontinhos seguros valem mais do que arriscar.
  if(my < 30 && remaining <= 60) wMy = 1.4;
  if(op < 30 && remaining <= 60) wOp = 1.25;
  return { wMy: wMy, wOp: wOp };
}

/* ───────── 2. Como a mesa responde (bom senso de jogador) ───────── */

function minBy(cards, f){
  var best = null, bv = Infinity;
  for(var i=0;i<cards.length;i++){ var v = f(cards[i]); if(v < bv){ bv = v; best = cards[i]; } }
  return best;
}
function maxBy(cards, f){
  return minBy(cards, function(c){ return -f(c); });
}
/** Descartar: lixo primeiro; evitar dar pontos, gastar corte ou bisca. */
function shedCost(c, T){
  if(c.s === T) return 20 + cRnk(c) * 2 + cPts(c);
  return cPts(c) * 1.2 + cRnk(c) * 0.1;
}

/**
 * Resposta de um jogador que já vê cartas na mesa (usada para imaginar os outros jogadores).
 * Regras de mesa: Réle quando dá; ganhar a vaza barato; cortar bisca (com corte alto se ainda
 * houver quem jogue depois); encartar só quando a vaza está garantida; senão, lixo.
 */
export function respondPolicy(S, p){
  var T = S.trump;
  var legal = legalCards(S.hands[p], S.trick, T, S.sevenOut, S.trickN);
  if(legal.length <= 1) return legal[0];
  var trick = S.trick;
  var prev = trick[trick.length - 1].card;
  var aceT = legal.find(function(c){ return c.s === T && c.v === 'A'; });
  // Réle: Ás de corte logo depois do 7 de corte.
  if(aceT && prev.s === T && prev.v === '7') return aceT;
  // 7 de abertura do adversário: o Ás de corte cancela-o.
  if(aceT && S.trickN === 0 && trick[0].card.s === T && trick[0].card.v === '7' && pTm(trick[0].player) !== pTm(p)) return aceT;

  var L = trick[0].card.s;
  var cw = getWin(trick, T);
  var pts = trickPts(trick);
  var last = trick.length === 3;
  var shed = function(c){ return shedCost(c, T); };

  if(pTm(cw.player) === pTm(p)){
    // A minha dupla está a ganhar. Encartar só com a vaza segura.
    var safe = last || (cw.card.s === T && cRnk(cw.card) >= RNK['7']) ||
      (cw.card.s === T && cRnk(cw.card) >= RNK.K && S.sevenOut);
    if(safe){
      var give = maxBy(legal.filter(function(c){ return c.s !== T; }), cPts);
      if(give && cPts(give) > 0) return give;
    }
    return minBy(legal, shed);
  }

  var wins = legal.filter(function(c){ return beats(c, cw.card, L, T); });
  if(!wins.length) return minBy(legal, shed);
  var inSuit = wins.filter(function(c){ return c.s !== T; });
  if(inSuit.length){
    if(last) return maxBy(inSuit, cPts);
    // Ainda joga alguém depois: ganhar no naipe sem pôr bisca à mercê de um corte.
    var cheap = inSuit.filter(function(c){ return cPts(c) < 10; });
    if(cheap.length) return maxBy(cheap, cPts);
    if(pts >= 4) return minBy(inSuit, cRnk);
  }
  var trumps = wins.filter(function(c){ return c.s === T; });
  if(trumps.length){
    var worth = pts >= 10 || (last && pts >= 3) || (S.trickN >= 6 && pts >= 4);
    if(worth){
      if(!last && pts >= 10){
        // Bisca na mesa e ainda há quem jogue: cobrir com corte alto para não levar sobrecorte.
        var high = trumps.filter(function(c){ return cRnk(c) >= RNK.K; });
        if(high.length) return minBy(high, cRnk);
      }
      return minBy(trumps, cRnk);
    }
  }
  return minBy(legal, shed);
}

/**
 * Saída (primeira carta da vaza) dos jogadores imaginados.
 * 7 de abertura quando dá; senão sair de lixo; bisca/corte só quando não há outra coisa.
 */
export function leadPolicy(S, p){
  var T = S.trump;
  var legal = legalCards(S.hands[p], S.trick, T, S.sevenOut, S.trickN);
  if(legal.length <= 1) return legal[0];
  if(S.trickN === 0 && p === S.starter){
    var seven = legal.find(function(c){ return c.s === T && c.v === '7'; });
    if(seven) return seven;
  }
  return minBy(legal, function(c){ return shedCost(c, T); });
}

/** Política completa de um jogador imaginado (sai ou responde). */
export function playPolicy(S, p){
  return S.trick.length ? respondPolicy(S, p) : leadPolicy(S, p);
}

/** Joga a mão imaginada até ao fim com todos a seguir as regras de mesa. */
function rolloutToEnd(S){
  var guard = 0;
  while(!roundOver(S) && guard++ < 60){
    var c = playPolicy(S, S.cur);
    if(!c) break;
    applyPlay(S, c);
  }
}

/** Joga a vaza até ao fim a partir de S (já com a minha carta) e devolve o resultado. */
function finishTrick(S){
  var guard = 0;
  while(S.trick.length && S.trick.length < 4 && guard++ < 4){
    var c = respondPolicy(S, S.cur);
    if(!c) break;
    applyTrickOnly(S, c);
  }
}

/** Joga uma carta só na vaza (sem fechar nem comprar) — chega para avaliar esta vaza. */
function applyTrickOnly(S, card){
  var p = S.cur, T = S.trump;
  var h = S.hands[p];
  for(var i=0;i<h.length;i++){ if(h[i].id === card.id){ h.splice(i, 1); break; } }
  var prev = S.trick.length ? S.trick[S.trick.length - 1].card : null;
  if(prev && prev.s === T && prev.v === '7' && card.s === T && card.v === 'A') S.ev[pTm(p)]++; // Réle
  S.trick.push({ player: p, card: card });
  S.cur = nxt(p);
}

/** Resultado da vaza para a dupla mt: pontos ganhos/perdidos e eventos de partida. */
function trickOutcome(S, mt){
  var T = S.trump;
  var w = getWin(S.trick, T);
  var pts = trickPts(S.trick);
  var ev = S.ev.slice();
  var t0 = S.trick[0];
  if(S.trickN === 0 && t0.player === S.starter && t0.card.s === T && t0.card.v === '7'){
    var ot = 1 - pTm(t0.player);
    if(!S.trick.some(function(x){ return x.card.s === T && x.card.v === 'A' && pTm(x.player) === ot; })) ev[pTm(t0.player)]++;
  }
  var weWin = pTm(w.player) === mt;
  return { my: weWin ? pts : 0, op: weWin ? 0 : pts, evDiff: ev[mt] - ev[1 - mt], weWin: weWin };
}

/* ───────── Decisão ───────── */

function chooseEndgame(pv, seat, cands, spec, opts){
  var endMs = opts && opts.endMs != null ? opts.endMs : END_TIME_MS;
  var endMin = opts && opts.endMin != null ? opts.endMin : END_MIN_SAMPLES;
  var endMax = opts && opts.endMax != null ? opts.endMax : END_MAX_SAMPLES;
  var mt = pTm(seat);
  var base = pv.batido && pv.trump === 'copas' ? 2 : 1;
  var tieBonus = pv.tieBonus || 0;
  var totals = cands.map(function(){ return 0; });
  var t0 = Date.now();
  var n = 0;
  while(n < endMax && (n < endMin || Date.now() - t0 < endMs)){
    var W = sampleWorld(pv, seat, spec);
    for(var i=0;i<cands.length;i++){
      var S = cloneState(W);
      applyPlay(S, cands[i]);
      totals[i] += searchExact(S, mt, base, tieBonus, -Infinity, Infinity);
    }
    n++;
  }
  var best = 0;
  for(var b=1;b<cands.length;b++){
    var d = totals[b] - totals[best];
    if(d > 1e-9 * n || (Math.abs(d) <= 1e-9 * n && shedCost(cands[b], pv.trump) < shedCost(cands[best], pv.trump))) best = b;
  }
  return cands[best];
}

/**
 * Avalia cada carta jogável: valor médio desta vaza (nas distribuições sorteadas, com a mesa a
 * responder com bom senso) menos o que se perde por gastar a carta. Devolve [{card, score}].
 */
export function scoreCandidates(pv, seat, opts){
  var hand = (pv.hands[seat] || []).filter(Boolean);
  var cands = legalCards(hand, pv.trick || [], pv.trump, !!pv.trumpSevenOut, pv.trickN || 0);
  var spec = buildWorldSpec(pv, seat, opts);
  var count = buildCount(pv, seat, spec);
  var mt = pTm(seat);
  var tPts = (pv.tPts || [0, 0]);
  var w = scoreWeights(tPts, mt);
  var cardsLeftPerPlayer = hand.length + Math.floor((pv.deck || []).filter(Boolean).length / 4);
  var ctx = { trump: pv.trump, count: count, tricksAfter: Math.max(0, cardsLeftPerPlayer - 1) };
  var samples = (opts && opts.samples) || MID_SAMPLES;
  var hvCache = {};
  function hv(c){
    if(hvCache[c.id] == null) hvCache[c.id] = holdValue(c, ctx);
    return hvCache[c.id];
  }
  var already = (pv.trick || []).length;
  var sums = cands.map(function(){ return 0; });
  for(var n=0;n<samples;n++){
    var W = sampleWorld(pv, seat, spec);
    for(var i=0;i<cands.length;i++){
      var S = cloneState(W);
      applyTrickOnly(S, cands[i]);
      finishTrick(S);
      var o = trickOutcome(S, mt);
      var v = w.wMy * o.my - w.wOp * o.op + MP_PTS * o.evDiff;
      // O que cada um gastou para chegar a este resultado: cortes e biscas nossos gastos custam;
      // os do adversário são ganho nosso (é o que ele deixa de ter para o resto da mão).
      for(var t=already;t<S.trick.length;t++){
        var x = S.trick[t];
        if(pTm(x.player) === mt) v -= w.wMy * hv(x.card);
        else v += w.wOp * hv(x.card);
      }
      sums[i] += v;
    }
  }
  return cands.map(function(c, i){
    return { card: c, score: sums[i] / samples };
  });
}

/** Peso da diferença de pontos na mesa face a 1 ponto de partida (pontos de carta contam, não só ganhar). */
var MARGIN_W = 0.012;
var ROLL_TIME_MS = 300;
var ROLL_MIN_SAMPLES = 60;
var ROLL_MAX_SAMPLES = 800;
/** Peso da leitura tática da vaza somada à simulação (0 = só simulação). */
var TRICK_W = 0.5;
/** Conversão aproximada: quantos pontos de carta valem 1 ponto de partida. */
var CARD_PTS_PER_MP = 40;
/** Peso dos "freios" de jogador profissional (em pontos de partida). */
var RULE_W = 0.3;

/** Probabilidade de o jogador `s` ter pelo menos um corte, pelo que o bot sabe (contagem de cartas). */
function pHasTrump(spec, s, T){
  if(spec.pinned[s].some(function(c){ return c.s === T; })) return 1;
  var U = spec.unknown.length, k = spec.need[s];
  var t = spec.unknown.filter(function(c){ return c.s === T; }).length;
  if(k <= 0 || t <= 0) return 0;
  if(k > U - t) return 1;
  var pNone = 1;
  for(var i=0;i<k;i++) pNone *= (U - t - i) / (U - i);
  return 1 - pNone;
}

/**
 * Regras de mesa de jogador profissional (penalidade em pontos de partida, 0 = jogada limpa).
 * São “freios”: a simulação decide, mas jogadas que um profissional não faz custam caro.
 */
export function proRulePenalty(pv, seat, card, hand, spec, count){
  var T = pv.trump;
  var trick = pv.trick || [];
  var deckLeft = (pv.deck || []).filter(Boolean).length;
  var pen = 0;
  var mt = pTm(seat);
  // Quem ainda joga depois de mim nesta vaza.
  var after = [];
  var p = seat;
  for(var i=trick.length + 1;i<4;i++){ p = nxt(p); after.push(p); }
  var oppsAfter = after.filter(function(s){ return pTm(s) !== mt; });

  // 1. Ás/7 de corte numa vaza pobre enquanto ainda há baralho (guardar para pegar bisca).
  if(card.s === T && (card.v === 'A' || card.v === '7') && deckLeft >= 4 && trick.length){
    var prev = trick[trick.length - 1].card;
    var rele = card.v === 'A' && prev.s === T && prev.v === '7';
    if(!rele && trickPts(trick) < 10) pen += 1;
  }
  // 2. Sair de bisca cedo com risco de corte, havendo outra carta para sair.
  if(!trick.length && card.s !== T && cPts(card) >= 10 && deckLeft >= 8){
    var alt = hand.some(function(c){ return c.id !== card.id && !(c.s !== T && cPts(c) >= 10) && !(c.s === T && cRnk(c) >= RNK.K); });
    var risk = Math.min(1, count.oppTrumpsExp / 2);
    if(alt) pen += 0.8 * risk;
  }
  // 3. Encarte arriscado: bisca do naipe por cima da saída, com adversário depois que provavelmente corta.
  if(trick.length && card.s === trick[0].card.s && card.s !== T && cPts(card) >= 10 && oppsAfter.length){
    var cw = getWin(trick, T);
    if(beats(card, cw.card, trick[0].card.s, T)){
      var pCut = 1;
      oppsAfter.forEach(function(s){ pCut *= 1 - pHasTrump(spec, s, T); });
      pCut = 1 - pCut;
      // Só freia quando o corte é provável de verdade; abaixo disso o encarte é uma aposta legítima.
      if(pCut > 0.55) pen += (pCut - 0.55) / 0.45;
    }
  }
  // 4. Sair de corte cedo tendo outra carta para sair (cortes servem para pegar bisca).
  if(!trick.length && card.s === T && deckLeft >= 8 && !(pv.trickN === 0 && seat === parseSeat(pv.starter) && card.v === '7')){
    var other = hand.some(function(c){ return c.s !== T && cPts(c) < 10; });
    if(other) pen += card.v === 'A' || card.v === '7' ? 1.5 : cRnk(card) >= RNK.Q ? 1 : 0.6;
  }
  return pen;
}

/**
 * Avalia cada carta imaginando a mão até ao fim, em muitas distribuições possíveis das cartas escondidas,
 * com todos os jogadores a seguir as regras de mesa (playPolicy). Valor = pontos de partida da mão
 * (vitória, capote, 61, Réle, 7 de abertura) + diferença de pontos de carta.
 */
export function scoreByRollout(pv, seat, cands, spec, opts){
  var mt = pTm(seat);
  var base = pv.batido && pv.trump === 'copas' ? 2 : 1;
  var tieBonus = pv.tieBonus || 0;
  var margin = opts && opts.margin != null ? opts.margin : MARGIN_W;
  var ms = opts && opts.rollMs != null ? opts.rollMs : ROLL_TIME_MS;
  var minN = opts && opts.rollMin != null ? opts.rollMin : ROLL_MIN_SAMPLES;
  var maxN = opts && opts.rollMax != null ? opts.rollMax : ROLL_MAX_SAMPLES;
  var totals = cands.map(function(){ return 0; });
  var t0 = Date.now();
  var n = 0;
  while(n < maxN && (n < minN || Date.now() - t0 < ms)){
    var W = sampleWorld(pv, seat, spec);
    for(var i=0;i<cands.length;i++){
      var S = cloneState(W);
      applyPlay(S, cands[i]);
      rolloutToEnd(S);
      totals[i] += roundMatchValue(S.tPts, S.ev, mt, base, tieBonus) + margin * (S.tPts[mt] - S.tPts[1 - mt]);
    }
    n++;
  }
  return cands.map(function(c, i){ return { card: c, score: totals[i] / n }; });
}

/** Decisão do bot (assento `seat`) no estado de mesa `pv`. opts.mode: 'rollout' (padrão) | 'trick'. */
export function chooseCard(pv, seat, opts){
  var hand = (pv.hands[seat] || []).filter(Boolean);
  if(!hand.length) return null;
  var cands = legalCards(hand, pv.trick || [], pv.trump, !!pv.trumpSevenOut, pv.trickN || 0);
  if(cands.length === 1) return cands[0];
  if(!(pv.deck || []).filter(Boolean).length){
    return chooseEndgame(pv, seat, cands, buildWorldSpec(pv, seat, opts), opts);
  }
  var mode = (opts && opts.mode) || 'rollout';
  var scored = mode === 'trick' ? scoreCandidates(pv, seat, opts) : scoreByRollout(pv, seat, cands, buildWorldSpec(pv, seat, opts), opts);
  // Leitura tática da vaza atual (risco de corte, encarte, custo de gastar a carta): sinal estável que
  // complementa a simulação até ao fim da mão, cujo resultado varia muito de sorteio para sorteio.
  var trickW = opts && opts.trickW != null ? opts.trickW : TRICK_W;
  if(mode !== 'trick' && trickW > 0){
    var tac = scoreCandidates(pv, seat, opts);
    for(var k=0;k<scored.length;k++) scored[k].score += trickW * tac[k].score / CARD_PTS_PER_MP;
  }
  var ruleW = opts && opts.ruleW != null ? opts.ruleW : RULE_W;
  if(ruleW > 0){
    var spec2 = buildWorldSpec(pv, seat, opts);
    var count2 = buildCount(pv, seat, spec2);
    for(var r=0;r<scored.length;r++) scored[r].score -= ruleW * proRulePenalty(pv, seat, scored[r].card, hand, spec2, count2);
  }
  var best = scored[0];
  for(var i=1;i<scored.length;i++){
    var d = scored[i].score - best.score;
    if(d > 1e-6 || (Math.abs(d) <= 1e-6 && shedCost(scored[i].card, pv.trump) < shedCost(best.card, pv.trump))) best = scored[i];
  }
  return best.card;
}

/* Exposto para testes. */
export var _internals = { holdValue: holdValue, scoreWeights: scoreWeights, buildCount: buildCount, TORD: TORD };
