/* Reproduz o exemplo do Pedro: últimas 3 vazas, duas biscas na mesa, o último tem 7 e Ás de corte. */
import { mkDk, legalCards } from '../../src/lib/bisca/rules.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';
import { chooseCardOld } from './old-ai.mjs';

var ALL = mkDk();
var SU = { o: 'ouros', c: 'copas', e: 'espadas', p: 'paus' };
var SYM = { ouros: '♦', copas: '♥', espadas: '♠', paus: '♣' };
function C(s){ var v = s.slice(0, -1), su = SU[s.slice(-1)]; return ALL.find(function(x){ return x.v === v && x.s === su; }); }
function cs(c){ return c.v + SYM[c.s]; }

// Ordem 0 → 3 → 2 → 1. Eu (humano) = 0 saio de bisca; 3 (adv. direita) joga outra bisca; 2 (meu parceiro) lixo; 1 (adv. esquerda, bot) último.
// Corte: ouros. Mão 8 (trickN 7), baralho vazio: 3 cartas cada (quem já jogou tem 2).
function pvFor(tPts){
  var hands = [
    [C('4c'), C('Kp')],          // eu (já joguei A♠)
    [C('7o'), C('Ao'), C('2p')], // bot adv. esquerda — último a jogar
    [C('5c'), C('6p')],          // meu parceiro (já jogou 3♣)
    [C('Qc'), C('3c')],          // adv. direita (já jogou 7♠)
  ];
  var trick = [{ player: 0, card: C('Ae') }, { player: 3, card: C('7e') }, { player: 2, card: C('3p') }];
  return { hands: hands, deck: [], trick: trick, trickN: 7, trump: 'ouros', tc: null, tPts: tPts,
    trumpSevenOut: false, starter: 0, fd: [], batido: false, tieBonus: 0, aceReveal: null };
}

[[40, 40], [50, 30], [30, 60], [20, 70], [65, 20]].forEach(function(tp){
  var pv = pvFor(tp);
  var legal = legalCards(pv.hands[1], pv.trick, 'ouros', false, 7).map(cs).join(' ');
  var picks = {}, picksOld = {};
  for(var i=0;i<6;i++){
    var c = chooseCard(pv, 1, {}); picks[cs(c)] = (picks[cs(c)] || 0) + 1;
    var o = chooseCardOld(pvFor(tp), 1, { samples: 150 }); picksOld[cs(o)] = (picksOld[cs(o)] || 0) + 1;
  }
  console.log('placar dupla0/dupla1 = ' + tp.join('/') + '  legais: ' + legal + '  → novo: ' + JSON.stringify(picks) + '  antigo: ' + JSON.stringify(picksOld));
});
