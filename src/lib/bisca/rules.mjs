/* Regras puras da Bisca Fucas — fonte única usada pela mesa (page.tsx), pelo bot e pelo simulador. */

export var SUITS = ['ouros','copas','espadas','paus'];
export var VALS = ['2','3','4','5','6','7','J','Q','K','A'];
export var PTS = {A:11,'7':10,K:4,J:3,Q:2};
export var RNK = {A:9,'7':8,K:7,J:6,Q:5,'6':4,'5':3,'4':2,'3':1,'2':0};
/** Ordem de jogo à volta da mesa. */
export var TORD = [0,3,2,1];

export function nxt(p){ return TORD[(TORD.indexOf(p)+1)%4]; }
export function prv(p){ return TORD[(TORD.indexOf(p)+3)%4]; }
/** Assento 0–3 válido em TORD; aceita string vinda do Firebase; NaN se inválido. */
export function parseSeat(p){
  if(p==null||p==='') return NaN;
  var n = typeof p === 'number' ? p : parseInt(String(p),10);
  if(isNaN(n)) return NaN;
  return TORD.indexOf(n) >= 0 ? n : NaN;
}
export function cPts(c){ return PTS[c.v]||0; }
export function cRnk(c){ return RNK[c.v]; }
export function pTm(p){ return p%2; }
export function mkDk(){ return SUITS.flatMap(function(s){ return VALS.map(function(v){ return {s:s,v:v,id:v+'_'+s}; }); }); }

/** a vence b? L = naipe de saída, T = corte. Sem obrigação de seguir naipe: fora do naipe e sem corte nunca ganha. */
export function beats(a,b,L,T){
  var at=a.s===T, bt=b.s===T;
  if(at!==bt) return at;
  if(at) return cRnk(a)>cRnk(b);
  if(a.s===L && b.s!==L) return true;
  if(b.s===L && a.s!==L) return false;
  if(a.s===L) return cRnk(a)>cRnk(b);
  return false;
}

export function getWin(tk,tr){
  var L=tk[0].card.s;
  return tk.reduce(function(b,c){ return beats(c.card,b.card,L,tr)?c:b; }, tk[0]);
}

/** 7 de corte como 4.ª carta só faz sentido com o Ás “presente”: na tua mão ou já na mesma vaza (ex.: parceiro jogou o Ás antes de seres o último a jogar). Na mão 10/10 (trickN===9) cada um tem uma carta — o 7 pode sair “de fundo” sem essa condição. */
export function mayPlaySevenTrumpFourth(trickLen, hand, trump, card, trick, trickN){
  if(trickN===9) return true;
  if(trickLen!==3 || !card || card.v!=='7' || card.s!==trump) return true;
  if(hand.some(function(h){ return h && h.v==='A' && h.s===trump; })) return true;
  if(trick && trick.some(function(t){ return t.card && t.card.v==='A' && t.card.s===trump; })) return true;
  return false;
}

/** Ás de corte só depois do 7 ter saído (nesta vaza ou noutra). Exceções: mão 10/10 (trickN===9); ou só te resta uma carta na mão e é o Ás (não tens o 7 — não podes cumprir “sair com o 7 primeiro”). Se tens outras cartas e o 7 ainda não saiu, não podes antecipar o Ás. */
export function mayPlayAceTrump(trick, trump, trumpSevenOut, hand, card, trickN){
  if(!card || card.v!=='A' || card.s!==trump) return true;
  if(trickN===9) return true;
  var s7 = trick.some(function(t){ return t.card && t.card.v==='7' && t.card.s===trump; });
  if(trumpSevenOut || s7) return true;
  var holdSeven = hand.some(function(h){ return h && h.v==='7' && h.s===trump; });
  if(holdSeven) return false;
  var nLeft = hand.reduce(function(n, h){ return n + (h ? 1 : 0); }, 0);
  return nLeft <= 1;
}

/** Cartas que o jogador pode jogar agora (regras da casa do Ás e do 7 de corte). */
export function legalCards(hand, trick, trump, sevenOut, trickN){
  var cards = hand.filter(function(c){ return !!c; });
  var ok = cards.filter(function(c){
    return mayPlayAceTrump(trick, trump, sevenOut, cards, c, trickN) &&
      mayPlaySevenTrumpFourth(trick.length, cards, trump, c, trick, trickN);
  });
  return ok.length ? ok : cards;
}

/** Pontos de cartas numa vaza. */
export function trickPts(trick){
  var s = 0;
  for(var i=0;i<trick.length;i++) s += cPts(trick[i].card);
  return s;
}

/** Placar da partida que a dupla mt ganha (+) ou perde (−) com o resultado da mão — mesma conta de bfResolveEndRound. */
export function roundMatchValue(tPts, ev, mt, base, tieBonus){
  var my = tPts[mt], op = tPts[1 - mt];
  var v = ev[mt] - ev[1 - mt];
  if(my > op) v += base + tieBonus + (my === 61 && op === 59 ? 1 : 0) + (op < 30 ? 1 : 0);
  else if(op > my) v -= base + tieBonus + (op === 61 && my === 59 ? 1 : 0) + (my < 30 ? 1 : 0);
  return v;
}
