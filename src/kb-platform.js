/* ══════════════════════════════════════════════════════════════
   PLATFORMBEHEER
   Scholen aanmaken, accounts regelen, en per school zien hoeveel
   er gebruikt wordt. Wat hier bewust NIET staat: kinderen, borden
   en statistieken. Die zijn van de school. Zie docs/ROLLEN.md.

   Dit scherm praat alleen met de server -- er is geen lokale kopie
   van iets, want er is niets om offline mee door te werken.
   ══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

function $(id){ return document.getElementById(id); }
function el(tag, klasse, tekst){
  var n = document.createElement(tag);
  if (klasse) n.className = klasse;
  if (tekst != null) n.textContent = tekst;
  return n;
}
function leeg(n){ while (n && n.firstChild) n.removeChild(n.firstChild); return n; }

var meldingTimer = null;
function meld(t){
  var m = $('melding'); m.textContent = t; m.classList.add('zichtbaar');
  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(function () { m.classList.remove('zichtbaar'); }, 3200);
}

function toonBlad(bouw){
  var blad = leeg($('blad'));
  bouw(blad);
  $('overlay').classList.add('open');
}
function sluitBlad(){ $('overlay').classList.remove('open'); }
$('overlay').addEventListener('click', function (e) { if (e.target.id === 'overlay') sluitBlad(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluitBlad(); });

function knop(tekst, soort, doen){
  var b = el('button', 'knop knop-' + (soort || 'stil') + ' knop-klein', tekst);
  b.addEventListener('click', doen);
  return b;
}
function kopregel(titel, onder, rechts){
  var kop = el('div', 'kopregel');
  var links = el('div');
  links.appendChild(el('div', 'titel', titel));
  if (onder) links.appendChild(el('div', 'ondertitel', onder));
  kop.appendChild(links);
  if (rechts) {
    var r = el('div', 'knoprij');
    [].concat(rechts).forEach(function (x) { r.appendChild(x); });
    kop.appendChild(r);
  }
  return kop;
}

function datum(t){
  if (!t) return '—';
  var d = new Date(t);
  return d.toLocaleDateString('nl-NL', { day:'numeric', month:'short' }) + ' ' +
         d.toLocaleTimeString('nl-NL', { hour:'2-digit', minute:'2-digit' });
}

/* ── wat we van de server halen ───────────────────────────────── */

var ONDERDELEN = [
  { id:'scholen', naam:'Scholen',
    icoon:'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5' },
  { id:'logboek', naam:'Logboek',
    icoon:'M4 5h16M4 12h16M4 19h10' }
];
var huidig = 'scholen';
var cijfers = [];
var deuren  = [];
var logboek = [];

function haalAlles(){
  return Promise.all([
    SB.roep('schoolcijfers', {}),
    SB.lees('ondersteuning', { kies:'*', volgorde:'tot.desc', hoeveel:50 }),
    SB.lees('handelingen',   { kies:'*', volgorde:'tijd.desc', hoeveel:40 })
  ]).then(function (uit) {
    cijfers = uit[0] || [];
    deuren  = uit[1] || [];
    logboek = uit[2] || [];
  });
}

function deurVan(schoolId){
  var nu = Date.now();
  for (var i = 0; i < deuren.length; i++) {
    var d = deuren[i];
    if (d.school_id !== schoolId || d.ingetrokken) continue;
    if (new Date(d.tot).getTime() > nu) return d;
  }
  return null;
}

/* ── het scherm ───────────────────────────────────────────────── */

function tekenMenu(){
  var vak = leeg($('zij-menu'));
  ONDERDELEN.forEach(function (o) {
    var b = el('button', 'zij-knop' + (o.id === huidig ? ' aan' : ''));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '17'); svg.setAttribute('height', '17');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    var pad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pad.setAttribute('d', o.icoon);
    svg.appendChild(pad);
    b.appendChild(svg);
    b.appendChild(el('span', null, o.naam));
    b.addEventListener('click', function () { huidig = o.id; tekenMenu(); teken(); });
    vak.appendChild(b);
  });
}

function teken(){
  var v = leeg($('inhoud'));
  if (huidig === 'logboek') return tekenLogboek(v);
  return tekenScholen(v);
}

function tekenScholen(v){
  v.appendChild(kopregel(
    'Scholen', cijfers.length === 1 ? 'Eén school' : cijfers.length + ' scholen',
    [knop('Voorbeeldschool', 'stil', toonVoorbeeld),
     knop('Nieuwe school', 'primair', toonNieuweSchool)]));

  if (!cijfers.length) {
    var leegvak = el('div', 'leegvak');
    leegvak.appendChild(el('p', 'hint',
      'Er staat nog geen school. Maak er een aan, of zet een voorbeeldschool ' +
      'met verzonnen kinderen neer om te laten zien hoe het werkt.'));
    v.appendChild(leegvak);
    return;
  }

  var rooster = el('div', 'scholen');
  cijfers.forEach(function (c) {
    var kaart = el('div', 'schoolkaart');
    kaart.appendChild(el('div', 'schoolnaam', c.naam));

    var deur = deurVan(c.school_id);
    if (deur) {
      kaart.appendChild(el('div', 'deur',
        'Deur open tot ' + datum(deur.tot) + (deur.reden ? ' — ' + deur.reden : '')));
    }

    var vak = el('div', 'cijfers');
    [[c.leerkrachten, 'leerkrachten'], [c.groepen, 'groepen'],
     [c.leerlingen, 'kinderen'], [c.hoeken, 'hoeken']].forEach(function (paar) {
      var k = el('div', 'cijfer');
      k.appendChild(el('b', null, String(paar[0])));
      k.appendChild(el('span', null, paar[1]));
      vak.appendChild(k);
    });
    kaart.appendChild(vak);

    kaart.appendChild(el('div', 'stil', c.laatst_gebruikt
      ? 'Laatst gebruikt ' + datum(c.laatst_gebruikt)
      : 'Nog niet gebruikt'));
    rooster.appendChild(kaart);
  });
  v.appendChild(rooster);

  var uitleg = el('div', 'paneel');
  uitleg.appendChild(el('div', 'paneelkop', 'Waarom hier geen kinderen staan'));
  uitleg.appendChild(el('p', 'hint',
    'Je ziet hier aantallen en verder niets. De kinderen, de borden en de ' +
    'statistieken zijn van de school, niet van wie de software levert. ' +
    'Moet je een school helpen, dan zet de schoolbeheerder de deur zelf ' +
    'open; dat loopt na een paar uur vanzelf af en komt in het logboek ' +
    'dat de school kan nakijken.'));
  v.appendChild(uitleg);
}

function tekenLogboek(v){
  v.appendChild(kopregel('Logboek', 'Wie heeft wat gedaan'));
  var p = el('div', 'paneel');
  if (!logboek.length) {
    p.appendChild(el('p', 'hint', 'Nog niets gebeurd.'));
  } else {
    logboek.forEach(function (r) {
      var rij = el('div', 'logrij');
      rij.appendChild(el('div', 'logwat', r.wat + (r.waarover ? ' — ' + r.waarover : '')));
      rij.appendChild(el('div', 'logtijd', datum(r.tijd)));
      p.appendChild(rij);
    });
  }
  v.appendChild(p);

  var uitleg = el('div', 'paneel');
  uitleg.appendChild(el('div', 'paneelkop', 'Alleen bijschrijven'));
  uitleg.appendChild(el('p', 'hint',
    'Deze regels zijn door niemand te wijzigen of te wissen, ook niet door ' +
    'jou. Dat is het punt: een logboek dat de beheerder kan bijwerken is ' +
    'geen logboek. Een school ziet hier haar eigen regels terug.'));
  v.appendChild(uitleg);
}

/* ── een school erbij ─────────────────────────────────────────── */

function toonNieuweSchool(){
  var concept = { naam:'', email:'' };
  toonBlad(function (blad) {
    var t = el('div', null, 'Nieuwe school');
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:8px';
    blad.appendChild(t);
    blad.appendChild(el('p', 'hint',
      'De school krijgt meteen een schoolbeheerder uitgenodigd. Zonder ' +
      'beheerder is het een school waar niemand bij kan.'));

    var r1 = el('div', 'veldrij');
    r1.appendChild(el('label', 'veldlabel', 'Naam van de school'));
    var naam = el('input', 'invoer');
    naam.type = 'text'; naam.placeholder = 'Kindcentrum De Regenboog';
    naam.value = concept.naam;
    naam.addEventListener('input', function () { concept.naam = naam.value; });
    r1.appendChild(naam);
    blad.appendChild(r1);

    var r2 = el('div', 'veldrij');
    r2.appendChild(el('label', 'veldlabel', 'E-mailadres van de schoolbeheerder'));
    var mail = el('input', 'invoer');
    mail.type = 'email'; mail.placeholder = 'ict@deregenboog.nl';
    mail.value = concept.email;
    mail.addEventListener('input', function () { concept.email = mail.value; });
    r2.appendChild(mail);
    blad.appendChild(r2);

    var rij = el('div', 'knoprij-onder');
    rij.appendChild(knop('Annuleren', 'stil', sluitBlad));
    rij.appendChild(knop('Aanmaken', 'primair', function () {
      var n = (concept.naam || '').trim();
      var e = (concept.email || '').trim();
      if (!n) { meld('Geef de school een naam'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { meld('Dat lijkt geen geldig e-mailadres'); return; }
      SB.roep('school_aanmaken', { schoolnaam: n, beheerder_email: e })
        .then(function (uit) {
          sluitBlad();
          return haalAlles().then(function () { teken(); toonCode(e, uit && uit.code); });
        }, function (err) { meld('Dat lukte niet: ' + (err && err.message)); });
    }));
    blad.appendChild(rij);
    setTimeout(function () { naam.focus(); }, 60);
  });
}

function toonCode(email, code){
  toonBlad(function (blad) {
    var t = el('div', null, 'De school staat klaar');
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:8px';
    blad.appendChild(t);
    blad.appendChild(el('p', 'hint',
      'Geef deze code door aan ' + email + '. Daarmee komt dat account als ' +
      'schoolbeheerder binnen. De code vervalt na drie weken.'));
    var vak = el('div', 'codevak');
    vak.appendChild(el('div', 'codetekst', code || '—'));
    blad.appendChild(vak);
    var rij = el('div', 'knoprij-onder');
    rij.appendChild(knop('Klaar', 'primair', sluitBlad));
    blad.appendChild(rij);
  });
}

function toonVoorbeeld(){
  toonBlad(function (blad) {
    var t = el('div', null, 'Voorbeeldschool');
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:8px';
    blad.appendChild(t);
    blad.appendChild(el('p', 'hint',
      'Een hele school om te laten zien: drie groepen, vijf hoeken per ' +
      'groep en vijf verzonnen kinderen. Geen echte namen, dus je kunt hem ' +
      'aan iedereen laten zien.'));

    var r = el('div', 'veldrij');
    r.appendChild(el('label', 'veldlabel', 'Naam'));
    var naam = el('input', 'invoer');
    naam.type = 'text'; naam.value = 'Voorbeeldschool';
    r.appendChild(naam);
    blad.appendChild(r);

    var rij = el('div', 'knoprij-onder');
    rij.appendChild(knop('Annuleren', 'stil', sluitBlad));
    rij.appendChild(knop('Aanmaken', 'primair', function () {
      SB.roep('voorbeeldschool_aanmaken', { schoolnaam: (naam.value || 'Voorbeeldschool').trim() })
        .then(function () {
          sluitBlad();
          return haalAlles().then(function () { teken(); meld('De voorbeeldschool staat klaar'); });
        }, function (err) { meld('Dat lukte niet: ' + (err && err.message)); });
    }));
    blad.appendChild(rij);
    setTimeout(function () { naam.focus(); naam.select(); }, 60);
  });
}

/* ── opstarten ────────────────────────────────────────────────── */

$('afmelden').addEventListener('click', function (e) {
  e.preventDefault();
  SB.afmelden().then(function () { location.href = 'inloggen.html'; },
                     function () { location.href = 'inloggen.html'; });
});

tekenMenu();
SB.wieBenIk().then(function (ik) {
  /* Dit scherm is van de platformbeheerder. Wie hier anders komt sturen
     we weg -- niet omdat het scherm gevaarlijk is (de database laat hem
     toch niets zien), maar omdat een leeg scherm vol uitleg over rechten
     die je niet hebt alleen maar verwarrend is. */
  if (!ik || !ik.profiel || ik.profiel.rol !== 'platformbeheerder') {
    location.href = ik && ik.profiel && ik.profiel.school_id ? 'school.html' : 'inloggen.html';
    return null;
  }
  return haalAlles().then(teken);
}).catch(function (e) {
  var v = leeg($('inhoud'));
  v.appendChild(kopregel('Geen verbinding', 'Dit scherm werkt alleen online'));
  v.appendChild(el('p', 'hint', (e && e.message) || 'Probeer het zo nog eens.'));
});

})();
