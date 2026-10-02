/* Encarte no início: adv. sai de 3♠, eu (2.º) tenho bisca de espadas; o meu parceiro (último) tem corte. */
import { mkDk } from '../../src/lib/bisca/rules.mjs';
import { chooseCard } from '../../src/lib/bisca/ai.mjs';
var ALL = mkDk(), SU = { o:'ouros', c:'copas', e:'espadas', p:'paus' };
function C(s){ var v = s.slice(0,-1), su = SU[s.slice(-1)]; return ALL.find(function(x){ return x.v===v && x.s===su; }); }
function sh(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function run(label, hand, mate, n){
  var picks = {};
  for(var r=0;r<n;r++){
    var used = {}; var H = hand.map(C), M = mate.map(C), lead = C('3e');
    H.concat(M,[lead]).forEach(function(c){ used[c.id]=1; });
    var rest = sh(ALL.filter(function(c){ return !used[c.id] && c.id !== 'Q_copas'; }));
    var hands = [rest.splice(0,2), M, rest.splice(0,3), H];
    var deck = rest.slice(0, 27).concat([C('Qc')]);
    var pv = { hands: hands, deck: deck, trick: [{ player: 0, card: lead }], trickN: 0, trump: 'copas', tc: C('Qc'), tPts:[0,0],
      trumpSevenOut:false, starter:0, fd:[], batido:false, tieBonus:0, aceReveal:null };
    var c = chooseCard(pv, 3, { knownMate: true });
    picks[c.v + c.s[0]] = (picks[c.v + c.s[0]] || 0) + 1;
  }
  console.log(label.padEnd(40), JSON.stringify(picks));
}
var N = +(process.argv[2] || 10);
run('Ás♠, parceiro com K♥', ['Ae','4p','5o'], ['Kc','2o','6p'], N);
run('7♠, parceiro com K♥', ['7e','4p','5o'], ['Kc','2o','6p'], N);
run('Ás♠, parceiro com 4♥', ['Ae','4p','5o'], ['4c','2o','6p'], N);
run('7♠, parceiro com 3♥', ['7e','4p','5o'], ['3c','2o','6p'], N);
run('Ás♠, parceiro SEM corte', ['Ae','4p','5o'], ['Ko','2o','6p'], N);
run('7♠, parceiro SEM corte', ['7e','4p','5o'], ['Ko','2o','6p'], N);
