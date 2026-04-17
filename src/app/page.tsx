"use client";
import React, { useState, useEffect, useRef } from "react";
import { ref, get, set as rtSet, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

var RTB = "bisca/rooms";
function roomDbRef(code) {
  if (!db) return null;
  return ref(db, RTB + "/" + code);
}
function gameDbRef(code) {
  if (!db) return null;
  return ref(db, RTB + "/" + code + "/game");
}
function chatDbRef(code) {
  if (!db) return null;
  return ref(db, RTB + "/" + code + "/chat");
}

/** Evita crash (.length em undefined) quando o Realtime DB devolve nós incompletos. */
function normalizeGame(g) {
  if (!g || typeof g !== "object") return g;
  function handRow(hands, i) {
    if (hands == null) return [];
    if (Array.isArray(hands)) {
      var x = hands[i];
      return Array.isArray(x) ? x : [];
    }
    if (typeof hands === "object") {
      var k = hands[i] !== undefined ? hands[i] : hands[String(i)];
      return Array.isArray(k) ? k : [];
    }
    return [];
  }
  var hands = [0, 1, 2, 3].map(function (i) {
    return handRow(g.hands, i);
  });
  var pn = g.playerNames;
  var names = ["?", "?", "?", "?"];
  if (Array.isArray(pn) && pn.length >= 4) {
    names = [pn[0], pn[1], pn[2], pn[3]];
  } else if (pn && typeof pn === "object") {
    for (var ni = 0; ni < 4; ni++) {
      names[ni] = pn[ni] || pn[String(ni)] || "?";
    }
  }
  return Object.assign({}, g, {
    hands: hands,
    trick: Array.isArray(g.trick) ? g.trick : [],
    deck: Array.isArray(g.deck) ? g.deck : [],
    fd: Array.isArray(g.fd) ? g.fd : [],
    events: Array.isArray(g.events) ? g.events : [],
    playerNames: names,
  });
}

function normalizeRoom(r) {
  if (!r || typeof r !== "object") return null;
  var players = r.players;
  if (!Array.isArray(players)) {
    if (players && typeof players === "object") {
      players = Object.keys(players)
        .sort(function (a, b) {
          return Number(a) - Number(b);
        })
        .map(function (k) {
          return players[k];
        })
        .filter(function (p) {
          return p && typeof p === "object";
        });
    } else players = [];
  }
  var game = r.game != null ? normalizeGame(r.game) : null;
  var tid = r.themeId;
  if (tid !== "terrafe" && tid !== "hub" && tid !== "floresta" && tid !== "sala") tid = "sala";
  return Object.assign({}, r, { players: players, game: game, themeId: tid });
}

/** Firebase Realtime Database — salas, jogo e chat (multijogador). */
var RT = {
  isConfigured: function () {
    return !!db;
  },
  getRoom: async function (code) {
    if (!code || !db) return null;
    try {
      var rref = roomDbRef(code);
      if (!rref) return null;
      var snap = await get(rref);
      return snap.exists() ? normalizeRoom(snap.val()) : null;
    } catch {
      return null;
    }
  },
  setRoom: async function (code, room) {
    if (!db) return false;
    try {
      var rref = roomDbRef(code);
      if (!rref) return false;
      await rtSet(rref, room);
      return true;
    } catch {
      return false;
    }
  },
  setGame: async function (code, game) {
    if (!db) return false;
    try {
      var gref = gameDbRef(code);
      if (!gref) return false;
      await rtSet(gref, game);
      return true;
    } catch {
      return false;
    }
  },
  setChat: async function (code, msgs) {
    if (!db) return false;
    try {
      var cref = chatDbRef(code);
      if (!cref) return false;
      await rtSet(cref, msgs);
      return true;
    } catch {
      return false;
    }
  },
  subscribeRoom: function (code, cb) {
    if (!db) {
      return function () {};
    }
    var r = roomDbRef(code);
    if (!r) return function () {};
    return onValue(r, function (snap) {
      cb(snap.exists() ? normalizeRoom(snap.val()) : null);
    });
  },
  subscribeChat: function (code, cb) {
    if (!db) {
      return function () {};
    }
    var c = chatDbRef(code);
    if (!c) return function () {};
    return onValue(c, function (snap) {
      var v = snap.val();
      cb(Array.isArray(v) ? v : []);
    });
  },
};

/* ═══ CONSTANTS ═══ */
var SUITS = ['ouros','copas','espadas','paus'];
var VALS = ['2','3','4','5','6','7','J','Q','K','A'];
var SYM = {ouros:'\u2666',copas:'\u2665',espadas:'\u2660',paus:'\u2663'};
var RCOL = {ouros:'#cc1111',copas:'#cc1111',espadas:'#111',paus:'#111'};
var PTS = {A:11,'7':10,K:4,J:3,Q:2};
var RNK = {A:9,'7':8,K:7,J:6,Q:5,'6':4,'5':3,'4':2,'3':1,'2':0};
var PAIRS = {espadas:'paus',paus:'espadas',copas:'ouros',ouros:'copas'};
var TORD = [0,3,2,1];

function nxt(p){ return TORD[(TORD.indexOf(p)+1)%4]; }
function prv(p){ return TORD[(TORD.indexOf(p)+3)%4]; }
function cPts(c){ return PTS[c.v]||0; }
function cRnk(c){ return RNK[c.v]; }
function pTm(p){ return p%2; }
function mkDk(){ return SUITS.flatMap(function(s){ return VALS.map(function(v){ return {s:s,v:v,id:v+'_'+s}; }); }); }
function shf(d){ var a=d.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; } return a; }
function uid(){ return Math.random().toString(36).slice(2,10); }
function mkCode(){ var s='',chars='ABCDEFGHJKLMNPQRSTUVWXYZ'; for(var i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }

function beats(a,b,L,T){
  var at=a.s===T, bt=b.s===T;
  if(at!==bt) return at;
  if(at) return cRnk(a)>cRnk(b);
  if(a.s===L && b.s!==L) return true;
  if(b.s===L && a.s!==L) return false;
  if(a.s===L) return cRnk(a)>cRnk(b);
  return false;
}

function getWin(tk,tr){
  var L=tk[0].card.s;
  return tk.reduce(function(b,c){ return beats(c.card,b.card,L,tr)?c:b; }, tk[0]);
}

/* ═══ AI PRO ═══ */
// Memory tracker — tracks played cards and void suits per player
function makeMemory(){
  return { played:[], voids:[[],[],[],[]] };
}
var aiMemory = makeMemory();

function recordPlay(mem, player, card, trick, trump){
  mem.played.push({player:player, card:card});
  // If player didn't follow lead suit AND didn't play trump, they're void in lead suit
  if(trick.length>0){
    var leadSuit = trick[0].card.s;
    if(card.s !== leadSuit && card.s !== trump){
      if(mem.voids[player].indexOf(leadSuit)===-1) mem.voids[player].push(leadSuit);
    }
    // If they didn't follow lead and played trump instead of a non-trump, also void
    if(card.s !== leadSuit && card.s === trump){
      if(mem.voids[player].indexOf(leadSuit)===-1) mem.voids[player].push(leadSuit);
    }
  }
}

function countPlayed(mem, suit, val){
  return mem.played.filter(function(p){ return p.card.s===suit && (val ? p.card.v===val : true); }).length;
}

function isOut(mem, suit, val){
  return mem.played.some(function(p){ return p.card.s===suit && p.card.v===val; });
}

function isVoid(mem, player, suit){
  return mem.voids[player].indexOf(suit) !== -1;
}

function cardsPlayedInSuit(mem, suit){
  return mem.played.filter(function(p){ return p.card.s===suit; }).length;
}

function opponentsVoidIn(mem, mt, suit){
  // Check if BOTH opponents are void in this suit
  var opp1 = mt===0 ? 1 : 0;
  var opp2 = mt===0 ? 3 : 2;
  return isVoid(mem, opp1, suit) || isVoid(mem, opp2, suit);
}

function aiPick(hand, trick, trump, mt, sevenOut, avoidLast, mem, tPts, trickN){
  if(!hand.length) return null;
  if(!mem) mem = makeMemory();

  var s7 = trick.some(function(t){ return t.card && t.card.v==='7' && t.card.s===trump; });
  var h7 = hand.some(function(c){ return c && c.v==='7' && c.s===trump; });

  var pool = hand.filter(function(c){
    if(!c) return false;
    if(c.v==='A' && c.s===trump && !sevenOut && !s7 && !h7 && hand.length>1) return false;
    if(trick.length===3 && c.v==='7' && c.s===trump && hand.length>1){
      if(!hand.some(function(h){ return h && h.v==='A' && h.s===trump; })) return false;
    }
    return true;
  });
  if(!pool.length) pool = hand.filter(function(c){ return !!c; });
  if(!pool.length) return null;
  if(avoidLast){ var ns=pool.filter(function(c){ return !(c.v==='7' && c.s===trump); }); if(ns.length) pool=ns; }

  var trumpCards = pool.filter(function(c){ return c.s===trump; });
  var nonTrump = pool.filter(function(c){ return c.s!==trump; });
  var trickPts = trick.reduce(function(s,t){ return s+cPts(t.card); }, 0);
  var hasTrumpBackup = trumpCards.length>=2 || (trumpCards.length>=1 && trumpCards.some(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; }));
  var strongTrumps = trumpCards.filter(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; });

  // Score awareness
  var myScore = tPts ? tPts[mt] : 0;
  var oppScore = tPts ? tPts[1-mt] : 0;
  var losing = oppScore > myScore + 10;
  var winning = myScore > oppScore + 20;
  var endGame = trickN >= 7; // last 3 tricks

  function byPtsAsc(a,b){ return cPts(a)-cPts(b) || cRnk(a)-cRnk(b); }
  function byPtsDesc(a,b){ return cPts(b)-cPts(a) || cRnk(b)-cRnk(a); }
  function byRnkAsc(a,b){ return cRnk(a)-cRnk(b); }
  function lowest(cards){ return cards.slice().sort(byPtsAsc)[0]; }
  function highest(cards){ return cards.slice().sort(byPtsDesc)[0]; }
  function winners(cards,cw,ld){ return cards.filter(function(c){ return beats(c,cw,ld,trump); }); }
  function suitHigh(suit){ return pool.some(function(c){ return c.s===suit && (c.v==='A'||c.v==='7'); }); }
  function suitLows(suit){ return pool.filter(function(c){ return c.s===suit && cPts(c)===0; }); }
  function suitCount(suit){ return pool.filter(function(c){ return c.s===suit; }).length; }

  // Is the Ás of this suit still out there (not played, not in my hand)?
  function aceStillOut(suit){
    if(hand.some(function(c){ return c && c.v==='A' && c.s===suit; })) return false;
    return !isOut(mem, suit, 'A');
  }
  // Is the 7 still out there?
  function sevenStillOut(suit){
    if(hand.some(function(c){ return c && c.v==='7' && c.s===suit; })) return false;
    return !isOut(mem, suit, '7');
  }

  // ══ LEADING ══
  if(!trick.length){

    // RULE 1: Play 7 of trump EARLY to liberate Ás
    var my7t = pool.find(function(c){ return c.v==='7' && c.s===trump; });
    if(my7t && hand.length>=5) return my7t;

    // RULE 2: Force opponents to use trump — lead suit they're void in
    // This is PRO strategy: if opponent is void in a suit, leading it forces them to trump or lose
    if(!winning){
      var forceSuits = SUITS.filter(function(s){
        if(s===trump) return false;
        // I have high card in this suit AND opponent is void
        return suitHigh(s) && opponentsVoidIn(mem, mt, s);
      });
      if(forceSuits.length){
        // Lead high card of that suit — force them to waste trump or give points
        for(var fi=0; fi<forceSuits.length; fi++){
          var fCards = pool.filter(function(c){ return c.s===forceSuits[fi]; }).sort(byPtsDesc);
          if(fCards.length) return fCards[0];
        }
      }
    }

    // RULE 3: Encarte — low card of suit where I have A or 7
    // But ONLY if the Ás of that suit hasn't been played and opponent might have trump
    var encSuits = SUITS.filter(function(s){
      return s!==trump && suitHigh(s) && suitLows(s).length>0;
    });
    if(encSuits.length){
      // Prefer suit with most cards (more control) and where A isn't out
      encSuits.sort(function(a,b){ return suitCount(b)-suitCount(a); });
      var el = suitLows(encSuits[0]);
      if(el.length) return el[0];
    }

    // RULE 4: Ás of non-trump — safe if opponent can't trump it
    var aces = nonTrump.filter(function(c){ return c.v==='A'; });
    if(aces.length){
      // Find Ás where opponents likely can't trump (they have cards of that suit)
      var safeAces = aces.filter(function(c){ return !opponentsVoidIn(mem, mt, c.s); });
      if(safeAces.length) return safeAces[0];
      // With trump backup, any Ás is fine
      if(hasTrumpBackup) return aces[0];
      if(hand.length<=4) return aces[0]; // endgame, just play it
    }

    // RULE 5: 7 of non-trump (same logic as Ás)
    var sevens = nonTrump.filter(function(c){ return c.v==='7'; });
    if(sevens.length){
      var safeSevens = sevens.filter(function(c){ return !opponentsVoidIn(mem, mt, c.s); });
      if(safeSevens.length && hasTrumpBackup) return safeSevens[0];
      if(hasTrumpBackup) return sevens[0];
    }

    // RULE 6: If losing badly, be more aggressive — play K/J to grab some points
    if(losing){
      var mids = nonTrump.filter(function(c){ return c.v==='K'||c.v==='J'; });
      if(mids.length && hasTrumpBackup) return mids.sort(byPtsDesc)[0];
    }

    // RULE 7: Garbage — probe with zero-value cards
    var garbage = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(garbage.length){
      // Prefer suits where opponent has cards (won't trump)
      var safeGarbage = garbage.filter(function(c){ return !opponentsVoidIn(mem, mt, c.s); });
      if(safeGarbage.length) return safeGarbage[Math.floor(Math.random()*safeGarbage.length)];
      // Prefer suits where I DON'T have high cards (save encarte)
      var pureG = garbage.filter(function(c){ return !suitHigh(c.s); });
      if(pureG.length) return pureG[Math.floor(Math.random()*pureG.length)];
      return garbage[Math.floor(Math.random()*garbage.length)];
    }

    // RULE 8: Q is only 2 pts, acceptable loss
    var queens = nonTrump.filter(function(c){ return c.v==='Q'; });
    if(queens.length) return queens[0];

    if(nonTrump.length) return lowest(nonTrump);
    return lowest(trumpCards);
  }

  // ══ FOLLOWING ══
  var lead = trick[0].card.s;
  var curWin = getWin(trick, trump);
  var partnerWinning = pTm(curWin.player)===mt;
  var isLast = trick.length===3;
  var is2nd = trick.length===1;
  var is3rd = trick.length===2;
  var followSuit = pool.filter(function(c){ return c.s===lead; });
  var partnerIdx = mt===0 ? 2 : (mt===1 ? 3 : (mt===2 ? 0 : 1));

  // ── PARTNER WINNING ──
  if(partnerWinning){
    // PROTECT PARTNER'S ENCARTE: if partner led with low card (0 pts),
    // they might be setting up an encarte — don't steal with trump
    var partnerCard = trick.find(function(t){ return t.player===curWin.player; });
    var partnerLedLow = trick.length>=1 && trick[0].player===curWin.player && cPts(trick[0].card)===0;

    // If partner played strong card (A, 7, K), ENCHER!
    var partnerStrong = partnerCard && (partnerCard.card.v==='A' || partnerCard.card.v==='7' || partnerCard.card.v==='K');

    // LAST TO PLAY + partner winning = ALWAYS feed maximum, no risk!
    if(isLast){
      var bestFeed = nonTrump.filter(function(c){ return cPts(c)>=10; }).sort(byPtsDesc);
      if(bestFeed.length) return bestFeed[0];
      var midFeed = nonTrump.filter(function(c){ return cPts(c)>=2; }).sort(byPtsDesc);
      if(midFeed.length) return midFeed[0];
      // Even feed trump points if no non-trump with value
      var trumpFeed = trumpCards.filter(function(c){ return cPts(c)>=2 && c.v!=='7'; }).sort(byPtsDesc);
      if(trumpFeed.length && trickPts>=6) return trumpFeed[0];
      return lowest(pool);
    }

    if(partnerStrong || trickPts>=12){
      var bf = nonTrump.filter(function(c){ return cPts(c)>=10; }).sort(byPtsDesc);
      if(bf.length) return bf[0];
      var mf = nonTrump.filter(function(c){ return cPts(c)>=3; }).sort(byPtsDesc);
      if(mf.length) return mf[0];
      var qf = nonTrump.filter(function(c){ return cPts(c)>=2; }).sort(byPtsDesc);
      if(qf.length) return qf[0];
    }

    if(trickPts>=6){
      var gf = nonTrump.filter(function(c){ return cPts(c)>=2; }).sort(byPtsDesc);
      if(gf.length) return gf[0];
    }

    // Partner led low (possible encarte) or low-value trick — throw garbage
    return lowest(pool);
  }

  // ── OPPONENT WINNING ──

  // Can I win with same suit?
  var suitW = winners(followSuit, curWin.card, lead);
  if(suitW.length){
    var cw = suitW.slice().sort(byRnkAsc);
    // Don't waste A/7 on empty trick
    if(trickPts<=2){
      var cnb = cw.filter(function(c){ return c.v!=='A' && c.v!=='7'; });
      if(cnb.length) return cnb[0];
      // If only A/7 can win and trick is worthless, maybe don't bother
      if(!isLast && nonTrump.filter(function(c){ return cPts(c)===0; }).length>0){
        return lowest(nonTrump.filter(function(c){ return cPts(c)===0; }));
      }
    }
    return cw[0];
  }

  // Should I trump?
  var trumpW = winners(trumpCards, curWin.card, lead);
  if(trumpW.length){
    // NEVER trump a worthless trick with weak trump (Q/J of trump)
    if(trickPts<=3 && strongTrumps.length===0){
      var gb = nonTrump.filter(function(c){ return cPts(c)===0; });
      if(gb.length) return gb[Math.floor(Math.random()*gb.length)];
      if(nonTrump.length) return lowest(nonTrump);
    }

    // Last to play: trump if trick has value
    if(isLast && trickPts>=4) return lowest(trumpW);

    // High value trick: always trump
    if(trickPts>=10) return lowest(trumpW);

    // Medium value: trump if we have strong trumps or many trumps
    if(trickPts>=4 && (strongTrumps.length>=1 || trumpCards.length>=3)) return lowest(trumpW);

    // Losing badly? Be more aggressive with trumping
    if(losing && trickPts>=3) return lowest(trumpW);

    // Endgame (last 3 tricks): trump more aggressively
    if(endGame && trickPts>=3) return lowest(trumpW);

    // Not worth trumping
    var gb2 = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(gb2.length) return gb2[Math.floor(Math.random()*gb2.length)];
    if(nonTrump.length) return lowest(nonTrump);
    return lowest(trumpW);
  }

  // Can't win — minimize loss
  // IMPORTANT: if partner still hasn't played, throw low — partner might win!
  var partnerStillToPlay = !trick.some(function(t){ return pTm(t.player)===mt; });
  if(partnerStillToPlay){
    // Throw garbage, partner might save us
    var zeros = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(zeros.length) return zeros[Math.floor(Math.random()*zeros.length)];
    return lowest(pool);
  }

  // Both us and partner can't win — minimize damage
  var zeros2 = nonTrump.filter(function(c){ return cPts(c)===0; });
  if(zeros2.length) return zeros2[Math.floor(Math.random()*zeros2.length)];
  var qs = nonTrump.filter(function(c){ return c.v==='Q'; });
  if(qs.length) return qs[0];
  if(nonTrump.length) return lowest(nonTrump);
  return lowest(pool);
}

/* ═══ GAME STATE ═══ */
function mkGame(pm,ps,tb,names,actor){
  var m = pm || [0,0];
  var st = ps!==undefined ? nxt(ps) : 2;
  return {
    phase:'shuffle', starter:st, fd:shf(mkDk()), tc:null, trump:null, rawTc:null,
    hands:[[],[],[],[]], trick:[], curP:st, tPts:[0,0], mPts:m.slice(),
    trickN:0, canSwap:false, batido:false, trumpSevenOut:false, tieBonus:tb||0,
    events:[], summary:null, lastW:null, deck:[], dealStep:0, msg:'',
    playerNames: names || ['Você','Adv. Esq.','Parceiro','Adv. Dir.'],
    lastActor: actor || ''
  };
}

/* ═══ CSS ═══ */
var ACSS = [
  '@keyframes shfl{0%{transform:translateX(0)}30%{transform:translateX(-20px) rotate(-9deg)}70%{transform:translateX(20px) rotate(9deg)}100%{transform:translateX(0)}}',
  '@keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}',
  '@keyframes cin{from{opacity:0;transform:scale(.3) translateY(-15px)}to{opacity:1;transform:scale(1) translateY(0)}}',
  '@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
  '@keyframes float1{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-18px) rotate(5deg)}}',
  '@keyframes float2{0%,100%{transform:translateY(0) rotate(3deg)}50%{transform:translateY(-14px) rotate(-4deg)}}',
  '@keyframes float3{0%,100%{transform:translateY(-5px) rotate(2deg)}50%{transform:translateY(-22px) rotate(-6deg)}}',
  '@keyframes glow{0%,100%{text-shadow:0 0 20px rgba(196,18,48,.4)}50%{text-shadow:0 0 40px rgba(196,18,48,.7),0 0 60px rgba(212,168,67,.3)}}',
  '@keyframes spin{to{transform:rotate(360deg)}}'
].join('');

/* ═══ RENDER HELPERS ═══ */
var BTN = {background:'#C41230',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',cursor:'pointer',fontSize:15,fontWeight:'bold'};

/* ═══ THEMES ═══ */
var THEMES = {
  terrafe: {
    name: 'Terrafé', icon: '☕',
    bg: '#1a1208', tableColor: 'radial-gradient(ellipse at 50% 50%,#1a1a1a,#0d0d0d)',
    tableBorder: '2px solid #3a2a1a', tableShadow: 'inset 0 0 30px rgba(139,69,19,.15), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:50%', accent: '#8B4513',
    decor: function(){ return [
      React.createElement('div',{key:'d1',style:{position:'absolute',top:8,left:8,fontSize:10,opacity:0.15}},'☕'),
      React.createElement('div',{key:'d2',style:{position:'absolute',bottom:8,right:8,fontSize:10,opacity:0.15}},'☕'),
      React.createElement('div',{key:'d3',style:{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:60,height:60,borderRadius:'50%',border:'1px solid rgba(139,69,19,.08)'}})
    ]; }
  },
  hub: {
    name: 'HUB Fucape', icon: '💡',
    bg: '#0a0a18', tableColor: 'radial-gradient(ellipse at 50% 50%,#15153a,#0a0a20)',
    tableBorder: '2px solid #2a2a5a', tableShadow: 'inset 0 0 30px rgba(37,99,235,.1), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:14px', accent: '#2563eb',
    decor: function(){ return [
      React.createElement('div',{key:'d1',style:{position:'absolute',top:6,left:6,width:16,height:2,background:'#2563eb',opacity:0.15,borderRadius:1}}),
      React.createElement('div',{key:'d2',style:{position:'absolute',top:6,right:6,width:16,height:2,background:'#eab308',opacity:0.15,borderRadius:1}}),
      React.createElement('div',{key:'d3',style:{position:'absolute',bottom:6,left:6,width:16,height:2,background:'#ef4444',opacity:0.15,borderRadius:1}})
    ]; }
  },
  floresta: {
    name: 'Floresta', icon: '🌿',
    bg: '#0a1a0e', tableColor: 'radial-gradient(ellipse at 50% 50%,#1a2a1a,#0d1a0d)',
    tableBorder: '2px solid #2a3a2a', tableShadow: 'inset 0 0 30px rgba(45,90,39,.1), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:8px', accent: '#2d5a27',
    decor: function(){ return [
      React.createElement('div',{key:'d1',style:{position:'absolute',top:6,left:8,fontSize:9,opacity:0.1}},'🍃'),
      React.createElement('div',{key:'d2',style:{position:'absolute',bottom:6,right:8,fontSize:9,opacity:0.1}},'🍃')
    ]; }
  },
  sala: {
    name: 'Sala de Aula', icon: '🎓',
    bg: '#6B1010', tableColor: 'radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.35),rgba(0,0,0,.25))',
    tableBorder: '1px solid rgba(255,100,100,.2)', tableShadow: 'inset 0 2px 15px rgba(0,0,0,.3)',
    tableShape: 'borderRadius:14px', accent: '#C41230',
    decor: function(){ return []; }
  }
};

/* ═══ LOCATION LOGOS ═══ */
function TerrafeLogo(sz){
  return React.createElement('div',{style:{fontSize:Math.round(sz*0.85),lineHeight:1}},'☕');
}
function HubLogo(sz){
  return React.createElement('svg',{viewBox:'0 0 120 60',width:sz,height:Math.round(sz*0.5)},
    React.createElement('text',{x:0,y:48,fontFamily:'Arial,sans-serif',fontSize:52,fontWeight:900},
      React.createElement('tspan',{fill:'#2563eb'},'h'),
      React.createElement('tspan',{fill:'#ef4444',dy:8},'u'),
      React.createElement('tspan',{fill:'#eab308',dy:-8},'b')
    )
  );
}

/* ═══ LOCATION SELECT ═══ */
function LocationScreen(P){
  var floats=[{s:'\u2660',x:8,y:10,a:'float1',o:0.05,z:48},{s:'\u2665',x:88,y:8,a:'float2',o:0.06,z:40},{s:'\u2666',x:12,y:80,a:'float3',o:0.04,z:44},{s:'\u2663',x:85,y:75,a:'float1',o:0.05,z:42},{s:'\u2665',x:50,y:92,a:'float2',o:0.03,z:36},{s:'\u2660',x:45,y:4,a:'float3',o:0.04,z:38}];

  var locs = [
    {id:'terrafe',name:'Terrafé',color:'#8B4513',bg:'linear-gradient(145deg,#2a1c10,#1a1208)',glow:'rgba(139,69,19,.5)',
      logo:function(){return TerrafeLogo(52);}},
    {id:'hub',name:'HUB Fucape',color:'#2563eb',bg:'linear-gradient(145deg,#0e1230,#080818)',glow:'rgba(37,99,235,.5)',
      logo:function(){return HubLogo(80);}},
    {id:'floresta',name:'Floresta',color:'#2d5a27',bg:'linear-gradient(145deg,#142a18,#0a1a0e)',glow:'rgba(45,90,39,.5)',
      logo:function(){return React.createElement('div',{style:{fontSize:44,lineHeight:1}},'🌿');}},
    {id:'sala',name:'Sala de Aula',color:'#C41230',bg:'linear-gradient(145deg,#3a0808,#1a0404)',glow:'rgba(196,18,48,.5)',
      logo:function(){return rLogoW(48);}}
  ];

  return React.createElement('div',{style:{minHeight:'100vh',background:'linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)',fontFamily:'system-ui,sans-serif',color:'white',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,position:'relative',overflow:'hidden'}},
    React.createElement('style',null,ACSS),
    floats.map(function(f,i){return React.createElement('span',{key:i,style:{position:'absolute',left:f.x+'%',top:f.y+'%',fontSize:f.z,opacity:f.o,color:'#C41230',animation:f.a+' '+(3+i*0.4)+'s ease-in-out infinite',pointerEvents:'none'}},f.s);}),
    React.createElement('div',{style:{position:'absolute',top:20,left:20,display:'flex',alignItems:'center',gap:8}},
      React.createElement('button',{onClick:P.onBack,style:{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:20}},'←'),
      rLogoW(22)
    ),
    React.createElement('div',{style:{fontSize:24,fontWeight:800,marginBottom:6,background:'linear-gradient(135deg,#d4a843,#f0d078)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:1}},'Escolha a mesa'),
    React.createElement('div',{style:{fontSize:11,opacity:0.3,marginBottom:28}},P.pickForCreate?'Escolha a mesa da sala (todos verão o mesmo cenário).':'Onde você quer jogar?'),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,width:'100%',maxWidth:340}},
      locs.map(function(loc){
        return React.createElement('div',{key:loc.id,
          onClick:function(){P.onSelect(loc.id);},
          onMouseEnter:function(e){e.currentTarget.style.boxShadow='0 0 30px '+loc.glow;e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.borderColor=loc.color;},
          onMouseLeave:function(e){e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.5)';e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=loc.color+'33';},
          style:{background:loc.bg,border:'1.5px solid '+loc.color+'33',borderRadius:16,padding:'28px 16px 22px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,transition:'all .3s cubic-bezier(.4,0,.2,1)',boxShadow:'0 8px 24px rgba(0,0,0,.5)',minHeight:130}
        },
          React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:52}},loc.logo()),
          React.createElement('div',{style:{fontSize:14,fontWeight:700,color:loc.color,letterSpacing:0.5,textAlign:'center'}},loc.name)
        );
      })
    ),
    React.createElement('div',{style:{position:'fixed',bottom:8,right:10,fontSize:10,opacity:0.2}},'by: Ruivo01')
  );
}

function rLogo(h){
  var w = Math.round(h*0.55);
  return React.createElement('svg',{viewBox:'0 0 58 70',width:w,height:h},
    React.createElement('rect',{x:0,y:2,width:9,height:66,fill:'#C41230',rx:1}),
    React.createElement('text',{x:12,y:62,fontFamily:'Georgia,serif',fontSize:62,fontWeight:'bold',fill:'#111'},'F')
  );
}
function rLogoW(h){
  var w = Math.round(h*0.55);
  return React.createElement('svg',{viewBox:'0 0 58 70',width:w,height:h},
    React.createElement('rect',{x:0,y:2,width:9,height:66,fill:'#C41230',rx:1}),
    React.createElement('text',{x:12,y:62,fontFamily:'Georgia,serif',fontSize:62,fontWeight:'bold',fill:'#fff'},'F')
  );
}

function rCard(c,onClick,back,glow,sm,blocked,mob){
  var W,H,fs,symFs,pad;
  if(mob){
    if(back||!c){
      W=sm?22:26; H=sm?32:36;
      return React.createElement('div',{style:{width:W,height:H,background:'linear-gradient(160deg,#7B1010,#3A0606)',border:'2px solid #C41230',borderRadius:5,flexShrink:0,touchAction:'manipulation'}});
    }
    if(sm){ W=24;H=32;fs=8;symFs=10;pad='0 1px'; }
    else { W=36;H=48;fs=10;symFs=14;pad='2px 3px'; }
  } else {
    W=sm?30:46; H=sm?42:63;
    if(back||!c){
      return React.createElement('div',{style:{width:W,height:H,background:'linear-gradient(160deg,#7B1010,#3A0606)',border:'2px solid #C41230',borderRadius:5,flexShrink:0,touchAction:'manipulation'}});
    }
    fs=sm?9:11; symFs=sm?12:18; pad=sm?'1px 2px':'2px 4px';
  }
  var col = RCOL[c.s];
  var lift = mob ? -4 : -8;
  return React.createElement('div',{
    onClick: onClick,
    onMouseEnter: function(e){ if(onClick) e.currentTarget.style.transform='translateY('+lift+'px)'; },
    onMouseLeave: function(e){ e.currentTarget.style.transform='none'; },
    style:{width:W,height:H,background:'white',border:'2px solid '+(glow?'#FFD700':col),borderRadius:5,
      cursor:blocked?'not-allowed':onClick?'pointer':'default',
      display:'flex',flexDirection:'column',justifyContent:'space-between',
      padding:pad,fontSize:fs,fontWeight:'bold',color:col,flexShrink:0,
      opacity:blocked?0.35:1,boxShadow:glow?'0 0 10px #FFD70088':'0 1px 4px #0004',
      transition:'transform .12s',userSelect:'none',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}
  },
    React.createElement('span',null,c.v),
    React.createElement('span',{style:{textAlign:'center',fontSize:symFs,lineHeight:1}},SYM[c.s]),
    React.createElement('span',{style:{transform:'rotate(180deg)',display:'block'}},c.v)
  );
}

function rSlot(a,mob){
  var w=mob?24:30, h=mob?32:42;
  return React.createElement('div',{style:{width:w,height:h,border:'1px dashed rgba(255,255,255,'+(a?'.45':'.1')+')',borderRadius:4,background:a?'rgba(255,255,255,.06)':'transparent',flexShrink:0}});
}

function deckPile(n,onClick,hi,mob){
  var cw=mob?26:46, ch=mob?38:63, off=mob?1:2, boxW=mob?32:52, boxH=mob?46:70, fs=mob?9:11;
  var layers = [2,1,0].map(function(i){
    return React.createElement('div',{key:i,style:{position:'absolute',left:i*off,top:i*-off,width:cw,height:ch,background:'linear-gradient(160deg,#7B1010,#3A0606)',border:'2px solid '+(hi?'#FFD700':'#C41230'),borderRadius:5,boxShadow:'0 2px 6px #0005'}});
  });
  var lbl = React.createElement('div',{style:{position:'absolute',left:0,top:-2,width:cw,height:ch,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.35)',fontSize:fs,fontWeight:'bold',zIndex:5}},n);
  return React.createElement('div',{onClick:onClick,style:{position:'relative',width:boxW,height:boxH,cursor:onClick?'pointer':'default',flexShrink:0,touchAction:'manipulation'}},layers[0],layers[1],layers[2],lbl);
}

/* ═══ CHAT ═══ */
function ChatPanel(P){
  var mob = useNarrowScreen();
  var vs=useState(false); var open=vs[0], setOpen=vs[1];
  var inpFs = mob ? 16 : 12;
  var ms=useState(''); var msg=ms[0], setMsg=ms[1];
  var cs=useState([]); var msgs=cs[0], setMsgs=cs[1];
  var ns=useState(0); var unread=ns[0], setUnread=ns[1];
  var lastCount=useRef(0);
  var bottomRef=useRef(null);
  var openRef=useRef(false);
  var code = P.roomCode || "";
  openRef.current = open;

  useEffect(function(){
    if(!code) return;
    var unsub = RT.subscribeChat(code, function(parsed){
      setMsgs(parsed);
      if(!openRef.current && parsed.length > lastCount.current){
        setUnread(parsed.length - lastCount.current);
      }
      if(openRef.current) lastCount.current = parsed.length;
    });
    return function(){ unsub(); };
  },[code]);

  // Scroll to bottom when new messages
  useEffect(function(){
    if(open && bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'});
  },[msgs.length, open]);

  async function send(){
    if(!msg.trim() || !code) return;
    var newMsg = {name:P.myName||'???', msg:msg.trim(), t:Date.now()};
    var updated = msgs.concat([newMsg]);
    if(updated.length>50) updated = updated.slice(updated.length-50);
    var ok = await RT.setChat(code, updated);
    if(ok){
      setMsgs(updated);
      lastCount.current = updated.length;
    }
    setMsg('');
  }

  function toggleOpen(){
    setOpen(!open);
    if(!open){
      setUnread(0);
      lastCount.current = msgs.length;
    }
  }

  // Chat button
  var btn = React.createElement('button',{onClick:toggleOpen,style:{position:'fixed',bottom:mob?'max(12px, env(safe-area-inset-bottom))':12,right:mob?'max(12px, env(safe-area-inset-right))':12,width:44,height:44,borderRadius:'50%',background:open?'#C41230':'rgba(0,0,0,.6)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,boxShadow:'0 4px 12px rgba(0,0,0,.4)'}},
    open ? '✕' : '💬',
    unread>0 && !open ? React.createElement('div',{style:{position:'absolute',top:-4,right:-4,background:'#C41230',color:'#fff',borderRadius:'50%',width:18,height:18,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}},unread) : null
  );

  // Chat panel
  var panel = open ? React.createElement('div',{style:{position:'fixed',bottom:mob?'max(64px, calc(52px + env(safe-area-inset-bottom)))':64,right:mob?'max(12px, env(safe-area-inset-right))':12,width:mob?'min(280, calc(100vw - 24px))':280,maxHeight:mob?320:360,background:'#1a0a0a',border:'1px solid rgba(196,18,48,.3)',borderRadius:14,display:'flex',flexDirection:'column',zIndex:150,boxShadow:'0 8px 30px rgba(0,0,0,.6)',overflow:'hidden',touchAction:'manipulation',WebkitOverflowScrolling:'touch'}},
    // Header
    React.createElement('div',{style:{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.1)',fontSize:13,fontWeight:700,color:'#d4a843',display:'flex',justifyContent:'space-between',alignItems:'center'}},
      'Chat da mesa',
      React.createElement('span',{style:{fontSize:10,opacity:0.4,fontWeight:400}},msgs.length+' msgs')
    ),
    // Messages
    React.createElement('div',{style:{flex:1,overflowY:'auto',padding:'8px 12px',display:'flex',flexDirection:'column',gap:6,maxHeight:240,minHeight:100}},
      msgs.length===0 ? React.createElement('div',{style:{fontSize:11,opacity:0.3,textAlign:'center',marginTop:20}},'Nenhuma mensagem ainda...') : null,
      msgs.map(function(m,i){
        var isMe = m.name===(P.myName||'');
        return React.createElement('div',{key:i,style:{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}},
          React.createElement('div',{style:{fontSize:9,opacity:0.4,marginBottom:1}},isMe?'Você':m.name),
          React.createElement('div',{style:{background:isMe?'rgba(196,18,48,.25)':'rgba(255,255,255,.08)',border:'1px solid '+(isMe?'rgba(196,18,48,.3)':'rgba(255,255,255,.1)'),borderRadius:10,padding:'6px 10px',fontSize:12,maxWidth:'85%',wordBreak:'break-word',color:'#fff'}},m.msg)
        );
      }),
      React.createElement('div',{ref:bottomRef})
    ),
    // Input
    React.createElement('div',{style:{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',gap:6}},
      React.createElement('input',{value:msg,onChange:function(e){setMsg(e.target.value);},onKeyDown:function(e){if(e.key==='Enter')send();},placeholder:'Digite...',autoCorrect:'off',autoCapitalize:'sentences',style:{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:8,padding:mob?'10px 12px':'7px 10px',color:'#fff',fontSize:inpFs,lineHeight:1.25,outline:'none',minHeight:mob?44:undefined}}),
      React.createElement('button',{onClick:send,style:{background:'#C41230',color:'#fff',border:'none',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12,fontWeight:700}},'→')
    )
  ) : null;

  return React.createElement(React.Fragment,null, btn, panel);
}

/* ═══ HOME SCREEN ═══ */
function HomeScreen(P){
  var ns=useState(''); var nm=ns[0], setNm=ns[1];
  var cs=useState(''); var cd=cs[0], setCd=cs[1];
  var es=useState(''); var er=es[0], setEr=es[1];
  var ls=useState(false); var ld=ls[0], setLd=ls[1];

  var floats = [
    {s:'\u2660',x:10,y:12,a:'float1',o:0.06,z:64},
    {s:'\u2665',x:80,y:8,a:'float2',o:0.08,z:52},
    {s:'\u2666',x:18,y:74,a:'float3',o:0.05,z:48},
    {s:'\u2663',x:86,y:70,a:'float1',o:0.06,z:56},
    {s:'\u2660',x:52,y:88,a:'float2',o:0.04,z:44},
    {s:'\u2665',x:42,y:3,a:'float3',o:0.05,z:40}
  ];

  var inp = {background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',width:'100%',boxSizing:'border-box'};

  async function join(){
    if(!nm.trim()){ setEr('Digite seu nome'); return; }
    if(cd.length!==4){ setEr('Código: 4 letras'); return; }
    if(!RT.isConfigured()){ setEr('Firebase não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL).'); return; }
    setLd(true); setEr('');
    var r = await RT.getRoom(cd.toUpperCase());
    if(!r){ setLd(false); setEr('Sala não encontrada'); return; }
    if(r.game){ setLd(false); setEr('Partida já começou'); return; }
    var humanNJoin = r.players.filter(function(p){ return !p.isBot; }).length;
    if(humanNJoin>=4){ setLd(false); setEr('Sala cheia'); return; }
    var pid = uid();
    r.players.push({id:pid,name:nm.trim(),seat:-1,team:null});
    var ok = await RT.setRoom(cd.toUpperCase(), r);
    setLd(false);
    if(ok) P.onJoin(pid,nm.trim(),cd.toUpperCase(),r); else setEr('Erro');
  }

  var divider = function(t){
    return React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,opacity:0.3}},
      React.createElement('div',{style:{flex:1,height:1,background:'#fff'}}),
      React.createElement('span',{style:{fontSize:11}},t),
      React.createElement('div',{style:{flex:1,height:1,background:'#fff'}})
    );
  };

  return React.createElement('div',{style:{minHeight:'100vh',background:'linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)',fontFamily:'system-ui,sans-serif',color:'white',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,position:'relative',overflow:'hidden'}},
    React.createElement('style',null,ACSS),
    floats.map(function(f,i){ return React.createElement('span',{key:i,style:{position:'absolute',left:f.x+'%',top:f.y+'%',fontSize:f.z,opacity:f.o,color:'#C41230',animation:f.a+' '+(3+i*0.4)+'s ease-in-out infinite',pointerEvents:'none'}},f.s); }),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:30,animation:'fadeIn .8s ease-out'}},
      rLogoW(64),
      React.createElement('div',{style:{fontSize:40,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#d4a843,#f0d078,#a17c2f)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'glow 3s ease-in-out infinite',lineHeight:1.1,textAlign:'center'}},'BISCA FUCAS'),
      React.createElement('div',{style:{fontSize:12,letterSpacing:5,opacity:0.4,textTransform:'uppercase'}},'Jogo de Baralho \u00b7 Online')
    ),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12,width:'100%',maxWidth:320,animation:'fadeIn 1s ease-out'}},
      React.createElement('input',{value:nm,onChange:function(e){setNm(e.target.value);},placeholder:'Seu nome',style:Object.assign({},inp,{fontSize:17,padding:'14px 18px'})}),
      er ? React.createElement('div',{style:{color:'#ff6b6b',fontSize:13,textAlign:'center'}},er) : null,
      React.createElement('button',{onClick:function(){ if(!nm.trim()){setEr('Digite seu nome');return;} setEr(''); P.onSolo(nm.trim()); },style:{background:'linear-gradient(135deg,#C41230,#8a0e22)',color:'#fff',border:'none',borderRadius:10,padding:'14px',cursor:'pointer',fontSize:17,fontWeight:'bold',boxShadow:'0 4px 15px rgba(196,18,48,.3)'}},'🤖 Solo vs IA'),
      divider('ou jogue com amigos'),
      React.createElement('button',{onClick:function(){
 if(!nm.trim()){ setEr('Digite seu nome'); return; }
        if(!RT.isConfigured()){ setEr('Firebase não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL).'); return; }
        setEr(''); P.onGoPickCreate(nm.trim());
      },disabled:ld,style:{background:'linear-gradient(135deg,#2a6a3a,#1a4a2a)',color:'#fff',border:'none',borderRadius:10,padding:'12px',cursor:'pointer',fontSize:15,fontWeight:'bold'}},'🌐 Criar Sala'),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('input',{value:cd,onChange:function(e){setCd(e.target.value.toUpperCase().slice(0,4));},placeholder:'Código',style:Object.assign({},inp,{textAlign:'center',letterSpacing:4,fontWeight:700})}),
        React.createElement('button',{onClick:join,disabled:ld,style:{background:'#1a3a6a',color:'#fff',border:'none',borderRadius:10,padding:'10px 16px',cursor:'pointer',fontSize:14,fontWeight:'bold',whiteSpace:'nowrap'}},'Entrar')
      )
    ),
    ld ? React.createElement('div',{style:{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99}},
      React.createElement('div',{style:{width:36,height:36,border:'3px solid transparent',borderTop:'3px solid #d4a843',borderRadius:'50%',animation:'spin .8s linear infinite'}})
    ) : null,
    React.createElement('div',{style:{position:'fixed',bottom:8,right:10,fontSize:10,opacity:0.2}},'by: Ruivo01')
  );
}

/* ═══ LOBBY ═══ */
function LobbyScreen(P){
  var room=P.room, myId=P.myId, isHost=room.hostId===myId;
  var me = room.players.find(function(p){ return p.id===myId; });
  var humans = room.players.filter(function(p){ return !p.isBot; });
  var tA = humans.filter(function(p){ return p.team==='A'; });
  var tB = humans.filter(function(p){ return p.team==='B'; });
  var allHumansHaveTeam = humans.length>0 && humans.every(function(p){ return p.team==='A'||p.team==='B'; });
  var canStart = isHost && humans.length>=1 && humans.length<=4 && allHumansHaveTeam && tA.length<=2 && tB.length<=2 && (tA.length+tB.length===humans.length);

  async function toggle(team){
    var r = await RT.getRoom(room.code); if(!r) return;
    var pl = r.players.find(function(p){ return p.id===myId && !p.isBot; }); if(!pl) return;
    var H = r.players.filter(function(p){ return !p.isBot; });
    if(pl.team===team) pl.team=null;
    else if(H.filter(function(p){ return p.team===team; }).length<2) pl.team=team;
    await RT.setRoom(r.code, r);
  }

  async function start(){
    if(!canStart||!isHost) return;
    var r = await RT.getRoom(room.code); if(!r) return;
    var H = r.players.filter(function(p){ return !p.isBot; });
    var a=H.filter(function(p){return p.team==='A';}), b=H.filter(function(p){return p.team==='B';});
    if(a.length>2||b.length>2||a.length+b.length!==H.length) return;
    var needA = 2-a.length, needB = 2-b.length;
    var bots=[], bn=0;
    for(var ia=0;ia<needA;ia++){ bn++; bots.push({id:'bot:'+r.code+':'+uid(),name:'IA '+bn,seat:-1,team:'A',isBot:true}); }
    for(var ib=0;ib<needB;ib++){ bn++; bots.push({id:'bot:'+r.code+':'+uid(),name:'IA '+bn,seat:-1,team:'B',isBot:true}); }
    var aFull=a.concat(bots.filter(function(p){ return p.team==='A'; }));
    var bFull=b.concat(bots.filter(function(p){ return p.team==='B'; }));
    var sm={};
    sm[aFull[0].id]=0; sm[aFull[1].id]=2;
    sm[bFull[0].id]=1; sm[bFull[1].id]=3;
    r.players=H.concat(bots);
    r.players.forEach(function(p){ p.seat=sm[p.id]; });
    var nm=['','','',''];
    nm[0]=aFull[0].name; nm[2]=aFull[1].name;
    nm[1]=bFull[0].name; nm[3]=bFull[1].name;
    r.game = mkGame(null,undefined,0,nm,r.hostId);
    await RT.setRoom(r.code, r);
  }

  var playerRows = humans.map(function(p){
    return React.createElement('div',{key:p.id,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,.05)',borderRadius:8,marginBottom:6}},
      React.createElement('div',{style:{width:30,height:30,borderRadius:'50%',background:p.team==='A'?'#22c55e':p.team==='B'?'#f59e0b':'#555',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}},p.name[0]),
      React.createElement('div',{style:{flex:1}},
        React.createElement('div',{style:{fontSize:13,fontWeight:600}},p.name+(p.id===myId?' (você)':'')),
        React.createElement('div',{style:{fontSize:10,opacity:0.4}},(p.id===room.hostId?'Host \u00b7 ':'')+'Dupla '+(p.team||'?'))
      )
    );
  });

  var emptySlots = [];
  for(var i=0; i<Math.max(0,4-humans.length); i++){
    emptySlots.push(React.createElement('div',{key:'e'+i,style:{padding:10,background:'rgba(255,255,255,.03)',borderRadius:8,textAlign:'center',fontSize:11,opacity:0.3,border:'1px dashed rgba(255,255,255,.1)',marginBottom:6}},'Vaga livre (amigo ou IA ao iniciar)'));
  }

  return React.createElement('div',{style:{minHeight:'100vh',background:'linear-gradient(160deg,#0a0a12,#1a0a14)',fontFamily:'system-ui,sans-serif',color:'white',padding:20,display:'flex',flexDirection:'column',alignItems:'center'}},
    React.createElement('style',null,ACSS),
    React.createElement('div',{style:{width:'100%',maxWidth:420,display:'flex',flexDirection:'column',gap:16,animation:'fadeIn .6s ease-out'}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
        React.createElement('button',{onClick:P.onLeave,style:{background:'none',border:'none',color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:20}},'←'),
        rLogoW(28),
        React.createElement('div',{style:{fontSize:18,fontWeight:700}},'Bisca Fucas')
      ),
      React.createElement('div',{style:{background:'rgba(196,18,48,.08)',borderRadius:14,padding:20,textAlign:'center',border:'1px solid rgba(196,18,48,.25)'}},
        React.createElement('div',{style:{fontSize:11,opacity:0.4,letterSpacing:2}},'CÓDIGO DA SALA'),
        React.createElement('div',{style:{fontSize:48,fontWeight:900,letterSpacing:12,color:'#d4a843'}},room.code),
        React.createElement('div',{style:{fontSize:11,opacity:0.4,marginTop:6}},'Compartilhe com seus amigos'),
        React.createElement('div',{style:{fontSize:12,opacity:0.55,marginTop:10}},(THEMES[room.themeId]||THEMES.sala).icon+' Mesa: '+(THEMES[room.themeId]||THEMES.sala).name)
      ),
      React.createElement('div',{style:{background:'rgba(255,255,255,.05)',borderRadius:14,padding:16,border:'1px solid rgba(255,255,255,.1)'}},
        React.createElement('div',{style:{fontSize:12,opacity:0.5,marginBottom:10}},'Jogadores ('+humans.length+' humanos · ate 4)'),
        playerRows,
        emptySlots
      ),
      React.createElement('div',{style:{display:'flex',gap:10}},
        React.createElement('button',{onClick:function(){toggle('A');},style:{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(me&&me.team==='A'?'#22c55e':'rgba(255,255,255,.2)'),background:me&&me.team==='A'?'rgba(34,197,94,.2)':'transparent',color:me&&me.team==='A'?'#86efac':'rgba(255,255,255,.5)',cursor:'pointer',fontSize:13,fontWeight:me&&me.team==='A'?'bold':'normal'}},'Dupla A'),
        React.createElement('button',{onClick:function(){toggle('B');},style:{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(me&&me.team==='B'?'#f59e0b':'rgba(255,255,255,.2)'),background:me&&me.team==='B'?'rgba(245,158,11,.2)':'transparent',color:me&&me.team==='B'?'#fde68a':'rgba(255,255,255,.5)',cursor:'pointer',fontSize:13,fontWeight:me&&me.team==='B'?'bold':'normal'}},'Dupla B')
      ),
      isHost
        ? React.createElement(React.Fragment,null,
            React.createElement('div',{style:{fontSize:11,opacity:0.45,marginBottom:8,lineHeight:1.4}},'Escolha Dupla A ou B (max. 2 por lado). Pode iniciar sozinho ou com 2–3 pessoas — a IA completa a mesa.'),
            React.createElement('button',{onClick:start,disabled:!canStart,style:Object.assign({},BTN,{opacity:canStart?1:0.4,cursor:canStart?'pointer':'not-allowed',width:'100%',fontSize:16})},'Iniciar Partida →')
          )
        : React.createElement('div',{style:{textAlign:'center',fontSize:13,opacity:0.5,animation:'pls 2s infinite'}},'Aguardando o host iniciar...')
    )
  );
}

/* ═══ GAME SCREEN ═══ */
function useNarrowScreen(){
  var st = useState(function(){
    return typeof window!=='undefined' && window.matchMedia('(max-width: 640px)').matches;
  });
  var narrow = st[0], setNarrow = st[1];
  useEffect(function(){
    function u(){ setNarrow(window.innerWidth <= 640); }
    u();
    window.addEventListener('resize', u);
    window.addEventListener('orientationchange', u);
    return function(){
      window.removeEventListener('resize', u);
      window.removeEventListener('orientationchange', u);
    };
  },[]);
  return narrow;
}

function GameScreen(props){
  var g=props.g, sg=props.sg, isSolo=props.isSolo;
  var mob = useNarrowScreen();
  var mySeat=props.mySeat||0, isOnline=props.isOnline||false, myPid=props.myPid||'', roomCode=props.roomCode||'';
  var partnerCount=props.partnerCount||0, setPT=props.setPT;
  var shuffling=props.shuffling||false, setSh=props.setSh;
  var cutAnim=props.cutAnim||false, setCa=props.setCa;
  var hovHalf=props.hovHalf, setHovHalf=props.setHovHalf;
  var NAMES=g.playerNames;
  var th = props.theme || THEMES.sala;
  var dealer=prv(g.starter), cutter=prv(dealer);
   var dS=mySeat, dE=nxt(mySeat), dN=nxt(nxt(mySeat)), dW=nxt(nxt(nxt(mySeat)));
  var iAmCutter = cutter===mySeat;
  var botSeats = props.botSeats || {};
  var isRoomHost = !!props.isRoomHost;
  var cutSecSt = useState(null);
  var cutSec = cutSecSt[0], setCutSec = cutSecSt[1];

  // Write online state (ONLY here, GameScreen is the single writer)
  useEffect(function(){
    if(!isOnline || !roomCode) return;
    if(!g.lastActor || g.lastActor!==myPid) return;
    RT.setGame(roomCode, g);
  },[g]);

  // Shuffle phase
  useEffect(function(){
    if(g.phase!=='shuffle') return;
    if(isSolo) aiMemory = makeMemory();
    if(isOnline && isRoomHost) aiMemory = makeMemory();
    // Reset chat on new round
    if(isOnline && roomCode){ RT.setChat(roomCode, []); }
    setSh(true);
    var t = setTimeout(function(){ setSh(false); sg(function(p){ return Object.assign({},p,{phase:'cut'}); }); },2400);
    return function(){ clearTimeout(t); setSh(false); };
  },[g.phase]);

  // Auto-cut: solo quando quem corta é a IA; online só o host corta por IA (evita vários clientes cortando)
  useEffect(function(){
    if(g.phase!=='cut') return;
    var showCutUi = isSolo ? cutter===0 : (iAmCutter || (isRoomHost && !!botSeats[cutter]));
    if(showCutUi) return;
    var runAuto = !isOnline ? cutter!==0 : (isRoomHost && !!botSeats[cutter]);
    if(!runAuto) return;
    var t = setTimeout(function(){
      var ci = 8 + Math.floor(Math.random()*24);
      performCut(ci);
    },1500);
    return function(){ clearTimeout(t); };
  },[g.phase,cutter,mySeat,isOnline,isRoomHost]);

  // Até 10s para quem escolhe o corte; depois corta automático
  useEffect(function(){
    if(g.phase!=='cut'){ setCutSec(null); return; }
    var showCutUi = isSolo ? cutter===0 : (iAmCutter || (isRoomHost && !!botSeats[cutter]));
    if(!showCutUi){ setCutSec(null); return; }
    var left = 10;
    setCutSec(left);
    var iv = setInterval(function(){
      left -= 1;
      if(left<=0){
        clearInterval(iv);
        setCutSec(0);
        var ci = 8 + Math.floor(Math.random()*24);
        performCut(ci);
      } else {
        setCutSec(left);
      }
    },1000);
    return function(){ clearInterval(iv); };
  },[g.phase,cutter,mySeat,isOnline,isRoomHost]);

  // Deal phase
  useEffect(function(){
    if(g.phase!=='deal') return;

    // Batido: deal 3 cards at a time per player (4 steps)
    if(g.batido){
      if(g.dealStep>=4){
        var fd=g.fd.slice(); var deck=fd.slice(12);
        var t=setTimeout(function(){
          sg(function(p){ return Object.assign({},p,{phase:'playing',deck:deck,canSwap:false,curP:p.starter,msg:'COPAS BATIDO! Vencer vale 2 pts.'}); });
        },700);
        return function(){clearTimeout(t);};
      }
      var t2=setTimeout(function(){
        sg(function(prev){
          if(prev.phase!=='deal') return prev;
          var s=prev.dealStep;
          var playerIdx=TORD[(TORD.indexOf(prev.starter)+s)%4];
          var hands=prev.hands.map(function(h){return h.slice();});
          // Deal 3 cards at once to this player
          hands[playerIdx].push(prev.fd[s*3]);
          hands[playerIdx].push(prev.fd[s*3+1]);
          hands[playerIdx].push(prev.fd[s*3+2]);
          return Object.assign({},prev,{hands:hands,dealStep:s+1});
        });
      },500);
      return function(){clearTimeout(t2);};
    }

    // Normal deal: 1 card at a time (12 steps)
    if(g.dealStep>=12){
      var rem = g.tc ? g.fd.slice(13).concat([g.tc]) : g.fd.slice(12);
      var cs = false;
      if(g.tc && g.tc.v!=='2'){
        for(var si=0;si<4;si++){ if(g.hands[si].some(function(c){ return c.s===g.trump && c.v==='2'; })){ cs=si; break; } }
      }
      var t = setTimeout(function(){
        sg(function(p){ return Object.assign({},p,{phase:'playing',deck:rem,canSwap:cs,msg:NAMES[p.starter]+(p.starter===mySeat?' - sua vez!':' comeca.')}); });
      },700);
      return function(){ clearTimeout(t); };
    }
    var t2 = setTimeout(function(){
      sg(function(prev){
        if(prev.phase!=='deal') return prev;
        var s=prev.dealStep, c=prev.fd[s];
        var p=TORD[(TORD.indexOf(prev.starter)+s)%4];
        var hands=prev.hands.map(function(h){ return h.slice(); });
        hands[p].push(c);
        return Object.assign({},prev,{hands:hands,dealStep:s+1});
      });
    },340);
    return function(){ clearTimeout(t2); };
  },[g.phase,g.dealStep]);

  // Partner reveal
  useEffect(function(){
    if(g.phase!=='playing' || g.trickN!==0) return;
    setPT(7);
    var id = setInterval(function(){ setPT(function(n){ if(n<=1){clearInterval(id);return 0;} return n-1; }); },1000);
    return function(){ clearInterval(id); setPT(0); };
  },[g.phase,g.trickN]);

  useEffect(function(){
    if(g.trickN!==7) return;
    setPT(7);
    var id = setInterval(function(){ setPT(function(n){ if(n<=1){clearInterval(id);return 0;} return n-1; }); },1000);
    return function(){ clearInterval(id); setPT(0); };
  },[g.trickN]);

  function performCut(ci){
    setCutSec(null);
    sg(function(pv){
      if(pv.phase!=='cut' || !Array.isArray(pv.fd) || pv.fd.length<20) return pv;
      var fd=pv.fd.slice(), newFd=fd.slice(ci).concat(fd.slice(0,ci));
      var rawTc=newFd[12], tc, trump;
      if(!rawTc || !rawTc.v) return pv;
      if(rawTc.v==='7'||rawTc.v==='A'){ trump=PAIRS[rawTc.s]; tc=null; }
      else{ trump=rawTc.s; tc=rawTc; }
      var msg = tc ? ('Trunfo: '+tc.v+SYM[tc.s]+'! Distribuindo...') : ('Cortou '+rawTc.v+SYM[rawTc.s]+' - trunfo: '+SYM[trump]+' '+trump+'!');
      if(isOnline){
        return Object.assign({},pv,{phase:'deal',fd:newFd,tc:tc,trump:trump,rawTc:tc?null:rawTc,batido:false,hands:[[],[],[],[]],dealStep:0,msg:msg,lastActor:myPid});
      }
      return Object.assign({},pv,{phase:'deal',fd:newFd,tc:tc,trump:trump,rawTc:tc?null:rawTc,batido:false,hands:[[],[],[],[]],dealStep:0,msg:msg});
    });
    setCa(false); setHovHalf(null);
  }

  function doCut(side){
    if(g.phase!=='cut') return;
    setCa(true);
    var ci = side==='top' ? (16+Math.floor(Math.random()*5)) : (8+Math.floor(Math.random()*5));
    setTimeout(function(){ performCut(ci); },600);
  }

  function doBat(){
    if(g.phase!=='cut') return;
    setCutSec(null);
    // Go to deal phase with batido flag — animation deals 3 at a time
    sg(function(pv){
      return Object.assign({},pv,{phase:'deal',tc:null,trump:'copas',batido:true,dealStep:0,
        canSwap:false,trumpSevenOut:false,tPts:[0,0],trickN:0,trick:[],events:[],
        lastW:null,rawTc:null,msg:'COPAS BATIDO! Distribuindo 3 cartas por vez...',
        lastActor:isOnline?myPid:pv.lastActor});
    });
  }

  function playCard(seat,card){
    if(g.curP!==seat || g.phase!=='playing' || partnerCount>0) return;
    var hand=g.hands[seat];
    var s7=g.trick.some(function(t){ return t.card.v==='7' && t.card.s===g.trump; });
    var h7=hand.some(function(c){ return c && c.v==='7' && c.s===g.trump; });
    if(card.v==='A' && card.s===g.trump && !g.trumpSevenOut && !s7 && !h7 && hand.length>1){
      sg(function(p){ return Object.assign({},p,{msg:'O As de '+g.trump+' so sai apos o 7!'}); }); return;
    }
    if(g.trick.length===3 && card.v==='7' && card.s===g.trump && hand.length>1){
      if(!hand.some(function(c){ return c && c.v==='A' && c.s===g.trump; })){
        sg(function(p){ return Object.assign({},p,{msg:'7 de trunfo nao pode ser a 4a carta sem o As!'}); }); return;
      }
    }
    if(isSolo) recordPlay(aiMemory, seat, card, g.trick, g.trump);
    sg(function(p){
      if(p.curP!==seat || p.phase!=='playing') return p;
      var hands=p.hands.map(function(h){ return h.filter(function(c){ return c && c.id!==card.id; }); });
      var trick=p.trick.concat([{player:seat,card:card}]);
      var done=trick.length===4;
      return Object.assign({},p,{hands:hands,trick:trick,curP:done?-1:nxt(seat),phase:done?'end_trick':'playing',msg:NAMES[seat]+' jogou '+card.v+SYM[card.s],lastActor:isOnline?myPid:p.lastActor});
    });
  }

  // IA (solo) ou bots online — só o host simula bots e grava lastActor para sincronizar
  useEffect(function(){
    if(g.phase!=='playing' || partnerCount>0) return;
    var p=g.curP;
    if(p<0||p>3) return;
    var seatIsBot = !!botSeats[p];
    var hostPlaysBot = isOnline && seatIsBot && isRoomHost;
    var soloAi = isSolo && p>=1;
    if(!hostPlaysBot && !soloAi) return;
    var t = setTimeout(function(){
      sg(function(pv){
        if(pv.phase!=='playing' || pv.curP!==p) return pv;
        var isLT = pv.deck.length===0 && pv.hands.every(function(h){ return h.length<=1; });
        var avL = isLT && pv.trick.length===3;
        var card = aiPick(pv.hands[p],pv.trick,pv.trump,pTm(p),pv.trumpSevenOut,avL,aiMemory,pv.tPts,pv.trickN);
        if(!card) return pv;
        recordPlay(aiMemory, p, card, pv.trick, pv.trump);
        var hands=pv.hands.map(function(h){ return h.filter(function(c){ return c && c.id!==card.id; }); });
        var trick=pv.trick.concat([{player:p,card:card}]);
        var done=trick.length===4;
        var upd = {hands:hands,trick:trick,curP:done?-1:nxt(p),phase:done?'end_trick':'playing',msg:NAMES[p]+' jogou '+card.v+SYM[card.s]};
        if(hostPlaysBot) Object.assign(upd,{lastActor:myPid});
        return Object.assign({},pv,upd);
      });
    },750);
    return function(){ clearTimeout(t); };
  },[g.curP,g.phase,partnerCount,isSolo,isOnline,isRoomHost,myPid]);

  // End trick
  useEffect(function(){
    if(g.phase!=='end_trick') return;
    if(isOnline && g.lastActor!==myPid) return;
    var t = setTimeout(function(){
      sg(function(pv){
        if(pv.phase!=='end_trick') return pv;
        var trick=pv.trick, trump=pv.trump;
        var w=getWin(trick,trump), wt=pTm(w.player);
        var tp=trick.reduce(function(s,x){ return s+cPts(x.card); },0);
        var tPn=pv.tPts.slice(); tPn[wt]+=tp;
        var events=pv.events.slice();
        var sevenNow=trick.some(function(x){ return x.card.v==='7' && x.card.s===trump; });
        for(var i=0;i<trick.length-1;i++){
          if(trick[i].card.s===trump && trick[i].card.v==='7' && trick[i+1].card.s===trump && trick[i+1].card.v==='A')
            events.push({tm:pTm(trick[i+1].player),lbl:'Rele! '+pv.playerNames[trick[i+1].player]+' jogou As apos o 7'});
        }
        if(trick[0].card.s===trump && trick[0].card.v==='7'){
          var ot=1-pTm(trick[0].player);
          if(!trick.some(function(x){ return x.card.s===trump && x.card.v==='A' && pTm(x.player)===ot; }))
            events.push({tm:pTm(trick[0].player),lbl:'7 de abertura ('+pv.playerNames[trick[0].player]+')'});
        }
        var deck=pv.deck.filter(function(c){ return !!c; });
        var hands=pv.hands.map(function(h){ return h.slice(); });
        var wi=TORD.indexOf(w.player);
        for(var j=0;j<4;j++){ var pl=TORD[(wi+j)%4]; if(deck.length>0) hands[pl].push(deck.shift()); }
        var tN=pv.trickN+1, over=hands.every(function(h){ return h.length===0; });
        var cs = false;
        if(!over && tN<=3 && pv.tc && pv.tc.v!=='2' && deck.some(function(c){ return c && c.id===pv.tc.id; })){
          for(var si=0;si<4;si++){ if(hands[si].some(function(c){ return c.s===trump && c.v==='2'; })){ cs=si; break; } }
        }
        return Object.assign({},pv,{trick:[],tPts:tPn,events:events,hands:hands,deck:deck,trickN:tN,trumpSevenOut:pv.trumpSevenOut||sevenNow,curP:over?-1:w.player,phase:over?'end_round':'playing',lastW:w.player,canSwap:cs,msg:pv.playerNames[w.player]+' venceu a mao! (+'+tp+' pts)'});
      });
    }, isSolo?1100:800);
    return function(){ clearTimeout(t); };
  },[g.phase]);

  // End round
  useEffect(function(){
    if(g.phase!=='end_round') return;
    if(isOnline && g.lastActor!==myPid) return;
    var t = setTimeout(function(){
      sg(function(pv){
        if(pv.phase!=='end_round') return pv;
        var mPts=pv.mPts.slice(), sum=[];
        var win=pv.tPts[0]>pv.tPts[1]?0:pv.tPts[1]>pv.tPts[0]?1:-1, newTB=0;
        if(win>=0){
          var l=1-win, basePts=(pv.batido&&pv.trump==='copas')?2:1, totalPts=basePts+pv.tieBonus;
          mPts[win]+=totalPts;
          var note=' +'+totalPts;
          if(pv.batido&&pv.trump==='copas') note+=' (copas batido!)';
          if(pv.tieBonus>0) note+=' (+'+pv.tieBonus+' empate)';
          sum.push('Dupla '+(win===0?'A':'B')+' venceu ('+pv.tPts[win]+'x'+pv.tPts[l]+'pts)'+note);
          if(pv.tPts[l]<30){ mPts[win]++; sum.push('Capote! +1 extra'); }
        } else { newTB=pv.tieBonus+1; sum.push('Empate 60x60! Proxima vale '+(1+newTB)+' pts!'); }
        pv.events.forEach(function(e){ mPts[e.tm]++; sum.push(e.lbl+' +1 dupla '+(e.tm===0?'A':'B')); });
        var go = mPts[0]>=4 || mPts[1]>=4;
        return Object.assign({},pv,{mPts:mPts,tieBonus:newTB,phase:go?'end_game':'show_summary',summary:sum});
      });
    },500);
    return function(){ clearTimeout(t); };
  },[g.phase]);

  function swap(){
    sg(function(pv){
      if(pv.canSwap!==mySeat || !pv.tc) return pv;
      var hands=pv.hands.map(function(h){ return h.slice(); });
      var i=hands[mySeat].findIndex(function(c){ return c && c.s===pv.trump && c.v==='2'; });
      if(i<0) return pv;
      var twoCard = hands[mySeat][i]; // Save the 2 card
      hands[mySeat][i]=pv.tc; // Put cut card in hand
      var deck=pv.deck.filter(function(c){ return c && c.id!==pv.tc.id; }); // Remove cut card from deck
      deck.splice(Math.floor(deck.length/2),0,twoCard); // Put the 2 in middle of deck
      return Object.assign({},pv,{hands:hands,deck:deck,tc:null,canSwap:false,msg:'Corte alto! '+pv.tc.v+SYM[pv.trump]+' na mao, 2 no meio do baralho.',lastActor:isOnline?myPid:pv.lastActor});
    });
  }

  var myTurn = g.curP===mySeat && g.phase==='playing' && (isSolo||isOnline);
  var modal = g.phase==='show_summary' || g.phase==='end_game';
  var isLastHand = g.deck.length===0 && g.phase==='playing';
  var showP = (partnerCount>0) || modal;
  var isCB = g.batido && g.trump==='copas';

  function rPlaced(p){
    var pl=g.trick.find(function(t){ return t.player===p; });
    return pl && pl.card ? rCard(pl.card,null,false,false,true,false,mob) : rSlot(g.curP===p && g.phase==='playing',mob);
  }

  function rHand(seat,isMe,isPartner){
    var hand=g.hands[seat]||[]; if(!hand.length) return null;
    var showCards = isMe || (isPartner && (partnerCount>0 || modal));
    return hand.map(function(c){
      if(!c) return null;
      if(!showCards) return React.createElement(React.Fragment,{key:c.id},rCard(null,null,true,false,false,false,mob));
      if(!isMe) return React.createElement(React.Fragment,{key:c.id},rCard(c,null,false,false,false,false,mob));
      var s7out = g.trumpSevenOut || g.trick.some(function(t){ return t.card && t.card.v==='7' && t.card.s===g.trump; }) || hand.some(function(h){ return h && h.v==='7' && h.s===g.trump; });
      var ab = c.v==='A' && c.s===g.trump && !s7out && hand.length>1;
      var canClick = myTurn && !ab && partnerCount<=0;
      return React.createElement(React.Fragment,{key:c.id},rCard(c,canClick?function(){playCard(mySeat,c);}:null,false,canClick,false,ab,mob));
    });
  }

  var mkRow = function(anim,delay){
    return React.createElement('div',{style:{display:'flex',flexDirection:'column',animation:anim?'shfl .55s ease-in-out infinite'+(delay?' ':'')+delay:'none'}},
      [0,1,2,3,4].map(function(i){ return React.createElement('div',{key:i,style:{width:50,height:13,background:'hsl(0,65%,'+(22+i*9)+'%)',border:'1px solid #C41230',marginTop:i?-1:0,borderRadius:i===0?'5px 5px 0 0':i===4?'0 0 5px 5px':'0'}}); })
    );
  };

  // ── SHUFFLE / CUT / DEAL ──
  if(g.phase==='shuffle' || g.phase==='cut' || (g.phase==='deal' && !isOnline)){
    var showCut = g.phase==='cut' && (isSolo ? cutter===0 : (iAmCutter || (isRoomHost && !!botSeats[cutter])));
    var aiCutting = g.phase==='cut' && !showCut;

    return React.createElement('div',{style:{minHeight:'100dvh',background:th.bg,fontFamily:'system-ui,sans-serif',color:'white',padding:mob?8:14,paddingBottom:mob?'max(10px, env(safe-area-inset-bottom))':14,boxSizing:'border-box',display:'flex',flexDirection:'column',gap:mob?8:12,overflowX:'hidden'}},
      React.createElement('style',null,ACSS),
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.15)'}},
        rLogo(36),
        React.createElement('div',{style:{borderLeft:'1px solid rgba(255,255,255,.15)',paddingLeft:10}},
          React.createElement('div',{style:{fontSize:16,fontWeight:'bold'}},'Bisca Fucas'),
          React.createElement('div',{style:{fontSize:10,opacity:0.5}},isSolo?'Solo vs IA':'Online'),
          React.createElement('div',{style:{fontSize:9,opacity:0.3}},th.name)
        ),
        React.createElement('div',{style:{marginLeft:'auto',fontSize:12,opacity:0.7}},'🟢'+g.mPts[0]+' x 🔴'+g.mPts[1])
      ),
      React.createElement('div',{style:{textAlign:'center',fontSize:12,opacity:0.65}},
        NAMES[dealer]+' embaralha \u00b7 '+NAMES[cutter]+' corta \u00b7 '+NAMES[g.starter]+' comeca',
        g.tieBonus>0 ? React.createElement('span',{style:{marginLeft:8,background:'#C41230',borderRadius:4,padding:'1px 6px',fontSize:11}},'Vale +'+(1+g.tieBonus)+' pts') : null
      ),
      g.phase==='shuffle' ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12}},mkRow(shuffling,''),React.createElement('div',{style:{width:3,height:78,background:'rgba(255,255,255,.15)',borderRadius:2}}),mkRow(shuffling,'animationDelay:.28s')),
        React.createElement('div',{style:{fontSize:15,animation:'pls 1s ease-in-out infinite'}},NAMES[dealer]+' embaralhando...')
      ) : null,
      showCut ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}},
        React.createElement('div',{style:{fontSize:14,opacity:0.85,fontWeight:'500'}},'Escolha como cortar:'),
        cutSec!=null && cutSec>0 ? React.createElement('div',{style:{fontSize:13,fontWeight:700,color:'#fbbf24',textAlign:'center',padding:'0 12px'}},'Tempo: '+cutSec+'s — se acabar, corta automático.') : null,
        React.createElement('div',{style:{display:'flex',gap:mob?12:24,alignItems:'flex-end',flexWrap:mob?'wrap':'nowrap',justifyContent:'center',maxWidth:'100%',boxSizing:'border-box'}},
          React.createElement('div',{onClick:function(){doCut('top');},onMouseEnter:function(){setHovHalf('top');},onMouseLeave:function(){setHovHalf(null);},style:{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',transform:cutAnim?'translateY(-32px)':'none',transition:'transform .55s cubic-bezier(.4,0,.2,1)'}},
            deckPile(20,null,hovHalf==='top',mob),
            React.createElement('div',{style:{fontSize:11,color:hovHalf==='top'?'#FFD700':'#fca5a5'}},'Metade de cima')
          ),
          React.createElement('div',{onClick:function(){doCut('bottom');},onMouseEnter:function(){setHovHalf('bottom');},onMouseLeave:function(){setHovHalf(null);},style:{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer'}},
            deckPile(20,null,hovHalf==='bottom',mob),
            React.createElement('div',{style:{fontSize:11,color:hovHalf==='bottom'?'#FFD700':'#fca5a5'}},'Metade de baixo')
          )
        ),
        React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:6,marginTop:4}},
          React.createElement('button',{onClick:doBat,style:Object.assign({},BTN,{padding:'10px 32px',animation:'pls 1.5s ease-in-out infinite'})},'Bater!'),
          React.createElement('div',{style:{fontSize:10,opacity:0.45}},'Bater = trunfo e copas, vencer vale 2 pts')
        )
      ) : null,
      aiCutting ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}},
        React.createElement('div',{style:{fontSize:15,animation:'pls 1s ease-in-out infinite'}},NAMES[cutter]+' cortando...')
      ) : null,
      g.phase==='deal' ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',gap:6}},
        React.createElement('div',{style:{textAlign:'center',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:8}},
          React.createElement('span',null,'Trunfo:'),
          React.createElement('b',{style:{color:g.trump==='ouros'||g.trump==='copas'?'#fca5a5':'#ddd',fontSize:15}},SYM[g.trump]+' '+g.trump),
          isCB ? React.createElement('span',{style:{background:'#C41230',borderRadius:4,padding:'1px 6px',fontSize:11}},'BATIDO') : null
        ),
        React.createElement('div',{style:{display:'grid',gridTemplateAreas:'"n n n""w c e""s s s"',gridTemplateColumns:mob?'minmax(0,1fr) minmax(52px,26vw) minmax(0,1fr)':'1fr 120px 1fr',gap:mob?4:6,alignItems:'center',justifyItems:'center',flex:1,minWidth:0,width:'100%'}},
          React.createElement('div',{style:{gridArea:'n',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{display:'flex',gap:3,minHeight:mob?52:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dN].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,dN!==mySeat,false,false,false,mob)):null; })),
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dN])
          ),
          React.createElement('div',{style:{gridArea:'w',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dW]),
            React.createElement('div',{style:{display:'flex',gap:2,minHeight:mob?52:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dW].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,true,false,false,false,mob)):null; }))
          ),
          React.createElement('div',{style:{gridArea:'c',display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:0}},
            g.tc ? React.createElement('div',{style:{transform:'rotate(-14deg)',marginBottom:-8}},rCard(g.tc,null,false,false,true,false,mob)) : null,
            deckPile(Math.max(0, g.batido ? 28-g.dealStep*3 : 28-g.dealStep),null,false,mob)
          ),
          React.createElement('div',{style:{gridArea:'e',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dE]),
            React.createElement('div',{style:{display:'flex',gap:2,minHeight:mob?52:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dE].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,true,false,false,false,mob)):null; }))
          ),
          React.createElement('div',{style:{gridArea:'s',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{display:'flex',gap:4,minHeight:mob?52:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dS].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,false,false,false,false,mob)):null; })),
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dS])
          )
        ),
        React.createElement('div',{style:{textAlign:'center',fontSize:12,opacity:0.6,animation:'pls 1s infinite'}},
          g.batido
            ? (g.dealStep<4 ? NAMES[TORD[(TORD.indexOf(g.starter)+g.dealStep)%4]]+' recebe 3 cartas... ('+(g.dealStep+1)+'/4)' : 'Preparando...')
            : (g.dealStep<12 ? 'Distribuindo '+(g.dealStep+1)+'/12...' : 'Preparando...')
        )
      ) : null
    );
  }

  // ── PLAYING SCREEN ──
  var gridColsPlay = mob ? 'minmax(0,1fr) minmax(52px,26vw) minmax(0,1fr)' : '1fr 192px 1fr';
  var tblW = mob ? 'min(26vw, 102px)' : 192;
  var tblH = mob ? 'min(24vw, 96px)' : 178;
  var edge = mob ? 4 : 7;
  return React.createElement('div',{style:{minHeight:'100dvh',background:th.bg,fontFamily:'system-ui,sans-serif',color:'white',padding:mob?'6px max(6px, env(safe-area-inset-left)) 6px max(6px, env(safe-area-inset-right))':12,paddingBottom:mob?'max(12px, env(safe-area-inset-bottom))':12,boxSizing:'border-box',position:'relative',overflowX:'hidden',width:'100%',maxWidth:'100vw'}},
    React.createElement('style',null,'@keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}'),
    React.createElement('div',{style:{display:'flex',flexDirection:mob?'column':'row',justifyContent:'space-between',alignItems:mob?'stretch':'center',gap:mob?8:0,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.15)'}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:mob?8:10}},
        rLogo(mob?28:40),
        React.createElement('div',{style:{borderLeft:mob?'none':'1px solid rgba(255,255,255,.15)',paddingLeft:mob?0:10}},
          React.createElement('div',{style:{fontSize:mob?15:18,fontWeight:'bold',letterSpacing:0.4}},'Bisca Fucas'),
          React.createElement('div',{style:{fontSize:10,opacity:0.5,marginTop:-1,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}},
            React.createElement('span',null,isSolo?'Solo vs IA':'Online'),
            isCB ? React.createElement('span',{style:{background:'#C41230',borderRadius:4,padding:'1px 5px'}},'copas batido') : null,
            g.tieBonus>0 ? React.createElement('span',{style:{background:'#7B3010',borderRadius:4,padding:'1px 5px',fontSize:10}},'vale '+(1+g.tieBonus)+' pts') : null
          )
        )
      ),
      React.createElement('div',{style:{display:'flex',gap:mob?10:6,fontSize:13,alignItems:'center',justifyContent:mob?'space-between':'flex-end'}},
        React.createElement('span',{style:{display:'flex',alignItems:'center',gap:4}},
          React.createElement('span',{style:{width:10,height:10,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}),
          React.createElement('span',{style:{fontSize:mob?10:11,opacity:0.6}},mob?'A':'Dupla A'),
          React.createElement('b',{style:{fontSize:mob?14:16}},g.mPts[0]),
          React.createElement('span',{style:{opacity:0.4}},'/4')
        ),
        React.createElement('span',{style:{opacity:0.3,fontSize:18}},'|'),
        React.createElement('span',{style:{display:'flex',alignItems:'center',gap:4}},
          React.createElement('span',{style:{width:10,height:10,borderRadius:'50%',background:'#f87171',display:'inline-block'}}),
          React.createElement('span',{style:{fontSize:mob?10:11,opacity:0.6}},mob?'B':'Dupla B'),
          React.createElement('b',{style:{fontSize:mob?14:16}},g.mPts[1]),
          React.createElement('span',{style:{opacity:0.4}},'/4')
        )
      )
    ),
    React.createElement('div',{style:{height:mob?4:8}}),
    React.createElement('div',{style:{background:'rgba(0,0,0,.4)',borderRadius:8,padding:mob?'6px 8px':'5px 12px',marginBottom:8,fontSize:mob?10:12,display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center'}},
      React.createElement('span',null,g.msg),
      React.createElement('span',{style:{opacity:0.7,fontSize:mob?9:11,lineHeight:1.35}},
        'Trunfo: ',
        React.createElement('b',{style:{color:g.trump==='ouros'||g.trump==='copas'?'#fca5a5':'#ddd'}},g.trump?SYM[g.trump]+' '+g.trump:'?'),
        ' | Mao '+(g.trickN+1)+'/10 | Deck:'+g.deck.length,
        !g.trumpSevenOut && g.trump ? React.createElement('span',{style:{color:'#fbbf24',marginLeft:4,fontSize:10}},'7'+SYM[g.trump]+' nao saiu') : null
      )
    ),
    partnerCount>0 ? React.createElement('div',{style:{background:'rgba(134,239,172,.2)',border:'1px solid #86efac',borderRadius:6,padding:'4px 12px',marginBottom:8,fontSize:12,textAlign:'center'}},'Veja as cartas do parceiro! '+partnerCount+'s...') : null,
    isLastHand ? React.createElement('div',{style:{background:'#C41230',borderRadius:6,padding:'4px 12px',marginBottom:8,fontSize:12,textAlign:'center',fontWeight:'bold',animation:'pls 2s infinite'}},'Ultima mao!') : null,
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}},
      React.createElement('span',{style:{fontSize:11,opacity:0.6}},'Corte:'),
      g.tc ? rCard(g.tc,null,false,false,true,false,mob)
        : isCB ? React.createElement('span',{style:{color:'#fca5a5',fontSize:14,fontWeight:'bold'}},'\u2665 copas batido')
        : g.rawTc ? React.createElement('span',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
            rCard(g.rawTc,null,false,false,true,false,mob),
            React.createElement('span',{style:{color:'#fca5a5',fontSize:11}},'\u2192 trunfo: '+SYM[g.trump]+' '+g.trump),
            React.createElement('span',{style:{opacity:0.4,fontSize:10}},'(voltou ao baralho)')
          )
        : null,
      g.canSwap===mySeat && g.tc ? React.createElement('button',{onClick:swap,style:{background:'#C41230',color:'#fff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:'bold',fontSize:11}},'Corte alto: 2'+SYM[g.trump]+' por '+g.tc.v+SYM[g.trump]) : null
    ),
    React.createElement('div',{style:{display:'grid',gridTemplateAreas:'"n n n" "w c e" "s s s"',gridTemplateColumns:gridColsPlay,gap:mob?4:8,alignItems:'center',justifyItems:'center',width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'}},
      React.createElement('div',{style:{gridArea:'n',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0}},
        React.createElement('div',{style:{display:'flex',gap:mob?2:4,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dN,false,true)),
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,textAlign:'center',lineHeight:1.2,padding:'0 4px'}},NAMES[dN]+(g.curP===dN?' 🎯':''),' ',React.createElement('span',{style:{color:'#86efac'}},mob?(pTm(dN)===0?'A':'B'):'dupla '+(pTm(dN)===0?'A':'B')))
      ),
      React.createElement('div',{style:{gridArea:'w',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0,overflow:'hidden'}},
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,textAlign:'center',lineHeight:1.2,padding:'0 2px'}},NAMES[dW]+(g.curP===dW?' 🎯':''),' ',React.createElement('span',{style:{color:'#fca5a5'}},mob?(pTm(dW)===0?'A':'B'):'dupla '+(pTm(dW)===0?'A':'B'))),
        React.createElement('div',{style:{display:'flex',gap:mob?1:2,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dW,false,false))
      ),
      React.createElement('div',{style:{gridArea:'c',position:'relative',width:tblW,height:tblH,maxWidth:'100%',minWidth:0,background:th.tableColor,borderRadius:th.name==='Terrafé'?'50%':14,border:th.tableBorder,boxShadow:th.tableShadow,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}},
        th.decor ? th.decor() : null,
        React.createElement('div',{style:{position:'absolute',top:edge,left:'50%',transform:'translateX(-50%)'}},rPlaced(dN)),
        React.createElement('div',{style:{position:'absolute',left:edge,top:'50%',transform:'translateY(-50%)'}},rPlaced(dW)),
        React.createElement('div',{style:{position:'absolute',right:edge,top:'50%',transform:'translateY(-50%)'}},rPlaced(dE)),
        React.createElement('div',{style:{position:'absolute',bottom:edge,left:'50%',transform:'translateX(-50%)'}},rPlaced(dS)),
        g.lastW!==null && g.lastW>=0 && g.lastW<4 && g.trick.length===0 ? React.createElement('div',{style:{fontSize:mob?8:10,opacity:0.35,textAlign:'center',padding:'0 4px'}},'ganhou: '+NAMES[g.lastW]) : null
      ),
      React.createElement('div',{style:{gridArea:'e',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0,overflow:'hidden'}},
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,textAlign:'center',lineHeight:1.2,padding:'0 2px'}},NAMES[dE]+(g.curP===dE?' 🎯':''),' ',React.createElement('span',{style:{color:'#fca5a5'}},mob?(pTm(dE)===0?'A':'B'):'dupla '+(pTm(dE)===0?'A':'B'))),
        React.createElement('div',{style:{display:'flex',gap:mob?1:2,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dE,false,false))
      ),
      React.createElement('div',{style:{gridArea:'s',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?4:6,paddingBottom:mob?4:0,minWidth:0,maxWidth:'100%'}},
        React.createElement('div',{style:{display:'flex',gap:mob?3:5,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dS,true,false)),
        React.createElement('div',{style:{fontSize:mob?11:12,fontWeight:'bold',color:myTurn&&partnerCount<=0?'#FFD700':'rgba(255,255,255,.6)',textAlign:'center',padding:'0 8px',lineHeight:1.25}},
          NAMES[dS]+(myTurn&&partnerCount<=0?(mob?' — Toque na carta':' Clique para jogar!'):''),' ',
          React.createElement('span',{style:{color:'#86efac',fontWeight:'normal',fontSize:mob?9:10}},mob?(pTm(dS)===0?'Dupla A':'Dupla B'):'dupla '+(pTm(dS)===0?'A':'B'))
        )
      )
    ),
    modal ? React.createElement('div',{style:{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,minHeight:'100dvh'}},
      React.createElement('div',{style:{background:'#3a0808',border:'1px solid #C41230',borderRadius:14,padding:28,maxWidth:400,width:'90%'}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:16}},
          rLogo(34),
          React.createElement('h2',{style:{margin:0,fontSize:18,fontWeight:'500'}},g.phase==='end_game'?'Fim de partida!':'Resultado da rodada')
        ),
        React.createElement('div',{style:{marginBottom:14}},
          g.summary ? g.summary.map(function(s,i){ return React.createElement('div',{key:i,style:{padding:'5px 0',fontSize:13,borderBottom:'1px solid rgba(255,255,255,.1)'}},s); }) : null
        ),
        React.createElement('div',{style:{textAlign:'center',fontSize:22,fontWeight:'bold',margin:'16px 0'}},'🟢 '+g.mPts[0]+' x '+g.mPts[1]+' 🔴'),
        g.phase==='end_game'
          ? React.createElement('div',{style:{textAlign:'center'}},
              React.createElement('div',{style:{fontSize:18,marginBottom:14}},g.mPts[0]>=4?'Dupla A venceu! 🎉':'Dupla B venceu! 🎉'),
              React.createElement('div',{style:{display:'flex',gap:10,justifyContent:'center'}},
                React.createElement('button',{onClick:function(){sg(mkGame(g.mPts,g.starter,g.tieBonus,g.playerNames,isOnline?myPid:g.lastActor));},style:BTN},'Revanche'),
                React.createElement('button',{onClick:function(){if(props.onMenu)props.onMenu();},style:Object.assign({},BTN,{background:'#444'})},'Menu')
              )
            )
          : React.createElement('div',{style:{textAlign:'center'}},
              React.createElement('button',{onClick:function(){sg(mkGame(g.mPts,g.starter,g.tieBonus,g.playerNames,isOnline?myPid:g.lastActor));},style:BTN},'Proxima rodada')
            )
      )
    ) : null,
    React.createElement('div',{style:{position:'fixed',bottom:mob?'max(8px, env(safe-area-inset-bottom))':8,right:mob?'max(10px, env(safe-area-inset-right))':10,fontSize:10,opacity:0.3}},'by: Ruivo01')
  );
}

/* ═══ APP ═══ */
export default function App(){
  var ss=useState('home'); var screen=ss[0], setScreen=ss[1];
  var ids=useState(''); var myId=ids[0], setMyId=ids[1];
  var nms=useState(''); var myName=nms[0], setMyName=nms[1];
  var rcs=useState(''); var roomCode=rcs[0], setRoomCode=rcs[1];
  var rms=useState(null); var room=rms[0], setRoom=rms[1];
  var gs=useState(null); var g=gs[0], sg=gs[1];
  var shs=useState(false); var shuffling=shs[0], setSh=shs[1];
  var cas=useState(false); var cutAnim=cas[0], setCa=cas[1];
  var hvs=useState(null); var hovHalf=hvs[0], setHovHalf=hvs[1];
  var ptc=useState(0); var partnerCount=ptc[0], setPT=ptc[1];
  var ogs=useState(null); var og=ogs[0], setOG=ogs[1];
  var oshs=useState(false); var oShuf=oshs[0], setOSh=oshs[1];
  var ocas=useState(false); var oCut=ocas[0], setOCa=ocas[1];
  var ohvs=useState(null); var oHov=ohvs[0], setOHov=ohvs[1];
  var optc=useState(0); var oPart=optc[0], setOPT=optc[1];
  var exs=useState(false); var showExit=exs[0], setShowExit=exs[1];
  var lcs=useState('sala'); var locId=lcs[0], setLocId=lcs[1];
  var crBusySt=useState(false); var crBusy=crBusySt[0], setCrBusy=crBusySt[1];
  var themeKey = locId;
  if((screen==='lobby' || screen==='online') && room && room.themeId) themeKey = room.themeId;
  if(!THEMES[themeKey]) themeKey = 'sala';
  var theme = THEMES[themeKey];
  var screenRef=useRef(screen);
  var myIdRef=useRef(myId);
  screenRef.current=screen;
  myIdRef.current=myId;

  useEffect(function(){
    if(screen!=="lobby" && screen!=="online") return;
    if(!roomCode) return;
    var unsub = RT.subscribeRoom(roomCode, function(r){
      if(!r) return;
      setRoom(r);
      var scr=screenRef.current;
      if(r.themeId && (scr==='lobby' || scr==='online')) setLocId(r.themeId);
      if(r.game && scr==="lobby") setScreen("online");
      if(r.game && scr==="online"){
        var gm=r.game;
        if(gm && gm.lastActor!==myIdRef.current) setOG(gm);
      }
    });
    return function(){ unsub(); };
  },[screen,roomCode]);

  useEffect(function(){
    if(screen!=="online"||!room||!room.game) return;
    setOG(function(prev){
      if(prev!=null) return prev;
      return normalizeGame(room.game);
    });
  },[screen,room,room&&room.game]);

  function goHome(){ setScreen('home'); setRoom(null); setRoomCode(''); sg(null); setOG(null); setShowExit(false); }

  var exitBtn = React.createElement('button',{onClick:function(){setShowExit(true);},style:{position:'fixed',bottom:'max(12px, calc(12px + env(safe-area-inset-bottom)))',left:'max(12px, calc(12px + env(safe-area-inset-left)))',background:'rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:11,padding:'5px 10px',zIndex:100}},'← Voltar');

  var exitModal = showExit ? React.createElement('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}},
    React.createElement('div',{style:{background:'#2a0a0a',border:'1px solid #C41230',borderRadius:14,padding:28,maxWidth:340,width:'90%',textAlign:'center'}},
      React.createElement('div',{style:{fontSize:18,fontWeight:'bold',marginBottom:8,color:'#fff'}},'Sair da partida?'),
      React.createElement('div',{style:{fontSize:13,opacity:0.6,marginBottom:20}},'O progresso será perdido.'),
      React.createElement('div',{style:{display:'flex',gap:10,justifyContent:'center'}},
        React.createElement('button',{onClick:goHome,style:BTN},'Sim, sair'),
        React.createElement('button',{onClick:function(){setShowExit(false);},style:{background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',borderRadius:8,padding:'10px 24px',cursor:'pointer',fontSize:14}},'Continuar')
      )
    )
  ) : null;

  if(screen==='home'){
    return React.createElement(HomeScreen,{
      onSolo:function(name){ setMyName(name); setScreen('pickLoc'); },
      onGoPickCreate:function(name){ setMyName(name); setScreen('pickLocCreate'); },
      onJoin:function(id,name,code,roomSnap){ setMyId(id); setMyName(name); setRoomCode(code); if(roomSnap){ setRoom(roomSnap); if(roomSnap.themeId) setLocId(roomSnap.themeId);} setScreen('lobby'); }
    });
  }

  if(screen==='pickLocCreate'){
    return React.createElement(React.Fragment,null,
      React.createElement(LocationScreen,{
        pickForCreate:true,
        onBack:function(){ if(!crBusy) setScreen('home'); },
        onSelect:async function(loc){
          if(crBusy || !RT.isConfigured()) return;
          setCrBusy(true);
          var c=mkCode(), pid=uid();
          var roomNew={code:c,hostId:pid,players:[{id:pid,name:myName,seat:-1,team:null}],game:null,themeId:loc};
          var ok = await RT.setRoom(c, roomNew);
          setCrBusy(false);
          if(ok){ setMyId(pid); setRoomCode(c); setLocId(loc); setRoom(roomNew); setScreen('lobby'); }
        }
      }),
      crBusy ? React.createElement('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99}},
        React.createElement('div',{style:{width:36,height:36,border:'3px solid transparent',borderTop:'3px solid #d4a843',borderRadius:'50%',animation:'spin .8s linear infinite'}})
      ) : null
    );
  }

  if(screen==='pickLoc'){
    return React.createElement(LocationScreen,{
      onBack:function(){ setScreen('home'); },
      onSelect:function(loc){ setLocId(loc); sg(mkGame(null,undefined,0,[myName,'Adv. Esq.','Parceiro','Adv. Dir.'])); setScreen('solo'); }
    });
  }

  if(screen==='lobby' && room){
    return React.createElement(LobbyScreen,{room:room,myId:myId,onLeave:goHome});
  }

  if(screen==='online' && room && og){
    var me = room.players.find(function(p){ return p.id===myId; });
    var botSeatsMap = {};
    room.players.forEach(function(p){
      if(p.isBot && typeof p.seat==='number' && p.seat>=0) botSeatsMap[p.seat]=true;
    });
    return React.createElement('div',{style:{position:'relative'}},
      React.createElement(GameScreen,{g:og,sg:setOG,isSolo:false,isOnline:true,mySeat:me?me.seat:0,myPid:myId,roomCode:roomCode,isRoomHost:room.hostId===myId,botSeats:botSeatsMap,partnerCount:oPart,setPT:setOPT,shuffling:oShuf,setSh:setOSh,cutAnim:oCut,setCa:setOCa,hovHalf:oHov,setHovHalf:setOHov,onMenu:goHome,theme:theme}),
      React.createElement(ChatPanel,{roomCode:roomCode,myName:myName}),
      exitBtn, exitModal
    );
  }

  if(screen==='solo' && g){
    return React.createElement('div',{style:{position:'relative'}},
      React.createElement(GameScreen,{g:g,sg:sg,isSolo:true,isOnline:false,mySeat:0,myPid:'solo',roomCode:'',partnerCount:partnerCount,setPT:setPT,shuffling:shuffling,setSh:setSh,cutAnim:cutAnim,setCa:setCa,hovHalf:hovHalf,setHovHalf:setHovHalf,onMenu:goHome,theme:theme}),
      exitBtn, exitModal
    );
  }

  if(screen==='online' && room && room.game && !og){
    return React.createElement('div',{style:{minHeight:'100vh',background:'#0a0a12',color:'rgba(255,255,255,.75)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif',fontSize:14}},'Carregando mesa...');
  }

  return React.createElement(HomeScreen,{onSolo:function(){},onGoPickCreate:function(){},onJoin:function(){}});
}

