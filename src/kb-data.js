/* ══════════════════════════════════════════════════════════════
   KEUZEBORD — GEDEELDE DATALAAG
   Het bord en de beheeromgeving zijn twee aparte apps die hier
   allebei op draaien. Deze laag kent de opslag, de klassen, de
   hoeken en de doelen; hij weet niets van schermen.
   Dezelfde opslagsleutels als de oude app, zodat bestaande
   gegevens gewoon meekomen.
   ══════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

var SLEUTEL      = 'kb_v5';
var DOELEN_KEY   = 'kb_doelen';
var FK_DB        = 'kb_fotokluis', FK_STORE = 'fotos', FK_KEY = 'alles';

var KIND_KLEUREN = ['#3b6ff0','#d94f4f','#2e9e6b','#c8820a','#7c5cbf','#b8436d','#c06428','#1a9aad'];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* ── opslag ──────────────────────────────────────────────── */
var G = null;

function standaardInstellingen(){
  return { timerAan:true, timerMinuten:20, wachtrijAan:true, tellingAan:false,
           pinAan:true, pincode:'1234', kolommen:3 };
}

function leegKlas(naam){
  var bord = { id:'b'+uid(), naam:'Keuzebord', hoekLibIds:[], plaatsingen:{},
               dagOpen:false, dagGesloten:false, dagStart:null, thema:'geen' };
  return { id:'k'+uid(), naam:naam, borden:[bord], activeBordId:bord.id,
           hoekLib:[], fotoLib:[], leerlingen:[], weekData:[], groepjes:[],
           werkplaatsTaken:[], weekplannerWeken:[], observaties:[],
           wachtrij:[], doelActief:{}, settings:standaardInstellingen() };
}

function laad(){
  try {
    var s = localStorage.getItem(SLEUTEL);
    if (s) { G = JSON.parse(s); }
  } catch (e) { G = null; }
  if (!G || !Array.isArray(G.klassen) || !G.klassen.length) {
    var k = leegKlas('Mijn groep');
    G = { klassen:[k], activeKlasId:k.id, settings:standaardInstellingen() };
  }
  G.klassen.forEach(function (k) {
    if (!k.settings) k.settings = standaardInstellingen();
    if (!k.wachtrij)  k.wachtrij  = [];
    if (!k.doelActief) k.doelActief = {};
    (k.borden || []).forEach(function (b) {
      if (!b.plaatsingen) b.plaatsingen = {};
      if (!b.hoekLibIds)  b.hoekLibIds  = [];
    });
  });
  return G;
}

function bewaar(){
  try {
    var kopie = JSON.parse(JSON.stringify(G));
    // Foto's uit de fotokluis horen daar, niet in de klasgegevens.
    kopie.klassen.forEach(function (k) {
      k.leerlingen.forEach(function (l) { if (l._c) l.image = null; });
      (k.fotoLib || []).forEach(function (f) { if (f._c) f.data = null; });
    });
    localStorage.setItem(SLEUTEL, JSON.stringify(kopie));
    return true;
  } catch (e) {
    return false;   // vol: de aanroeper mag beslissen wat te melden
  }
}

/* ── opzoeken ────────────────────────────────────────────── */
function klas(id){
  return G.klassen.filter(function (k) { return k.id === (id || G.activeKlasId); })[0] || G.klassen[0];
}
function bord(k){
  k = k || klas();
  return (k.borden || []).filter(function (b) { return b.id === k.activeBordId; })[0] || k.borden[0];
}
function bordHoeken(b, k){
  k = k || klas(); b = b || bord(k);
  return (b.hoekLibIds || []).map(function (id) {
    return (k.hoekLib || []).filter(function (h) { return h.id === id; })[0];
  }).filter(Boolean);
}
function foto(id, k){
  k = k || klas();
  var f = (k.fotoLib || []).filter(function (x) { return x.id === id; })[0];
  return f ? f.data : null;
}
function leerling(id, k){
  k = k || klas();
  return (k.leerlingen || []).filter(function (l) { return l.id === id; })[0] || null;
}
function instelling(naam, k){
  k = k || klas();
  var s = k.settings || {};
  var std = standaardInstellingen();
  return (naam in s) ? s[naam] : std[naam];
}

/* ── plaatsen op het bord ────────────────────────────────── */
function bezetting(hoekId, b){
  b = b || bord();
  return (b.plaatsingen[hoekId] || []).filter(function (p) {
    var l = leerling(p.leerlingId);
    return l && l.lid !== false;
  });
}
function isVol(hoek, b){ return bezetting(hoek.id, b).length >= hoek.maxKinderen; }

function plaatsingVan(leerlingId, b){
  b = b || bord();
  var hoeken = Object.keys(b.plaatsingen);
  for (var i = 0; i < hoeken.length; i++) {
    var gevonden = (b.plaatsingen[hoeken[i]] || []).filter(function (p) {
      return p.leerlingId === leerlingId;
    })[0];
    if (gevonden) return { hoekId: hoeken[i], plaatsing: gevonden };
  }
  return null;
}

/* Hoeveel milliseconden een kind nog vastzit. 0 = mag wisselen. */
function vergrendeldTot(plaatsing, hoek, k){
  k = k || klas();
  if (!instelling('timerAan', k)) return 0;
  var minuten = (hoek && hoek.timerMinuten) || instelling('timerMinuten', k);
  var eind = (plaatsing.startTijd || 0) + minuten * 60000;
  return Math.max(0, eind - Date.now());
}
function timerDeel(plaatsing, hoek, k){
  k = k || klas();
  if (!instelling('timerAan', k)) return 1;
  var minuten = (hoek && hoek.timerMinuten) || instelling('timerMinuten', k);
  var totaal = minuten * 60000;
  if (totaal <= 0) return 1;
  var verstreken = Date.now() - (plaatsing.startTijd || 0);
  return Math.max(0, Math.min(1, verstreken / totaal));
}

/* Zet een kind in een hoek. Geeft terug wat er gebeurde, zodat de
   schermlaag zelf mag beslissen wat het de klas laat zien. */
function plaats(leerlingId, hoekId){
  var k = klas(), b = bord(k);
  var hoek = (k.hoekLib || []).filter(function (h) { return h.id === hoekId; })[0];
  if (!hoek) return { ok:false, reden:'geen-hoek' };

  var huidig = plaatsingVan(leerlingId, b);
  if (huidig && huidig.hoekId === hoekId) return { ok:false, reden:'zelfde-hoek' };

  if (huidig) {
    var rest = vergrendeldTot(huidig.plaatsing, hoekVan(huidig.hoekId, k), k);
    if (rest > 0) return { ok:false, reden:'vergrendeld', restMs:rest };
  }
  if (isVol(hoek, b)) return { ok:false, reden:'vol', hoek:hoek };

  Object.keys(b.plaatsingen).forEach(function (hid) {
    b.plaatsingen[hid] = (b.plaatsingen[hid] || []).filter(function (p) {
      return p.leerlingId !== leerlingId;
    });
  });
  if (!b.plaatsingen[hoekId]) b.plaatsingen[hoekId] = [];
  b.plaatsingen[hoekId].push({ leerlingId: leerlingId, startTijd: Date.now() });
  uitWachtrij(leerlingId, k);
  logGebeurtenis('gekozen', { leerlingId: leerlingId, hoekId: hoekId }, k);
  bewaar();
  return { ok:true, hoek:hoek };
}

function hoekVan(id, k){
  k = k || klas();
  return (k.hoekLib || []).filter(function (h) { return h.id === id; })[0] || null;
}

function haalWeg(leerlingId, hoekId){
  var b = bord();
  b.plaatsingen[hoekId] = (b.plaatsingen[hoekId] || []).filter(function (p) {
    return p.leerlingId !== leerlingId;
  });
  logGebeurtenis('weg', { leerlingId: leerlingId, hoekId: hoekId });
  bewaar();
  schuifWachtrijDoor(hoekId);
}

/* ── wachtrij ────────────────────────────────────────────── */
function wachtrijVoor(hoekId, k){
  k = k || klas();
  return (k.wachtrij || []).filter(function (w) { return w.hoekId === hoekId; })
    .sort(function (a, b) { return a.sinds - b.sinds; });
}
function inWachtrij(leerlingId, hoekId, k){
  k = k || klas();
  if (!k.wachtrij) k.wachtrij = [];
  uitWachtrij(leerlingId, k);
  k.wachtrij.push({ leerlingId: leerlingId, hoekId: hoekId, sinds: Date.now() });
  bewaar();
  return wachtrijVoor(hoekId, k).map(function (w) { return w.leerlingId; }).indexOf(leerlingId) + 1;
}
function uitWachtrij(leerlingId, k){
  k = k || klas();
  if (!k.wachtrij) { k.wachtrij = []; return; }
  k.wachtrij = k.wachtrij.filter(function (w) { return w.leerlingId !== leerlingId; });
}
function schuifWachtrijDoor(hoekId){
  var k = klas(), hoek = hoekVan(hoekId, k);
  if (!hoek || !instelling('wachtrijAan', k)) return null;
  var rij = wachtrijVoor(hoekId, k);
  if (!rij.length || isVol(hoek)) return null;
  var eerste = rij[0];
  uitWachtrij(eerste.leerlingId, k);
  bewaar();
  return eerste.leerlingId;   // het scherm mag dit vieren
}

/* ── logboek (basis voor statistieken later) ─────────────── */
function logGebeurtenis(soort, gegevens, k){
  k = k || klas();
  if (!k.gebeurtenissen) k.gebeurtenissen = [];
  k.gebeurtenissen.push(Object.assign({ soort: soort, tijd: Date.now() }, gegevens));
  // Ruim op: het logboek mag de opslag niet opeten zolang er geen database is.
  if (k.gebeurtenissen.length > 4000) k.gebeurtenissen = k.gebeurtenissen.slice(-3000);
}

/* ── doelen ──────────────────────────────────────────────── */
var NIVEAUS_PER_GROEP = { 1:['0','1a','1b','1'], 2:['2a','2b','2'], 3:['3a','3b','3'] };
var doelen = { meta:null, lijst:[] };

function doelenLaad(){
  try {
    var s = localStorage.getItem(DOELEN_KEY);
    if (s) { var p = JSON.parse(s); doelen.meta = p.meta || null; doelen.lijst = p.lijst || []; }
  } catch (e) { doelen = { meta:null, lijst:[] }; }
  return doelen;
}
function doelenBewaar(){
  try { localStorage.setItem(DOELEN_KEY, JSON.stringify(doelen)); return true; }
  catch (e) { return false; }
}
function doelenNeemOver(pak){
  if (!pak || pak.formaat !== 'keuzebord-doelen' || !Array.isArray(pak.doelen)) return false;
  doelen.meta = { bron: pak.bron || '', versie: pak.versie || 1,
                  niveaus: pak.niveaus || [], domeinen: pak.domeinen || [] };
  doelen.lijst = pak.doelen;
  return doelenBewaar();
}
function klasNiveaus(k){
  k = k || klas();
  if (Array.isArray(k.doelNiveaus) && k.doelNiveaus.length) return k.doelNiveaus;
  var m = (k.naam || '').match(/\b([123])\b/);
  return NIVEAUS_PER_GROEP[m ? m[1] : 2] || NIVEAUS_PER_GROEP[2];
}
function doelenVanKlas(k){
  k = k || klas();
  var niveaus = klasNiveaus(k);
  return doelen.lijst.filter(function (d) { return niveaus.indexOf(d.niveau) >= 0; });
}

/* ── fotokluis (blijft op dit apparaat) ──────────────────── */
function fkOpen(){
  return new Promise(function (res, rej) {
    if (!global.indexedDB) { rej(new Error('geen opslag')); return; }
    var req;
    try { req = indexedDB.open(FK_DB, 1); } catch (e) { rej(e); return; }
    req.onupgradeneeded = function () { req.result.createObjectStore(FK_STORE); };
    req.onsuccess = function () { res(req.result); };
    req.onerror   = function () { rej(req.error || new Error('opslag niet beschikbaar')); };
  });
}
function fkTx(modus, fn){
  return fkOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var req = fn(db.transaction(FK_STORE, modus).objectStore(FK_STORE));
      req.onsuccess = function () { res(req.result); };
      req.onerror   = function () { rej(req.error); };
    });
  });
}
function fkLees(){  return fkTx('readonly',  function (s) { return s.get(FK_KEY); }); }
function fkBewaar(m){ return fkTx('readwrite', function (s) { return s.put(m, FK_KEY); }); }
function fkWis(){   return fkTx('readwrite', function (s) { return s.delete(FK_KEY); }); }

/* Zet de foto's uit de kluis op de leerlingen en hoekfoto's van elke klas.
   Sleutels: "leerling/<klasnaam>/<naam>", "hoek/<naam>", plus de oude
   vorm "1c/<naam>" en "1d/<naam>" uit de eerste kluisbestanden. */
function fkPasToe(kluis){
  if (!kluis) return 0;
  var n = 0;
  G.klassen.forEach(function (k) {
    (k.leerlingen || []).forEach(function (l) {
      if (l.image && !l._c) return;
      var kandidaten = ['leerling/' + k.naam + '/' + l.naam];
      var m = (k.naam || '').match(/([123][a-dA-D])/);
      if (m) kandidaten.push(m[1].toLowerCase() + '/' + l.naam);
      for (var i = 0; i < kandidaten.length; i++) {
        if (kluis[kandidaten[i]]) { l.image = kluis[kandidaten[i]]; l._c = true; n++; return; }
      }
    });
    (k.fotoLib || []).forEach(function (f) {
      if (f.data) return;
      if (kluis['hoek/' + f.naam]) { f.data = kluis['hoek/' + f.naam]; f._c = true; n++; }
    });
  });
  return n;
}

/* ── afbeeldingen verkleinen ─────────────────────────────── */
var FOTO_MAAT = { leerling:256, hoek:640, archief:640 };

function verklein(file, maxPx, kwaliteit){
  kwaliteit = kwaliteit || 0.82;
  return new Promise(function (res, rej) {
    if (!file) { rej(new Error('geen bestand')); return; }
    if (file.type && file.type.indexOf('image/') !== 0) { rej(new Error('geen afbeelding')); return; }

    function teken(bron, breedte, hoogte){
      try {
        var schaal = Math.min(1, maxPx / Math.max(breedte, hoogte));
        var w = Math.max(1, Math.round(breedte * schaal));
        var h = Math.max(1, Math.round(hoogte  * schaal));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bron, 0, 0, w, h);
        var uit = c.toDataURL('image/webp', kwaliteit);
        if (uit.indexOf('data:image/webp') !== 0) uit = c.toDataURL('image/jpeg', kwaliteit);
        if (bron.close) bron.close();
        res(uit);
      } catch (e) { rej(e); }
    }
    function viaImg(){
      var r = new FileReader();
      r.onload = function (e) {
        var im = new Image();
        im.onload  = function () { teken(im, im.naturalWidth, im.naturalHeight); };
        im.onerror = function () { rej(new Error('kon de afbeelding niet lezen')); };
        im.src = e.target.result;
      };
      r.onerror = function () { rej(new Error('kon het bestand niet lezen')); };
      r.readAsDataURL(file);
    }
    if (global.createImageBitmap) {
      try {
        createImageBitmap(file, { imageOrientation:'from-image' })
          .then(function (bm) { teken(bm, bm.width, bm.height); })
          .catch(viaImg);
        return;
      } catch (e) {}
    }
    viaImg();
  });
}

/* ── naar buiten ─────────────────────────────────────────── */
global.KB = {
  KIND_KLEUREN: KIND_KLEUREN,
  FOTO_MAAT: FOTO_MAAT,
  NIVEAUS_PER_GROEP: NIVEAUS_PER_GROEP,
  uid: uid,
  get G(){ return G; },
  laad: laad, bewaar: bewaar, leegKlas: leegKlas, standaardInstellingen: standaardInstellingen,
  klas: klas, bord: bord, bordHoeken: bordHoeken, foto: foto, leerling: leerling,
  hoekVan: hoekVan, instelling: instelling,
  bezetting: bezetting, isVol: isVol, plaatsingVan: plaatsingVan,
  vergrendeldTot: vergrendeldTot, timerDeel: timerDeel,
  plaats: plaats, haalWeg: haalWeg,
  wachtrijVoor: wachtrijVoor, inWachtrij: inWachtrij, uitWachtrij: uitWachtrij,
  schuifWachtrijDoor: schuifWachtrijDoor,
  logGebeurtenis: logGebeurtenis,
  doelen: doelen, doelenLaad: doelenLaad, doelenNeemOver: doelenNeemOver,
  doelenBewaar: doelenBewaar, klasNiveaus: klasNiveaus, doelenVanKlas: doelenVanKlas,
  fkLees: fkLees, fkBewaar: fkBewaar, fkWis: fkWis, fkPasToe: fkPasToe,
  verklein: verklein
};

})(window);
