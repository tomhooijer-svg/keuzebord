/* ══════════════════════════════════════════════════════════════
   HET BORD
   De app die de hele dag op het digibord staat. Kiezen, timers,
   wachtrij. Verder niets — al het regelwerk zit in beheer.html.
   ══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var $  = function (id) { return document.getElementById(id); };
var el = function (tag, klasse, tekst) {
  var n = document.createElement(tag);
  if (klasse) n.className = klasse;
  if (tekst != null) n.textContent = tekst;
  return n;
};
var veilig = function (s) { return String(s == null ? '' : s); };

var DAGEN   = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
var MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus',
               'september','oktober','november','december'];

/* Elke hoek heeft een eigen kleur — dat maakt het bord vrolijk en helpt
   kleuters de hoek herkennen voordat ze de naam kunnen lezen. De kleur
   loopt door de hele kaart: sterk in het beeldvlak, zacht eronder. */
var HOEKTINTEN = [
  { kleur:'#3b6ff0', tint:'#dfe9fd', zacht:'#f2f6ff' },   // blauw
  { kleur:'#e2607f', tint:'#fde0e8', zacht:'#fff3f6' },   // roze
  { kleur:'#e79a1f', tint:'#fdeecd', zacht:'#fff9ed' },   // oker
  { kleur:'#8b6ad0', tint:'#ebe3fb', zacht:'#f8f5ff' },   // paars
  { kleur:'#17a9bd', tint:'#d6f1f5', zacht:'#effbfc' },   // turkoois
  { kleur:'#37ab74', tint:'#d9f2e5', zacht:'#f1fbf6' },   // groen
  { kleur:'#e8674f', tint:'#fde2dc', zacht:'#fff4f2' },   // koraal
  { kleur:'#c9772f', tint:'#fbe8d5', zacht:'#fff6ee' }    // oranje
];

/* Welke groep bij dit apparaat hoort is één afspraak, gedeeld met het
   beheer en het schoolbeheer. Stel je hem daar in, dan opent het bord
   meteen die groep. */
var OUDE_SLEUTEL = 'kb_bord_klas';   // uit een eerdere versie
var scherm = 'klassen';
var meldingTimer = null;

/* ── meldingen ───────────────────────────────────────────── */
function meld(tekst){
  var m = $('melding');
  m.textContent = tekst;
  m.classList.add('zichtbaar');
  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(function () { m.classList.remove('zichtbaar'); }, 2600);
}

/* ── overlay ─────────────────────────────────────────────── */
function toonBlad(bouw){
  var blad = $('blad');
  blad.innerHTML = '';
  bouw(blad);
  $('overlay').classList.add('open');
}
function sluitBlad(){ $('overlay').classList.remove('open'); }
$('overlay').addEventListener('click', function (e) { if (e.target.id === 'overlay') sluitBlad(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluitBlad(); });

/* ── picto ───────────────────────────────────────────────── */
function maakPicto(leerling, opties){
  opties = opties || {};
  var wrap = el('div', 'picto');
  wrap.dataset.leerlingId = leerling.id;

  var rond = el('div', 'picto-rond');
  rond.style.background = leerling.kleur || '#3b6ff0';
  if (leerling.image) {
    rond.style.backgroundImage = 'url(' + leerling.image + ')';
  } else {
    rond.textContent = (leerling.naam || '?').charAt(0).toUpperCase();
  }

  if (opties.plaatsing && opties.hoek) {
    var deel = KB.timerDeel(opties.plaatsing, opties.hoek);
    var vrij = KB.vergrendeldTot(opties.plaatsing, opties.hoek) === 0;
    if (KB.instelling('timerAan')) {
      rond.appendChild(maakRing(deel));
      if (vrij) wrap.classList.add('vrij');
      else wrap.classList.add('op-slot');
    }
  }

  wrap.appendChild(rond);
  if (!opties.zonderNaam) wrap.appendChild(el('div', 'picto-naam', leerling.naam));
  return wrap;
}

function maakRing(deel){
  var straal = 46, omtrek = 2 * Math.PI * straal;
  var ring = el('div', 'ring');
  ring.innerHTML =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="baan" cx="50" cy="50" r="' + straal + '"></circle>' +
      '<circle class="voortgang" cx="50" cy="50" r="' + straal +
      '" stroke-linecap="' + (deel < 0.02 ? 'butt' : 'round') +
      '" stroke-dasharray="' + (omtrek * deel).toFixed(1) + ' ' + omtrek.toFixed(1) + '"></circle>' +
    '</svg>';
  return ring;
}

/* ── klas kiezen ─────────────────────────────────────────── */
function toonKlassen(){
  scherm = 'klassen';
  document.querySelectorAll('.scherm').forEach(function (s) { s.classList.remove('aan'); });
  $('scherm-klassen').classList.add('aan');

  pasUiterlijkToe(KB.klas());
  var rooster = $('klas-rooster');
  rooster.innerHTML = '';
  KB.G.klassen.forEach(function (k) {
    var kaart = el('button', 'kaart klas-kaart');
    kaart.appendChild(el('div', 'n', k.naam));
    kaart.appendChild(el('div', 's', (k.leerlingen || []).length + ' kinderen · ' +
                                     (k.hoekLib || []).length + ' hoeken'));
    kaart.addEventListener('click', function () {
      KB.zetBeheerKlas(k.id); KB.bewaar();
      toonBord();
    });
    rooster.appendChild(kaart);
  });
  tik();
}

/* ── bord ────────────────────────────────────────────────── */
function toonBord(){
  scherm = 'bord';
  document.querySelectorAll('.scherm').forEach(function (s) { s.classList.remove('aan'); });
  $('scherm-bord').classList.add('aan');
  tekenBord();
}

function tintVan(index){ return HOEKTINTEN[index % HOEKTINTEN.length]; }

function pasUiterlijkToe(k){
  try { document.body.style.background = KB.achtergrondCss(k); }
  catch (e) { /* dan blijft de standaardachtergrond staan */ }
}

function tekenBord(){
  var k = KB.klas(), b = KB.bord(k);
  $('bord-groep').textContent = k.naam;
  pasUiterlijkToe(k);

  var hoeken = KB.bordHoeken(b, k);
  var rooster = $('rooster');
  rooster.innerHTML = '';
  var kolommen = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(hoeken.length || 1))));
  rooster.style.setProperty('--kolommen', kolommen);

  hoeken.forEach(function (hoek, i) { rooster.appendChild(maakHoekKaart(hoek, i, k, b)); });
  tekenStrook(k, b);
  tik();
}

function gereserveerdVoor(hoek, k, b){
  if (!hoek.werkplaats || !KB.instelling('werkplaatsAan', k)) return [];
  var aanwezig = KB.bezetting(hoek.id, b).map(function (p) { return p.leerlingId; });
  return KB.geplandVandaag(null, null, k)
    .filter(function (g) { return aanwezig.indexOf(g.leerlingId) < 0; })
    .map(function (g) { return g.leerlingId; });
}

function maakHoekKaart(hoek, index, k, b){
  var tint = tintVan(index);
  var kinderen = KB.bezetting(hoek.id, b);
  var gereserveerd = gereserveerdVoor(hoek, k, b);
  var vol = kinderen.length >= hoek.maxKinderen;
  var rij = KB.wachtrijVoor(hoek.id, k);

  var kaart = el('div', 'kaart hoek' + (vol ? ' vol' : ''));
  kaart.dataset.hoekId = hoek.id;
  kaart.style.setProperty('--hoekkleur', tint.kleur);
  kaart.style.setProperty('--hoektint', tint.tint);
  kaart.style.setProperty('--hoekzacht', tint.zacht);
  kaart.style.setProperty('--hoekschaduw', tint.kleur + '33');

  var beeld = el('div', 'hoek-beeld');
  var f = KB.foto(hoek.fotoId, k);
  if (f) { beeld.style.backgroundImage = 'url(' + f + ')'; }
  else   { beeld.appendChild(hoekIcoon(tint.kleur, hoek.naam)); }
  kaart.appendChild(beeld);

  var onder = el('div', 'hoek-onder');
  var kop = el('div', 'hoek-kop');
  kop.appendChild(el('div', 'hoek-naam', hoek.naam));

  var plekjes = el('div', 'plekjes');
  for (var i = 0; i < hoek.maxKinderen; i++) {
    plekjes.appendChild(el('div', 'plek' + (i < kinderen.length ? ' bezet' : '')));
  }
  kop.appendChild(plekjes);
  onder.appendChild(kop);

  var rijKinderen = el('div', 'hoek-kinderen');
  kinderen.forEach(function (p) {
    var l = KB.leerling(p.leerlingId, k);
    if (!l) return;
    var picto = maakPicto(l, { plaatsing: p, hoek: hoek, zonderNaam: true });
    picto.title = l.naam;
    maakSleepbaar(picto, l, hoek.id);
    rijKinderen.appendChild(picto);
  });
  // De kinderen die vandaag aan de beurt zijn krijgen alvast hun plek te zien.
  gereserveerd.slice(0, Math.max(0, hoek.maxKinderen - kinderen.length)).forEach(function (id) {
    var l = KB.leerling(id, k);
    if (!l) return;
    var plek = el('div', 'gereserveerd');
    var bol = el('div', 'picto-rond');
    bol.style.width = bol.style.height = '46px';
    bol.style.background = l.kleur || '#3b6ff0';
    if (l.image) bol.style.backgroundImage = 'url(' + l.image + ')';
    else bol.textContent = (l.naam || '?').charAt(0).toUpperCase();
    plek.appendChild(bol);
    plek.title = l.naam + ' is vandaag aan de beurt';
    rijKinderen.appendChild(plek);
  });
  if (!vol && !gereserveerd.length) rijKinderen.appendChild(el('div', 'leeg-plekje'));

  if (vol) {
    var label = el('div', 'vol-label' + (rij.length ? ' wacht-label' : ''),
                   rij.length ? rij.length + ' wacht' + (rij.length === 1 ? 't' : 'en') : 'Vol');
    rijKinderen.appendChild(label);
  } else if (gereserveerd.length) {
    rijKinderen.appendChild(el('div', 'vol-label beurt-label', 'aan de beurt'));
  }
  onder.appendChild(rijKinderen);
  kaart.appendChild(onder);

  kaart.addEventListener('click', function (e) {
    if (e.target.closest('.picto')) return;
    toonHoekDetail(hoek, index);
  });
  return kaart;
}

/* Eenvoudige lijntekeningen tot een groep zijn eigen hoekfoto's uploadt.
   Op naam herkend, met de blokken als terugval. */
var ICONEN = [
  { woorden:['bouw','blok','constructie'],
    pad:'<rect x="3" y="13" width="8" height="8" rx="1.5"></rect>' +
        '<rect x="13" y="13" width="8" height="8" rx="1.5"></rect>' +
        '<rect x="8" y="4" width="8" height="8" rx="1.5"></rect>' },
  { woorden:['huis','poppen','keuken'],
    pad:'<path d="M4 11 L12 4 L20 11 V20 H4 Z"></path><path d="M10 20 v-6 h4 v6"></path>' },
  { woorden:['zand','water','tafel met zand'],
    pad:'<path d="M3 15 c3 -2 5 2 9 0 c3 -1.5 6 1 9 -0.5"></path>' +
        '<path d="M8 15 V9 h8 v6"></path><path d="M6 20 h12"></path>' },
  { woorden:['knutsel','verf','schilder','teken','creatief','plak'],
    pad:'<circle cx="6.5" cy="17.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>' +
        '<path d="M8.3 15.7 L18 4"></path><path d="M15.7 15.7 L6 4"></path>' },
  { woorden:['werk','taak','opdracht'],
    pad:'<path d="M3 9 h18"></path><path d="M5 9 v11"></path><path d="M19 9 v11"></path>' +
        '<path d="M14.5 4 l4 3 -8 2.5"></path>' },
  { woorden:['lees','boek','verhaal','luister'],
    pad:'<path d="M12 7 C10 5 7 4.5 4 5 v12 c3 -.5 6 0 8 2"></path>' +
        '<path d="M12 7 C14 5 17 4.5 20 5 v12 c-3 -.5 -6 0 -8 2"></path>' },
  { woorden:['puzzel','spel','gezelschap'],
    pad:'<path d="M4 4 h6 a2 2 0 0 1 4 0 h6 v6 a2 2 0 0 0 0 4 v6 h-6 a2 2 0 0 0 -4 0 H4 v-6 ' +
        'a2 2 0 0 0 0 -4 Z"></path>' },
  { woorden:['muziek','dans','zing'],
    pad:'<path d="M9 18 V6 l10 -2 v12"></path><circle cx="6.5" cy="18" r="2.5"></circle>' +
        '<circle cx="16.5" cy="16" r="2.5"></circle>' },
];

function icoonPad(naam){
  var n = (naam || '').toLowerCase();
  for (var i = 0; i < ICONEN.length; i++) {
    for (var j = 0; j < ICONEN[i].woorden.length; j++) {
      if (n.indexOf(ICONEN[i].woorden[j]) >= 0) return ICONEN[i].pad;
    }
  }
  return ICONEN[0].pad;
}

function hoekIcoon(kleur, naam, maat){
  var d = el('div');
  d.innerHTML =
    '<svg width="' + (maat || 60) + '" height="' + (maat || 60) + '" viewBox="0 0 24 24" fill="none" stroke="' +
    kleur + '" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' +
    icoonPad(naam) + '</svg>';
  return d;
}

function tekenStrook(k, b){
  var strook = $('strook');
  strook.innerHTML = '';
  var vrij = (k.leerlingen || []).filter(function (l) {
    return l.lid !== false && !KB.plaatsingVan(l.id, b);
  });
  $('strook-kop').textContent = vrij.length ? 'Nog kiezen · ' + vrij.length : 'Iedereen heeft gekozen';
  vrij.forEach(function (l) {
    var picto = maakPicto(l, {});
    maakSleepbaar(picto, l, null);
    strook.appendChild(picto);
  });
}

/* ── slepen ──────────────────────────────────────────────────
   Op een digibord staan vaak meerdere kinderen tegelijk te slepen.
   Elke aanraking krijgt daarom zijn eigen sleep, herkenbaar aan het
   pointerId. De luisteraars staan op het document en filteren op dat
   id, zodat een sleep blijft werken ook als het bord ondertussen
   opnieuw wordt getekend doordat een ander kind zijn keuze maakt. */
var lopendeSlepen = 0;
var slependeKinderen = {};      // leerlingId -> true, om dubbel pakken te weren
window.KB_SLEEP_STATUS = function () {
  return { lopend: lopendeSlepen, kinderen: Object.keys(slependeKinderen) };
};

function maakSleepbaar(picto, leerling, vanHoekId){
  picto.addEventListener('pointerdown', function (start) {
    if (start.button != null && start.button !== 0) return;
    // Twee vingers op hetzelfde kind is één sleep, geen twee.
    if (slependeKinderen[leerling.id]) return;

    // Zit dit kind nog vast, dan mag het niet weg.
    if (vanHoekId) {
      var b = KB.bord(), plaatsing = (b.plaatsingen[vanHoekId] || []).filter(function (p) {
        return p.leerlingId === leerling.id;
      })[0];
      var hoek = KB.hoekVan(vanHoekId);
      if (plaatsing) {
        var rest = KB.vergrendeldTot(plaatsing, hoek);
        if (rest > 0) { toonNogEven(leerling, hoek, rest); return; }
      }
    }

    start.preventDefault();
    var pid = start.pointerId;
    lopendeSlepen++;
    slependeKinderen[leerling.id] = true;

    // Alleen de bol meenemen, niet de naam eronder: dat leest als een
    // kaartje dat je optilt in plaats van als een stukje tekst.
    var bron = picto.querySelector('.picto-rond');
    var maat = bron ? bron.getBoundingClientRect().width : 60;
    var geest = document.createElement('div');
    geest.className = 'sleep-geest';
    var bol = bron.cloneNode(true);
    var ring = bol.querySelector('.ring');
    if (ring) ring.remove();                 // de timer hoort bij de hoek, niet bij je hand
    bol.style.width = bol.style.height = maat + 'px';
    geest.appendChild(bol);
    geest.style.left = start.clientX + 'px';
    geest.style.top  = start.clientY + 'px';
    document.body.appendChild(geest);
    // eerst op ware grootte tekenen, dan optillen — anders slaat de
    // browser de overgang over
    requestAnimationFrame(function () { geest.classList.add('opgetild'); });
    picto.classList.add('sleept');

    var laatsteDoel = null;
    function beweeg(e){
      if (e.pointerId !== pid) return;
      geest.style.left = e.clientX + 'px';
      geest.style.top  = e.clientY + 'px';
      geest.style.display = 'none';
      var onder = document.elementFromPoint(e.clientX, e.clientY);
      geest.style.display = '';
      var kaart = onder && onder.closest ? onder.closest('.hoek') : null;
      if (kaart !== laatsteDoel) {
        if (laatsteDoel) laatsteDoel.classList.remove('doelwit');
        if (kaart) kaart.classList.add('doelwit');
        laatsteDoel = kaart;
      }
    }
    function los(e){
      if (e.pointerId !== pid) return;
      document.removeEventListener('pointermove', beweeg);
      document.removeEventListener('pointerup', los);
      document.removeEventListener('pointercancel', los);
      lopendeSlepen = Math.max(0, lopendeSlepen - 1);
      delete slependeKinderen[leerling.id];
      picto.classList.remove('sleept');
      if (laatsteDoel) laatsteDoel.classList.remove('doelwit');

      var onder = document.elementFromPoint(e.clientX, e.clientY);
      var kaart = onder && onder.closest ? onder.closest('.hoek') : null;

      if (kaart) {
        // even naar het midden van de hoek toe zakken voordat het bord
        // opnieuw tekent: dat leest als "hij is er"
        var doos = kaart.getBoundingClientRect();
        geest.classList.remove('opgetild');
        geest.classList.add('landt');
        geest.style.left = (doos.left + doos.width / 2) + 'px';
        geest.style.top  = (doos.top + doos.height / 2) + 'px';
        setTimeout(function () {
          geest.remove();
          leg(leerling, kaart.dataset.hoekId);
        }, 170);
      } else {
        geest.classList.add('valt-terug');
        setTimeout(function () { geest.remove(); tekenBord(); }, 150);
      }
    }
    document.addEventListener('pointermove', beweeg);
    document.addEventListener('pointerup', los);
    document.addEventListener('pointercancel', los);
  });
}

function leg(leerling, hoekId){
  var k = KB.klas(), b = KB.bord(k);
  var hoek = KB.hoekVan(hoekId, k);

  // Staat er vandaag een groepje ingepland in de werkplaats, dan zijn de
  // plekken van hen. Een ander kind mag alleen bij wat overblijft.
  if (hoek && hoek.werkplaats && KB.instelling('werkplaatsAan', k)) {
    var gereserveerd = gereserveerdVoor(hoek, k, b);
    var isAanDeBeurt = KB.heeftBeurtVandaag(leerling.id, k);
    var bezet = KB.bezetting(hoek.id, b).length;
    if (!isAanDeBeurt && bezet + gereserveerd.length >= hoek.maxKinderen) {
      toonBeurtUitleg(leerling, hoek, gereserveerd, k);
      return;
    }
  }

  var uitkomst = KB.plaats(leerling.id, hoekId);
  if (uitkomst.ok) {
    tekenBord();
    meld(leerling.naam + ' → ' + uitkomst.hoek.naam);
    return;
  }
  if (uitkomst.reden === 'vol') {
    if (KB.instelling('wachtrijAan')) toonWachtrij(leerling, uitkomst.hoek);
    else meld(uitkomst.hoek.naam + ' is vol');
    tekenBord();
    return;
  }
  if (uitkomst.reden === 'vergrendeld') {
    var h = KB.hoekVan(KB.plaatsingVan(leerling.id).hoekId);
    toonNogEven(leerling, h, uitkomst.restMs);
    return;
  }
  tekenBord();
}

/* ── "nog even" ──────────────────────────────────────────── */
function minutenTekst(ms){
  var m = Math.ceil(ms / 60000);
  return m <= 1 ? 'nog even' : 'nog ' + m + ' minuten';
}
function toonNogEven(leerling, hoek, restMs){
  toonBlad(function (blad) {
    var kop = el('div', 'detail-kop');
    var plaatsing = (KB.bord().plaatsingen[hoek.id] || []).filter(function (p) {
      return p.leerlingId === leerling.id;
    })[0] || { startTijd: Date.now() };
    var picto = maakPicto(leerling, { plaatsing: plaatsing, hoek: hoek, zonderNaam: true });
    picto.querySelector('.picto-rond').style.width = '84px';
    picto.querySelector('.picto-rond').style.height = '84px';
    picto.querySelector('.picto-rond').style.fontSize = '2rem';
    kop.appendChild(picto);
    var tekst = el('div');
    tekst.appendChild(el('div', null, leerling.naam)).style.cssText =
      'font-size:1.5rem;font-weight:600;letter-spacing:-.02em;margin-bottom:4px';
    tekst.appendChild(el('div', null, 'Je speelt in de ' + hoek.naam.toLowerCase() + '.')).style.cssText =
      'font-size:1.05rem;color:var(--inkt-2)';
    kop.appendChild(tekst);
    blad.appendChild(kop);

    var uitleg = el('div');
    uitleg.style.cssText = 'font-size:1.15rem;color:var(--inkt);line-height:1.5;margin-bottom:24px';
    uitleg.textContent = 'Als het rondje vol is, mag je naar een andere hoek. Dat duurt ' +
                         minutenTekst(restMs) + '.';
    blad.appendChild(uitleg);

    var knop = el('button', 'knop knop-primair knop-groot', 'Oké');
    knop.addEventListener('click', sluitBlad);
    blad.appendChild(knop);
  });
}

function toonBeurtUitleg(leerling, hoek, gereserveerd, k){
  toonBlad(function (blad) {
    blad.style.textAlign = 'center';
    var titel = el('div', null, 'De werkplaats is vandaag bezet');
    titel.style.cssText = 'font-size:1.5rem;font-weight:600;letter-spacing:-.02em;margin-bottom:10px';
    blad.appendChild(titel);
    var namen = gereserveerd.map(function (id) {
      var l = KB.leerling(id, k); return l ? l.naam : null;
    }).filter(Boolean);
    var sub = el('div', null, namen.length
      ? 'Vandaag zijn ' + namen.join(', ') + ' aan de beurt. Jij komt op een andere dag.'
      : 'Vandaag is er geen plek meer. Je komt op een andere dag aan de beurt.');
    sub.style.cssText = 'font-size:1.05rem;color:var(--inkt-2);line-height:1.5;max-width:34ch;margin:0 auto 24px';
    blad.appendChild(sub);
    var k2 = el('button', 'knop knop-primair knop-groot', 'Andere hoek kiezen');
    k2.addEventListener('click', function () { sluitBlad(); tekenBord(); });
    blad.appendChild(k2);
  });
}

/* ── wachtrij ────────────────────────────────────────────── */
function toonWachtrij(leerling, hoek){
  toonBlad(function (blad) {
    blad.style.textAlign = 'center';

    var icoon = el('div');
    icoon.style.cssText = 'width:92px;height:92px;border-radius:30px;background:var(--vlak-2);' +
                          'display:flex;align-items:center;justify-content:center;margin:0 auto 22px';
    icoon.appendChild(hoekIcoon('#3b6ff0', hoek.naam, 50));
    blad.appendChild(icoon);

    var titel = el('div', null, 'De ' + hoek.naam.toLowerCase() + ' is even vol');
    titel.style.cssText = 'font-size:1.6rem;font-weight:600;letter-spacing:-.02em;margin-bottom:8px';
    blad.appendChild(titel);

    var sub = el('div', null, 'Wil je wachten tot er een plekje vrijkomt?');
    sub.style.cssText = 'font-size:1.05rem;color:var(--inkt-2);margin-bottom:8px';
    blad.appendChild(sub);

    var knoppen = el('div');
    knoppen.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:26px;flex-wrap:wrap';

    var jaWachten = el('button', 'knop knop-primair knop-groot', 'Ik wacht');
    jaWachten.addEventListener('click', function () {
      var plek = KB.inWachtrij(leerling.id, hoek.id);
      sluitBlad(); tekenBord();
      toonPlekInRij(leerling, hoek, plek);
    });
    var anders = el('button', 'knop knop-stil knop-groot', 'Andere hoek kiezen');
    anders.addEventListener('click', function () { sluitBlad(); tekenBord(); });

    knoppen.appendChild(jaWachten);
    knoppen.appendChild(anders);
    blad.appendChild(knoppen);
  });
}

function toonPlekInRij(leerling, hoek, plek){
  toonBlad(function (blad) {
    blad.style.textAlign = 'center';
    var titel = el('div', null, 'Je staat in de rij');
    titel.style.cssText = 'font-size:1.6rem;font-weight:600;letter-spacing:-.02em;margin-bottom:6px';
    blad.appendChild(titel);
    var sub = el('div', null, 'Komt er een plekje vrij in de ' + hoek.naam.toLowerCase() +
                              ', dan ben jij aan de beurt.');
    sub.style.cssText = 'font-size:1.05rem;color:var(--inkt-2)';
    blad.appendChild(sub);

    var k = KB.klas();
    var rij = KB.wachtrijVoor(hoek.id, k);
    var strip = el('div', 'rij-wacht');
    rij.forEach(function (w, i) {
      var l = KB.leerling(w.leerlingId, k);
      if (!l) return;
      var ikzelf = l.id === leerling.id;
      var plekje = el('div', 'rij-plek' + (ikzelf ? ' ikzelf' : ''));
      plekje.appendChild(el('div', 'rij-nummer', String(i + 1)));
      var picto = maakPicto(l, { zonderNaam: true });
      if (ikzelf) {
        var houder = el('div', 'rij-ring');
        houder.appendChild(picto);
        plekje.appendChild(houder);
      } else {
        plekje.appendChild(picto);
      }
      plekje.appendChild(el('div', 'picto-naam', l.naam));
      if (ikzelf) {
        var jij = el('div', null, 'Dat ben jij');
        jij.style.cssText = 'font-size:.85rem;color:var(--accent);font-weight:600';
        plekje.appendChild(jij);
      }
      strip.appendChild(plekje);
    });
    blad.appendChild(strip);

    var knop = el('button', 'knop knop-primair knop-groot', 'Oké');
    knop.addEventListener('click', sluitBlad);
    blad.appendChild(knop);
  });
}

/* ── hoekdetail ──────────────────────────────────────────── */
function toonHoekDetail(hoek, index){
  toonBlad(function (blad) {
    var k = KB.klas(), b = KB.bord(k), tint = tintVan(index);
    var kinderen = KB.bezetting(hoek.id, b);

    var kop = el('div', 'detail-kop');
    var icoon = el('div', 'detail-icoon');
    var f = KB.foto(hoek.fotoId, k);
    if (f) icoon.style.backgroundImage = 'url(' + f + ')';
    else { icoon.style.background = tint.tint; icoon.appendChild(hoekIcoon(tint.kleur, hoek.naam, 34)); }
    kop.appendChild(icoon);

    var tekst = el('div');
    var naam = el('div', null, hoek.naam);
    naam.style.cssText = 'font-size:1.6rem;font-weight:600;letter-spacing:-.02em';
    var sub = el('div', null, kinderen.length + ' van de ' + hoek.maxKinderen + ' plekken bezet');
    sub.style.cssText = 'font-size:1rem;color:var(--inkt-3)';
    tekst.appendChild(naam); tekst.appendChild(sub);
    kop.appendChild(tekst);
    blad.appendChild(kop);

    var plekken = el('div', 'detail-plekken');
    kinderen.forEach(function (p) {
      var l = KB.leerling(p.leerlingId, k);
      if (!l) return;
      var vak = el('div', 'detail-plek');
      vak.appendChild(maakPicto(l, { plaatsing: p, hoek: hoek, zonderNaam: true }));
      vak.appendChild(el('div', 'picto-naam', l.naam));
      var rest = KB.vergrendeldTot(p, hoek);
      var stand = el('div', 'detail-stand' + (rest === 0 ? ' vrij' : ''));
      if (!KB.instelling('timerAan'))  stand.textContent = 'Speelt hier';
      else if (rest === 0)             stand.textContent = 'Mag wisselen';
      else                             stand.textContent = minutenTekst(rest);
      vak.appendChild(stand);
      plekken.appendChild(vak);
    });
    for (var i = kinderen.length; i < hoek.maxKinderen; i++) {
      var leeg = el('div', 'detail-plek');
      var cirkel = el('div', 'detail-leeg');
      cirkel.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" ' +
        'stroke="rgba(20,28,44,.22)" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M12 5 v14"></path><path d="M5 12 h14"></path></svg>';
      leeg.appendChild(cirkel);
      leeg.appendChild(el('div', 'picto-naam', 'Vrij'));
      plekken.appendChild(leeg);
    }
    blad.appendChild(plekken);

    var rij = KB.wachtrijVoor(hoek.id, k);
    if (rij.length) {
      var wacht = el('div');
      wacht.style.cssText = 'margin-top:24px;padding-top:18px;border-top:1px solid var(--lijn);' +
                            'font-size:.95rem;color:var(--inkt-2)';
      wacht.textContent = 'In de rij: ' + rij.map(function (w) {
        var l = KB.leerling(w.leerlingId, k); return l ? l.naam : '?';
      }).join(', ');
      blad.appendChild(wacht);
    }

    var knop = el('button', 'knop knop-stil knop-groot', 'Sluiten');
    knop.style.marginTop = '26px';
    knop.addEventListener('click', sluitBlad);
    blad.appendChild(knop);
  });
}

/* ── menu ────────────────────────────────────────────────── */
$('knop-menu').addEventListener('click', function () {
  toonBlad(function (blad) {
    var titel = el('div', null, 'Bord');
    titel.style.cssText = 'font-size:1.4rem;font-weight:600;letter-spacing:-.02em;margin-bottom:20px';
    blad.appendChild(titel);

    var lijst = el('div');
    lijst.style.cssText = 'display:flex;flex-direction:column;gap:10px';

    [['Andere groep', function () {
        KB.zetBeheerKlas(null);
        sluitBlad(); toonKlassen();
      }],
     ['Bord leegmaken', function () {
        var b = KB.bord(), k = KB.klas();
        Object.keys(b.plaatsingen).forEach(function (h) { b.plaatsingen[h] = []; });
        k.wachtrij = [];
        KB.bewaar(); sluitBlad(); tekenBord(); meld('Bord leeggemaakt');
      }],
     ['Volledig scherm', function () {
        sluitBlad();
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen) { document.exitFullscreen().catch(function () {}); }
      }]
    ].forEach(function (paar) {
      var knop = el('button', 'knop knop-stil', paar[0]);
      knop.addEventListener('click', paar[1]);
      lijst.appendChild(knop);
    });

    var beheer = el('a', 'knop knop-primair', 'Naar beheer');
    beheer.href = 'beheer.html';
    lijst.appendChild(beheer);
    blad.appendChild(lijst);
  });
});

/* ── klok en timers ──────────────────────────────────────── */
function tik(){
  var nu = new Date();
  var datum = DAGEN[nu.getDay()] + ' ' + nu.getDate() + ' ' + MAANDEN[nu.getMonth()];
  var tijd  = String(nu.getHours()).padStart(2, '0') + ':' + String(nu.getMinutes()).padStart(2, '0');
  if ($('bord-datum')) $('bord-datum').textContent = datum;
  if ($('bord-klok'))  $('bord-klok').textContent  = tijd;
  if ($('klas-datum')) $('klas-datum').textContent = datum + ' · ' + tijd;
}

/* Elke seconde de ringen bijwerken zonder het hele bord opnieuw te tekenen:
   anders knippert het scherm en verlies je een sleep die bezig is. */
function ververTimers(){
  if (scherm !== 'bord') return;
  var k = KB.klas(), b = KB.bord(k);
  var vrijgekomen = [];
  document.querySelectorAll('.hoek').forEach(function (kaart) {
    var hoek = KB.hoekVan(kaart.dataset.hoekId, k);
    if (!hoek) return;
    kaart.querySelectorAll('.picto').forEach(function (picto) {
      var p = (b.plaatsingen[hoek.id] || []).filter(function (x) {
        return x.leerlingId === picto.dataset.leerlingId;
      })[0];
      if (!p) return;
      var boog = picto.querySelector('.voortgang');
      if (!boog) return;
      var straal = 46, omtrek = 2 * Math.PI * straal;
      var deel = KB.timerDeel(p, hoek);
      boog.setAttribute('stroke-linecap', deel < 0.02 ? 'butt' : 'round');
      boog.setAttribute('stroke-dasharray',
        (omtrek * deel).toFixed(1) + ' ' + omtrek.toFixed(1));
      var wasVast = picto.classList.contains('op-slot');
      if (wasVast && KB.vergrendeldTot(p, hoek) === 0) {
        picto.classList.remove('op-slot');
        picto.classList.add('vrij');
        var l = KB.leerling(p.leerlingId, k);
        if (l) vrijgekomen.push(l.naam);
      }
    });
  });
  if (vrijgekomen.length) meld(vrijgekomen.join(' en ') + ' mag wisselen');
}

/* ── opstarten ───────────────────────────────────────────── */
KB.laad();
KB.doelenLaad();
KB.fkLees()
  .then(function (kluis) { if (kluis) { KB.fkPasToe(kluis); } })
  .catch(function () { /* zonder foto's werkt het bord gewoon */ })
  .then(function () {
    // Dit apparaat draait meestal altijd dezelfde groep. Is er ooit een
    // groep gekozen, dan gaan we daar direct heen — een digibord hoort na
    // een herstart gewoon weer het bord te tonen.
    var onthouden = KB.beheerKlasId();
    if (!onthouden) {
      // een apparaat dat nog op de oude manier was ingesteld
      try {
        var oud = localStorage.getItem(OUDE_SLEUTEL);
        if (oud && KB.G.klassen.some(function (k) { return k.id === oud; })) {
          KB.zetBeheerKlas(oud);
          localStorage.removeItem(OUDE_SLEUTEL);
          onthouden = oud;
        }
      } catch (e) {}
    }
    var bestaat = !!onthouden;
    if (bestaat) { KB.G.activeKlasId = onthouden; KB.bewaar(); }

    var k = KB.klas();
    // Nieuwe dag of nieuw dagdeel? Dan begint het bord blanco.
    if (KB.moetLegen(k)) {
      var opgeruimd = KB.leegBord(k);
      if (opgeruimd) setTimeout(function () {
        meld('Nieuwe start — iedereen mag opnieuw kiezen');
      }, 900);
    }
    if ((bestaat || KB.G.klassen.length === 1) && (k.hoekLib || []).length) toonBord();
    else toonKlassen();
    setInterval(tik, 1000);
    setInterval(ververTimers, 1000);
  });

})();
