/* Investiga uma situação: mostra como a mesa imaginada responde e o resultado médio de cada carta. */
import { mkDk, pTm, getWin, trickPts } from '../../src/lib/bisca/rules.mjs';
import { cloneState } from '../../src/lib/bisca/engine.mjs';
import { buildWorldSpec, sampleWorld, respondPolicy, scoreCandidates } from '../../src/lib/bisca/ai.mjs';

var ALL = mkDk();
var SYM = { o:'ouros', c:'copas', e:'espadas', p:'paus' };
var N = { ouros:'♦', copas:'♥', espadas:'♠', paus:'♣' };
function C(s){ var v = s.slice(0, -1), su = SYM[s.slice(-1)]; var c = ALL.find(function(x){ return x.v === v && x.s === su; }); if(!c) throw new Error(s); return c; }
function cs(c){ return c.v + N[c.s]; }

// Cenário: corte ouros, mão 2. Adversário (seat 1) saiu de J♣; eu (seat 0... ordem TORD [0,3,2,1]) — montar com seat 3 a jogar depois do 1? TORD: 0→3→2→1→0.
// Saída do seat 2 (adv do seat 3? não: equipas por paridade: 0,2 vs 1,3). Eu = seat 1? Simplificar: quem sai = seat 0 (adv), eu = seat 3, parceiro = seat 1, último = seat 2 (adv).
var used = {};
function take(list){ return list.map(function(s){ var c = C(s); used[c.id] = 1; return c; }); }
var me = 3, mate = 1;
var hands = [[], [], [], []];
hands[me] = take(['4p', '7c', 'Je']);
var trick = [{ player: 0, card: take(['Jp'])[0] }];
var rest = ALL.filter(function(c){ return !used[c.id]; });
// distribuição real qualquer para as mãos escondidas (o bot não as vê; só define tamanhos)
var k = 0;
hands[0] = rest.slice(k, k += 2); hands[1] = rest.slice(k, k += 3); hands[2] = rest.slice(k, k += 3);
var deck = rest.slice(k, k + 24);
var pv = { hands: hands, deck: deck, trick: trick, trickN: 1, trump: 'ouros', tc: null, tPts: [3, 0], trumpSevenOut: false, starter: 0, fd: [], batido: false, tieBonus: 0, aceReveal: null };

var spec = buildWorldSpec(pv, me);
['4p', '7c', 'Je'].forEach(function(s){
  var card = C(s);
  var wins = 0, n = 400, whoWin = { me: 0, mate: 0, op: 0 };
  for(var i=0;i<n;i++){
    var W = sampleWorld(pv, me, spec);
    var S = cloneState(W);
    var h = S.hands[me]; h.splice(h.findIndex(function(x){ return x.id === card.id; }), 1);
    S.trick.push({ player: me, card: card }); S.cur = 2 === me ? 1 : [0,3,2,1][([0,3,2,1].indexOf(me)+1)%4];
    while(S.trick.length < 4){ var p = S.cur; var c = respondPolicy(S, p); var hh = S.hands[p]; hh.splice(hh.findIndex(function(x){ return x.id === c.id; }), 1); S.trick.push({ player: p, card: c }); S.cur = [0,3,2,1][([0,3,2,1].indexOf(p)+1)%4]; }
    var w = getWin(S.trick, S.trump);
    if(pTm(w.player) === pTm(me)) wins++;
    whoWin[w.player === me ? 'me' : w.player === mate ? 'mate' : 'op']++;
    if(i < 4) console.log('  amostra ' + cs(card) + ': ' + S.trick.map(function(x){ return 's' + x.player + ':' + cs(x.card); }).join(' ') + ' → vence s' + w.player);
  }
  console.log(cs(card) + ': nossa dupla ganha ' + (100 * wins / n).toFixed(0) + '%  ' + JSON.stringify(whoWin));
});
console.log(scoreCandidates(pv, me, { samples: 400 }).map(function(x){ return cs(x.card) + ':' + x.score.toFixed(1); }).join('  '));
