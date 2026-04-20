"use client";
import React, { useState, useEffect, useRef } from "react";
import { ref, get, set as rtSet, onValue, onDisconnect, remove } from "firebase/database";
import { db } from "@/lib/firebase";

var RTB = "bisca/rooms";
/** Presença por sala (fora de rooms/{code}: setRoom reescreve a sala inteira e apagaria presence embutida). */
var RTP = "bisca/presence";
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
function presencePlayerRef(code, playerId) {
  if (!db || !code || !playerId) return null;
  return ref(db, RTP + "/" + code + "/" + playerId);
}
function presenceRoomRef(code) {
  if (!db || !code) return null;
  return ref(db, RTP + "/" + code);
}

/** onDisconnect da chave de presença atual (cancelar antes de sair ou trocar de sala). */
var activePresenceOnDisconnect = /** @type {import("firebase/database").OnDisconnect | null} */ (null);
var activePresencePlayerRef = /** @type {import("firebase/database").DatabaseReference | null} */ (null);

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
  for (var nj = 0; nj < 4; nj++) {
    names[nj] = clampDisplayName(String(names[nj] || "?")) || "?";
  }
  var stRaw = parseSeat(g.starter);
  return Object.assign({}, g, {
    hands: hands,
    trick: Array.isArray(g.trick) ? g.trick : [],
    deck: Array.isArray(g.deck) ? g.deck : [],
    fd: Array.isArray(g.fd) ? g.fd : [],
    events: Array.isArray(g.events) ? g.events : [],
    setWins: Array.isArray(g.setWins) ? g.setWins : [0, 0],
    playerNames: names,
    starter: isNaN(stRaw) ? 2 : stRaw,
  });
}

function normalizeRoom(r) {
  if (!r || typeof r !== "object") return null;
  var players = r.players;
  if (!Array.isArray(players)) {
    if (players && typeof players === "object") {
      players = Object.keys(players)
        .sort(function (a, b) {
          var na = Number(a),
            nb = Number(b);
          if (!isNaN(na) && !isNaN(nb) && String(na) === a && String(nb) === b) return na - nb;
          return a.localeCompare(b);
        })
        .map(function (k) {
          return players[k];
        })
        .filter(function (p) {
          return p && typeof p === "object";
        });
    } else players = [];
  }
  players = players.map(function (p) {
    if (!p || typeof p !== "object") return p;
    var nm = clampDisplayName(typeof p.name === "string" ? p.name : "") || "Jogador";
    return Object.assign({}, p, { name: nm });
  });
  var game = r.game != null ? normalizeGame(r.game) : null;
  var tid = r.themeId;
  if (tid !== "terrafe" && tid !== "hub" && tid !== "floresta" && tid !== "sala") tid = "sala";
  return Object.assign({}, r, { players: players, game: game, themeId: tid });
}

var BF_SESSION_KEY = "bf_online_session_v1";
function readBfSession() {
  try {
    if (typeof localStorage === "undefined") return null;
    var j = localStorage.getItem(BF_SESSION_KEY);
    if (!j) return null;
    var o = JSON.parse(j);
    if (!o || typeof o !== "object") return null;
    var code = typeof o.code === "string" ? o.code.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) : "";
    if (code.length !== 4 || !o.playerId) return null;
    return {
      code: code,
      playerId: String(o.playerId),
      playerName: clampDisplayName(typeof o.playerName === "string" ? o.playerName : ""),
    };
  } catch {
    return null;
  }
}
function writeBfSession(s) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      BF_SESSION_KEY,
      JSON.stringify({
        v: 1,
        code: s.code,
        playerId: s.playerId,
        playerName: clampDisplayName(s.playerName || ""),
      })
    );
  } catch {
    void 0;
  }
}
function clearBfSession() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(BF_SESSION_KEY);
  } catch {
    void 0;
  }
}

/** Limite no estilo de jogos competitivos (ex.: nome de invocador ~16 caracteres). */
var DISPLAY_NAME_MAX = 16;
/** Enquanto digita: junta espaços repetidos e corta só espaços no início — o espaço no fim fica (senão “João |” perde o espaço antes da próxima letra). */
function formatNameWhileTyping(s) {
  if (typeof s !== "string") return "";
  var t = s.replace(/\s+/g, " ").replace(/^\s+/, "");
  if (t.length > DISPLAY_NAME_MAX) t = t.slice(0, DISPLAY_NAME_MAX);
  return t;
}
/** Nome para gravar / validar: normaliza e remove espaços extra no início e fim. */
function clampDisplayName(s) {
  return formatNameWhileTyping(s).trim();
}

function playerInRoom(r, playerId) {
  if (!r || !playerId || !Array.isArray(r.players)) return null;
  for (var i = 0; i < r.players.length; i++) {
    var p = r.players[i];
    if (p && p.id === playerId) return p;
  }
  return null;
}

/**
 * Assento 0–3 no online: usa `room.players[].seat` quando válido; senão tenta casar o nome
 * com `game.playerNames` (corrige RT atrasado com seat -1 ou cliente que clampava tudo a 0).
 */
function resolveOnlineMySeat(room, myPlayerId, myDisplayName, gamePlayerNames) {
  if (!room || !Array.isArray(room.players)) return 0;
  var me = playerInRoom(room, myPlayerId);
  var raw = me && me.seat != null && me.seat !== "" ? Number(me.seat) : NaN;
  if (raw >= 0 && raw <= 3 && raw === Math.floor(raw)) return raw;
  var myNm = clampDisplayName(typeof myDisplayName === "string" ? myDisplayName : "") || "";
  var gpn = gamePlayerNames;
  if (Array.isArray(gpn) && gpn.length >= 4) {
    for (var si = 0; si < 4; si++) {
      var pn = clampDisplayName(String(gpn[si] || "")) || "";
      if (myNm && pn && pn === myNm) return si;
    }
  }
  return 0;
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
      var payload = Object.assign({}, room);
      if (Array.isArray(payload.players)) {
        var pm = {};
        for (var pi = 0; pi < payload.players.length; pi++) {
          var pl = payload.players[pi];
          if (pl && pl.id) pm[pl.id] = pl;
        }
        payload.players = pm;
      }
      await rtSet(rref, payload);
      return true;
    } catch {
      return false;
    }
  },
  deleteRoom: async function (code) {
    if (!db || !code) return false;
    try {
      var rref = roomDbRef(code);
      if (!rref) return false;
      await remove(rref);
      var pref = presenceRoomRef(code);
      if (pref) await remove(pref);
      return true;
    } catch {
      return false;
    }
  },
  /** Liga presença: escreve bisca/presence/{code}/{playerId}; onDisconnect remove só essa chave (roster em rooms/ mantém-se). */
  attachRoomPresence: async function (code, playerId) {
    if (!db || !code || !playerId) return;
    await RT.detachRoomPresence();
    var pref = presencePlayerRef(code, playerId);
    if (!pref) return;
    try {
      await rtSet(pref, true);
      var od = onDisconnect(pref);
      await od.remove();
      activePresenceOnDisconnect = od;
      activePresencePlayerRef = pref;
    } catch (e) {
      void e;
      activePresenceOnDisconnect = null;
      activePresencePlayerRef = null;
    }
  },
  detachRoomPresence: async function () {
    try {
      if (activePresenceOnDisconnect) {
        await activePresenceOnDisconnect.cancel();
      }
    } catch (e) {
      void e;
    }
    activePresenceOnDisconnect = null;
    try {
      if (activePresencePlayerRef) await remove(activePresencePlayerRef);
    } catch (e) {
      void e;
    }
    activePresencePlayerRef = null;
  },
  removeSelfFromRoom: async function (code, playerId) {
    if (!db || !code || !playerId) return;
    try {
      await RT.detachRoomPresence();
    } catch (e) {
      void e;
    }
    try {
      var pOnly = presencePlayerRef(code, playerId);
      if (pOnly) await remove(pOnly);
    } catch (e) {
      void e;
    }
    try {
      var r = await RT.getRoom(code);
      if (!r) return;
      if (!Array.isArray(r.players)) return;
      var players = r.players.filter(function (p) {
        return p && p.id !== playerId;
      });
      var humans = players.filter(function (p) {
        return !p.isBot;
      });
      if (humans.length === 0) {
        await RT.deleteRoom(code);
        return;
      }
      var hostId = r.hostId;
      if (hostId === playerId || !players.some(function (p) { return p.id === hostId; })) {
        hostId = humans[0].id;
      }
      await RT.setRoom(code, Object.assign({}, r, { players: players, hostId: hostId }));
    } catch (e) {
      void e;
    }
  },
  setGame: async function (code, game) {
    if (!db) return false;
    var gref = gameDbRef(code);
    if (!gref) return false;
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        await rtSet(gref, game);
        return true;
      } catch {
        if (attempt === 2) return false;
        await new Promise(function (r) {
          setTimeout(r, 280 * (attempt + 1));
        });
      }
    }
    return false;
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
    var rref = roomDbRef(code);
    if (!rref) return function () {};
    var roomRef = rref;
    return onValue(roomRef, function (snap) {
      void (async function () {
        if (!snap.exists()) {
          cb(null);
          return;
        }
        var r = normalizeRoom(snap.val());
        if (!r || !Array.isArray(r.players)) {
          cb(null);
          return;
        }
        var humans = r.players.filter(function (p) {
          return !p.isBot;
        });
        if (humans.length === 0) {
          try {
            await RT.deleteRoom(code);
          } catch (e) {
            void e;
          }
          cb(null);
          return;
        }
        var hostOk = r.players.some(function (p) {
          return p.id === r.hostId;
        });
        if (!hostOk) {
          var fixedHost = Object.assign({}, r, { hostId: humans[0].id });
          try {
            await RT.setRoom(code, fixedHost);
            cb(fixedHost);
          } catch (e) {
            void e;
            cb(r);
          }
          return;
        }
        cb(r);
      })();
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
/** Assento 0–3 válido em TORD; aceita string vinda do Firebase; NaN se inválido. */
function parseSeat(p){
  if(p==null||p==='') return NaN;
  var n = typeof p === 'number' ? p : parseInt(String(p),10);
  if(isNaN(n)) return NaN;
  return TORD.indexOf(n) >= 0 ? n : NaN;
}
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

/** Fecha a vaza (host). Extraído para o fluxo normal e para watchdog anti-travamento. */
function bfResolveEndTrick(pv, roomHostId, isOnline) {
  if (!pv || pv.phase !== "end_trick" || !Array.isArray(pv.trick) || pv.trick.length !== 4) return pv;
  var trick = pv.trick;
  var trump = pv.trump;
  var w = getWin(trick, trump);
  var wt = pTm(w.player);
  var tp = trick.reduce(function (s, x) {
    return s + cPts(x.card);
  }, 0);
  var tPn = pv.tPts.slice();
  tPn[wt] += tp;
  var events = pv.events.slice();
  var sevenNow = trick.some(function (x) {
    return x.card.v === "7" && x.card.s === trump;
  });
  var pNs = pv.playerNames || ["?", "?", "?", "?"];
  for (var i = 0; i < trick.length - 1; i++) {
    if (trick[i].card.s === trump && trick[i].card.v === "7" && trick[i + 1].card.s === trump && trick[i + 1].card.v === "A")
      events.push({
        tm: pTm(trick[i + 1].player),
        lbl: "Rele! " + pNs[trick[i + 1].player] + " jogou o Ás após o 7",
      });
  }
  var stDeal = parseSeat(pv.starter);
  if (isNaN(stDeal)) stDeal = 2;
  if (pv.trickN === 0 && trick[0].player === stDeal && trick[0].card.s === trump && trick[0].card.v === "7") {
    var ot = 1 - pTm(trick[0].player);
    if (!trick.some(function (x) {
      return x.card.s === trump && x.card.v === "A" && pTm(x.player) === ot;
    }))
      events.push({ tm: pTm(trick[0].player), lbl: "7 de abertura (" + pNs[trick[0].player] + ")" });
  }
  var deck = pv.deck.filter(function (c) {
    return !!c;
  });
  var hands = pv.hands.map(function (h) {
    return h.slice();
  });
  var wi = TORD.indexOf(w.player);
  for (var j = 0; j < 4; j++) {
    var pl = TORD[(wi + j) % 4];
    if (deck.length > 0) hands[pl].push(deck.shift());
  }
  var tN = pv.trickN + 1;
  var over = hands.every(function (h) {
    return h.length === 0;
  });
  var cs = false;
  if (!over && pv.trickN <= 1 && pv.tc && pv.tc.v !== "2" && deck.some(function (c) {
    return c && c.id === pv.tc.id;
  })) {
    for (var si = 0; si < 4; si++) {
      if (hands[si].some(function (c) {
        return c.s === trump && c.v === "2";
      })) {
        cs = si;
        break;
      }
    }
  }
  var laEt = isOnline && roomHostId ? roomHostId : pv.lastActor;
  return Object.assign({}, pv, {
    trick: [],
    tPts: tPn,
    events: events,
    hands: hands,
    deck: deck,
    trickN: tN,
    trumpSevenOut: pv.trumpSevenOut || sevenNow,
    curP: over ? -1 : w.player,
    phase: over ? "end_round" : "playing",
    lastW: w.player,
    canSwap: cs,
    aceReveal: null,
    msg: pNs[w.player] + " venceu a mão! (+" + tp + " pts)",
    lastActor: laEt || pv.lastActor,
  });
}

/** Resumo da ronda na mesa (host). */
function bfResolveEndRound(pv, roomHostId, isOnline) {
  if (!pv || pv.phase !== "end_round") return pv;
  var mPts = pv.mPts.slice();
  var setWins = (pv.setWins || [0, 0]).slice();
  var sum = [];
  var win = pv.tPts[0] > pv.tPts[1] ? 0 : pv.tPts[1] > pv.tPts[0] ? 1 : -1;
  var newTB = 0;
  if (win >= 0) {
    var l = 1 - win;
    var basePts = pv.batido && pv.trump === "copas" ? 2 : 1;
    var ponta61 = pv.tPts[win] === 61 && pv.tPts[l] === 59;
    var pontaPts = ponta61 ? 1 : 0;
    var totalPts = basePts + pv.tieBonus + pontaPts;
    mPts[win] += totalPts;
    sum.push("Dupla " + (win === 0 ? "A" : "B") + " venceu na mesa (" + pv.tPts[win] + " a " + pv.tPts[l] + " pts).");
    var bits = [];
    if (pv.batido && pv.trump === "copas") bits.push("Copas batido");
    else bits.push("corte normal");
    if (pv.tieBonus > 0) bits.push("+" + pv.tieBonus + " pt bónus 60–60");
    if (ponta61) bits.push("ponta 61–59");
    sum.push("Soma: +" + totalPts + " pt (" + bits.join(" · ") + ").");
    if (pv.tPts[l] < 30) {
      mPts[win]++;
      sum.push("Capote! +1 extra");
    }
  } else {
    newTB = pv.tieBonus + 1;
    sum.push("Empate 60 a 60 na mesa — ninguém marca ponto nesta partida.");
    sum.push(
      "Na próxima partida, quem ganhar na mesa por pontos soma +1 pt extra por cada um destes empates 60-60 (acumulado neste momento: +" +
        newTB +
        " pt na próxima vitória por pontos)."
    );
    sum.push(
      "Exemplos: corte normal → 1 + " +
        newTB +
        " = " +
        (1 + newTB) +
        " pts na partida; Copas batido → 2 + " +
        newTB +
        " = " +
        (2 + newTB) +
        " pts na partida."
    );
  }
  pv.events.forEach(function (e) {
    mPts[e.tm]++;
    sum.push(e.lbl + " +1 dupla " + (e.tm === 0 ? "A" : "B"));
  });
  var m0 = mPts[0];
  var m1 = mPts[1];
  var bothAtOrPast4 = m0 >= 4 && m1 >= 4;
  var go;
  if (bothAtOrPast4) {
    go = win >= 0 && m0 !== m1;
    if (!go && win >= 0 && m0 === m1) sum.push("Partida empatada (" + m0 + "-" + m1 + "). Continua até desempatar na mesa.");
  } else {
    go = m0 >= 4 || m1 >= 4;
  }
  var summaryFinalMPts = null;
  if (go) {
    var matchWinner = m0 > m1 ? 0 : 1;
    setWins[matchWinner] += 1;
    sum.push("Dupla " + (matchWinner === 0 ? "A" : "B") + " fechou a partida de 4 pontos!");
    summaryFinalMPts = mPts.slice();
    mPts = [0, 0];
    newTB = 0;
  }
  var stKeep = parseSeat(pv.starter);
  if (isNaN(stKeep)) stKeep = 2;
  var laEr = isOnline && roomHostId ? roomHostId : pv.lastActor;
  return Object.assign({}, pv, {
    mPts: mPts,
    tieBonus: newTB,
    setWins: setWins,
    phase: "show_summary",
    summary: sum,
    starter: stKeep,
    summaryFinalMPts: summaryFinalMPts,
    lastActor: laEr || pv.lastActor,
  });
}

/**
 * Índice de rotação do maço antes de revelar a 13.ª carta (trunfo).
 * O UI humano usa só duas faixas: metade de baixo (8–12) e metade de cima (16–20).
 * Os bots usavam 8–31 ao calhas, o que favorecia demais a metade de cima e cortes “estranhos”.
 */
function aiPickCutRotateIndex(fd){
  if(!Array.isArray(fd) || fd.length<20) return 12;
  if(Math.random()<0.72) return 8 + Math.floor(Math.random() * 5);
  return 16 + Math.floor(Math.random() * 5);
}

/**
 * Partida a 4 pts: adversário com 3 e a dupla do cortador com 0, 1 ou 2 (3×0, 3×1, 3×2).
 * Copas batido faz a vitória na mesa valer +2 na partida — boa jogada de desespero/risco.
 */
function shouldBatDesvantagemPartida(mPts, cutterTeam){
  if(!Array.isArray(mPts) || mPts.length<2) return false;
  var my = mPts[cutterTeam], opp = mPts[1-cutterTeam];
  return opp===3 && my<=2;
}

/** Transição do corte para deal em modo copas batido (mesma lógica do botão "Bater!"). */
function stateBatidoFromCut(pv, lastActor){
  var actor = lastActor!=null && lastActor!=='' ? lastActor : pv.lastActor;
  return Object.assign({},pv,{
    phase:'deal',tc:null,trump:'copas',batido:true,dealStep:0,
    canSwap:false,trumpSevenOut:false,tPts:[0,0],trickN:0,trick:[],events:[],
    lastW:null,rawTc:null,msg:'COPAS BATIDO! Distribuindo 3 cartas por vez...',
    lastActor:actor
  });
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

/** 7 de corte não pode ser a 4.ª carta da rodada sem ter o Ás de corte na mão (regra de mesa). */
function mayPlaySevenTrumpFourth(trickLen, hand, trump, card){
  if(trickLen!==3 || !card || card.v!=='7' || card.s!==trump) return true;
  return hand.some(function(h){ return h && h.v==='A' && h.s===trump; });
}

/** Ás de trunfo só depois do 7 ter saído (nesta vaza ou noutra). Nunca antes do 7 de corte — mesmo com uma só carta na mão. */
function mayPlayAceTrump(trick, trump, trumpSevenOut, hand, card){
  if(!card || card.v!=='A' || card.s!==trump) return true;
  var s7 = trick.some(function(t){ return t.card && t.card.v==='7' && t.card.s===trump; });
  if(trumpSevenOut || s7) return true;
  return false;
}

/** Bíscas = Ás e 7 nos naipes que não são o de trunfo. O Ás e o 7 de trunfo não são bíscas. */
function isBiscaCard(card, trump){
  return !!card && card.s !== trump && (card.v === 'A' || card.v === '7');
}

/** Vaza com muito em jogo: bísca na mesa, Ás/7 (10–11 pts) ou soma já alta — ao cortar, usar o maior corte que ganha para não deixarem ir por cima. */
function trickNeedsStrongTrumpCut(trick, trump, trickPts){
  if(trickPts >= 10) return true;
  if(trick.some(function(t){ return t.card && isBiscaCard(t.card, trump); })) return true;
  if(trick.some(function(t){ return t.card && cPts(t.card) >= 10; })) return true;
  return false;
}

function aiPick(hand, trick, trump, mt, sevenOut, avoidLast, mem, tPts, trickN, mySeat){
  /* Vocabulário Bisca Fucas (mesa): "corte" = trunfo; "rodada" = 4 cartas na mesa; "mão" = ganhar essa rodada;
     "bísca" = Ás ou 7 fora do naipe de trunfo (Ás/7 de trunfo não são bíscas);
     "encarte" = matar a carta do adversário no mesmo naipe (carta maior que a que vai ganhando). Na abertura,
     RULE 3 é só "sair baixo" num naipe onde há A/7 — não é encarte.
     Dupla: (1) Dupla já a ganhar a mão (parceiro com corte ou encarte) → maximizar pontos na vaza com carta segura.
     (2) Parceiro já segura com corte → não jogar corte mais baixo que o dele (não levas a mão; só gastas corte).
     (3) Bísca ou 10/11 pts na mesa (ou vaza já alta) → ao cortar, maior corte que ganha, para fixar a vaza.
     Rele: logo após o 7 de trunfo na mesa, o próximo com o Ás de trunfo deve jogá-lo.
     Bísca na mesa + dupla a perder → encarte/corte com a maior carta do naipe/trunfo que ganha.
     Bísca + parceiro a ganhar com corte e ainda há quem jogar → subir ao máximo de trunfo; no último da vaza, não subir o corte do parceiro — só somar pontos fora de trunfo se der.
     Abertura: não sair com Ás/7 de bísca (fora de trunfo) cedo na partida — o adversário pode cortar por cima e levar a mão sem sabermos o que têm.
     Seguir: com a dupla a perder a vaza, nunca jogar bísca se houver lixo/outra carta — não se dá 10/11 à toa. */
  if(!hand.length) return null;
  if(!mem) mem = makeMemory();
  if(mySeat==null || mySeat<0) mySeat = 0;

  var pool = hand.filter(function(c){
    if(!c) return false;
    if(c.v==='A' && c.s===trump && !mayPlayAceTrump(trick, trump, sevenOut, hand, c)) return false;
    if(!mayPlaySevenTrumpFourth(trick.length, hand, trump, c)) return false;
    return true;
  });
  if(!pool.length){
    pool = hand.filter(function(c){ return !!c; }).filter(function(c){
      if(c.v==='A' && c.s===trump && !mayPlayAceTrump(trick, trump, sevenOut, hand, c)) return false;
      return mayPlaySevenTrumpFourth(trick.length, hand, trump, c);
    });
  }
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
  var earlyLead = trickN <= 2;

  function byPtsAsc(a,b){ return cPts(a)-cPts(b) || cRnk(a)-cRnk(b); }
  function byPtsDesc(a,b){ return cPts(b)-cPts(a) || cRnk(b)-cRnk(a); }
  function byRnkAsc(a,b){ return cRnk(a)-cRnk(b); }
  function lowest(cards){ return cards.slice().sort(byPtsAsc)[0]; }
  function highest(cards){ return cards.slice().sort(byPtsDesc)[0]; }
  /** Com a mão perdida, não “oferecer” Ás/7 de bísca se houver outra carta jogável. */
  function lowestPreferNoBisca(cards){
    if(!cards||!cards.length) return null;
    var nb = cards.filter(function(c){ return !isBiscaCard(c, trump); });
    if(nb.length) return lowest(nb);
    return lowest(cards);
  }
  /** Versão “global”: prefere não-bísca no conjunto jogável inteiro (não só fora de trunfo). */
  function lowestPreferNoBiscaAny(cards){
    if(!cards||!cards.length) return null;
    var nb = cards.filter(function(c){ return !isBiscaCard(c, trump); });
    if(nb.length) return lowest(nb);
    return lowest(cards);
  }
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
    /* Nunca abrir a vaza com bísca (Ás/7 fora de trunfo) se houver qualquer outra carta jogável — só bísca/trunfo na mão é exceção. */
    var poolLead = pool.filter(function(c){ return !isBiscaCard(c, trump); });
    if(poolLead.length) pool = poolLead;
    trumpCards = pool.filter(function(c){ return c.s===trump; });
    nonTrump = pool.filter(function(c){ return c.s!==trump; });
    hasTrumpBackup = trumpCards.length>=2 || (trumpCards.length>=1 && trumpCards.some(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; }));
    strongTrumps = trumpCards.filter(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; });

    // RULE 1: na 1.ª mão, se abrir e tiver o 7 de trunfo, sai sempre com ele (regra da mesa: vale 1 ponto).
    var my7t = pool.find(function(c){ return c.v==='7' && c.s===trump; });
    if(my7t && trickN===0) return my7t;

    // RULE 2: Force opponents to use trump — lead suit they're void in
    // This is PRO strategy: if opponent is void in a suit, leading it forces them to trump or lose
    // Forçar naipe “seco” no adversário: evitar nas primeiras mãos se a dupla vai mal — poupa A/7 e não despeja bísca à toa
    if(!winning && (!earlyLead || losing) && !(losing && earlyLead && trickN<5)){
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

    // RULE 2b: últimas 3 rodadas (trickN 7–9) — abrir com o 7 de corte antes da última rodada se ainda não saiu,
    // para o parceiro poder usar o Ás de corte a tempo (Ás de corte só depois do 7 na mesa).
    var sevenOpen = pool.find(function(c){ return c.v==='7' && c.s===trump; });
    if(sevenOpen && endGame && !sevenOut && trickN < 9) return sevenOpen;

    // RULE 3 (abertura): sair baixo num naipe onde tens A ou 7 (trabalhar o naipe). Isto não é "encarte" na tua mesa.
    var openLowSuits = SUITS.filter(function(s){
      return s!==trump && suitHigh(s) && suitLows(s).length>0;
    });
    if(openLowSuits.length){
      openLowSuits.sort(function(a,b){ return suitCount(b)-suitCount(a); });
      var el = suitLows(openLowSuits[0]);
      if(el.length) return el[0];
    }

    /* Ás/7 de bísca na abertura: já filtrados por poolLead; o que resta abaixo só corre com mão sem outras saídas. */

    // RULE 6: If losing badly — K/J só quando a mesa já avançou (antes disso, RULE 7 lixo)
    if(losing && trickN>=3){
      var mids = nonTrump.filter(function(c){ return c.v==='K'||c.v==='J'; });
      if(mids.length && hasTrumpBackup) return mids.sort(byPtsDesc)[0];
    }

    // RULE 7: Garbage — probe with zero-value cards
    var garbage = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(garbage.length){
      // Prefer suits where opponent has cards (won't trump)
      var safeGarbage = garbage.filter(function(c){ return !opponentsVoidIn(mem, mt, c.s); });
      if(safeGarbage.length) return safeGarbage[Math.floor(Math.random()*safeGarbage.length)];
      // Prefer naipes onde não tens A/7 (guardar o setup da RULE 3)
      var pureG = garbage.filter(function(c){ return !suitHigh(c.s); });
      if(pureG.length) return pureG[Math.floor(Math.random()*pureG.length)];
      return garbage[Math.floor(Math.random()*garbage.length)];
    }

    // RULE 8: Q is only 2 pts, acceptable loss
    var queens = nonTrump.filter(function(c){ return c.v==='Q'; });
    if(queens.length) return queens[0];

    if(nonTrump.length){
      var lnb = lowestPreferNoBisca(nonTrump);
      if(lnb) return lnb;
    }
    return lowest(trumpCards);
  }

  // ══ FOLLOWING ══
  var lead = trick[0].card.s;
  var curWin = getWin(trick, trump);
  var partnerWinning = pTm(curWin.player)===mt;
  var isLast = trick.length===3;
  var is2nd = trick.length===1;
  var is3rd = trick.length===2;
  var followOpts = pool.filter(function(c){ return c.s===lead; });
  var followCanWin = winners(followOpts, curWin.card, lead);
  var voidLead = followOpts.length===0;
  /* Regra da mesa local: só “seguir naipe” de forma rígida quando isso encarta/ganha.
     Se não há carta do naipe que ganhe, a IA pode cortar para capturar pontos (ex.: bísca na mesa). */
  if(followCanWin.length){
    pool = followOpts;
    trumpCards = pool.filter(function(c){ return c.s===trump; });
    nonTrump = pool.filter(function(c){ return c.s!==trump; });
    strongTrumps = trumpCards.filter(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; });
    hasTrumpBackup = trumpCards.length>=2 || (trumpCards.length>=1 && trumpCards.some(function(c){ return c.v==='A'||c.v==='7'||c.v==='K'; }));
  }
  var followSuit = pool.filter(function(c){ return c.s===lead; });
  var anyBiscaTableGlobal = trick.some(function(t){ return t.card && isBiscaCard(t.card, trump); });

  // RELE: o jogador imediatamente a seguir ao 7 de trunfo na mesa deve pôr o Ás de trunfo se o tiver (pontos de rele).
  if(trick.length>0){
    var lastTr = trick[trick.length-1];
    if(lastTr && lastTr.card && lastTr.card.v==='7' && lastTr.card.s===trump){
      var aceRele = pool.find(function(c){ return c.v==='A' && c.s===trump; });
      if(aceRele) return aceRele;
    }
  }

  // ── PARTNER WINNING (dupla vai ganhando a rodada): maximizar pontos na vaza quando a mão é segura; nunca “corte morto” abaixo do corte do parceiro ──
  if(partnerWinning){
    function teamWinsWith(card){
      var w = getWin(trick.concat([{player:mySeat,card:card}]), trump);
      return pTm(w.player)===mt;
    }
    var safePool = pool.filter(function(c){ return teamWinsWith(c); });
    if(!safePool.length) return lowest(pool);

    var mateWinsTrump = curWin.card.s===trump;
    /* Bísca na mesa, parceiro vai ganhando com corte e ainda há quem jogar: subir ao máximo de trunfo para não deixarem roubar a vaza. */
    if(anyBiscaTableGlobal && mateWinsTrump && !isLast){
      var raiseTrump = pool.filter(function(c){
        return c.s===trump && beats(c, curWin.card, lead, trump) && teamWinsWith(c);
      });
      if(raiseTrump.length){
        return raiseTrump.slice().sort(function(a,b){ return cRnk(b)-cRnk(a) || cPts(b)-cPts(a); })[0];
      }
    }
    var winCard = curWin.card;
    var candidates = safePool;
    if(mateWinsTrump){
      var ntOnly = safePool.filter(function(c){ return c.s!==trump; });
      if(ntOnly.length) candidates = ntOnly;
    } else if(curWin.card.s===lead && curWin.card.s!==trump){
      /* Dupla já vai ganhando no naipe (ex.: encartou Ás); não cortar por cima — somar bísca/lixo fora de corte. */
      var ntLeadWin = safePool.filter(function(c){ return c.s!==trump; });
      if(ntLeadWin.length) candidates = ntLeadWin;
    }
    /* Quem ganha a vaza tem de continuar a ser o parceiro: não “roubar” com corte mais alto nem trocar o vencedor sem necessidade. */
    function winnerSeatIfPlay(card){
      return getWin(trick.concat([{ player: mySeat, card: card }]), trump).player;
    }
    var keepPartnerAsWinner = candidates.filter(function(c){ return winnerSeatIfPlay(c) === curWin.player; });
    if(keepPartnerAsWinner.length) candidates = keepPartnerAsWinner;
    else {
      var dumpLose = pool.filter(function(c){ return !teamWinsWith(c) && c.s !== trump && cPts(c) <= 2; });
      if(dumpLose.length) return lowest(dumpLose);
    }
    /* Último a jogar, bísca na mesa, parceiro já vai ganhando com corte: não “subir” o corte do parceiro — somar fora de trunfo se der. */
    if(isLast && anyBiscaTableGlobal && mateWinsTrump && pTm(curWin.player)===mt){
      var noTrumpOverMate = candidates.filter(function(c){
        if(c.s!==trump) return true;
        return !beats(c, curWin.card, lead, trump);
      });
      if(noTrumpOverMate.length) candidates = noTrumpOverMate;
    }
    // Parceiro já largou bísca (Ás/7 fora de trunfo): não empilhar outra bísca se uma carta fraca ainda deixa a dupla ganhar.
    var matePlayedBisca = trick.some(function(t){
      return pTm(t.player)===mt && isBiscaCard(t.card, trump);
    });
    if(matePlayedBisca){
      var cheapWin = candidates.filter(function(c){ return !isBiscaCard(c, trump); });
      if(cheapWin.length) return cheapWin.slice().sort(byPtsAsc)[0];
    }
    // Parceiro com corte (ou tu só podes somar no naipe): somar o máximo de pontos possível na vaza.
    return candidates.slice().sort(function(a,b){ return cPts(b)-cPts(a) || cRnk(b)-cRnk(a); })[0];
  }

  // Parceiro já pôs bísca (Ás/7 fora de trunfo): recuperar esses pontos pesa mais que poupar corte baixo
  var partnerPutBisca = trick.some(function(t){
    return pTm(t.player)===mt && isBiscaCard(t.card, trump);
  });

  /* Adversário já ganha com corte (ex.: 4 de copas), vaza sem bísca — nunca descartar Ás/7 fora de trunfo se houver lixo. */
  var anyBiscaOnTableEarly = trick.some(function(t){ return t.card && isBiscaCard(t.card, trump); });
  if(
    voidLead &&
    !partnerWinning &&
    pTm(curWin.player) !== mt &&
    curWin.card.s === trump &&
    !anyBiscaOnTableEarly &&
    trickPts <= 10
  ){
    var shedNoBisca = pool.filter(function(c){ return c.s !== trump && !isBiscaCard(c, trump); });
    if(shedNoBisca.length) return shedNoBisca.slice().sort(byPtsAsc)[0];
  }

  // ── OPPONENT WINNING ──

  // Encarte (mesa): matar no mesmo naipe a carta que vai ganhando — menor carta que ainda ganha (menos pontos, depois menor força).
  var suitW = winners(followSuit, curWin.card, lead);
  if(suitW.length){
    if(lead===trump){
      var loseTrumpFollow = followSuit.filter(function(c){ return !beats(c, curWin.card, lead, trump); });
      function isHeavyTrump(c){ return c.v==='A' || c.v==='7' || c.v==='K' || c.v==='J' || c.v==='Q'; }
      var lightWinTrump = suitW.filter(function(c){ return !isHeavyTrump(c); });
      /* Trunfo puxado (corte sobre corte): em vaza sem bísca e fraca/média, não “encartar” trunfos altos à toa. */
      if(!anyBiscaTableGlobal && trickPts<=8){
        if(!isLast && loseTrumpFollow.length) return lowest(loseTrumpFollow);
        if(isLast){
          if(lightWinTrump.length) return lowest(lightWinTrump);
          if(trickPts<=4 && loseTrumpFollow.length) return lowest(loseTrumpFollow);
        }
      }
    }
    /* Com bísca na mesa e a dupla a perder a vaza: matar com a MAIOR carta do naipe (fixar pontos), não a mínima. */
    if(anyBiscaTableGlobal && !partnerWinning && pTm(curWin.player)!==mt){
      return suitW.slice().sort(function(a,b){ return cRnk(b)-cRnk(a) || cPts(b)-cPts(a); })[0];
    }
    var cw = suitW.slice().sort(byPtsAsc);
    // Vaza muito fraca: não gastar A/7 se houver carta intermédia que já ganha
    if(trickPts<=2){
      var cnb = cw.filter(function(c){ return c.v!=='A' && c.v!=='7'; });
      if(cnb.length) return cnb[0];
      var partnerNotInTrick = !trick.some(function(t){ return pTm(t.player)===mt; });
      // Só A/7 ganham e a rodada está fraca: só deixa de encartar se o parceiro ainda vai jogar (pode salvar sem gastar figuras)
      if(partnerNotInTrick && !isLast && nonTrump.filter(function(c){ return cPts(c)===0; }).length>0){
        return lowest(nonTrump.filter(function(c){ return cPts(c)===0; }));
      }
    }
    return cw[0];
  }

  // Should I trump?
  var trumpW = winners(trumpCards, curWin.card, lead);
  if(trumpW.length){
    var stakeHigh = trickNeedsStrongTrumpCut(trick, trump, trickPts);
    var anyBiscaOnTable = trick.some(function(t){ return t.card && isBiscaCard(t.card, trump); });
    /* Bísca na mesa e adversários a ganhar: sempre o maior trunfo que ganha (não deixar escapar a vaza). */
    if(anyBiscaOnTable && !partnerWinning && pTm(curWin.player)!==mt){
      return trumpW.slice().sort(function(a,b){ return cRnk(b)-cRnk(a) || cPts(b)-cPts(a); })[0];
    }
    function isKQJTrumpCard(c){ return c.s===trump && (c.v==='K'||c.v==='J'||c.v==='Q'); }
    /** Menor corte que ainda ganha, mas evita K/J/Q se houver 2–7 (poupa figuras de corte). */
    function pickWinningTrumpPreferLow(){
      var esc = trumpW.filter(function(c){ return !isKQJTrumpCard(c); });
      if(esc.length) return lowest(esc);
      return lowest(trumpW);
    }
    /** Bísca / vaza pesada: maior corte que ganha (força, depois pontos). */
    function pickWinningTrumpPreferHigh(){
      return trumpW.slice().sort(function(a,b){ return cRnk(b)-cRnk(a) || cPts(b)-cPts(a); })[0];
    }
    function pickWinningTrumpChosen(){
      return stakeHigh ? pickWinningTrumpPreferHigh() : pickWinningTrumpPreferLow();
    }
    var partnerNotYetPlayed = !trick.some(function(t){ return pTm(t.player)===mt; });

    if(partnerPutBisca){
      return trumpW.slice().sort(function(a,b){ return cRnk(b)-cRnk(a); })[0];
    }
    /* Adversário já vai ganhando com corte em vaza sem bísca e quase sem pontos: não gastar Dama/Rei/Valete só para isso — lixar se ainda der. */
    if(
      !stakeHigh &&
      !anyBiscaOnTable &&
      trickPts <= 4 &&
      curWin.card.s === trump &&
      pTm(curWin.player) !== mt
    ){
      var winTrumpNoFig = trumpW.filter(function(c){ return !isKQJTrumpCard(c); });
      if(!winTrumpNoFig.length){
        var lixoNt = nonTrump.filter(function(c){ return cPts(c) === 0; });
        if(lixoNt.length && !isLast) return lowest(lixoNt);
      }
    }
    if(endGame && !sevenOut && trickN < 9){
      var trumpSevenWin = trumpW.find(function(c){ return c.v==='7' && c.s===trump; });
      if(trumpSevenWin) return trumpSevenWin;
    }
    // Parceiro ainda joga: vaza sem grande valor — não abrir cortes em cadeia; lixo fora de trunfo
    if(!stakeHigh && partnerNotYetPlayed && !isLast && !partnerPutBisca && voidLead && !losing){
      if(trickPts<=8){
        var shed0 = pool.filter(function(c){ return c.s!==trump && cPts(c)===0; });
        if(shed0.length) return lowest(shed0);
      }
      if(trickPts<=5){
        var shed1 = pool.filter(function(c){ return c.s!==trump && cPts(c)<=2; });
        if(shed1.length) return lowest(shed1);
      }
    }
    // Adversário já vai ganhando de corte, rodada fraca/média, ainda não és o último: deixa o parceiro poupar cortes
    if(!stakeHigh && voidLead && !isLast && curWin.card.s===trump && trickPts<=10 && !losing && !partnerPutBisca){
      var duckOff = pool.filter(function(c){ return c.s!==trump && cPts(c)===0; });
      if(duckOff.length) return lowest(duckOff);
    }

    // Vaza fraca: não cortar só com K/J/Q (ou sem “corte baixo” que ganhe) se dá para lixar
    if(!stakeHigh && !partnerPutBisca && !losing){
      var trumpNoKQJ = trumpW.filter(function(c){ return !isKQJTrumpCard(c); });
      var onlyKQJWins = !trumpNoKQJ.length;
      if((trickPts<=3 && strongTrumps.length===0) || (trickPts<=7 && onlyKQJWins && !endGame)){
        var gb = nonTrump.filter(function(c){ return cPts(c)===0; });
        if(gb.length) return lowest(gb);
        if(trickPts<=5 && nonTrump.length){
          var midNb = lowestPreferNoBisca(nonTrump);
          if(midNb) return midNb;
          return nonTrump.slice().sort(byPtsAsc)[0];
        }
      }
    }

    // Last to play: trump if trick has value
    if(isLast && trickPts>=4) return pickWinningTrumpChosen();

    // High value trick: always trump
    if(trickPts>=10) return pickWinningTrumpChosen();

    // Medium value: cortar só se compensa (evita gastar figuras de corte em vazas médias)
    if(trickPts>=4 && (strongTrumps.length>=1 || trumpCards.length>=3)){
      if(!stakeHigh && !losing && !endGame && trickPts<8){
        var minWin = pickWinningTrumpPreferLow();
        if(isKQJTrumpCard(minWin) && trickPts<=6){
          var gbMid = nonTrump.filter(function(c){ return cPts(c)===0; });
          if(gbMid.length) return lowest(gbMid);
        }
      }
      return pickWinningTrumpChosen();
    }

    // Losing badly? Be more aggressive with trumping
    if(losing && trickPts>=3) return pickWinningTrumpChosen();

    // Endgame (last 3 tricks): trump more aggressively
    if(endGame && trickPts>=3) return pickWinningTrumpChosen();

    // Not worth trumping — mínimo de perda; nunca bísca fora de trunfo se houver outra carta
    var gb2 = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(gb2.length) return lowest(gb2);
    if(nonTrump.length){
      var nbb = lowestPreferNoBisca(nonTrump);
      if(nbb) return nbb;
      return nonTrump.slice().sort(byPtsAsc)[0];
    }
    return pickWinningTrumpChosen();
  }

  // Can't win — minimize loss
  // IMPORTANT: if partner still hasn't played, throw low — partner might win!
  var partnerStillToPlay = !trick.some(function(t){ return pTm(t.player)===mt; });
  if(partnerStillToPlay){
    var safeAny0 = pool.filter(function(c){ return !isBiscaCard(c, trump) && cPts(c)===0; });
    if(safeAny0.length) return lowest(safeAny0);
    var safeAny = lowestPreferNoBiscaAny(pool);
    if(safeAny) return safeAny;
    var zeros = nonTrump.filter(function(c){ return cPts(c)===0; });
    if(zeros.length) return lowest(zeros);
    if(nonTrump.length){
      var pnb = lowestPreferNoBisca(nonTrump);
      if(pnb) return pnb;
      return nonTrump.slice().sort(byPtsAsc)[0];
    }
    return lowest(pool);
  }

  // Dupla adversária vai ganhando: não dar pontos — lixo mínimo, depois damos o mínimo de valor possível
  var zeros2 = nonTrump.filter(function(c){ return cPts(c)===0; });
  if(zeros2.length) return lowest(zeros2);
  var safeAny2 = pool.filter(function(c){ return !isBiscaCard(c, trump) && cPts(c)===0; });
  if(safeAny2.length) return lowest(safeAny2);
  var safeAnyPick = lowestPreferNoBiscaAny(pool);
  if(safeAnyPick) return safeAnyPick;
  var qs = nonTrump.filter(function(c){ return c.v==='Q'; });
  if(qs.length) return qs[0];
  if(nonTrump.length){
    var lpb2 = lowestPreferNoBisca(nonTrump);
    if(lpb2) return lpb2;
    return nonTrump.slice().sort(byPtsAsc)[0];
  }
  var lpb3 = lowestPreferNoBisca(pool);
  if(lpb3) return lpb3;
  return pool.slice().sort(byPtsAsc)[0];
}

/** Jogada do bot na mesa (host online ou solo). Usado pelo timer normal e pelo watchdog. */
function bfApplyBotSeatPlay(pv, seat, myPid, playerNames, forOnlineHost) {
  if (!pv || pv.phase !== "playing" || pv.curP !== seat) return pv;
  var isLT = pv.deck.length === 0 && pv.hands.every(function (h) {
    return h.length <= 1;
  });
  var avL = isLT && pv.trick.length === 3;
  var card = aiPick(pv.hands[seat], pv.trick, pv.trump, pTm(seat), pv.trumpSevenOut, avL, aiMemory, pv.tPts, pv.trickN, seat);
  if (!card) return pv;
  recordPlay(aiMemory, seat, card, pv.trick, pv.trump);
  var hands = pv.hands.map(function (h) {
    return h.filter(function (c) {
      return c && c.id !== card.id;
    });
  });
  var trick = pv.trick.concat([{ player: seat, card: card }]);
  var done = trick.length === 4;
  var revealAceTrump =
    pv.trick.length === 3 && card.v === "7" && card.s === pv.trump && pv.hands[seat].some(function (c) {
      return c && c.v === "A" && c.s === pv.trump;
    });
  var aceCardBot = revealAceTrump
    ? pv.hands[seat].find(function (c) {
        return c && c.v === "A" && c.s === pv.trump;
      })
    : null;
  var pNs = playerNames || ["?", "?", "?", "?"];
  var msg = pNs[seat] + " jogou " + card.v + SYM[card.s];
  var upd = { hands: hands, trick: trick, curP: done ? -1 : nxt(seat), phase: done ? "end_trick" : "playing", msg: msg };
  if (revealAceTrump && aceCardBot)
    Object.assign(upd, {
      aceReveal: { seat: seat, t: Date.now(), ace: { v: aceCardBot.v, s: aceCardBot.s, id: aceCardBot.id } },
    });
  if (forOnlineHost) Object.assign(upd, { lastActor: myPid });
  return Object.assign({}, pv, upd);
}

/* ═══ GAME STATE ═══ */
/** Nova rodada: repasse o starter da rodada que acabou; o próximo quem começa é nxt(disso). Quem embaralha = prv(starter), corta = prv(prv(starter)). */
function mkGame(pm,ps,tb,names,actor,sw){
  var m = pm || [0,0];
  var prev = parseSeat(ps);
  var st = !isNaN(prev) ? nxt(prev) : 2;
  return {
    phase:'shuffle', starter:st, fd:shf(mkDk()), tc:null, trump:null, rawTc:null,
    hands:[[],[],[],[]], trick:[], curP:st, tPts:[0,0], mPts:m.slice(),
    trickN:0, canSwap:false, batido:false, trumpSevenOut:false, tieBonus:tb||0,
    setWins:Array.isArray(sw)?sw.slice():[0,0],
    events:[], summary:null, lastW:null, deck:[], dealStep:0, msg:'',
    playerNames: names || ['Você','Adv. Esq.','Parceiro','Adv. Dir.'],
    lastActor: actor || '',
    swapToast: null,
    aceReveal: null,
    summaryFinalMPts: null
  };
}

/** Um passo da distribuição (deal). Usado pelo timer normal e pelo watchdog anti-travamento. */
function advanceDealOneStep(prev) {
  if (!prev || prev.phase !== "deal") return prev;
  if (prev.batido) {
    if (prev.dealStep >= 4) return prev;
    var sb = prev.dealStep;
    var pIdx = TORD[(TORD.indexOf(prev.starter) + sb) % 4];
    var handsB = prev.hands.map(function (h) {
      return h.slice();
    });
    var b0 = sb * 3;
    if (!prev.fd[b0] || !prev.fd[b0 + 1] || !prev.fd[b0 + 2]) return prev;
    handsB[pIdx].push(prev.fd[b0]);
    handsB[pIdx].push(prev.fd[b0 + 1]);
    handsB[pIdx].push(prev.fd[b0 + 2]);
    return Object.assign({}, prev, { hands: handsB, dealStep: sb + 1 });
  }
  if (prev.dealStep >= 12) return prev;
  var s = prev.dealStep;
  var c = prev.fd[s];
  if (!c) return prev;
  var pl = TORD[(TORD.indexOf(prev.starter) + s) % 4];
  var handsN = prev.hands.map(function (h) {
    return h.slice();
  });
  handsN[pl].push(c);
  return Object.assign({}, prev, { hands: handsN, dealStep: s + 1 });
}

/** Ordem de fases para o host nunca aceitar um snapshot “mais atrás” por causa de RTDB atrasado. */
var BF_PHASE_RANK = {
  shuffle: 0,
  cut: 1,
  deal: 2,
  playing: 3,
  end_trick: 4,
  end_round: 5,
  show_summary: 6,
  end_game: 7,
};
function phaseRankBF(ph) {
  var r = BF_PHASE_RANK[ph];
  return typeof r === "number" ? r : -1;
}

function sumHandCards(g) {
  if (!g || !Array.isArray(g.hands)) return 0;
  return g.hands.reduce(function (s, h) {
    return s + (Array.isArray(h) ? h.length : 0);
  }, 0);
}

/**
 * Multijogador: o host aplica jogadas/bots localmente e grava no RTDB; snapshots fora de ordem
 * podem repor trick menor, dealStep menor ou fase anterior — cancela timers e trava a mesa.
 * Só o host faz merge conservador; outros clientes seguem sempre o servidor.
 */
function mergeOnlineGameState(prev, incoming, hostId, myPlayerId) {
  if (!incoming) return prev;
  if (!hostId || myPlayerId !== hostId || !prev) return incoming;

  var pr = phaseRankBF(prev.phase);
  var ir = phaseRankBF(incoming.phase);
  if (ir < pr) return prev;
  if (ir > pr) return incoming;

  if (incoming.phase === "deal") {
    var pd = typeof prev.dealStep === "number" ? prev.dealStep : 0;
    var id = typeof incoming.dealStep === "number" ? incoming.dealStep : 0;
    return pd > id ? prev : incoming;
  }

  if (incoming.phase === "playing") {
    var ptn = typeof prev.trickN === "number" ? prev.trickN : 0;
    var itn = typeof incoming.trickN === "number" ? incoming.trickN : 0;
    if (ptn !== itn) return ptn > itn ? prev : incoming;
    var pl = Array.isArray(prev.trick) ? prev.trick.length : 0;
    var il = Array.isArray(incoming.trick) ? incoming.trick.length : 0;
    if (pl !== il) return pl > il ? prev : incoming;
    var ph = sumHandCards(prev);
    var ih = sumHandCards(incoming);
    if (ph !== ih) return ph < ih ? prev : incoming;
    /* Mesma “forma” da mão: snapshot duplicado ou atrasado com curP errado — mantém o estado local do host. */
    return prev;
  }

  if (incoming.phase === "end_trick") {
    var pl2 = Array.isArray(prev.trick) ? prev.trick.length : 0;
    var il2 = Array.isArray(incoming.trick) ? incoming.trick.length : 0;
    if (pl2 !== il2) return pl2 > il2 ? prev : incoming;
    return incoming;
  }

  return incoming;
}

/* ═══ CSS ═══ */
var ACSS = [
  '@keyframes shfl{0%{transform:translateX(0)}30%{transform:translateX(-20px) rotate(-9deg)}70%{transform:translateX(20px) rotate(9deg)}100%{transform:translateX(0)}}',
  '@keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}',
  '@keyframes cin{from{opacity:0;transform:scale(.3) translateY(-15px)}to{opacity:1;transform:scale(1) translateY(0)}}',
  '@keyframes aceRevealIn{from{opacity:0;transform:translateY(10px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}',
  '@keyframes aceRevealBannerIn{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}',
  '@keyframes aceRevealPulse{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:1;filter:brightness(1.06)}}',
  '@keyframes aceRevealRing{0%,100%{box-shadow:0 0 0 1px rgba(251,191,36,.55),0 8px 26px rgba(0,0,0,.55),0 0 28px rgba(245,158,11,.35),inset 0 1px 0 rgba(255,255,255,.14)}50%{box-shadow:0 0 0 2px rgba(253,224,150,.85),0 12px 32px rgba(0,0,0,.62),0 0 36px rgba(251,191,36,.5),inset 0 1px 0 rgba(255,255,255,.22)}}',
  '@keyframes bfAceFlip3d{from{transform:rotateY(180deg)}to{transform:rotateY(0deg)}}',
  '@keyframes bfAceFlipFloat{0%{opacity:0;transform:translateY(12px) scale(.88)}18%{opacity:1}100%{opacity:1;transform:translateY(0) scale(1)}}',
  '@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
  '@keyframes float1{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-18px) rotate(5deg)}}',
  '@keyframes float2{0%,100%{transform:translateY(0) rotate(3deg)}50%{transform:translateY(-14px) rotate(-4deg)}}',
  '@keyframes float3{0%,100%{transform:translateY(-5px) rotate(2deg)}50%{transform:translateY(-22px) rotate(-6deg)}}',
  '@keyframes glow{0%,100%{text-shadow:0 0 20px rgba(196,18,48,.4)}50%{text-shadow:0 0 40px rgba(196,18,48,.7),0 0 60px rgba(212,168,67,.3)}}',
  '@keyframes spin{to{transform:rotate(360deg)}}',
  '@keyframes bfConnPulse{0%,100%{opacity:.45}50%{opacity:1}}'
].join('');

/* ═══ RENDER HELPERS ═══ */
function primaryButtonStyle(th){
  var u = (th && th.ui) || {};
  return {
    background: u.btnBg || '#C41230',
    color: u.btnText || '#fff',
    border: u.btnBorder || 'none',
    borderRadius: 8,
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 'bold',
    boxShadow: u.btnShadow || '0 2px 12px rgba(0,0,0,.22)',
  };
}

/* ═══ THEMES ═══ */
var THEMES = {
  terrafe: {
    id: 'terrafe', name: 'Terrafé', icon: '',
    bg: '#1a1208',
    pageGradient: 'linear-gradient(165deg, #23180f 0%, #2a1c10 42%, #1a1208 100%)',
    vignette: 'radial-gradient(ellipse 95% 78% at 50% 45%, transparent 30%, rgba(0,0,0,.52) 100%)',
    playfieldSurface: 'linear-gradient(145deg, rgba(55,42,28,.42) 0%, rgba(12,9,6,.58) 100%)',
    playfieldBorder: '1px solid rgba(201,149,106,.2)',
    playfieldRadius: 18,
    playfieldShadow: '0 14px 44px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.06)',
    tableColor: 'radial-gradient(ellipse at 50% 50%,#1a1a1a,#0d0d0d)',
    tableBorder: '2px solid #3a2a1a', tableShadow: 'inset 0 0 30px rgba(139,69,19,.15), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:50%', accent: '#8B4513',
    logoBar: '#b08968', logoLetter: '#fffef8', logoLetterStroke: 'rgba(26,18,8,.35)',
    venueChipBg: 'rgba(201,149,106,.22)', venueChipFg: '#fde8d0', venueChipBorder: 'rgba(212,168,67,.35)',
    cardBack: { grad: 'linear-gradient(160deg,#5c4033,#2d1810)', border: '#a67c52', hi: '#d4a574', label: 'rgba(253,230,138,.42)' },
    shuffleStripes: ['#24180f','#2f2015','#3a281b','#453021','#503827'],
    ui: {
      btnBg: '#6b4f36', btnText: '#fff8f0', btnShadow: '0 2px 14px rgba(0,0,0,.35)',
      timer: '#fcd34d', cutLabelMuted: 'rgba(253,230,138,.5)', cutLabelActive: '#fde68a',
      accentBadge: '#78350f',
    },
    decor: function(){ return []; }
  },
  hub: {
    id: 'hub', name: 'HUB Fucape', icon: '',
    bg: '#0a0a18',
    pageGradient: 'linear-gradient(165deg, #0a0a1c 0%, #12122e 48%, #0a0a18 100%)',
    vignette: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(37,99,235,.14) 0%, transparent 55%), radial-gradient(ellipse 92% 72% at 50% 48%, transparent 34%, rgba(0,0,0,.58) 100%)',
    playfieldSurface: 'linear-gradient(180deg, rgba(28,28,58,.4) 0%, rgba(8,8,22,.55) 100%)',
    playfieldBorder: '1px solid rgba(96,165,250,.18)',
    playfieldRadius: 16,
    playfieldShadow: '0 14px 44px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.07)',
    tableColor: 'radial-gradient(ellipse at 50% 50%,#15153a,#0a0a20)',
    tableBorder: '2px solid #2a2a5a', tableShadow: 'inset 0 0 30px rgba(37,99,235,.1), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:14px', accent: '#60a5fa',
    logoBar: '#e0f2fe', logoLetter: '#0c4a6e', logoLetterStroke: 'rgba(255,255,255,.5)',
    venueChipBg: 'rgba(224,242,254,.2)', venueChipFg: '#f0f9ff', venueChipBorder: 'rgba(147,197,253,.45)',
    cardBack: { grad: 'linear-gradient(160deg,#1e3a5f,#0c1929)', border: '#3b82f6', hi: '#60a5fa', label: 'rgba(147,197,253,.45)' },
    shuffleStripes: ['#0a1522','#0f1c2e','#14233a','#192a46','#1e3152'],
    ui: {
      btnBg: '#2563eb', btnText: '#f8fafc', btnShadow: '0 2px 14px rgba(37,99,235,.35)',
      timer: '#93c5fd', cutLabelMuted: 'rgba(147,197,253,.55)', cutLabelActive: '#e0f2fe',
      accentBadge: '#1d4ed8',
    },
    decor: function(){ return tableDecorHub(); }
  },
  floresta: {
    id: 'floresta', name: 'Floresta', icon: '',
    bg: '#0a1a0e',
    pageGradient: 'linear-gradient(165deg, #08140c 0%, #132018 48%, #0a1a0e 100%)',
    vignette: 'radial-gradient(ellipse 88% 50% at 50% 100%, rgba(45,90,39,.2) 0%, transparent 48%), radial-gradient(ellipse 95% 76% at 50% 42%, transparent 32%, rgba(0,0,0,.52) 100%)',
    playfieldSurface: 'linear-gradient(180deg, rgba(22,48,32,.38) 0%, rgba(6,20,12,.55) 100%)',
    playfieldBorder: '1px solid rgba(110,231,183,.14)',
    playfieldRadius: 14,
    playfieldShadow: '0 14px 44px rgba(0,0,0,.46), inset 0 1px 0 rgba(134,239,172,.06)',
    tableColor: 'radial-gradient(ellipse at 50% 50%,#1a2a1a,#0d1a0d)',
    tableBorder: '2px solid #2a3a2a', tableShadow: 'inset 0 0 30px rgba(45,90,39,.1), 0 0 20px rgba(0,0,0,.5)',
    tableShape: 'borderRadius:8px', accent: '#4ade80',
    logoBar: '#166534', logoLetter: '#ecfccb', logoLetterStroke: 'rgba(5,46,22,.4)',
    venueChipBg: 'rgba(74,222,128,.14)', venueChipFg: '#dcfce7', venueChipBorder: 'rgba(134,239,172,.35)',
    cardBack: { grad: 'linear-gradient(160deg,#14532d,#052e16)', border: '#22c55e', hi: '#4ade80', label: 'rgba(187,247,208,.4)' },
    shuffleStripes: ['#052e16','#0a3d1f','#0f4c28','#145b31','#196a3a'],
    ui: {
      btnBg: '#15803d', btnText: '#f0fdf4', btnShadow: '0 2px 14px rgba(21,128,61,.4)',
      timer: '#86efac', cutLabelMuted: 'rgba(134,239,172,.5)', cutLabelActive: '#bbf7d0',
      accentBadge: '#166534',
    },
    decor: function(){ return []; }
  },
  sala: {
    id: 'sala', name: 'Sala de Aula', icon: '',
    bg: '#6B1010',
    pageGradient: 'linear-gradient(165deg, #3f0c0c 0%, #5a1010 38%, #6B1010 58%, #481010 100%)',
    vignette: 'radial-gradient(ellipse 90% 72% at 50% 40%, transparent 28%, rgba(0,0,0,.45) 100%)',
    playfieldSurface: 'linear-gradient(180deg, rgba(255,255,255,.06) 0%, rgba(0,0,0,.3) 100%)',
    playfieldBorder: '1px solid rgba(255,200,200,.14)',
    playfieldRadius: 16,
    playfieldShadow: '0 14px 44px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.07)',
    tableColor: 'radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.35),rgba(0,0,0,.25))',
    tableBorder: '1px solid rgba(255,100,100,.2)', tableShadow: 'inset 0 2px 15px rgba(0,0,0,.3)',
    tableShape: 'borderRadius:14px', accent: '#fb7185',
    logoBar: '#C41230', logoLetter: '#ffffff', logoLetterStroke: 'rgba(0,0,0,.35)',
    venueChipBg: 'rgba(255,255,255,.12)', venueChipFg: '#ffe4e6', venueChipBorder: 'rgba(251,113,133,.4)',
    cardBack: { grad: 'linear-gradient(160deg,#7B1010,#3A0606)', border: '#C41230', hi: '#fca5a5', label: 'rgba(255,255,255,.38)' },
    shuffleStripes: ['#2a0808','#3a0a0a','#4a0c0c','#5a0e0e','#6a1010'],
    ui: {
      btnBg: '#C41230', btnText: '#fff', btnShadow: '0 2px 14px rgba(196,18,48,.4)',
      timer: '#fcd34d', cutLabelMuted: 'rgba(254,202,202,.55)', cutLabelActive: '#fecaca',
      accentBadge: '#b91c1c',
    },
    decor: function(){ return []; }
  }
};

/** Vidro escuro + borda/superfície do tema da mesa. Sala de Aula mantém o painel vermelho clássico; demais cenários usam vidro do tema. */
function themeDialogChrome(th){
  th = th || THEMES.sala;
  if (th.id === 'sala') {
    return {
      background: 'linear-gradient(165deg, rgba(100,20,24,.95) 0%, #2a0a0a 48%, #1f0808 100%)',
      backdropFilter: 'saturate(1.06) blur(12px)',
      WebkitBackdropFilter: 'saturate(1.06) blur(12px)',
      border: '1px solid #C41230',
      boxShadow: '0 20px 56px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06), 0 0 28px rgba(196,18,48,.18)',
      borderRadius: 18,
    };
  }
  var surface = th.playfieldSurface || 'linear-gradient(180deg, rgba(255,255,255,.06) 0%, rgba(0,0,0,.32) 100%)';
  var border = th.playfieldBorder || '1px solid rgba(255,255,255,.12)';
  return {
    background: surface + ', rgba(7,9,14,.88)',
    backdropFilter: 'saturate(1.12) blur(18px)',
    WebkitBackdropFilter: 'saturate(1.12) blur(18px)',
    border: border,
    boxShadow: '0 20px 56px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
    borderRadius: 18,
  };
}

function themeGhostButtonStyle(th){
  th = th || THEMES.sala;
  return {
    background: th.venueChipBg || 'rgba(255,255,255,.1)',
    color: th.venueChipFg || '#fff',
    border: '1px solid ' + (th.venueChipBorder || 'rgba(255,255,255,.22)'),
    borderRadius: 8,
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  };
}

var DEFAULT_CARD_BACK = { grad: 'linear-gradient(160deg,#7B1010,#3A0606)', border: '#C41230', hi: '#FFD700', label: 'rgba(255,255,255,.35)' };

function cardBackSkin(th){
  if(th && th.cardBack) return th.cardBack;
  return DEFAULT_CARD_BACK;
}

/** Placar: pontos + meta colados; partidas (n) à direita; tipografia estável para 0–9. */
function scoreTeamLine(mob, dotHex, shortLabel, mVal, setW, goal, compact){
  goal = goal || 4;
  var fs = compact ? (mob ? 13 : 14) : (mob ? 15 : 17);
  var fsSlash = compact ? (mob ? 11 : 12) : (mob ? 13 : 15);
  var fsSide = compact ? (mob ? 9 : 10) : (mob ? 10 : 11);
  var dotSz = compact ? 7 : 10;
  var mStr = String(mVal);
  return React.createElement('span',{style:{display:'inline-flex',alignItems:'center',gap:compact?(mob?4:5):(mob?5:6),flexWrap:'nowrap'}},
    React.createElement('span',{style:{width:dotSz,height:dotSz,borderRadius:'50%',background:dotHex,flexShrink:0}}),
    React.createElement('span',{style:{fontSize:fsSide,opacity:0.62,fontWeight:600,whiteSpace:'nowrap',letterSpacing:0.02}},shortLabel),
    React.createElement('span',{style:{display:'inline-flex',alignItems:'baseline',gap:0,fontVariantNumeric:'tabular-nums',lineHeight:1,whiteSpace:'nowrap'}},
      React.createElement('span',{style:{fontSize:fs,fontWeight:800,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.02em',minWidth:'1ch',textAlign:'right'}},mStr),
      React.createElement('span',{style:{fontSize:fsSlash,opacity:0.38,fontWeight:700,fontVariantNumeric:'tabular-nums'}},'/'+goal)
    ),
    setW>0 ? React.createElement('span',{style:{fontSize:fsSide,opacity:0.5,fontWeight:600,marginLeft:compact?6:8,fontVariantNumeric:'tabular-nums'}},'('+setW+')') : null
  );
}

/** Nome do cenário legível em qualquer tema (lobby / header). */
function venueNameChip(th, fs){
  if(!th) return null;
  fs = fs || 10;
  var bg = th.venueChipBg || 'rgba(255,255,255,.1)';
  var fg = th.venueChipFg || '#f8fafc';
  var br = th.venueChipBorder || 'rgba(255,255,255,.22)';
  return React.createElement('span',{style:{display:'inline-block',fontSize:fs,fontWeight:600,color:fg,background:bg,border:'1px solid '+br,borderRadius:999,padding:'2px 10px',letterSpacing:0.02,lineHeight:1.35,boxShadow:'0 1px 2px rgba(0,0,0,.12)'}},th.name);
}

/** Fundo em camadas + vignete (mesa online / solo). */
function gameBackdropLayer(th){
  if(!th || !th.vignette) return null;
  return React.createElement('div',{'aria-hidden':true,style:{position:'absolute',inset:0,pointerEvents:'none',background:th.vignette,zIndex:0}});
}

/* === LOCATION MARKS (SVG) === */
/** HUB — texto colorido centrado no cartão (evita âncora à esquerda do SVG). */
function HubMark(sz) {
  var fs = Math.max(26, Math.round(sz * 0.52));
  return React.createElement(
    'div',
    {
      'aria-hidden': true,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: fs,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      },
    },
    React.createElement('span', { style: { color: '#2563eb' } }, 'h'),
    React.createElement('span', { style: { color: '#ef4444', position: 'relative', top: '0.1em' } }, 'u'),
    React.createElement('span', { style: { color: '#eab308', position: 'relative', top: '-0.06em' } }, 'b')
  );
}
/** Floresta: silhueta de árvore geométrica. */
function FlorestaMark(sz) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 56 56",
      width: sz,
      height: sz,
      "aria-hidden": true,
      style: { display: "block" },
    },
    React.createElement("path", {
      d: "M 28 4 L 44 34 H 37 L 48 46 H 8 L 19 34 H 12 Z",
      fill: "currentColor",
      opacity: 0.92,
    }),
    React.createElement("rect", {
      x: 23.5,
      y: 38,
      width: 9,
      height: 14,
      rx: 1.5,
      fill: "currentColor",
      opacity: 0.55,
    })
  );
}

/** HUB: marca colorida apagada no centro da mesa. */
function tableDecorHub() {
  return [
    React.createElement(
      'div',
      {
        key: 'hubm',
        style: {
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.1,
        },
      },
      React.createElement(
        'div',
        { style: { width: 200, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.4)' } },
        HubMark(96)
      )
    ),
  ];
}

/* ═══ LOCATION SELECT ═══ */
function LocationScreen(P){
  var floats=[{s:'\u2660',x:8,y:10,a:'float1',o:0.06,z:48},{s:'\u2665',x:88,y:8,a:'float2',o:0.07,z:40},{s:'\u2666',x:12,y:80,a:'float3',o:0.05,z:44},{s:'\u2660',x:85,y:75,a:'float1',o:0.06,z:42},{s:'\u2663',x:50,y:92,a:'float2',o:0.04,z:36},{s:'\u2663',x:45,y:4,a:'float3',o:0.05,z:38}];

  var locs = [
    {id:'terrafe',name:'Terrafé',color:'#c9956a',bg:'linear-gradient(145deg,#2a1c10,#1a1208)',glow:'rgba(139,69,19,.5)',
      logo:function(){
        var u = 'url(/assets/terrafe/logo.png)';
        var sz = 52;
        return React.createElement('div',{
          role:'img',
          'aria-label':'Terrafé',
          style:{
            width:sz,
            height:sz,
            flexShrink:0,
            boxSizing:'border-box',
            backgroundColor:'#e8c9a0',
            WebkitMaskImage:u,
            WebkitMaskSize:'contain',
            WebkitMaskRepeat:'no-repeat',
            WebkitMaskPosition:'center',
            maskImage:u,
            maskSize:'contain',
            maskRepeat:'no-repeat',
            maskPosition:'center',
            display:'block',
            filter:'drop-shadow(0 0 2px rgba(0,0,0,.45))',
          },
        });
      }},
    {id:'hub',name:'HUB Fucape',color:'#60a5fa',bg:'linear-gradient(145deg,#0e1230,#080818)',glow:'rgba(37,99,235,.5)',
      logo:function(){return HubMark(84);}},
    {id:'floresta',name:'Floresta',color:'#6ee7b7',bg:'linear-gradient(145deg,#142a18,#0a1a0e)',glow:'rgba(45,90,39,.5)',
      logo:function(){return React.createElement('div',{style:{color:'#86efac'}},FlorestaMark(52));}},
    {id:'sala',name:'Sala de Aula',color:'#fb7185',bg:'linear-gradient(145deg,#3a0808,#1a0404)',glow:'rgba(196,18,48,.5)',
      logo:function(){return rLogoW(50);}}
  ];

  return React.createElement('div',{style:{minHeight:'100vh',background:'linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)',fontFamily:'system-ui,sans-serif',color:'white',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'52px 20px 28px',position:'relative',overflow:'hidden'}},
    React.createElement('style',null,ACSS),
    React.createElement('style',null,'.bfLocTile{-webkit-tap-highlight-color:transparent;outline:none;touch-action:manipulation;box-shadow:0 10px 28px rgba(0,0,0,.55)}@media (hover:hover) and (pointer:fine){.bfLocTile:hover{box-shadow:0 0 30px var(--bfGlow);transform:translateY(-6px);border-color:var(--bfLoc) !important}}'),
    floats.map(function(f,i){return React.createElement('span',{key:i,style:{position:'absolute',left:f.x+'%',top:f.y+'%',fontSize:f.z,opacity:f.o,color:'#C81734',animation:f.a+' '+(3+i*0.4)+'s ease-in-out infinite',pointerEvents:'none'}},f.s);}),
    React.createElement('div',{style:{position:'absolute',top:20,left:20,display:'flex',alignItems:'center',gap:8}},
      React.createElement('button',{onClick:P.onBack,style:{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:20}},'←'),
      rLogoW(22)
    ),
    React.createElement('div',{style:{textAlign:'center',maxWidth:400,marginBottom:8,paddingTop:8}},
      React.createElement('div',{style:{fontSize:'clamp(26px,8vw,34px)',fontWeight:900,letterSpacing:2,lineHeight:1.1,marginBottom:10,background:'linear-gradient(135deg,#d4a843,#f0d078,#a17c2f)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'glow 3s ease-in-out infinite'}},'Escolha a mesa'),
      React.createElement('div',{style:{fontSize:13,opacity:0.5,letterSpacing:0.3,lineHeight:1.4}},P.pickForCreate?'Escolha a mesa da sala — todos verão o mesmo cenário.':'Onde você quer jogar?')
    ),
    P.pickForCreate && P.createRoomError
      ? React.createElement('div',{
          role: 'alert',
          style: {
            width: '100%',
            maxWidth: 360,
            marginBottom: 12,
            padding: '12px 14px',
            boxSizing: 'border-box',
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.45,
            color: 'rgba(254,242,242,.95)',
            background: 'rgba(127,29,29,.35)',
            border: '1px solid rgba(248,113,113,.35)',
            textAlign: 'left',
          },
        }, P.createRoomError)
      : null,
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,width:'100%',maxWidth:360}},
      locs.map(function(loc){
        return React.createElement('div',{key:loc.id,
          className:'bfLocTile',
          onClick:function(){P.onSelect(loc.id);},
          style:{background:loc.bg,border:'1.5px solid '+loc.color+'33',borderRadius:18,padding:'24px 14px 20px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,transition:'all .3s cubic-bezier(.4,0,.2,1)',minHeight:142,'--bfLoc':loc.color,'--bfGlow':loc.glow}
        },
          React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',minHeight:56,boxSizing:'border-box'}},loc.logo()),
          React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',boxSizing:'border-box'}},venueNameChip(THEMES[loc.id]||THEMES.sala,13))
        );
      })
    )
  );
}

function rLogo(h, th){
  var w = Math.round(h*0.55);
  var bar = (th && th.logoBar) || '#C41230';
  var letter = (th && th.logoLetter) || '#ffffff';
  var stroke = (th && th.logoLetterStroke) || 'rgba(0,0,0,.35)';
  return React.createElement('svg',{viewBox:'0 0 58 70',width:w,height:h,style:{flexShrink:0}},
    React.createElement('rect',{x:0,y:2,width:9,height:66,fill:bar,rx:1}),
    React.createElement('text',{x:12,y:62,fontFamily:'Georgia,serif',fontSize:62,fontWeight:'bold',fill:letter,stroke:stroke,strokeWidth:0.4,paintOrder:'stroke fill'},'F')
  );
}
function rLogoW(h){
  var w = Math.round(h*0.55);
  return React.createElement('svg',{viewBox:'0 0 58 70',width:w,height:h},
    React.createElement('rect',{x:0,y:2,width:9,height:66,fill:'#C41230',rx:1}),
    React.createElement('text',{x:12,y:62,fontFamily:'Georgia,serif',fontSize:62,fontWeight:'bold',fill:'#fff'},'F')
  );
}

function rCard(c,onClick,back,glow,sm,blocked,mob,bk){
  bk = bk || DEFAULT_CARD_BACK;
  var W,H,fs,symFs,pad;
  if(mob){
    if(back||!c){
      W=sm?26:30; H=sm?38:44;
      var bdM = glow ? bk.hi : bk.border;
      return React.createElement('div',{style:{width:W,height:H,boxSizing:'border-box',background:bk.grad,border:'2px solid '+bdM,borderRadius:5,flexShrink:0,touchAction:'manipulation'}});
    }
    if(sm){ W=30;H=40;fs=9;symFs=12;pad='3px 3px'; }
    else { W=44;H=58;fs=12;symFs=17;pad='5px 6px'; }
  } else {
    W=sm?30:46; H=sm?42:63;
    if(back||!c){
      var bdD = glow ? bk.hi : bk.border;
      return React.createElement('div',{style:{width:W,height:H,background:bk.grad,border:'2px solid '+bdD,borderRadius:5,flexShrink:0,touchAction:'manipulation'}});
    }
    fs=sm?9:11; symFs=sm?12:18; pad=sm?'1px 2px':'2px 4px';
  }
  var col = RCOL[c.s];
  var lift = mob ? -4 : -8;
  return React.createElement('div',{
    onClick: onClick,
    onMouseEnter: function(e){ if(onClick) e.currentTarget.style.transform='translateY('+lift+'px)'; },
    onMouseLeave: function(e){ e.currentTarget.style.transform='none'; },
    style:{width:W,height:H,boxSizing:'border-box',background:'white',border:'2px solid '+(glow?'#FFD700':col),borderRadius:5,
      cursor:blocked?'not-allowed':onClick?'pointer':'default',
      display:'flex',flexDirection:'column',justifyContent:'space-between',
      alignItems:'stretch',
      padding:pad,fontSize:fs,fontWeight:'bold',color:col,flexShrink:0,
      overflow:'visible',
      opacity:blocked?0.35:1,boxShadow:glow?'0 0 10px #FFD70088':'0 1px 4px #0004',
      transition:'transform .12s',userSelect:'none',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}
  },
    React.createElement('span',{style:{lineHeight:1.15,display:'block'}},c.v),
    React.createElement('span',{style:{textAlign:'center',fontSize:symFs,lineHeight:1,flex:1,display:'flex',alignItems:'center',justifyContent:'center'}},SYM[c.s]),
    React.createElement('span',{style:{transform:'rotate(180deg)',display:'block',lineHeight:1.15}},c.v)
  );
}

function rSlot(a,mob){
  var w=30, h=mob?40:42;
  return React.createElement('div',{style:{width:w,height:h,border:'1px dashed rgba(255,255,255,'+(a?'.45':'.1')+')',borderRadius:4,background:a?'rgba(255,255,255,.06)':'transparent',flexShrink:0}});
}

/** Ás de trunfo revelado: costas → face (3D), visível para todos. */
function aceRevealFlipVisual(ace, mob, cbk){
  if(!ace || !ace.v || !ace.s) return null;
  var face = rCard(ace, null, false, false, false, false, mob, cbk);
  var back = rCard(null, null, true, false, false, false, mob, cbk);
  return React.createElement('div',{style:{perspective:960, filter:'drop-shadow(0 18px 32px rgba(0,0,0,.5))'}},
    React.createElement('div',{style:{animation:'bfAceFlipFloat .95s cubic-bezier(.2,.9,.2,1) forwards'}},
      React.createElement('div',{style:{position:'relative', display:'inline-block', transformStyle:'preserve-3d', animation:'bfAceFlip3d .9s cubic-bezier(.32,.14,.12,1) .1s both'}},
        React.createElement('div',{style:{position:'absolute', left:0, top:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden', transform:'rotateY(180deg)'}}, back),
        React.createElement('div',{style:{position:'relative', backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden', transform:'rotateY(0deg)'}}, face)
      )
    )
  );
}

function deckPile(n,onClick,hi,mob,bk){
  bk = bk || DEFAULT_CARD_BACK;
  var cw=mob?30:46, ch=mob?44:63, off=mob?1:2, boxW=mob?36:52, boxH=mob?52:70, fs=mob?10:11;
  var bdLay = hi ? bk.hi : bk.border;
  var layers = [2,1,0].map(function(i){
    return React.createElement('div',{key:i,style:{position:'absolute',left:i*off,top:i*-off,width:cw,height:ch,background:bk.grad,border:'2px solid '+bdLay,borderRadius:5,boxShadow:'0 2px 6px #0005'}});
  });
  var lbl = React.createElement('div',{style:{position:'absolute',left:0,top:-2,width:cw,height:ch,display:'flex',alignItems:'center',justifyContent:'center',color:bk.label,fontSize:fs,fontWeight:'bold',fontVariantNumeric:'tabular-nums',zIndex:5}},n);
  return React.createElement('div',{onClick:onClick,style:{position:'relative',width:boxW,height:boxH,cursor:onClick?'pointer':'default',flexShrink:0,touchAction:'manipulation'}},layers[0],layers[1],layers[2],lbl);
}

/* ═══ CHAT ═══ */
/** Balão minimalista (botão flutuante). */
function ChatFabIcon() {
  return React.createElement(
    'svg',
    {
      width: 22,
      height: 22,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      stroke: 'currentColor',
      strokeWidth: 1.65,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    React.createElement('path', {
      d: 'M6 5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4.2L9 19v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    })
  );
}
function chatMsgCountLabel(n) {
  return (n > 50 ? '50+' : String(n)) + ' msgs';
}

/** Indicador de “vez de jogar” (SVG): branco, tamanho em px para alinhar com o nome na mesma linha flex. */
function rTurnIndicator(mob) {
  var px = mob ? 13 : 15;
  return React.createElement(
    'svg',
    {
      width: px,
      height: px,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-label': 'Vez de jogar',
      role: 'img',
      style: {
        display: 'block',
        flexShrink: 0,
      },
    },
    React.createElement('circle', { cx: 12, cy: 12, r: 3.25, fill: '#ffffff' }),
    React.createElement('circle', {
      cx: 12,
      cy: 12,
      r: 8,
      stroke: 'rgba(255,255,255,.55)',
      strokeWidth: 1.65,
      fill: 'none',
    })
  );
}

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

  var unreadBadgeTxt = unread > 50 ? '50+' : String(unread);
  var unreadBadgeWide = unread > 9 || unread > 50;
  // Chat button
  var btn = React.createElement('button',{onClick:toggleOpen,style:{position:'fixed',bottom:mob?'max(12px, env(safe-area-inset-bottom))':12,right:mob?'max(12px, env(safe-area-inset-right))':12,width:44,height:44,borderRadius:'50%',background:open?'#C41230':'rgba(0,0,0,.6)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,boxShadow:'0 4px 12px rgba(0,0,0,.4)'}},
    open ? '\u2715' : ChatFabIcon(),
    unread>0 && !open ? React.createElement('div',{style:{position:'absolute',top:-4,right:-4,background:'#C41230',color:'#fff',borderRadius:10,minWidth:18,height:18,padding:unreadBadgeWide?'0 5px':'0',fontSize:unread>50?9:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box'}},unreadBadgeTxt) : null
  );

  // Chat panel
  var panel = open ? React.createElement('div',{style:{position:'fixed',bottom:mob?'max(64px, calc(52px + env(safe-area-inset-bottom)))':64,right:mob?'max(12px, env(safe-area-inset-right))':12,width:mob?'min(280, calc(100vw - 24px))':280,maxHeight:mob?320:360,background:'#1a0a0a',border:'1px solid rgba(196,18,48,.3)',borderRadius:14,display:'flex',flexDirection:'column',zIndex:150,boxShadow:'0 8px 30px rgba(0,0,0,.6)',overflow:'hidden',touchAction:'manipulation',WebkitOverflowScrolling:'touch'}},
    // Header
    React.createElement('div',{style:{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.1)',fontSize:13,fontWeight:700,color:'#d4a843',display:'flex',justifyContent:'space-between',alignItems:'center'}},
      'Chat da mesa',
      React.createElement('span',{style:{fontSize:10,opacity:0.4,fontWeight:400}},chatMsgCountLabel(msgs.length))
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
/** Ícone robô (stroke) — escala com font-size do botão. */
function homeIconRobot() {
  return React.createElement(
    'svg',
    {
      width: '1.1em',
      height: '1.1em',
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': true,
      style: { display: 'block', flexShrink: 0 },
    },
    React.createElement('path', {
      d: 'M12 8V4H8',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    React.createElement('rect', {
      x: 4,
      y: 8,
      width: 16,
      height: 12,
      rx: 2,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
    }),
    React.createElement('path', {
      d: 'M2 14h2M20 14h2M15 13v2M9 13v2',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
  );
}
/** Ícone grupo / amigos (stroke). */
function homeIconPeople() {
  return React.createElement(
    'svg',
    {
      width: '1.1em',
      height: '1.1em',
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': true,
      style: { display: 'block', flexShrink: 0 },
    },
    React.createElement('path', {
      d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    React.createElement('circle', {
      cx: 9,
      cy: 7,
      r: 4,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
    }),
    React.createElement('path', {
      d: 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
  );
}

function HomeScreen(P){
  var resumeTopPad = typeof P.resumeTopPad === "number" ? P.resumeTopPad : 0;
  var ns=useState(''); var nm=ns[0], setNm=ns[1];
  var cs=useState(''); var cd=cs[0], setCd=cs[1];
  var es=useState(''); var er=es[0], setEr=es[1];
  var ls=useState(false); var ld=ls[0], setLd=ls[1];

  var floats = [
    {s:'\u2660',x:10,y:12,a:'float1',o:0.07,z:64},
    {s:'\u2665',x:80,y:8,a:'float2',o:0.09,z:52},
    {s:'\u2666',x:18,y:74,a:'float3',o:0.055,z:48},
    {s:'\u2663',x:86,y:70,a:'float1',o:0.07,z:56},
    {s:'\u2660',x:52,y:88,a:'float2',o:0.045,z:44},
    {s:'\u2663',x:42,y:3,a:'float3',o:0.055,z:40}
  ];

  var inp = {background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',width:'100%',boxSizing:'border-box'};

  async function join(){
    var nameOk = clampDisplayName(nm);
    if(!nameOk){ setEr('Digite seu nome'); return; }
    if(cd.length!==4){ setEr('Código: 4 letras'); return; }
    if(!RT.isConfigured()){ setEr('Firebase não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL).'); return; }
    setLd(true); setEr('');
    var r = await RT.getRoom(cd.toUpperCase());
    if(!r){ setLd(false); setEr('Sala não encontrada'); return; }
    if(r.game){ setLd(false); setEr('Partida já começou'); return; }
    var humanNJoin = r.players.filter(function(p){ return !p.isBot; }).length;
    if(humanNJoin>=4){ setLd(false); setEr('Sala cheia'); return; }
    var pid = uid();
    r.players.push({id:pid,name:nameOk,seat:-1,team:null});
    var ok = await RT.setRoom(cd.toUpperCase(), r);
    setLd(false);
    if(ok) P.onJoin(pid,nameOk,cd.toUpperCase(),r); else setEr('Erro');
  }

  var divider = function(t){
    return React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,opacity:0.3}},
      React.createElement('div',{style:{flex:1,height:1,background:'#fff'}}),
      React.createElement('span',{style:{fontSize:11}},t),
      React.createElement('div',{style:{flex:1,height:1,background:'#fff'}})
    );
  };

  return React.createElement('div',{style:{minHeight:'100vh',background:'linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)',fontFamily:'system-ui,sans-serif',color:'white',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,paddingTop:20+(resumeTopPad||0),position:'relative',overflow:'hidden',zIndex:0}},
    React.createElement('style',null,ACSS),
    floats.map(function(f,i){ return React.createElement('span',{key:i,style:{position:'absolute',left:f.x+'%',top:f.y+'%',fontSize:f.z,opacity:f.o,color:'#C81734',animation:f.a+' '+(3+i*0.4)+'s ease-in-out infinite',pointerEvents:'none'}},f.s); }),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:30,animation:'fadeIn .8s ease-out'}},
      rLogoW(64),
      React.createElement('div',{style:{fontSize:40,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#d4a843,#f0d078,#a17c2f)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'glow 3s ease-in-out infinite',lineHeight:1.1,textAlign:'center'}},'BISCA FUCAS'),
      React.createElement('div',{style:{fontSize:12,letterSpacing:5,opacity:0.4,textTransform:'uppercase'}},'Jogo de Baralho \u00b7 Online')
    ),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12,width:'100%',maxWidth:320,animation:'fadeIn 1s ease-out'}},
      React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:4}},
        React.createElement('input',{
          value:nm,
          maxLength:DISPLAY_NAME_MAX,
          onChange:function(e){
            var nextName = formatNameWhileTyping(e.target.value);
            setNm(nextName);
            if(er==='Digite seu nome' && clampDisplayName(nextName)) setEr('');
          },
          placeholder:'Seu nome',
          title:'Podes usar espaços entre palavras.',
          'aria-label':'Nome de jogador — podes usar espaços; máximo '+DISPLAY_NAME_MAX+' caracteres',
          autoComplete:'nickname',
          'aria-description':nm.length>=DISPLAY_NAME_MAX?'Limite de caracteres atingido':undefined,
          style:Object.assign({},inp,{
            fontSize:17,
            padding:'14px 18px',
            transition:'border-color .2s ease, box-shadow .2s ease',
            borderColor:nm.length>=DISPLAY_NAME_MAX?'rgba(212,168,67,.42)':'rgba(255,255,255,.15)',
            boxShadow:nm.length>=DISPLAY_NAME_MAX?'0 0 0 1px rgba(212,168,67,.12)':'none'
          })
        }),
        nm.length>=DISPLAY_NAME_MAX
          ? React.createElement('div',{
              role:'status',
              style:{
                fontSize:11,
                lineHeight:1.3,
                textAlign:'center',
                color:'rgba(212,168,67,.55)',
                letterSpacing:0.02
              }
            },'Limite atingido')
          : null
      ),
      er ? React.createElement('div',{style:{color:'#ff6b6b',fontSize:13,textAlign:'center'}},er) : null,
      React.createElement('button',{onClick:function(){
        var sn = clampDisplayName(nm);
        if(!sn){setEr('Digite seu nome');return;}
        setEr('');
        P.onSolo(sn);
      },style:{background:'linear-gradient(135deg,#C41230,#8a0e22)',color:'#fff',border:'none',borderRadius:10,padding:'14px',cursor:'pointer',fontSize:17,fontWeight:'bold',boxShadow:'0 4px 15px rgba(196,18,48,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35em'}},
        homeIconRobot(),
        'Solo vs IA'
      ),
      divider('ou jogue com amigos'),
      React.createElement('button',{onClick:function(){
        var cn = clampDisplayName(nm);
        if(!cn){ setEr('Digite seu nome'); return; }
        if(!RT.isConfigured()){ setEr('Firebase não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL).'); return; }
        setEr('');
        P.onGoPickCreate(cn);
      },disabled:ld,style:{background:'linear-gradient(135deg,#2a6a3a,#1a4a2a)',color:'#fff',border:'none',borderRadius:10,padding:'12px',cursor:'pointer',fontSize:15,fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35em'}},
        homeIconPeople(),
        'Criar Sala'
      ),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('input',{value:cd,onChange:function(e){setCd(e.target.value.toUpperCase().slice(0,4));},placeholder:'Código',style:Object.assign({},inp,{textAlign:'center',letterSpacing:4,fontWeight:700})}),
        React.createElement('button',{onClick:join,disabled:ld,style:{background:'#1a3a6a',color:'#fff',border:'none',borderRadius:10,padding:'10px 16px',cursor:'pointer',fontSize:14,fontWeight:'bold',whiteSpace:'nowrap'}},'Entrar')
      )
    ),
    ld ? React.createElement('div',{style:{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99}},
      React.createElement('div',{style:{width:36,height:36,border:'3px solid transparent',borderTop:'3px solid #d4a843',borderRadius:'50%',animation:'spin .8s linear infinite'}})
    ) : null,
    React.createElement('div',{style:{position:'fixed',bottom:8,right:'max(14px, calc(10px + env(safe-area-inset-right)))',fontSize:10,opacity:0.2,whiteSpace:'nowrap',maxWidth:'calc(100vw - 20px)',overflow:'hidden',textOverflow:'ellipsis'}},'by: Ruivo')
  );
}

/**
 * Ligação ao Realtime Database (Firebase `.info/connected`).
 * `variant`: `inline` — lobby (alinha à direita na barra); `hud` — chip compacto dentro do cabeçalho do jogo.
 */
function RtConnectionBadge(P){
  var c = P.connected;
  var variant = P.variant === 'hud' ? 'hud' : 'inline';
  var isHud = variant === 'hud';
  var dot = '#facc15';
  var label = 'A reconectar';
  var border = 'rgba(250,204,21,.42)';
  var labelColor = '#fef9c3';
  if (c === true) {
    dot = '#4ade80';
    label = 'Online';
    border = 'rgba(74,222,128,.35)';
    labelColor = 'rgba(240,253,244,.95)';
  }
  if (c === false) {
    dot = '#94a3b8';
    label = 'Offline';
    border = 'rgba(148,163,184,.4)';
    labelColor = 'rgba(203,213,225,.95)';
  }
  var title =
    c === false
      ? 'Sem ligação ao servidor. Verifique o Wi‑Fi ou os dados móveis; o estado atualiza quando a ligação voltar.'
      : c === true
        ? 'Ligação ativa com o servidor (Firebase).'
        : 'A estabelecer ligação com o servidor…';
  var dotPx = isHud ? 6 : 7;
  var pill = React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': c === false ? 'assertive' : 'polite',
      title: title,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: isHud ? 5 : 6,
        padding: isHud ? '3px 9px' : '4px 10px',
        borderRadius: 999,
        fontSize: isHud ? 9.5 : 10,
        fontWeight: 600,
        letterSpacing: 0.02,
        background: isHud ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.42)',
        border: '1px solid ' + border,
        color: labelColor,
        pointerEvents: 'none',
        fontFamily: 'system-ui,sans-serif',
        boxSizing: 'border-box',
        maxWidth: isHud ? 'min(132px, 42vw)' : 'min(168px, 52vw)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    },
    React.createElement('span', {
      style: {
        width: dotPx,
        height: dotPx,
        borderRadius: '50%',
        background: dot,
        flexShrink: 0,
        boxShadow:
          c === false
            ? '0 0 6px rgba(148,163,184,.35)'
            : c === true
              ? '0 0 6px rgba(74,222,128,.4)'
              : '0 0 7px rgba(250,204,21,.5)',
        animation: c === null ? 'bfConnPulse 1.1s ease-in-out infinite' : undefined,
      },
    }),
    React.createElement('span', { style: { lineHeight: 1.2 } }, label)
  );
  if (isHud) return pill;
  return React.createElement('div', { style: { flexShrink: 0, marginLeft: 'auto', minWidth: 0, display: 'flex', justifyContent: 'flex-end' } }, pill);
}

/* ═══ LOBBY ═══ */
function LobbyScreen(P){
  var room=P.room, myId=P.myId, presenceByPlayer=P.presenceByPlayer||{}, isHost=room.hostId===myId;
  var lobbyTh = THEMES[room.themeId]||THEMES.sala;
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
    r.game = mkGame(null,undefined,0,nm,r.hostId,undefined);
    await RT.setRoom(r.code, r);
  }

  var playerRows = humans.map(function(p){
    var online = !!presenceByPlayer[p.id];
    return React.createElement('div',{key:p.id,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,.05)',borderRadius:8,marginBottom:6}},
      React.createElement('div',{style:{position:'relative',width:30,height:30,flexShrink:0}},
        React.createElement('div',{style:{width:30,height:30,borderRadius:'50%',background:p.team==='A'?'#22c55e':p.team==='B'?'#f59e0b':'#555',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}},p.name[0]),
        React.createElement('div',{title:online?'Na rede':'Sem ligação (pode voltar)',style:{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',background:online?'#4ade80':'#64748b',border:'2px solid #14141c',boxSizing:'border-box'}})
      ),
      React.createElement('div',{style:{flex:1}},
        React.createElement('div',{style:{fontSize:13,fontWeight:600}},p.name+(p.id===myId?' (você)':'')),
        React.createElement('div',{style:{fontSize:10,opacity:0.4}},
          (p.id===room.hostId?'Host \u00b7 ':'')+'Dupla '+(p.team||'?'),
          online ? null : React.createElement('span',{style:{marginLeft:6,color:'#fb923c',opacity:0.95}},' · fora da rede')
        )
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
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,width:'100%',minWidth:0}},
        React.createElement('button',{onClick:P.onLeave,style:{background:'none',border:'none',color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:20,flexShrink:0}},'←'),
        React.createElement('div',{style:{flexShrink:0}},rLogoW(28)),
        React.createElement('div',{style:{fontSize:18,fontWeight:700,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},'Bisca Fucas'),
        RT.isConfigured() ? React.createElement(RtConnectionBadge,{connected:P.serverConnected,variant:'inline'}) : null
      ),
      React.createElement('div',{style:{background:'rgba(196,18,48,.08)',borderRadius:14,padding:20,textAlign:'center',border:'1px solid rgba(196,18,48,.25)'}},
        React.createElement('div',{style:{fontSize:11,opacity:0.4,letterSpacing:2}},'CÓDIGO DA SALA'),
        React.createElement('div',{style:{fontSize:48,fontWeight:900,letterSpacing:12,color:'#d4a843'}},room.code),
        React.createElement('div',{style:{fontSize:11,opacity:0.4,marginTop:6}},'Compartilhe com seus amigos'),
        React.createElement('div',{style:{fontSize:12,marginTop:10,display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'}},
          React.createElement('span',{style:{opacity:0.5}},'Mesa ·'),
          venueNameChip(THEMES[room.themeId]||THEMES.sala,12)
        )
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
            React.createElement('button',{onClick:start,disabled:!canStart,style:Object.assign({},primaryButtonStyle(lobbyTh),{opacity:canStart?1:0.4,cursor:canStart?'pointer':'not-allowed',width:'100%',fontSize:16})},'Iniciar Partida →')
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
  /** Pausa antes de bots/IA jogarem. */
  var BOT_PLAY_DELAY_MS = 750;
  /** Troca automática do 2 pelo corte (bot). */
  var BOT_SWAP_DELAY_MS = 550;
  /** Bot a cortar o maço (solo / host). */
  var BOT_AUTO_CUT_DELAY_MS = 1500;
  /** Toast “Troca do 2”: quanto tempo fica no ecrã (+ margem para o ticker redesenhar). */
  var SWAP_TOAST_VISIBLE_MS = 5400;
  var SWAP_TOAST_TICK_MS = SWAP_TOAST_VISIBLE_MS + 800;
  var ACE_REVEAL_TOAST_MS = 5200;

  var g=props.g, sg=props.sg, isSolo=props.isSolo;
  var mob = useNarrowScreen();
  var _ms = props.mySeat;
  var mySeat = typeof _ms === 'number' && _ms >= 0 && _ms <= 3 ? _ms : 0;
  var isOnline=props.isOnline||false, myPid=props.myPid||'', roomCode=props.roomCode||'';
  /** ID do host da sala (Firebase). No online, após cortar/distribuir/fechar vaza o lastActor passa a ser o host para todos os clientes gravarem o mesmo estado no RT. */
  var roomHostId = props.roomHostId || '';
  /** `true` | `false` | `null` = Firebase RTDB `.info/connected` (só multijogador). */
  var serverConnected = props.serverConnected;
  var partnerCount=props.partnerCount||0, setPT=props.setPT;
  /** Pausa local (não vai para o RT) para ver as cartas do parceiro — solo e mesa online. */
  var partnerViewPause = isSolo || isOnline;
  var shuffling=props.shuffling||false, setSh=props.setSh;
  var cutAnim=props.cutAnim||false, setCa=props.setCa;
  var hovHalf=props.hovHalf, setHovHalf=props.setHovHalf;
  var NAMES=g.playerNames;
  var th = props.theme || THEMES.sala;
  var cbk = cardBackSkin(th);
  var gStart = parseSeat(g.starter);
  if(isNaN(gStart)) gStart = 2;
  var dealer=prv(gStart), cutter=prv(dealer);
  var dS=mySeat, dE=nxt(mySeat), dN=nxt(nxt(mySeat)), dW=nxt(nxt(nxt(mySeat)));
  var iAmCutter = cutter===mySeat;
  var botSeats = props.botSeats || {};
  /** Boolean estável para deps de efeitos — `botSeats` é recriado no pai a cada render. */
  var isBotCutter = !!(botSeats && botSeats[cutter]);
  var isRoomHost = !!props.isRoomHost;
  var cutSecSt = useState(null);
  var cutSec = cutSecSt[0], setCutSec = cutSecSt[1];
  var cutLiftSt = useState(null);
  var cutLift = cutLiftSt[0], setCutLift = cutLiftSt[1];
  var aceRevealT = useRef(/** @type {any} */ (null));
  var tableDropRef = useRef(/** @type {HTMLElement|null} */ (null));
  var dragSessionRef = useRef(/** @type {any} */ (null));
  var handGhostSt = useState(/** @type {{ card: any; x: number; y: number } | null} */ (null));
  var handGhost = handGhostSt[0],
    setHandGhost = handGhostSt[1];
  var handLiftIdSt = useState(/** @type {string|null} */ (null));
  var handLiftId = handLiftIdSt[0],
    setHandLiftId = handLiftIdSt[1];
  /** Erro de regra só para o jogador (online); não vai para g.msg / Firebase. */
  var playDeniedSt = useState(/** @type {string | null} */ (null));
  var playDenied = playDeniedSt[0],
    setPlayDenied = playDeniedSt[1];
  var playDeniedTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  /** @param {string} text */
  function showPlayDeniedLocal(text) {
    setPlayDenied(text);
    if (playDeniedTimerRef.current) clearTimeout(playDeniedTimerRef.current);
    playDeniedTimerRef.current = setTimeout(function () {
      setPlayDenied(null);
      playDeniedTimerRef.current = null;
    }, 5200);
  }
  var swapToastTickSt = useState(0);
  var setSwapToastTick = swapToastTickSt[1];
  useEffect(
    function () {
      var hasSwap = g.swapToast && typeof g.swapToast.ts === "number";
      var hasAce = g.aceReveal && typeof g.aceReveal.t === "number";
      if (!hasSwap && !hasAce) return;
      var tickMs = hasAce ? Math.max(SWAP_TOAST_TICK_MS, ACE_REVEAL_TOAST_MS + 1200) : SWAP_TOAST_TICK_MS;
      var id = setInterval(function () {
        setSwapToastTick(function (x) {
          return x + 1;
        });
      }, 320);
      var maxT = setTimeout(function () {
        clearInterval(id);
      }, tickMs);
      return function () {
        clearInterval(id);
        clearTimeout(maxT);
      };
    },
    [g.swapToast, g.aceReveal]
  );

  // Write online state (ONLY here, GameScreen is the single writer)
  useEffect(function(){
    if(!isOnline || !roomCode) return;
    if(!g.lastActor || g.lastActor!==myPid) return;
    RT.setGame(roomCode, g);
  },[g]);

  // Shuffle phase — online: só o host avança para corte (evita 4 timers e sg paralelos).
  // Importante: após "Próxima rodada" lastActor pode ser outro humano; RT.setGame só corre quando lastActor===myPid.
  // Sem isto o host avançava para cut localmente mas não gravava no RT → outros clientes ficavam em embaralhar para sempre.
  useEffect(function(){
    if(g.phase!=='shuffle') return;
    if(isSolo) aiMemory = makeMemory();
    if(isOnline && isRoomHost) aiMemory = makeMemory();
    if(isOnline && roomCode && isRoomHost) RT.setChat(roomCode, []);
    setSh(true);
    if(isOnline && !isRoomHost){
      return function(){ setSh(false); };
    }
    var t = setTimeout(function(){
      setSh(false);
      sg(function(p){
        if(p.phase!=='shuffle') return p;
        var next = Object.assign({}, p, { phase: 'cut' });
        if(isOnline && isRoomHost) next.lastActor = myPid;
        return next;
      });
    },2400);
    return function(){ clearTimeout(t); setSh(false); };
  },[g.phase,isOnline,isRoomHost,roomCode,isSolo,myPid]);

  // Rede / Strict Mode / timer perdido: host força sync para cut se ainda estiver em shuffle.
  useEffect(function(){
    if(!isOnline || !isRoomHost || g.phase!=='shuffle') return;
    var w = setTimeout(function(){
      sg(function(p){
        if(p.phase!=='shuffle') return p;
        return Object.assign({}, p, { phase: 'cut', lastActor: myPid });
      });
    },4500);
    return function(){ clearTimeout(w); };
  },[g.phase,isOnline,isRoomHost,myPid]);

  // Auto-cut: solo quando quem corta é a IA; online só o host corta por IA quando o cortador é bot (cada humano só corta na própria vez)
  useEffect(function(){
    if(g.phase!=='cut') return;
    var iChooseCut = isSolo ? cutter===0 : (isOnline && iAmCutter);
    if(iChooseCut) return;
    var runAuto = !isOnline ? cutter!==0 : (isRoomHost && isBotCutter);
    if(!runAuto) return;
    var t = setTimeout(function(){
      performCut(null,true);
    },BOT_AUTO_CUT_DELAY_MS);
    return function(){ clearTimeout(t); };
  },[g.phase,cutter,mySeat,isOnline,isRoomHost,iAmCutter,isBotCutter]);

  // Online: host força corte aleatório se a fase “cortar” ficar presa (assento errado, AFK, falha de rede).
  useEffect(function(){
    if(!isOnline || !isRoomHost || g.phase!=='cut') return;
    var w = setTimeout(function(){
      performCut(null,false,true);
    },22000);
    return function(){ clearTimeout(w); };
  },[g.phase,isOnline,isRoomHost,g.starter]);

  // Até 10s para quem escolhe o corte; depois corta automático (só quem é o cortador na mesa)
  useEffect(function(){
    if(g.phase!=='cut'){ setCutSec(null); return; }
    var iChooseCut = isSolo ? cutter===0 : (isOnline && iAmCutter);
    if(!iChooseCut){ setCutSec(null); return; }
    var left = 10;
    setCutSec(left);
    var iv = setInterval(function(){
      left -= 1;
      if(left<=0){
        clearInterval(iv);
        setCutSec(0);
        performCut(null);
      } else {
        setCutSec(left);
      }
    },1000);
    return function(){ clearInterval(iv); };
  },[g.phase,cutter,mySeat,isOnline,iAmCutter]);

  // Deal phase — online: só o host corre a animação e grava (lastActor = host após o corte). Assim o cortador pode sair sem travar a distribuição.
  useEffect(function(){
    if(g.phase!=='deal') return;
    if(isOnline && !isRoomHost) return;

    // Batido: deal 3 cards at a time per player (4 steps)
    if(g.batido){
      if(g.dealStep>=4){
        var fd=g.fd.slice(); var deck=fd.slice(12);
        var t=setTimeout(function(){
          sg(function(p){
            var la = isOnline && roomHostId ? roomHostId : p.lastActor;
            return Object.assign({},p,{phase:'playing',deck:deck,canSwap:false,curP:p.starter,msg:'COPAS BATIDO! Vencer vale 2 pts.',lastActor:la||p.lastActor});
          });
        },700);
        return function(){clearTimeout(t);};
      }
      var t2=setTimeout(function(){
        sg(function(prev){
          return advanceDealOneStep(prev);
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
        sg(function(p){
          var la = isOnline && roomHostId ? roomHostId : p.lastActor;
          return Object.assign({},p,{phase:'playing',deck:rem,canSwap:cs,msg:NAMES[p.starter]+(p.starter===mySeat?' - sua vez!':' começa.'),lastActor:la||p.lastActor});
        });
      },700);
      return function(){ clearTimeout(t); };
    }
    var t2 = setTimeout(function(){
      sg(function(prev){
        return advanceDealOneStep(prev);
      });
    },340);
    return function(){ clearTimeout(t2); };
  },[g.phase,g.dealStep,isOnline,isRoomHost,myPid,roomHostId]);

  // Host: se a distribuição parar (tab em segundo plano, perda de rede, race no RTDB), força um passo após timeout.
  useEffect(function(){
    if(!isOnline || !isRoomHost || g.phase!=='deal') return;
    var w = setTimeout(function(){
      sg(function(prev){
        if(prev.phase!=='deal') return prev;
        var next = advanceDealOneStep(prev);
        if(next===prev) return prev;
        if(roomHostId) next = Object.assign({}, next, { lastActor: roomHostId });
        return next;
      });
    },3600);
    return function(){ clearTimeout(w); };
  },[g.phase,g.dealStep,isOnline,isRoomHost,roomHostId]);

  // Partner reveal — timer só em estado local (setPT/setOPT); o jogo em RT não inclui isto (evita “vazar” pausa entre clientes como dado partilhado).
  useEffect(function(){
    if(!partnerViewPause) return;
    if(g.phase!=='playing' || g.trickN!==0) return;
    setPT(7);
    var id = setInterval(function(){ setPT(function(n){ if(n<=1){clearInterval(id);return 0;} return n-1; }); },1000);
    return function(){ clearInterval(id); setPT(0); };
  },[g.phase,g.trickN,partnerViewPause]);

  // Últimas 3 cartas na mão (trickN 7–9): mesma pausa de 7s que no início da rodada. Depende só de trickN para o timer não ser limpo em cada end_trick.
  useEffect(function(){
    if(!partnerViewPause) return;
    if(g.trickN!==7) return;
    setPT(7);
    var id = setInterval(function(){ setPT(function(n){ if(n<=1){clearInterval(id);return 0;} return n-1; }); },1000);
    return function(){ clearInterval(id); setPT(0); };
  },[g.trickN,partnerViewPause]);

  useEffect(function () {
    setHandGhost(null);
    setHandLiftId(null);
    dragSessionRef.current = null;
  }, [g.phase, g.trick.length, g.curP, mySeat]);

  /** @param preferBat se true (só auto-corte do bot), tenta copas batido quando a dupla do cortador está 0–2 na partida e o adversário tem 3.
   *  @param forceByHostCut só online: o host aplica um corte aleatório para desbloquear a mesa (timeout de segurança). */
  function performCut(ci, preferBat = false, forceByHostCut = false){
    setCutSec(null);
    sg(function(pv){
      if(pv.phase!=='cut') return pv;
      if(isOnline){
        var stCut = parseSeat(pv.starter);
        if(isNaN(stCut)) stCut = 2;
        var cutterSeat = prv(prv(stCut));
        var allowedCut = cutterSeat===mySeat || (isRoomHost && !!botSeats[cutterSeat]);
        if(forceByHostCut) allowedCut = !!isRoomHost;
        if(!allowedCut) return pv;
      }
      if(preferBat && shouldBatDesvantagemPartida(pv.mPts, pTm(cutter))){
        return stateBatidoFromCut(pv, isOnline ? (roomHostId || myPid) : pv.lastActor);
      }
      if(!Array.isArray(pv.fd) || pv.fd.length<20) return pv;
      var useCi = ci!=null && typeof ci==='number' && !isNaN(ci) ? ci : aiPickCutRotateIndex(pv.fd);
      var fd=pv.fd.slice(), newFd=fd.slice(useCi).concat(fd.slice(0,useCi));
      var rawTc=newFd[12], tc, trump;
      if(!rawTc || !rawTc.v) return pv;
      if(rawTc.v==='7'||rawTc.v==='A'){ trump=PAIRS[rawTc.s]; tc=null; }
      else{ trump=rawTc.s; tc=rawTc; }
      var msg = tc ? ('Trunfo: '+tc.v+SYM[tc.s]+'! Distribuindo...') : ('Cortou '+rawTc.v+SYM[rawTc.s]+' - trunfo: '+SYM[trump]+' '+trump+'!');
      if(isOnline){
        return Object.assign({},pv,{phase:'deal',fd:newFd,tc:tc,trump:trump,rawTc:tc?null:rawTc,batido:false,hands:[[],[],[],[]],dealStep:0,msg:msg,lastActor:roomHostId||myPid});
      }
      return Object.assign({},pv,{phase:'deal',fd:newFd,tc:tc,trump:trump,rawTc:tc?null:rawTc,batido:false,hands:[[],[],[],[]],dealStep:0,msg:msg});
    });
    setCa(false); setCutLift(null); setHovHalf(null);
  }

  function doCut(side){
    if(g.phase!=='cut') return;
    if(isOnline && !iAmCutter) return;
    setCutLift(side);
    setCa(true);
    var ci = side==='top' ? (16+Math.floor(Math.random()*5)) : (8+Math.floor(Math.random()*5));
    setTimeout(function(){ performCut(ci); },600);
  }

  function doBat(){
    if(g.phase!=='cut') return;
    if(isOnline && !iAmCutter) return;
    setCutSec(null);
    sg(function(pv){
      return stateBatidoFromCut(pv, isOnline ? (roomHostId || myPid) : pv.lastActor);
    });
  }

  function playCard(seat,card){
    if(g.curP!==seat || g.phase!=='playing') return;
    if(partnerViewPause && partnerCount>0) return;
    var hand=g.hands[seat];
    var h7=hand.some(function(c){ return c && c.v==='7' && c.s===g.trump; });
    if(!mayPlayAceTrump(g.trick, g.trump, g.trumpSevenOut, hand, card)){
      var msgAce = h7
        ? ('Jogue o 7 de '+SYM[g.trump]+' '+g.trump+' antes do Ás de trunfo!')
        : ('O Ás de '+g.trump+' só sai após o 7!');
      if(isOnline) showPlayDeniedLocal(msgAce);
      else sg(function(p){ return Object.assign({},p,{msg:msgAce}); });
      return;
    }
    if(!mayPlaySevenTrumpFourth(g.trick.length, hand, g.trump, card)){
      var m7 = 'O 7 de trunfo não pode ser a 4.ª carta sem o Ás de trunfo na mão!';
      if(isOnline) showPlayDeniedLocal(m7);
      else sg(function(p){ return Object.assign({},p,{msg:m7}); });
      return;
    }
    if(playDeniedTimerRef.current){
      clearTimeout(playDeniedTimerRef.current);
      playDeniedTimerRef.current = null;
    }
    setPlayDenied(null);
    var revealAceTrump = g.trick.length===3 && card.v==='7' && card.s===g.trump && hand.some(function(c){ return c && c.v==='A' && c.s===g.trump; });
    var aceCardReveal = revealAceTrump ? hand.find(function(c){ return c && c.v==='A' && c.s===g.trump; }) : null;
    if(isSolo) recordPlay(aiMemory, seat, card, g.trick, g.trump);
    sg(function(p){
      if(p.curP!==seat || p.phase!=='playing') return p;
      var hands=p.hands.map(function(h){ return h.filter(function(c){ return c && c.id!==card.id; }); });
      var trick=p.trick.concat([{player:seat,card:card}]);
      var done=trick.length===4;
      var msg = NAMES[seat]+' jogou '+card.v+SYM[card.s];
      var upd = {hands:hands,trick:trick,curP:done?-1:nxt(seat),phase:done?'end_trick':'playing',msg:msg};
      if(revealAceTrump && aceCardReveal) Object.assign(upd,{aceReveal:{seat:seat,t:Date.now(),ace:{v:aceCardReveal.v,s:aceCardReveal.s,id:aceCardReveal.id}}});
      if(isOnline) Object.assign(upd,{lastActor:myPid});
      return Object.assign({},p,upd);
    });
  }

  var HAND_DROP_PAD = 18;
  var HAND_DRAG_THRESH_SQ = 10 * 10;
  function handInDropZone(clientX, clientY) {
    var el = tableDropRef.current;
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return (
      clientX >= r.left - HAND_DROP_PAD &&
      clientX <= r.right + HAND_DROP_PAD &&
      clientY >= r.top - HAND_DROP_PAD &&
      clientY <= r.bottom + HAND_DROP_PAD
    );
  }
  function onPlayablePointerDown(e, card) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragSessionRef.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      card: card,
      dragging: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }
  function onPlayablePointerMove(e) {
    var d = dragSessionRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    var dx = e.clientX - d.sx;
    var dy = e.clientY - d.sy;
    if (!d.dragging) {
      if (dx * dx + dy * dy < HAND_DRAG_THRESH_SQ) return;
      d.dragging = true;
      setHandLiftId(null);
    }
    setHandGhost({ card: d.card, x: e.clientX, y: e.clientY });
  }
  function onPlayablePointerUp(e, card) {
    var d = dragSessionRef.current;
    var el = e.currentTarget;
    dragSessionRef.current = null;
    setHandGhost(null);
    try {
      if (d && d.pointerId != null) el.releasePointerCapture(d.pointerId);
    } catch (_) {}
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.dragging) {
      if (handInDropZone(e.clientX, e.clientY)) playCard(mySeat, d.card);
      return;
    }
    setHandLiftId(card.id);
  }
  function onPlayablePointerCancel(e) {
    var d = dragSessionRef.current;
    dragSessionRef.current = null;
    setHandGhost(null);
    setHandLiftId(null);
    try {
      if (d && d.pointerId != null) e.currentTarget.releasePointerCapture(d.pointerId);
    } catch (_) {}
  }

  // IA (solo) ou bots online — só o host simula bots e grava lastActor para sincronizar
  useEffect(function(){
    if(g.phase!=='playing') return;
    if(partnerViewPause && partnerCount>0) return;
    var p=g.curP;
    if(p<0||p>3) return;
    var seatIsBot = !!botSeats[p];
    var hostPlaysBot = isOnline && seatIsBot && isRoomHost;
    var soloAi = isSolo && p>=1;
    if(!hostPlaysBot && !soloAi) return;
    var t = setTimeout(function(){
      sg(function(pv){
        return bfApplyBotSeatPlay(pv, p, myPid, NAMES, hostPlaysBot);
      });
    },BOT_PLAY_DELAY_MS);
    return function(){ clearTimeout(t); };
  },[g.curP,g.phase,partnerCount,partnerViewPause,isOnline,isRoomHost,myPid]);

  // Host: IA não jogou (timer perdido / race) — tenta de novo após margem extra.
  useEffect(function(){
    if(g.phase!=='playing') return;
    if(partnerViewPause && partnerCount>0) return;
    if(!isOnline || !isRoomHost) return;
    var p=g.curP;
    if(p<0||p>3) return;
    if(!botSeats[p]) return;
    var w = setTimeout(function(){
      sg(function(pv){
        return bfApplyBotSeatPlay(pv, p, myPid, NAMES, true);
      });
    },BOT_PLAY_DELAY_MS+4000);
    return function(){ clearTimeout(w); };
  },[g.curP,g.phase,g.trickN,partnerCount,partnerViewPause,isOnline,isRoomHost,myPid]);

  // Segurança: limpa aceReveal se ficou preso (o fluxo normal limpa ao fechar a mão). Online: só o host — o jogador do 7 pode desligar.
  useEffect(function(){
    if(!g.aceReveal) return;
    if(isOnline && !isRoomHost) return;
    if(aceRevealT.current) clearTimeout(aceRevealT.current);
    aceRevealT.current = setTimeout(function(){
      sg(function(pv){
        if(!pv.aceReveal) return pv;
        return Object.assign({},pv,{aceReveal:null});
      });
    },6200);
    return function(){ if(aceRevealT.current) clearTimeout(aceRevealT.current); };
  },[g.aceReveal,isOnline,isRoomHost]);

  // End trick — online: só o host resolve (evita vaza presa se o 4.º jogador sair antes do timeout).
  useEffect(function(){
    if(g.phase!=='end_trick') return;
    if(isOnline && !isRoomHost) return;
    var endTrickDelay = (isSolo ? 1500 : 1250) + (g.aceReveal ? 4300 : 0);
    var t = setTimeout(function(){
      sg(function(pv){
        return bfResolveEndTrick(pv, roomHostId, isOnline);
      });
    }, endTrickDelay);
    return function(){ clearTimeout(t); };
  },[g.phase,g.aceReveal,g.trickN,isSolo,isOnline,isRoomHost,roomHostId]);

  // Host: se end_trick ficar preso (timer cancelado / throttling), força fecho da vaza.
  useEffect(function(){
    if(g.phase!=='end_trick') return;
    if(isOnline && !isRoomHost) return;
    var endTrickDelay = (isSolo ? 1500 : 1250) + (g.aceReveal ? 4300 : 0);
    var w = setTimeout(function(){
      sg(function(pv){
        return bfResolveEndTrick(pv, roomHostId, isOnline);
      });
    }, endTrickDelay + 4500);
    return function(){ clearTimeout(w); };
  },[g.phase,g.aceReveal,g.trickN,isSolo,isOnline,isRoomHost,roomHostId]);

  // End round — online: só o host (mesmo motivo que end_trick).
  useEffect(function(){
    if(g.phase!=='end_round') return;
    if(isOnline && !isRoomHost) return;
    var t = setTimeout(function(){
      sg(function(pv){
        return bfResolveEndRound(pv, roomHostId, isOnline);
      });
    },2000);
    return function(){ clearTimeout(t); };
  },[g.phase,isOnline,isRoomHost,roomHostId]);

  useEffect(function(){
    if(g.phase!=='end_round') return;
    if(isOnline && !isRoomHost) return;
    var w = setTimeout(function(){
      sg(function(pv){
        return bfResolveEndRound(pv, roomHostId, isOnline);
      });
    },6500);
    return function(){ clearTimeout(w); };
  },[g.phase,isOnline,isRoomHost,roomHostId]);

  function swap(){
    sg(function(pv){
      if(pv.canSwap!==mySeat || !pv.tc) return pv;
      var hands=pv.hands.map(function(h){ return h.slice(); });
      var i=hands[mySeat].findIndex(function(c){ return c && c.s===pv.trump && c.v==='2'; });
      if(i<0) return pv;
      var tcTake = pv.tc;
      var twoCard = hands[mySeat][i];
      hands[mySeat][i]=tcTake;
      var deck=pv.deck.filter(function(c){ return c && c.id!==tcTake.id; });
      deck.splice(Math.floor(deck.length/2),0,twoCard);
      var who = (pv.playerNames && pv.playerNames[mySeat]) || 'Jogador';
      var sym = SYM[pv.trump] || '';
      return Object.assign({},pv,{
        hands:hands,deck:deck,tc:null,canSwap:false,
        swapToast:{
          title:'Troca do 2',
          body:who+' trocou o 2'+sym+' pela carta de corte '+tcTake.v+sym+'. O 2 volta ao meio do baralho.',
          ts:Date.now()
        },
        msg:'Corte alto! '+tcTake.v+sym+' na mão, 2 no meio do baralho.',
        lastActor:isOnline?myPid:pv.lastActor
      });
    });
  }

  /* IA / host online: troca 2 pelo corte sempre que o corte for maior que o 2 no trunfo (3, 4, … até ao Ás). */
  useEffect(function(){
    if(g.phase!=='playing') return;
    if(partnerViewPause && partnerCount>0) return;
    var seat = g.canSwap;
    if(seat!==0&&seat!==1&&seat!==2&&seat!==3) return;
    if(!g.tc || g.tc.v==='2') return;
    if(!g.trump || g.tc.s!==g.trump) return;
    var isBotSeat = !!botSeats[seat];
    if(!(isOnline && isRoomHost && isBotSeat) && !(isSolo && seat!==0)) return;
    var hand=g.hands[seat]||[];
    if(!hand.some(function(c){ return c && c.s===g.trump && c.v==='2'; })) return;
    if(cRnk(g.tc)<=cRnk({v:'2',s:g.trump})) return;
    var t=setTimeout(function(){
      sg(function(pv){
        if(pv.phase!=='playing'||pv.canSwap!==seat||!pv.tc||pv.tc.v==='2') return pv;
        if(!pv.trump||pv.tc.s!==pv.trump) return pv;
        var hands=pv.hands.map(function(h){ return h.slice(); });
        var i=hands[seat].findIndex(function(c){ return c && c.s===pv.trump && c.v==='2'; });
        if(i<0) return pv;
        var two=hands[seat][i], tc=pv.tc;
        hands[seat][i]=tc;
        var deck=pv.deck.filter(function(c){ return c && c.id!==tc.id; });
        deck.splice(Math.floor(deck.length/2),0,two);
        var sym0 = SYM[pv.trump] || '';
        var who0 = (pv.playerNames && pv.playerNames[seat]) || 'Bot';
        var msg='Corte alto (IA): '+tc.v+sym0+' na mão, 2 no baralho.';
        var upd={
          hands:hands,deck:deck,tc:null,canSwap:false,msg:msg,
          swapToast:{
            title:'Troca do 2',
            body:who0+' trocou o 2'+sym0+' pela carta de corte '+tc.v+sym0+'. O 2 volta ao meio do baralho.',
            ts:Date.now()
          }
        };
        if(isOnline) Object.assign(upd,{lastActor:myPid});
        return Object.assign({},pv,upd);
      });
    },BOT_SWAP_DELAY_MS);
    return function(){ clearTimeout(t); };
  },[g.phase,g.canSwap,g.tc,g.trump,partnerViewPause,isOnline,isRoomHost,myPid,botSeats,partnerCount]);

  var myTurn = g.curP===mySeat && g.phase==='playing' && (isSolo||isOnline);
  var modal = g.phase==='show_summary' || g.phase==='end_game';
  var isLastHand = g.deck.length===0 && g.phase==='playing';
  var showP = (partnerCount>0) || modal;
  var isCB = g.batido && g.trump==='copas';

  function rPlaced(p){
    var pl=g.trick.find(function(t){ return t.player===p; });
    return pl && pl.card ? rCard(pl.card,null,false,false,true,false,mob,cbk) : rSlot(g.curP===p && g.phase==='playing',mob);
  }

  function rHand(seat,isMe,isPartner){
    var hand=g.hands[seat]||[]; if(!hand.length) return null;
    var showCards = isMe || (isPartner && (partnerCount>0 || modal));
    return hand.map(function(c){
      if(!c) return null;
      if(!showCards) return React.createElement(React.Fragment,{key:c.id},rCard(null,null,true,false,false,false,mob,cbk));
      if(!isMe) return React.createElement(React.Fragment,{key:c.id},rCard(c,null,false,false,false,false,mob,cbk));
      var ab = c.v==='A' && c.s===g.trump && !mayPlayAceTrump(g.trick, g.trump, g.trumpSevenOut, hand, c);
      var canClick = myTurn && !ab && (!partnerViewPause || partnerCount<=0);
      if (canClick) {
        var draggingThis = handGhost && handGhost.card && handGhost.card.id === c.id;
        var liftedThis = handLiftId === c.id;
        return React.createElement(
          'div',
          {
            key: c.id,
            role: 'button',
            tabIndex: 0,
            'aria-label': 'Arraste a carta para o centro da mesa para jogar. Toque para levantar.',
            style: {
              display: 'inline-flex',
              position: 'relative',
              touchAction: 'none',
              cursor: draggingThis ? 'grabbing' : 'grab',
              opacity: draggingThis ? 0.22 : 1,
              /* Sem transição em box-shadow: o atraso fazia a sombra “aparecer” tarde na carta ao lado. */
              transition: 'opacity 0.14s ease, transform 0.36s cubic-bezier(.2,.9,.2,1)',
              transform: liftedThis ? 'translateY(-12px) scale(1.04)' : undefined,
              zIndex: liftedThis ? 6 : undefined,
              borderRadius: 8,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            },
            onPointerDown: function (ev) {
              onPlayablePointerDown(ev, c);
            },
            onPointerMove: onPlayablePointerMove,
            onPointerUp: function (ev) {
              onPlayablePointerUp(ev, c);
            },
            onPointerCancel: onPlayablePointerCancel,
            onKeyDown: function (ev) {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                playCard(mySeat, c);
              }
            },
          },
          rCard(c, null, false, true, false, ab, mob, cbk)
        );
      }
      return React.createElement(React.Fragment,{key:c.id},rCard(c,null,false,false,false,ab,mob,cbk));
    });
  }

  var mkRow = function(anim,delay){
    var stripes = th.shuffleStripes;
    if(!stripes || stripes.length<5){ stripes = ['#2a0808','#3a0a0a','#4a0c0c','#5a0e0e','#6a1010']; }
    return React.createElement('div',{style:{display:'flex',flexDirection:'column',animation:anim?'shfl .55s ease-in-out infinite'+(delay?' ':'')+delay:'none'}},
      [0,1,2,3,4].map(function(i){ return React.createElement('div',{key:i,style:{width:50,height:13,background:stripes[i],border:'1px solid rgba(0,0,0,.32)',marginTop:i?-1:0,borderRadius:i===0?'5px 5px 0 0':i===4?'0 0 5px 5px':'0'}}); })
    );
  };

  // ── SHUFFLE / CUT / DEAL ──
  if(g.phase==='shuffle' || g.phase==='cut' || (g.phase==='deal' && !isOnline)){
    var showCut = g.phase==='cut' && (isSolo ? cutter===0 : iAmCutter);
    var aiCutting = g.phase==='cut' && !showCut;
    var sw0=(g.setWins&&g.setWins[0])||0, sw1=(g.setWins&&g.setWins[1])||0;
    var tui = th.ui || {};
    var cutLblLo = tui.cutLabelMuted || 'rgba(255,255,255,.55)';
    var cutLblHi = tui.cutLabelActive || th.accent || '#e2e8f0';
    var timerAccent = tui.timer || '#fbbf24';
    var badgeBg = tui.accentBadge || '#C41230';
    var shGlass={display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'rgba(0,0,0,.28)',backdropFilter:'saturate(1.1) blur(10px)',WebkitBackdropFilter:'saturate(1.1) blur(10px)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 6px 28px rgba(0,0,0,.22)'};
    var shScore=React.createElement('div',{style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:mob?8:12,opacity:0.95,fontVariantNumeric:'tabular-nums'}},
      scoreTeamLine(mob,'#22c55e',mob?'A':'Dupla A',g.mPts[0],sw0,4,true),
      React.createElement('span',{style:{opacity:0.28,fontWeight:300,padding:'0 2px'}},'|'),
      scoreTeamLine(mob,'#f87171',mob?'B':'Dupla B',g.mPts[1],sw1,4,true)
    );

    return React.createElement('div',{style:{minHeight:'100dvh',background:th.pageGradient||th.bg,fontFamily:'system-ui,sans-serif',color:'white',padding:mob?8:14,paddingBottom:mob?'max(10px, env(safe-area-inset-bottom))':14,boxSizing:'border-box',display:'flex',flexDirection:'column',gap:mob?8:12,overflowX:'hidden',position:'relative'}},
      gameBackdropLayer(th),
      React.createElement('style',null,ACSS),
      React.createElement('div',{style:Object.assign({},shGlass,{marginBottom:2})},
        rLogo(36,th),
        React.createElement('div',{style:{borderLeft:'1px solid rgba(255,255,255,.15)',paddingLeft:10}},
          React.createElement('div',{style:{fontSize:16,fontWeight:'bold'}},'Bisca Fucas'),
          React.createElement('div',{style:{fontSize:10,opacity:0.5}},isSolo?'Solo vs IA':'Online'),
          React.createElement('div',{style:{marginTop:4}},venueNameChip(th,9))
        ),
        shScore
      ),
      React.createElement('div',{style:{textAlign:'center',fontSize:12,opacity:0.65}},
        NAMES[dealer]+' embaralha \u00b7 '+NAMES[cutter]+' corta \u00b7 '+NAMES[gStart]+' começa',
        g.tieBonus>0 ? React.createElement('span',{style:{marginLeft:8,background:badgeBg,borderRadius:4,padding:'1px 6px',fontSize:11},title:'Próxima vitória por pontos na mesa: 1+'+g.tieBonus+' (normal) ou 2+'+g.tieBonus+' (Copas batido), por empate(s) 60-60 anterior(es).'},'Na mesa: 1+'+g.tieBonus+' ou 2+'+g.tieBonus+' pts') : null
      ),
      g.phase==='shuffle' ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12}},mkRow(shuffling,''),React.createElement('div',{style:{width:3,height:78,background:'rgba(255,255,255,.15)',borderRadius:2}}),mkRow(shuffling,'animationDelay:.28s')),
        React.createElement('div',{style:{fontSize:15,animation:'pls 1s ease-in-out infinite'}},NAMES[dealer]+' embaralhando...')
      ) : null,
      showCut ? React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}},
        React.createElement('div',{style:{fontSize:14,opacity:0.85,fontWeight:'500'}},'Escolha como cortar:'),
        cutSec!=null && cutSec>0 ? React.createElement('div',{style:{fontSize:13,fontWeight:600,textAlign:'center',padding:'0 12px',fontVariantNumeric:'tabular-nums',color:'rgba(255,255,255,.88)'}},
          'Tempo: ',
          React.createElement('span',{style:{display:'inline-block',minWidth:'1.35em',textAlign:'right',fontVariantNumeric:'tabular-nums',color:timerAccent,fontWeight:700}},cutSec),
          's — se acabar, corta automático.'
        ) : null,
        React.createElement('div',{style:{display:'flex',gap:mob?12:24,alignItems:'flex-end',flexWrap:mob?'wrap':'nowrap',justifyContent:'center',maxWidth:'100%',boxSizing:'border-box'}},
          React.createElement('div',{onClick:function(){doCut('top');},onMouseEnter:function(){setHovHalf('top');},onMouseLeave:function(){setHovHalf(null);},style:{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',transform:cutAnim&&cutLift==='top'?'translateY(-32px)':'none',transition:'transform .55s cubic-bezier(.4,0,.2,1)'}},
            deckPile(20,null,hovHalf==='top',mob,cbk),
            React.createElement('div',{style:{fontSize:11,color:hovHalf==='top'?cutLblHi:cutLblLo,fontWeight:hovHalf==='top'?600:500}},'Metade de cima')
          ),
          React.createElement('div',{onClick:function(){doCut('bottom');},onMouseEnter:function(){setHovHalf('bottom');},onMouseLeave:function(){setHovHalf(null);},style:{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',transform:cutAnim&&cutLift==='bottom'?'translateY(-32px)':'none',transition:'transform .55s cubic-bezier(.4,0,.2,1)'}},
            deckPile(20,null,hovHalf==='bottom',mob,cbk),
            React.createElement('div',{style:{fontSize:11,color:hovHalf==='bottom'?cutLblHi:cutLblLo,fontWeight:hovHalf==='bottom'?600:500}},'Metade de baixo')
          )
        ),
        React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:6,marginTop:4}},
          React.createElement('button',{
            onClick:doBat,
            onPointerEnter:function(){ setHovHalf('bat'); },
            onPointerLeave:function(){ setHovHalf(function(h){ return h==='bat'?null:h; }); },
            style:(function(){
              var u=(th&&th.ui)||{};
              var batHi=hovHalf==='bat';
              var base=primaryButtonStyle(th);
              return Object.assign({},base,{
                padding:'10px 32px',
                transition:'box-shadow .22s ease, transform .2s ease, border-color .2s ease',
                border:batHi?'2px solid rgba(253,224,150,.88)':(base.border||'none'),
                boxShadow:batHi
                  ? '0 0 18px rgba(251,191,36,.6), 0 0 32px rgba(253,224,150,.38), 0 6px 22px rgba(0,0,0,.4)'
                  :(u.btnShadow||base.boxShadow||'0 2px 12px rgba(0,0,0,.22)'),
                transform:batHi?'translateY(-2px)':undefined
              });
            })()
          },'Bater!'),
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
          isCB ? React.createElement('span',{style:{background:badgeBg,borderRadius:4,padding:'1px 6px',fontSize:11}},'BATIDO') : null
        ),
        React.createElement('div',{style:{display:'grid',gridTemplateAreas:'"n n n""w c e""s s s"',gridTemplateColumns:mob?'minmax(0,1fr) minmax(56px,32vw) minmax(0,1fr)':'1fr 120px 1fr',gap:mob?4:6,alignItems:'center',justifyItems:'center',flex:1,minWidth:0,width:'100%'}},
          React.createElement('div',{style:{gridArea:'n',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{display:'flex',gap:3,minHeight:mob?58:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dN].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,dN!==mySeat,false,false,false,mob,cbk)):null; })),
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dN])
          ),
          React.createElement('div',{style:{gridArea:'w',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dW]),
            React.createElement('div',{style:{display:'flex',gap:2,minHeight:mob?58:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dW].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,true,false,false,false,mob,cbk)):null; }))
          ),
          React.createElement('div',{style:{gridArea:'c',display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:0}},
            g.tc ? React.createElement('div',{style:{transform:'rotate(-14deg)',marginBottom:-8}},rCard(g.tc,null,false,false,true,false,mob,cbk)) : null,
            deckPile(Math.max(0, g.batido ? 28-g.dealStep*3 : 28-g.dealStep),null,false,mob,cbk)
          ),
          React.createElement('div',{style:{gridArea:'e',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dE]),
            React.createElement('div',{style:{display:'flex',gap:2,minHeight:mob?58:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dE].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,true,false,false,false,mob,cbk)):null; }))
          ),
          React.createElement('div',{style:{gridArea:'s',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:0,maxWidth:'100%'}},
            React.createElement('div',{style:{display:'flex',gap:4,minHeight:mob?58:65,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},g.hands[dS].map(function(c){ return c?React.createElement('div',{key:c.id,style:{animation:'cin .28s ease-out'}},rCard(c,null,false,false,false,false,mob,cbk)):null; })),
            React.createElement('div',{style:{fontSize:10,opacity:0.6}},NAMES[dS])
          )
        ),
        React.createElement('div',{style:{textAlign:'center',fontSize:12,opacity:0.6,animation:'pls 1s infinite'}},
          g.batido
            ? (g.dealStep<4 ? NAMES[TORD[(TORD.indexOf(gStart)+g.dealStep)%4]]+' recebe 3 cartas... ('+(g.dealStep+1)+'/4)' : 'Preparando...')
            : (g.dealStep<12 ? 'Distribuindo '+(g.dealStep+1)+'/12...' : 'Preparando...')
        )
      ) : null
    );
  }

  // ── PLAYING SCREEN ──
  var gridColsPlay = mob ? 'minmax(0,1fr) minmax(56px,32vw) minmax(0,1fr)' : '1fr 192px 1fr';
  var tblW = mob ? 'min(32vw, 128px)' : 192;
  var tblH = mob ? 'min(30vw, 118px)' : 178;
  var edge = mob ? 6 : 7;
  var swA=(g.setWins&&g.setWins[0])||0, swB=(g.setWins&&g.setWins[1])||0;
  var hdrGlassPl={display:'flex',flexDirection:mob?'column':'row',justifyContent:mob?'flex-start':'space-between',alignItems:mob?'stretch':'center',gap:mob?8:0,padding:mob?'10px 12px':'11px 16px',marginBottom:10,borderRadius:14,background:'rgba(0,0,0,.28)',backdropFilter:'saturate(1.1) blur(10px)',WebkitBackdropFilter:'saturate(1.1) blur(10px)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 6px 28px rgba(0,0,0,.22)'};
  var playShell={position:'relative',zIndex:2,width:'100%',maxWidth:760,margin:'0 auto',padding:mob?'0 4px':'0 10px',boxSizing:'border-box'};
  var playPanel={borderRadius:th.playfieldRadius||16,background:th.playfieldSurface||'rgba(0,0,0,.22)',border:th.playfieldBorder||'1px solid rgba(255,255,255,.1)',boxShadow:th.playfieldShadow||'0 10px 36px rgba(0,0,0,.35)',padding:mob?'10px 8px 14px':'14px 16px 18px'};
  var swapSt = g.swapToast;
  void swapToastTickSt[0];
  var swapToastEl =
    swapSt && swapSt.title && swapSt.body && typeof swapSt.ts === 'number' && Date.now() - swapSt.ts < SWAP_TOAST_VISIBLE_MS
      ? React.createElement(
          'div',
          {
            role: 'status',
            'aria-live': 'polite',
            style: {
              position: 'fixed',
              left: '50%',
              bottom: mob ? 'calc(92px + env(safe-area-inset-bottom, 0px))' : '24px',
              transform: 'translateX(-50%)',
              zIndex: 95,
              maxWidth: 'min(440px, 94vw)',
              padding: mob ? '12px 14px' : '14px 20px',
              borderRadius: 14,
              background: 'linear-gradient(165deg, rgba(22,22,34,.94) 0%, rgba(10,10,18,.96) 100%)',
              border: '1px solid rgba(255,255,255,.14)',
              boxShadow: '0 14px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
              backdropFilter: 'saturate(1.1) blur(14px)',
              WebkitBackdropFilter: 'saturate(1.1) blur(14px)',
              pointerEvents: 'none',
              textAlign: 'center',
            },
          },
          React.createElement('div', { style: { fontSize: mob ? 13 : 14, fontWeight: 800, letterSpacing: 0.35, color: '#fde68a', marginBottom: 5 } }, swapSt.title),
          React.createElement('div', { style: { fontSize: mob ? 12 : 13, lineHeight: 1.45, color: 'rgba(255,255,255,.9)' } }, swapSt.body)
        )
      : null;
  var ar = g.aceReveal;
  var swapVisible =
    swapSt && swapSt.title && swapSt.body && typeof swapSt.ts === 'number' && Date.now() - swapSt.ts < SWAP_TOAST_VISIBLE_MS;
  var aceRevealToastEl =
    ar && ar.ace && ar.ace.v && typeof ar.t === 'number' && typeof ar.seat === 'number' && Date.now() - ar.t < ACE_REVEAL_TOAST_MS
      ? React.createElement(
          'div',
          {
            role: 'status',
            'aria-live': 'polite',
            style: {
              position: 'fixed',
              left: '50%',
              bottom: mob
                ? 'calc(' + (swapVisible ? 168 : 92) + 'px + env(safe-area-inset-bottom, 0px))'
                : swapVisible
                  ? 100
                  : 24,
              transform: 'translateX(-50%)',
              zIndex: 96,
              maxWidth: 'min(440px, 94vw)',
              padding: mob ? '12px 14px' : '14px 20px',
              borderRadius: 14,
              background: 'linear-gradient(165deg, rgba(22,28,44,.94) 0%, rgba(10,14,26,.96) 100%)',
              border: '1px solid rgba(147,197,253,.22)',
              boxShadow: '0 14px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
              backdropFilter: 'saturate(1.1) blur(14px)',
              WebkitBackdropFilter: 'saturate(1.1) blur(14px)',
              pointerEvents: 'none',
              textAlign: 'center',
            },
          },
          React.createElement('div', { style: { fontSize: mob ? 13 : 14, fontWeight: 800, letterSpacing: 0.35, color: '#93c5fd', marginBottom: 5 } }, 'Ás de trunfo na mesa'),
          React.createElement(
            'div',
            { style: { fontSize: mob ? 12 : 13, lineHeight: 1.45, color: 'rgba(255,255,255,.9)' } },
            NAMES[ar.seat] +
              ' fechou a rodada com o 7 de trunfo e mostrou o Ás ' +
              SYM[g.trump] +
              ' (' +
              (g.trump || '') +
              ') que tinha na mão. A carta fica à vista de todos.'
          )
        )
      : null;
  var aceRevealFlipEl =
    ar && ar.ace && ar.ace.v && typeof ar.t === 'number' && Date.now() - ar.t < ACE_REVEAL_TOAST_MS + 350
      ? React.createElement(
          'div',
          {
            style: {
              position: 'fixed',
              inset: 0,
              zIndex: 125,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: mob ? 12 : 20,
            },
          },
          aceRevealFlipVisual(ar.ace, mob, cbk)
        )
      : null;
  return React.createElement('div',{style:{minHeight:'100dvh',background:th.pageGradient||th.bg,fontFamily:'system-ui,sans-serif',color:'white',padding:mob?'6px max(6px, env(safe-area-inset-left)) 6px max(6px, env(safe-area-inset-right))':12,paddingBottom:mob?'max(56px, calc(10px + env(safe-area-inset-bottom)))':12,boxSizing:'border-box',position:'relative',overflowX:'hidden',width:'100%',maxWidth:'100vw'}},
    gameBackdropLayer(th),
    React.createElement('style',null,'@keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}'),
    swapToastEl,
    aceRevealFlipEl,
    aceRevealToastEl,
    React.createElement('div',{style:{position:'relative',zIndex:2}},
    React.createElement('div',{style:hdrGlassPl},
      mob
        ? [
            React.createElement(
              'div',
              {
                key: 'hdrTop',
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                  boxSizing: 'border-box',
                },
              },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 } },
                rLogo(28, th),
                React.createElement('div', { style: { minWidth: 0 } },
                  React.createElement('div', { style: { fontSize: 15, fontWeight: 'bold', letterSpacing: 0.4 } }, 'Bisca Fucas'),
                  React.createElement('div', { style: { fontSize: 10, opacity: 0.5, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                    React.createElement('span', null, isSolo ? 'Solo vs IA' : 'Multijogador'),
                    isCB ? React.createElement('span', { style: { background: '#C41230', borderRadius: 4, padding: '1px 5px' } }, 'copas batido') : null,
                    g.tieBonus > 0 ? React.createElement('span', { style: { background: '#7B3010', borderRadius: 4, padding: '1px 5px', fontSize: 10 }, title: 'Próxima vitória por pontos: 1+' + g.tieBonus + ' (normal) ou 2+' + g.tieBonus + ' (Copas batido) por empate(s) 60-60.' }, 'empate 60-60: 1+' + g.tieBonus + ' ou 2+' + g.tieBonus + ' pts') : null,
                    venueNameChip(th, 9)
                  )
                )
              ),
              isOnline && RT.isConfigured()
                ? React.createElement('div', { key: 'onl', style: { flexShrink: 0, alignSelf: 'flex-start', paddingTop: 1 } },
                    React.createElement(RtConnectionBadge, { connected: serverConnected, variant: 'hud' })
                  )
                : null
            ),
            React.createElement(
              'div',
              {
                key: 'hdrScores',
                style: {
                  display: 'flex',
                  gap: 8,
                  fontSize: 13,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  rowGap: 6,
                  width: '100%',
                  boxSizing: 'border-box',
                },
              },
              scoreTeamLine(mob, '#22c55e', 'A', g.mPts[0], swA, 4, false),
              scoreTeamLine(mob, '#f87171', 'B', g.mPts[1], swB, 4, false)
            ),
          ]
        : [
            React.createElement('div', { key: 'deskL', style: { display: 'flex', alignItems: 'center', gap: 10 } },
              rLogo(40, th),
              React.createElement('div', { style: { borderLeft: '1px solid rgba(255,255,255,.15)', paddingLeft: 10 } },
                React.createElement('div', { style: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.4 } }, 'Bisca Fucas'),
                React.createElement('div', { style: { fontSize: 10, opacity: 0.5, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                  React.createElement('span', null, isSolo ? 'Solo vs IA' : 'Multijogador'),
                  isCB ? React.createElement('span', { style: { background: '#C41230', borderRadius: 4, padding: '1px 5px' } }, 'copas batido') : null,
                  g.tieBonus > 0 ? React.createElement('span', { style: { background: '#7B3010', borderRadius: 4, padding: '1px 5px', fontSize: 10 }, title: 'Próxima vitória por pontos: 1+' + g.tieBonus + ' (normal) ou 2+' + g.tieBonus + ' (Copas batido) por empate(s) 60-60.' }, 'empate 60-60: 1+' + g.tieBonus + ' ou 2+' + g.tieBonus + ' pts') : null,
                  venueNameChip(th, 9)
                )
              )
            ),
            React.createElement(
              'div',
              { key: 'deskR', style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 0 } },
              isOnline && RT.isConfigured()
                ? React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement(RtConnectionBadge, { connected: serverConnected, variant: 'hud' })
                  )
                : null,
              React.createElement('div', { style: { display: 'flex', gap: 14, fontSize: 13, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', rowGap: 6 } },
                scoreTeamLine(mob, '#22c55e', 'Dupla A', g.mPts[0], swA, 4, false),
                React.createElement('span', { style: { opacity: 0.28, fontWeight: 300 } }, '|'),
                scoreTeamLine(mob, '#f87171', 'Dupla B', g.mPts[1], swB, 4, false)
              )
            ),
          ]
    ),
    React.createElement('div',{style:playShell},
      React.createElement('div',{style:playPanel},
    React.createElement('div',{style:{height:mob?2:4}}),
    React.createElement('div',{style:{background:'rgba(0,0,0,.38)',borderRadius:10,padding:mob?'8px 10px':'8px 14px',marginBottom:10,fontSize:mob?10:12,display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center',border:'1px solid rgba(255,255,255,.08)',borderLeft:'3px solid '+(th.accent||'#C41230'),boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}},
      React.createElement('span',{style:playDenied?{color:'#fb923c',fontWeight:600}:undefined},playDenied!=null?playDenied:g.msg),
      React.createElement('span',{style:{opacity:0.7,fontSize:mob?9:11,lineHeight:1.35}},
        'Trunfo: ',
        React.createElement('b',{style:{color:g.trump==='ouros'||g.trump==='copas'?'#fca5a5':'#ddd'}},g.trump?SYM[g.trump]+' '+g.trump:'?'),
        ' | Mão '+Math.min(g.trickN + 1, 10)+'/10 | Deck:'+
        (g.phase==='deal'?(g.batido?Math.max(0,28-g.dealStep*3):Math.max(0,28-g.dealStep)):g.deck.length),
        g.trump && !g.trumpSevenOut && !g.trick.some(function(t){ return t.card && t.card.v==='7' && t.card.s===g.trump; })
          ? React.createElement('span',{style:{color:'#fbbf24',marginLeft:4,fontSize:10}},'7'+SYM[g.trump]+' não saiu')
          : null
      )
    ),
    partnerViewPause&&partnerCount>0 ? React.createElement('div',{style:{background:'rgba(134,239,172,.2)',border:'1px solid #86efac',borderRadius:6,padding:'4px 12px',marginBottom:8,fontSize:12,textAlign:'center'}},'Veja as cartas do parceiro! '+partnerCount+'s...') : null,
    isLastHand && g.trickN===7 && partnerCount>0 ? React.createElement('div',{style:{background:'#C41230',borderRadius:6,padding:'4px 12px',marginBottom:8,fontSize:12,textAlign:'center',fontWeight:'bold',animation:'pls 2s infinite'}},'\u00daltima m\u00e3o!') : null,
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}},
      React.createElement('span',{style:{fontSize:11,opacity:0.6}},'Corte:'),
      g.tc ? rCard(g.tc,null,false,false,true,false,mob,cbk)
        : isCB ? React.createElement('span',{style:{color:'#fca5a5',fontSize:14,fontWeight:'bold'}},'\u2665 copas batido')
        : g.rawTc ? React.createElement('span',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
            rCard(g.rawTc,null,false,false,true,false,mob,cbk),
            React.createElement('span',{style:{color:g.trump==='ouros'||g.trump==='copas'?'#fca5a5':'#ddd',fontSize:11}},'\u2192 trunfo: '+SYM[g.trump]+' '+g.trump),
            React.createElement('span',{style:{opacity:0.4,fontSize:10}},'(voltou ao baralho)')
          )
        : g.trump ? React.createElement('span',{style:{color:g.trump==='ouros'||g.trump==='copas'?'#fca5a5':'#ddd',fontSize:14,fontWeight:'bold'}},SYM[g.trump]+' '+g.trump) : null,
      g.canSwap===mySeat && g.tc ? React.createElement('button',{onClick:swap,style:{background:'#C41230',color:'#fff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:'bold',fontSize:11}},'Trocar: 2'+SYM[g.trump]+' por '+g.tc.v+SYM[g.trump]) : null
    ),
    React.createElement('div',{style:{display:'grid',gridTemplateAreas:'"n n n" "w c e" "s s s"',gridTemplateColumns:gridColsPlay,gap:mob?4:8,alignItems:'center',justifyItems:'center',width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'}},
      React.createElement('div',{style:{gridArea:'n',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0}},
        React.createElement('div',{style:{display:'flex',gap:mob?2:4,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dN,false,true)),
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,color:'rgba(255,255,255,.92)',textAlign:'center',padding:'0 4px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:mob?6:7,flexWrap:'nowrap',maxWidth:'100%',minHeight:mob?18:20,lineHeight:1}},
          React.createElement('span',{style:{lineHeight:1,display:'block'}},NAMES[dN]),
          g.curP===dN ? rTurnIndicator(mob) : null
        )
      ),
      React.createElement('div',{style:{gridArea:'w',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0,overflow:'hidden'}},
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,color:'rgba(255,255,255,.92)',textAlign:'center',padding:'0 2px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:mob?6:7,flexWrap:'nowrap',maxWidth:'100%',minHeight:mob?18:20,lineHeight:1}},
          React.createElement('span',{style:{lineHeight:1,display:'block'}},NAMES[dW]),
          g.curP===dW ? rTurnIndicator(mob) : null
        ),
        React.createElement('div',{style:{display:'flex',gap:mob?1:2,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dW,false,false))
      ),
      React.createElement('div',{ref:tableDropRef,style:{gridArea:'c',position:'relative',width:tblW,height:tblH,maxWidth:'100%',minWidth:0,background:th.tableColor,borderRadius:th.id==='terrafe'?'50%':14,border:th.tableBorder,boxShadow:th.tableShadow,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}},
        th.decor ? th.decor() : null,
        React.createElement('div',{style:{position:'absolute',top:edge,left:'50%',transform:'translateX(-50%)'}},rPlaced(dN)),
        React.createElement('div',{style:{position:'absolute',left:edge,top:'50%',transform:'translateY(-50%)'}},rPlaced(dW)),
        React.createElement('div',{style:{position:'absolute',right:edge,top:'50%',transform:'translateY(-50%)'}},rPlaced(dE)),
        React.createElement('div',{style:{position:'absolute',bottom:edge,left:'50%',transform:'translateX(-50%)'}},rPlaced(dS)),
        g.lastW!==null && g.lastW>=0 && g.lastW<4 && g.trick.length===0 ? React.createElement('div',{style:{fontSize:mob?8:10,opacity:0.35,textAlign:'center',padding:'0 4px'}},'ganhou: '+NAMES[g.lastW]) : null
      ),
      React.createElement('div',{style:{gridArea:'e',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?2:3,maxWidth:'100%',minWidth:0,overflow:'hidden'}},
        React.createElement('div',{style:{fontSize:mob?9:11,opacity:0.7,color:'rgba(255,255,255,.92)',textAlign:'center',padding:'0 2px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:mob?6:7,flexWrap:'nowrap',maxWidth:'100%',minHeight:mob?18:20,lineHeight:1}},
          React.createElement('span',{style:{lineHeight:1,display:'block'}},NAMES[dE]),
          g.curP===dE ? rTurnIndicator(mob) : null
        ),
        React.createElement('div',{style:{display:'flex',gap:mob?1:2,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dE,false,false))
      ),
      React.createElement('div',{style:{gridArea:'s',display:'flex',flexDirection:'column',alignItems:'center',gap:mob?4:6,paddingBottom:mob?4:0,minWidth:0,maxWidth:'100%'}},
        React.createElement('div',{style:{display:'flex',gap:mob?3:5,flexWrap:'wrap',justifyContent:'center',maxWidth:'100%'}},rHand(dS,true,false)),
        React.createElement('div',{style:{fontSize:mob?11:12,fontWeight:'bold',color:'#ffffff',textAlign:'center',padding:'0 8px',lineHeight:1,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:mob?6:7,flexWrap:'nowrap',maxWidth:'100%',minHeight:mob?20:22}},
          React.createElement('span',{style:{lineHeight:1,display:'block'}},NAMES[dS]),
          g.curP===dS ? rTurnIndicator(mob) : null
        )
      )
    ),
    handGhost && handGhost.card
      ? React.createElement(
          'div',
          {
            key: 'hand-drag-ghost',
            style: {
              position: 'fixed',
              left: handGhost.x - (mob ? 22 : 23),
              top: handGhost.y - (mob ? 29 : 31),
              zIndex: 4500,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 14px 28px rgba(0,0,0,.5))',
              transform: 'rotate(-2deg)',
            },
          },
          rCard(handGhost.card, null, false, true, false, false, mob, cbk)
        )
      : null,
    ),
    ),
    ),
    modal ? React.createElement('div',{style:{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,minHeight:'100dvh'}},
      React.createElement('div',{style:Object.assign({},themeDialogChrome(th),{padding:28,maxWidth:400,width:'90%'})},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:16}},
          rLogo(34,th),
          React.createElement('h2',{style:{margin:0,fontSize:18,fontWeight:'500'}},'Resultado da rodada')
        ),
        React.createElement('div',{style:{marginBottom:14}},
          g.summary ? g.summary.map(function(s,i){
            var last = i===g.summary.length-1;
            return React.createElement('div',{
              key:i,
              style:{
                padding:'6px 0',
                fontSize:13,
                borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.1)',
                color:'rgba(255,255,255,.9)',
                lineHeight:1.45
              }
            }, s);
          }) : null
        ),
        React.createElement('div',{style:{display:'flex',justifyContent:'center',alignItems:'center',gap:mob?14:20,margin:'16px 0',fontSize:mob?18:22,fontWeight:'bold',fontVariantNumeric:'tabular-nums'}},
          (function(){
            var sf = g.summaryFinalMPts;
            var d0 = sf!=null && sf.length>0 ? sf[0] : g.mPts[0];
            var d1 = sf!=null && sf.length>1 ? sf[1] : g.mPts[1];
            return [
          React.createElement('span',{key:'a',style:{display:'inline-flex',alignItems:'center',gap:8}},
            React.createElement('span',{style:{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}),
            React.createElement('span',null,d0)),
          React.createElement('span',{key:'m',style:{opacity:0.35,fontWeight:400}},'\u2014'),
          React.createElement('span',{key:'b',style:{display:'inline-flex',alignItems:'center',gap:8}},
            React.createElement('span',{style:{width:8,height:8,borderRadius:'50%',background:'#f87171'}}),
            React.createElement('span',null,d1))
            ];
          })()),
        g.summaryFinalMPts ? React.createElement('div',{style:{textAlign:'center',fontSize:11,opacity:0.55,marginTop:-8,marginBottom:4}},'Placar final desta partida') : null,
        React.createElement('div',{style:{textAlign:'center',fontSize:12,opacity:0.78,marginBottom:12,letterSpacing:0.02}},
          'Partidas vencidas: A ',((g.setWins&&g.setWins[0])||0),' \u2014 B ',((g.setWins&&g.setWins[1])||0)
        ),
        React.createElement('div',{style:{textAlign:'center'}},
          React.createElement('button',{onClick:function(){sg(mkGame(g.mPts,gStart,g.tieBonus,g.playerNames,isOnline?myPid:g.lastActor,g.setWins));},style:primaryButtonStyle(th)},'Próxima rodada')
        )
      )
    ) : null
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
  var lcs=useState(null); var locId=lcs[0], setLocId=lcs[1];
  var crBusySt=useState(false); var crBusy=crBusySt[0], setCrBusy=crBusySt[1];
  var crErrSt=useState(''); var createRoomErr=crErrSt[0], setCreateRoomErr=crErrSt[1];
  var pbs=useState({}); var presenceByPlayer=pbs[0], setPresenceByPlayer=pbs[1];
  var resSt=useState(null); var resumeOffer=resSt[0], setResumeOffer=resSt[1];
  var rsBusySt=useState(false); var resumeBusy=rsBusySt[0], setResumeBusy=rsBusySt[1];
  var rtConnSt=useState(/** @type {boolean | null} */ (null));
  var rtdbConnected=rtConnSt[0], setRtdbConnected=rtConnSt[1];
  var themeKey = locId && THEMES[locId] ? locId : 'sala';
  if((screen==='lobby' || screen==='online') && room && room.themeId) themeKey = room.themeId;
  if(!THEMES[themeKey]) themeKey = 'sala';
  var theme = THEMES[themeKey];
  var screenRef=useRef(screen);
  var myIdRef=useRef(myId);
  var roomCodeRef=useRef(roomCode);
  screenRef.current=screen;
  myIdRef.current=myId;
  roomCodeRef.current=roomCode;

  useEffect(function(){
    if (!db) return;
    if (screen !== 'lobby' && screen !== 'online' && screen !== 'pickLocCreate') {
      setRtdbConnected(null);
      return;
    }
    var infoRef = ref(db, '.info/connected');
    var unsub = onValue(infoRef, function (snap) {
      setRtdbConnected(!!snap.val());
    });
    return function () {
      unsub();
      setRtdbConnected(null);
    };
  }, [screen]);

  useEffect(function(){
    if(screen!=="home"){
      return;
    }
    if(!RT.isConfigured()){
      setResumeOffer(null);
      return;
    }
    var s = readBfSession();
    if(!s){
      setResumeOffer(null);
      return;
    }
    var cancelled=false;
    void RT.getRoom(s.code).then(function(r){
      if(cancelled) return;
      if(!r || !playerInRoom(r, s.playerId)){
        clearBfSession();
        setResumeOffer(null);
        return;
      }
      var me = playerInRoom(r, s.playerId);
      setResumeOffer({ code: s.code, name: (me && me.name) || s.playerName || "Jogador", inGame: !!r.game });
    });
    return function(){
      cancelled=true;
    };
  },[screen]);

  useEffect(function(){
    if(screen!=="lobby" && screen!=="online") return;
    if(!roomCode) return;
    var unsub = RT.subscribeRoom(roomCode, function(r){
      if(!r){
        clearBfSession();
        setResumeOffer(null);
        setRoom(null);
        setRoomCode('');
        setOG(null);
        var scr0=screenRef.current;
        if(scr0==='lobby'||scr0==='online') setScreen('home');
        return;
      }
      var mid = myIdRef.current;
      if(mid && !playerInRoom(r, mid)){
        clearBfSession();
        setResumeOffer(null);
        setRoom(null);
        setRoomCode('');
        setOG(null);
        var scrKick=screenRef.current;
        if(scrKick==='lobby'||scrKick==='online') setScreen('home');
        return;
      }
      setRoom(r);
      var scr=screenRef.current;
      if(r.themeId && (scr==='lobby' || scr==='online')) setLocId(r.themeId);
      if(r.game && scr==="lobby") setScreen("online");
      if(r.game && scr==="online"){
        var gm = normalizeGame(r.game);
        var hid = r.hostId || '';
        /* Host mudou (ou RT desatualizado): fases em que lastActor deve ser o host para não travar setGame / timers. */
        if(hid && gm && (gm.phase==='shuffle'||gm.phase==='deal'||gm.phase==='end_trick'||gm.phase==='end_round'||gm.phase==='show_summary'||gm.phase==='cut') && gm.lastActor !== hid){
          gm = Object.assign({}, gm, { lastActor: hid });
        }
        if(gm){
          var midSub = myIdRef.current;
          setOG(function(prev){
            return mergeOnlineGameState(prev, gm, hid, midSub);
          });
        }
      }
    });
    return function(){ unsub(); };
  },[screen,roomCode]);

  useEffect(function(){
    if(!RT.isConfigured() || !roomCode) return;
    if(screen!=="lobby" && screen!=="online") return;
    var pref = presenceRoomRef(roomCode);
    if(!pref) return;
    var unsub = onValue(pref, function(snap){
      var v = snap.val();
      if(v && typeof v === "object" && !Array.isArray(v)) setPresenceByPlayer(v);
      else setPresenceByPlayer({});
    });
    return function(){ unsub(); };
  },[roomCode, screen]);

  useEffect(function(){
    if(!RT.isConfigured() || !roomCode || !myId) return;
    if(screen!=="lobby" && screen!=="online") return;
    var cancelled=false;
    void RT.attachRoomPresence(roomCode, myId).then(function(){
      if(cancelled) void RT.detachRoomPresence();
    });
    return function(){
      cancelled=true;
      void RT.detachRoomPresence();
    };
  },[roomCode, myId, screen]);

  useEffect(function(){
    if(screen!=="online"||!room||!room.game) return;
    var hidR = room.hostId || "";
    var ngRaw = normalizeGame(room.game);
    if(!ngRaw) return;
    if(hidR && (ngRaw.phase==='shuffle'||ngRaw.phase==='deal'||ngRaw.phase==='end_trick'||ngRaw.phase==='end_round'||ngRaw.phase==='show_summary'||ngRaw.phase==='cut') && ngRaw.lastActor !== hidR){
      ngRaw = Object.assign({}, ngRaw, { lastActor: hidR });
    }
    setOG(function(prev){
      return mergeOnlineGameState(prev, ngRaw, hidR, myId);
    });
  },[screen,room,room&&room.game,myId,room&&room.hostId]);

  // Parceiro / não-host: se `shuffle` ficar visível além do tempo normal (host ~2,4s + margem), repuxar a sala do RTDB.
  // Evita “IA a embaralhar para sempre” quando um snapshot atrasado ou um tick falhou a atualizar o listener.
  useEffect(function(){
    if(screen!=="online"||!roomCode||!room||!room.game) return;
    var ph = room.game.phase;
    if(ph!=="shuffle") return;
    var t = setTimeout(function(){
      void RT.getRoom(roomCode).then(function(r){
        if(!r) return;
        var nr = normalizeRoom(r);
        if(nr) setRoom(nr);
      });
    },5500);
    return function(){ clearTimeout(t); };
  },[screen,roomCode,room&&room.game&&room.game.phase]);

  function dismissResumeSession(){
    clearBfSession();
    setResumeOffer(null);
  }

  async function resumeIntoRoom(){
    if(resumeBusy) return;
    var s = readBfSession();
    if(!s){
      setResumeOffer(null);
      return;
    }
    setResumeBusy(true);
    var r = await RT.getRoom(s.code);
    if(!r || !playerInRoom(r, s.playerId)){
      clearBfSession();
      setResumeOffer(null);
      setResumeBusy(false);
      return;
    }
    var me = playerInRoom(r, s.playerId);
    setMyId(me.id);
    setMyName(clampDisplayName(me.name || s.playerName || "") || "Jogador");
    setRoomCode(s.code);
    setRoom(r);
    if(r.themeId) setLocId(r.themeId);
    writeBfSession({
      code: s.code,
      playerId: me.id,
      playerName: clampDisplayName(me.name || s.playerName || "") || "Jogador",
    });
    setOG(null);
    setScreen(r.game ? "online" : "lobby");
    setResumeOffer(null);
    setResumeBusy(false);
  }

  function goHome(){
    void (async function(){
      setOPT(0);
      var code=roomCodeRef.current, id=myIdRef.current, scr=screenRef.current;
      try{
        if(code && id && (scr==='lobby' || scr==='online')){
          await RT.removeSelfFromRoom(code, id);
        }
      }catch(e){ void e; }
      clearBfSession();
      setResumeOffer(null);
      setScreen('home');
      setRoom(null);
      setRoomCode('');
      sg(null);
      setOG(null);
      setShowExit(false);
    })();
  }

  var exitBtn = React.createElement('button',{onClick:function(){setShowExit(true);},style:{position:'fixed',bottom:'max(12px, calc(12px + env(safe-area-inset-bottom)))',left:'max(12px, calc(12px + env(safe-area-inset-left)))',background:'rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:11,padding:'5px 10px',zIndex:100}},'← Voltar');

  var exitModal = showExit ? React.createElement('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}},
    React.createElement('div',{style:Object.assign({},themeDialogChrome(theme),{padding:28,maxWidth:340,width:'90%',textAlign:'center'})},
      React.createElement('div',{style:{fontSize:18,fontWeight:'bold',marginBottom:8,color:'#fff'}},'Sair da partida?'),
      React.createElement('div',{style:{fontSize:13,opacity:0.6,marginBottom:20}},
        screen==='online'||screen==='lobby'
          ? 'Você será removido da sala no servidor. Com partida em curso, o botão Entrar com o código não volta a colocá-lo na mesa — só o cartão "Continuar na mesa" no início, se a sessão ainda for válida.'
          : 'O progresso será perdido.'
      ),
      React.createElement('div',{style:{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}},
        React.createElement('button',{onClick:goHome,style:primaryButtonStyle(theme)},'Sim, sair'),
        React.createElement('button',{onClick:function(){setShowExit(false);},style:themeGhostButtonStyle(theme)},'Continuar')
      )
    )
  ) : null;

  var resumeTh = THEMES.sala;
  var resumeBanner =
    screen === "home" && resumeOffer
      ? React.createElement(
          "div",
          {
            role: "dialog",
            "aria-label": "Continuar na mesa",
            style: {
              position: "fixed",
              top: "max(10px, env(safe-area-inset-top))",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(360px, calc(100vw - 24px))",
              padding: "14px 16px",
              borderRadius: 14,
              background: "linear-gradient(165deg, #2a1014 0%, #1a0a0e 55%, #14080c 100%)",
              border: "1px solid rgba(196,18,48,.45)",
              boxSizing: "border-box",
              boxShadow: "0 12px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.35)",
              zIndex: 5000,
              isolation: "isolate",
              pointerEvents: "auto",
            },
          },
          React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#f0d078", marginBottom: 6 } }, "Continuar na mesa"),
          React.createElement("div", { style: { fontSize: 16, fontWeight: 800, letterSpacing: 3, color: "#fff", marginBottom: 4 } }, resumeOffer.code),
          React.createElement("div", { style: { fontSize: 12, opacity: 0.75, marginBottom: 8 } }, resumeOffer.name),
          React.createElement(
            "div",
            { style: { fontSize: 11, opacity: 0.75, lineHeight: 1.5, marginBottom: 12, maxWidth: "100%" } },
            resumeOffer.inGame
              ? "A partida já começou. Reconecte para voltar ao mesmo lugar (internet, crash ou fecho acidental do separador)."
              : "Você ainda está na sala no servidor — volte ao lobby se fechou o site sem sair por \"Voltar\"."
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            React.createElement(
              "button",
              {
                type: "button",
                disabled: resumeBusy,
                onClick: function () {
                  void resumeIntoRoom();
                },
                style: Object.assign({}, primaryButtonStyle(resumeTh), { flex: 1, minWidth: 140, opacity: resumeBusy ? 0.6 : 1 }),
              },
              resumeBusy ? "A abrir…" : "Voltar à mesa"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                disabled: resumeBusy,
                onClick: dismissResumeSession,
                style: Object.assign({}, themeGhostButtonStyle(resumeTh), { minWidth: 100 }),
              },
              "Esquecer"
            )
          )
        )
      : null;

  if(screen==='home'){
    var resumePad = resumeOffer ? 168 : 0;
    return React.createElement(React.Fragment,null,
      React.createElement(HomeScreen,{
        resumeTopPad: resumePad,
        onSolo:function(name){ setMyName(name); setScreen('pickLoc'); },
        onGoPickCreate:function(name){ setCreateRoomErr(''); setMyName(name); setScreen('pickLocCreate'); },
        onJoin:function(id,name,code,roomSnap){
          writeBfSession({ code: code, playerId: id, playerName: name });
          setMyId(id); setMyName(name); setRoomCode(code); if(roomSnap){ setRoom(roomSnap); if(roomSnap.themeId) setLocId(roomSnap.themeId);} setScreen('lobby');
        }
      }),
      resumeBanner
    );
  }

  if(screen==='pickLocCreate'){
    return React.createElement(React.Fragment,null,
      React.createElement(LocationScreen,{
        pickForCreate:true,
        createRoomError:createRoomErr,
        onBack:function(){ if(!crBusy){ setCreateRoomErr(''); setScreen('home');} },
        onSelect:async function(loc){
          if(crBusy || !RT.isConfigured()) return;
          setCreateRoomErr('');
          if(rtdbConnected===false){
            setCreateRoomErr('Não foi possível criar a sala: não há ligação à internet ou ao servidor. Verifique o Wi‑Fi ou os dados móveis e tente novamente.');
            return;
          }
          setCrBusy(true);
          var c=mkCode(), pid=uid();
          var roomNew={code:c,hostId:pid,players:[{id:pid,name:myName,seat:-1,team:null}],game:null,themeId:loc};
          var ok = await RT.setRoom(c, roomNew);
          setCrBusy(false);
          if(ok){
            writeBfSession({ code: c, playerId: pid, playerName: myName });
            setMyId(pid); setRoomCode(c); setLocId(loc); setRoom(roomNew); setScreen('lobby');
          }else{
            setCreateRoomErr('Não foi possível criar a sala no servidor. Confirme que tem ligação estável à internet e tente de novo. Se o problema persistir, aguarde alguns minutos ou tente noutra rede.');
          }
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
      onSelect:function(loc){ setLocId(loc); sg(mkGame(null,undefined,0,[myName,'Adv. Esq.','Parceiro','Adv. Dir.'],undefined,undefined)); setScreen('solo'); }
    });
  }

  if(screen==='lobby' && room){
    return React.createElement(LobbyScreen,{room:room,myId:myId,presenceByPlayer:presenceByPlayer,onLeave:goHome,serverConnected:rtdbConnected});
  }

  if(screen==='online' && room && og){
    var seatClamped = resolveOnlineMySeat(room, myId, myName, og.playerNames);
    var botSeatsMap = {};
    room.players.forEach(function(p){
      if(p.isBot && typeof p.seat==='number' && p.seat>=0) botSeatsMap[p.seat]=true;
    });
    return React.createElement('div',{style:{position:'relative',boxSizing:'border-box',minHeight:'100vh'}},
      React.createElement(GameScreen,{g:og,sg:setOG,isSolo:false,isOnline:true,mySeat:seatClamped,myPid:myId,roomCode:roomCode,roomHostId:room.hostId||'',isRoomHost:room.hostId===myId,botSeats:botSeatsMap,partnerCount:oPart,setPT:setOPT,shuffling:oShuf,setSh:setOSh,cutAnim:oCut,setCa:setOCa,hovHalf:oHov,setHovHalf:setOHov,onMenu:goHome,theme:theme,serverConnected:rtdbConnected}),
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
    return React.createElement('div',{style:{minHeight:'100vh',background:'#0a0a12',color:'rgba(255,255,255,.75)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,fontFamily:'system-ui,sans-serif',fontSize:14,position:'relative',boxSizing:'border-box',padding:'max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-left)) max(24px, env(safe-area-inset-right))'}},
      RT.isConfigured() ? React.createElement(RtConnectionBadge,{connected:rtdbConnected,variant:'hud'}) : null,
      React.createElement('div',{style:{opacity:0.9}},'Carregando mesa…')
    );
  }

  return React.createElement(React.Fragment,null,
    React.createElement(HomeScreen,{resumeTopPad: resumeOffer ? 168 : 0, onSolo:function(){},onGoPickCreate:function(){},onJoin:function(){}}),
    resumeBanner
  );
}

