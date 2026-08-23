/* ══════════════════════════════════════════════════════════════
   DE BEHEEROMGEVING
   Alles wat je als leerkracht regelt. Staat los van het bord:
   een kind kan hier niet per ongeluk terechtkomen, en het bord
   hoeft deze code niet mee te sleuren.
   ══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
function el(tag, klasse, tekst){
  var n = document.createElement(tag);
  if (klasse) n.className = klasse;
  if (tekst != null) n.textContent = tekst;
  return n;
}
function leeg(n){ while (n.firstChild) n.removeChild(n.firstChild); return n; }

var meldingTimer = null;
function meld(t){
  var m = $('melding'); m.textContent = t; m.classList.add('zichtbaar');
  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(function () { m.classList.remove('zichtbaar'); }, 2600);
}
function bewaarOfKlaag(){
  if (!KB.bewaar()) meld('De opslag van deze browser zit vol');
}

/* ── overlay ─────────────────────────────────────────────── */
function toonBlad(bouw){
  var blad = leeg($('blad'));
  bouw(blad);
  $('overlay').classList.add('open');
}
function sluitBlad(){ $('overlay').classList.remove('open'); }
$('overlay').addEventListener('click', function (e) { if (e.target.id === 'overlay') sluitBlad(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluitBlad(); });

function vraagBevestiging(titel, uitleg, knoptekst, doen){
  toonBlad(function (blad) {
    var t = el('div', null, titel);
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:8px';
    blad.appendChild(t);
    blad.appendChild(el('p', 'hint', uitleg)).style.marginBottom = '22px';
    var rij = el('div');
    rij.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
    var annuleer = el('button', 'knop knop-stil', 'Annuleren');
    annuleer.addEventListener('click', sluitBlad);
    var door = el('button', 'knop knop-gevaar', knoptekst);
    door.addEventListener('click', function () { sluitBlad(); doen(); });
    rij.appendChild(annuleer); rij.appendChild(door);
    blad.appendChild(rij);
  });
}

/* ── bouwstenen ──────────────────────────────────────────── */
function paneel(kop){
  var p = el('div', 'paneel');
  if (kop) p.appendChild(el('div', 'paneelkop', kop));
  return p;
}
function schakelaar(aan, bijWissel){
  var s = el('div', 'schakel' + (aan ? ' aan' : ''));
  s.setAttribute('role', 'switch');
  s.setAttribute('tabindex', '0');
  s.setAttribute('aria-checked', aan ? 'true' : 'false');
  s.appendChild(el('div', 'knopje'));
  function wissel(){
    var nieuw = !s.classList.contains('aan');
    s.classList.toggle('aan', nieuw);
    s.setAttribute('aria-checked', nieuw ? 'true' : 'false');
    bijWissel(nieuw);
  }
  s.addEventListener('click', wissel);
  s.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); wissel(); }
  });
  return s;
}
function teller(waarde, min, max, bijWijziging){
  var t = el('div', 'teller');
  var minKnop = el('button', null, '−');
  var weergave = el('div', 'w', String(waarde));
  var plusKnop = el('button', null, '+');
  function zet(n){
    n = Math.max(min, Math.min(max, n));
    weergave.textContent = String(n);
    bijWijziging(n);
  }
  minKnop.addEventListener('click', function () { zet(parseInt(weergave.textContent, 10) - 1); });
  plusKnop.addEventListener('click', function () { zet(parseInt(weergave.textContent, 10) + 1); });
  t.appendChild(minKnop); t.appendChild(weergave); t.appendChild(plusKnop);
  return t;
}
function pictoVan(l, maat){
  var wrap = el('div', 'picto');
  var rond = el('div', 'picto-rond');
  rond.style.width = rond.style.height = (maat || 54) + 'px';
  rond.style.fontSize = ((maat || 54) * 0.42) + 'px';
  rond.style.background = l.kleur || '#3b6ff0';
  if (l.image) rond.style.backgroundImage = 'url(' + l.image + ')';
  else rond.textContent = (l.naam || '?').charAt(0).toUpperCase();
  wrap.appendChild(rond);
  return wrap;
}

/* ── menu ────────────────────────────────────────────────── */
var ONDERDELEN = [
  { id:'vandaag',    naam:'Vandaag',    icoon:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"></rect><path d="M3.5 10 h17"></path><path d="M8 3.5 v3"></path><path d="M16 3.5 v3"></path>' },
  { id:'groep',      naam:'Groep',      icoon:'<circle cx="9" cy="9" r="3.2"></circle><path d="M3.5 19 c0-3 2.5-4.6 5.5-4.6 s5.5 1.6 5.5 4.6"></path><path d="M16 7.2 a3 3 0 0 1 0 5.6"></path>' },
  { id:'leerlingen', naam:'Leerlingen', icoon:'<circle cx="12" cy="8" r="3.4"></circle><path d="M5 19.5 c0-3.6 3.1-5.6 7-5.6 s7 2 7 5.6"></path>' },
  { id:'hoeken',     naam:'Hoeken',     icoon:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"></rect>' },
  { id:'doelen',     naam:'Doelen',     icoon:'<circle cx="12" cy="12" r="8.2"></circle><circle cx="12" cy="12" r="4.4"></circle>' },
  { id:'fotos',      naam:"Foto's",     icoon:'<rect x="3" y="6" width="18" height="14" rx="2.4"></rect><circle cx="12" cy="13" r="3.4"></circle><path d="M8 6 l1.5-2.5 h5 L16 6"></path>' },
  { id:'functies',   naam:'Functies',   icoon:'<path d="M4 7.5 h9"></path><path d="M17 7.5 h3"></path><circle cx="15" cy="7.5" r="2.2"></circle><path d="M4 16.5 h3"></path><path d="M11 16.5 h9"></path><circle cx="9" cy="16.5" r="2.2"></circle>' }
];
var huidig = 'vandaag';

function tekenMenu(){
  var menu = leeg($('zij-menu'));
  ONDERDELEN.forEach(function (o) {
    var knop = el('button', 'zij-knop' + (o.id === huidig ? ' aan' : ''));
    knop.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + o.icoon + '</svg>';
    knop.appendChild(el('span', null, o.naam));
    knop.addEventListener('click', function () { ga(o.id); });
    menu.appendChild(knop);
  });
  $('zij-groep').textContent = KB.klas().naam;
}
function ga(id){
  huidig = id;
  try { location.hash = id; } catch (e) {}
  tekenMenu();
  teken();
}

function kopregel(titel, sub, actie){
  var k = el('div', 'kopregel');
  var links = el('div');
  links.appendChild(el('div', 'titel', titel));
  if (sub) links.appendChild(el('div', 'ondertitel', sub));
  k.appendChild(links);
  if (actie) k.appendChild(actie);
  return k;
}
function knop(tekst, soort, doen){
  var b = el('button', 'knop knop-' + (soort || 'stil') + ' knop-klein', tekst);
  b.addEventListener('click', doen);
  return b;
}

function teken(){
  var v = leeg($('inhoud'));
  ({ vandaag: tekenVandaag, groep: tekenGroep, leerlingen: tekenLeerlingen,
     hoeken: tekenHoeken, doelen: tekenDoelen, fotos: tekenFotos,
     functies: tekenFuncties }[huidig] || tekenVandaag)(v);
}

/* ── Vandaag ─────────────────────────────────────────────── */
function tekenVandaag(v){
  var k = KB.klas(), b = KB.bord(k);
  var hoeken = KB.bordHoeken(b, k);
  var gekozen = hoeken.reduce(function (n, h) { return n + KB.bezetting(h.id, b).length; }, 0);
  var totaal = (k.leerlingen || []).filter(function (l) { return l.lid !== false; }).length;

  v.appendChild(kopregel('Vandaag', k.naam,
    (function () {
      var a = el('a', 'knop knop-primair knop-klein', 'Bord openen');
      a.href = 'bord.html'; return a;
    })()));

  var rooster = el('div', 'rooster2');

  var links = paneel('Wie zit waar');
  if (!hoeken.length) {
    links.appendChild(el('p', 'hint', 'Deze groep heeft nog geen hoeken. Voeg ze toe bij Hoeken.'));
  } else {
    hoeken.forEach(function (h) {
      var kinderen = KB.bezetting(h.id, b);
      var rij = el('div', 'rij');
      var naam = el('div');
      naam.appendChild(el('div', 'rij-naam', h.naam));
      naam.appendChild(el('div', 'rij-sub', kinderen.length + ' van ' + h.maxKinderen));
      rij.appendChild(naam);
      var pictos = el('div');
      pictos.style.cssText = 'display:flex;gap:5px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end';
      kinderen.forEach(function (p) {
        var l = KB.leerling(p.leerlingId, k);
        if (l) { var pc = pictoVan(l, 28); pc.title = l.naam; pictos.appendChild(pc); }
      });
      rij.appendChild(pictos);
      links.appendChild(rij);
    });
  }
  rooster.appendChild(links);

  var rechts = el('div');
  var stand = paneel('Stand van zaken');
  [['Kinderen die gekozen hebben', gekozen + ' van ' + totaal],
   ['Hoeken op het bord', String(hoeken.length)],
   ['Kinderen in een wachtrij', String((k.wachtrij || []).length)],
   ['Doelen aangevinkt', String(Object.keys(k.doelActief || {}).length)]
  ].forEach(function (paar) {
    var rij = el('div', 'rij');
    rij.appendChild(el('div', 'rij-naam', paar[0])).style.fontWeight = '400';
    var w = el('div', 'rij-naam', paar[1]);
    w.style.marginLeft = 'auto';
    rij.appendChild(w);
    stand.appendChild(rij);
  });
  rechts.appendChild(stand);

  var rest = paneel('Nog in de oude beheeromgeving');
  rest.appendChild(el('p', 'hint',
    'Weekplanner, werkplaats, groepjes en statistieken zijn nog niet overgezet naar deze omgeving. ' +
    'Ze werken gewoon door in de oude app en verhuizen in een volgende stap.'));
  var link = el('a', 'knop knop-stil knop-klein', 'Oude beheeromgeving openen');
  link.href = 'index.html'; link.style.marginTop = '10px';
  rest.appendChild(link);
  rechts.appendChild(rest);

  rooster.appendChild(rechts);
  v.appendChild(rooster);
}

/* ── Groep ───────────────────────────────────────────────── */
function tekenGroep(v){
  var k = KB.klas();
  v.appendChild(kopregel('Groep', 'Welke groep je beheert en op welk niveau die werkt'));

  var kiezen = paneel('Groep kiezen');
  KB.G.klassen.forEach(function (g) {
    var rij = el('div', 'rij');
    var naam = el('div');
    naam.appendChild(el('div', 'rij-naam', g.naam + (g.id === k.id ? ' · actief' : '')));
    naam.appendChild(el('div', 'rij-sub', (g.leerlingen || []).length + ' kinderen · ' +
                                          (g.hoekLib || []).length + ' hoeken' +
                                          (g.voorbeeld ? ' · voorbeeldgroep' : '')));
    rij.appendChild(naam);
    var acties = el('div', 'rij-acties');
    if (g.id !== k.id) acties.appendChild(knop('Kies', 'stil', function () {
      KB.G.activeKlasId = g.id; bewaarOfKlaag(); tekenMenu(); teken();
    }));
    rij.appendChild(acties);
    kiezen.appendChild(rij);
  });
  v.appendChild(kiezen);

  var instellen = paneel('Deze groep');
  var naamVeld = el('div', 'veld');
  naamVeld.appendChild(el('label', null, 'Naam'));
  var invoer = el('input'); invoer.type = 'text'; invoer.value = k.naam;
  invoer.addEventListener('change', function () {
    k.naam = invoer.value.trim() || k.naam; bewaarOfKlaag(); tekenMenu(); meld('Naam opgeslagen');
  });
  naamVeld.appendChild(invoer);
  instellen.appendChild(naamVeld);

  var niveauVeld = el('div', 'veld');
  niveauVeld.appendChild(el('label', null, 'Beheersingsniveaus voor de doelen'));
  var chips = el('div', 'chips');
  ['0','1a','1b','1','2a','2b','2','3a','3b','3'].forEach(function (n) {
    var aan = KB.klasNiveaus(k).indexOf(n) >= 0;
    var c = el('button', 'chip' + (aan ? ' aan' : ''), n);
    c.addEventListener('click', function () {
      var huidige = KB.klasNiveaus(k).slice();
      var i = huidige.indexOf(n);
      if (i >= 0) huidige.splice(i, 1); else huidige.push(n);
      k.doelNiveaus = huidige;
      bewaarOfKlaag(); teken();
    });
    chips.appendChild(c);
  });
  niveauVeld.appendChild(chips);
  niveauVeld.appendChild(el('p', 'hint',
    'Groep 1 werkt meestal op 0, 1a, 1b en 1; groep 2 op 2a, 2b en 2. ' +
    'De halfjaarniveaus dragen spel, taal en rekenen, de hele-jaarniveaus motoriek en sociaal-emotioneel.'));
  instellen.appendChild(niveauVeld);
  v.appendChild(instellen);

  var proef = paneel('Uitproberen');
  proef.appendChild(el('p', 'hint',
    'Zes kleutergroepen met verzonnen kinderen, om de app mee te leren kennen.'));
  var rij2 = el('div');
  rij2.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
  rij2.appendChild(knop('Voorbeeldgroepen aanmaken', 'stil', maakVoorbeeldgroepen));
  if (KB.G.klassen.some(function (g) { return g.voorbeeld; })) {
    rij2.appendChild(knop('Voorbeeldgroepen verwijderen', 'gevaar', function () {
      vraagBevestiging('Voorbeeldgroepen verwijderen?',
        'Alleen de groepen met verzonnen kinderen verdwijnen. Je eigen groepen blijven staan.',
        'Verwijderen', function () {
          KB.G.klassen = KB.G.klassen.filter(function (g) { return !g.voorbeeld; });
          if (!KB.G.klassen.length) KB.G.klassen = [KB.leegKlas('Mijn groep')];
          if (!KB.G.klassen.some(function (g) { return g.id === KB.G.activeKlasId; })) {
            KB.G.activeKlasId = KB.G.klassen[0].id;
          }
          bewaarOfKlaag(); tekenMenu(); teken(); meld('Voorbeeldgroepen verwijderd');
        });
    }));
  }
  proef.appendChild(rij2);
  v.appendChild(proef);
}

var VOORBEELD = {
  '1A':['Bram','Isa','Kees','Yara','Otis','Loua','Sam','Fenne','Joep','Nora','Timo','Wies','Levi','Roos','Cas','Maud','Bas','Lotte','Sef','Fien'],
  '1B':['Mees','Sanne','Aiden','Vera','Job','Elin','Ties','Mila','Guus','Noor','Pim','Saar','Jesse','Anne','Ruben','Liv','Boaz','Tess','Hidde','Jill'],
  '1C':['Daan','Fleur','Milan','Nienke','Stijn','Evi','Luuk','Emma','Sven','Julia','Mats','Lieke','Thijs','Sofie','Jens','Hanne','Kars','Britt','Niek','Zoë'],
  '2A':['Finn','Nina','Lars','Amber','Teun','Merel','Jurre','Lynn','Koen','Iris','Siem','Puck','Wout','Nova','Gijs','Feline','Tim','Sara','Bo','Jade','Ravi','Nell'],
  '2B':['Noud','Marit','Ivan','Junia','Mason','Elif','Sepp','Fay','Yusuf','Isabel','Floris','Nienke','Arend','Lena','Bram','Amira','Tygo','Roos','Dex','Hala','Nout','Vera'],
  '2C':['Benjamin','Mia','Hugo','Abbey','Tomer','Nore','Abel','Hanami','Owen','Floor','Rida','Senne','Maeven','Lenn','Wess','Anna','Ben','Lorena','Max','Evan','Suze','Kaan']
};
var VOORBEELD_HOEKEN = [['Bouwhoek',4],['Huishoek',3],['Zandtafel',4],['Knutselhoek',4],['Werktafel',5],['Leeshoek',3]];

function maakVoorbeeldgroepen(){
  var gemaakt = 0;
  Object.keys(VOORBEELD).forEach(function (code) {
    var basis = 'Groep ' + code, naam = basis;
    var bestaat = function (n) { return KB.G.klassen.some(function (g) { return g.naam === n; }); };
    if (bestaat(basis)) {
      if (KB.G.klassen.some(function (g) { return g.naam === basis && g.voorbeeld; })) return;
      naam = basis + ' (voorbeeld)';
    }
    if (bestaat(naam)) return;

    var k = KB.leegKlas(naam);
    k.voorbeeld = true;
    k.doelNiveaus = KB.NIVEAUS_PER_GROEP[code.charAt(0)] || KB.NIVEAUS_PER_GROEP[2];
    k.hoekLib = VOORBEELD_HOEKEN.map(function (h, i) {
      return { id:'hl-' + code.toLowerCase() + '-' + i, naam:h[0], maxKinderen:h[1], fotoId:null };
    });
    var b = k.borden[0];
    b.hoekLibIds = k.hoekLib.map(function (h) { return h.id; });
    k.hoekLib.forEach(function (h) { b.plaatsingen[h.id] = []; });
    VOORBEELD[code].forEach(function (n, i) {
      k.leerlingen.push({ id:'ll-' + code.toLowerCase() + '-' + i, naam:n,
        kleur: KB.KIND_KLEUREN[i % KB.KIND_KLEUREN.length], image:null, lid:true });
    });
    KB.G.klassen.push(k);
    gemaakt++;
  });
  bewaarOfKlaag(); teken();
  meld(gemaakt ? gemaakt + ' voorbeeldgroepen aangemaakt' : 'Ze bestonden al');
}

/* ── Leerlingen ──────────────────────────────────────────── */
function tekenLeerlingen(v){
  var k = KB.klas();
  v.appendChild(kopregel('Leerlingen', (k.leerlingen || []).length + ' kinderen in ' + k.naam,
    knop('Kind toevoegen', 'primair', function () { bewerkLeerling(null); })));

  var p = paneel();
  if (!(k.leerlingen || []).length) {
    p.appendChild(el('p', 'hint', 'Nog geen kinderen. Voeg ze los toe, of zet er in één keer een lijst in.'));
  } else {
    var rooster = el('div', 'leerlingrooster');
    k.leerlingen.forEach(function (l) {
      var kaart = el('button', 'leerlingkaart');
      kaart.appendChild(pictoVan(l, 54));
      kaart.appendChild(el('div', 'picto-naam', l.naam));
      kaart.addEventListener('click', function () { bewerkLeerling(l); });
      rooster.appendChild(kaart);
    });
    p.appendChild(rooster);
  }
  v.appendChild(p);

  var invoer = paneel('In één keer toevoegen');
  invoer.appendChild(el('p', 'hint', 'Plak een lijst met namen, één per regel.'));
  var vak = el('textarea');
  vak.style.cssText = 'width:100%;min-height:110px;border:1.5px solid var(--lijn);border-radius:10px;' +
                      'padding:10px 12px;font-family:inherit;font-size:.9rem;margin:10px 0;resize:vertical';
  vak.placeholder = 'Benjamin\nMia\nHugo';
  invoer.appendChild(vak);
  invoer.appendChild(knop('Namen toevoegen', 'primair', function () {
    var namen = vak.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!namen.length) { meld('Geen namen gevonden'); return; }
    namen.forEach(function (n, i) {
      k.leerlingen.push({ id:'ll' + KB.uid(), naam:n,
        kleur: KB.KIND_KLEUREN[(k.leerlingen.length + i) % KB.KIND_KLEUREN.length],
        image:null, lid:true });
    });
    bewaarOfKlaag(); teken(); meld(namen.length + ' kinderen toegevoegd');
  }));
  v.appendChild(invoer);

  var pictos = paneel("Picto's in één keer koppelen");
  pictos.appendChild(el('p', 'hint',
    'Kies afbeeldingen die heten zoals de kinderen — Benjamin.jpg, Mia.png. ' +
    'Ze worden automatisch verkleind tot ongeveer 10 KB per stuk.'));
  var label = el('label', 'knop knop-stil knop-klein uploadvak');
  label.style.marginTop = '10px';
  label.appendChild(document.createTextNode('Afbeeldingen kiezen'));
  var invoerBestand = el('input'); invoerBestand.type = 'file';
  invoerBestand.accept = 'image/*'; invoerBestand.multiple = true; invoerBestand.style.display = 'none';
  invoerBestand.addEventListener('change', function () { koppelPictos(invoerBestand); });
  label.appendChild(invoerBestand);
  pictos.appendChild(label);
  v.appendChild(pictos);
}

function koppelPictos(invoer){
  var k = KB.klas();
  var bestanden = Array.prototype.slice.call(invoer.files);
  invoer.value = '';
  if (!bestanden.length) return;
  var gekoppeld = 0, onbekend = [], klaar = 0;
  meld('Bezig met ' + bestanden.length + ' afbeeldingen…');
  bestanden.forEach(function (f) {
    var basis = f.name.replace(/\.[^.]+$/, '').trim().toLowerCase();
    var kort = basis.split(/[_\-]/)[0].trim();
    KB.verklein(f, KB.FOTO_MAAT.leerling).then(function (data) {
      var l = k.leerlingen.filter(function (x) { return x.naam.trim().toLowerCase() === basis; })[0]
           || k.leerlingen.filter(function (x) { return x.naam.trim().toLowerCase() === kort; })[0];
      if (l) { l.image = data; l._c = false; gekoppeld++; }
      else onbekend.push(f.name);
    }).catch(function () { onbekend.push(f.name); })
      .then(function () {
        klaar++;
        if (klaar === bestanden.length) {
          bewaarOfKlaag(); teken();
          meld(gekoppeld + ' gekoppeld' + (onbekend.length ? ', ' + onbekend.length + ' niet herkend' : ''));
        }
      });
  });
}

function bewerkLeerling(l){
  var k = KB.klas(), nieuw = !l;
  var concept = { naam: l ? l.naam : '', kleur: l ? l.kleur : KB.KIND_KLEUREN[0], image: l ? l.image : null };

  toonBlad(function (blad) {
    var t = el('div', null, nieuw ? 'Kind toevoegen' : concept.naam);
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:18px';
    blad.appendChild(t);

    var voorbeeld = el('div');
    voorbeeld.style.cssText = 'display:flex;align-items:center;gap:16px;margin-bottom:18px';
    var toon = pictoVan({ naam: concept.naam || '?', kleur: concept.kleur, image: concept.image }, 64);
    voorbeeld.appendChild(toon);
    var fotoLabel = el('label', 'knop knop-stil knop-klein uploadvak', 'Foto kiezen');
    var fotoInvoer = el('input'); fotoInvoer.type = 'file'; fotoInvoer.accept = 'image/*';
    fotoInvoer.style.display = 'none';
    fotoInvoer.addEventListener('change', function () {
      var f = fotoInvoer.files && fotoInvoer.files[0];
      if (!f) return;
      KB.verklein(f, KB.FOTO_MAAT.leerling).then(function (d) {
        concept.image = d;
        var rond = toon.querySelector('.picto-rond');
        rond.style.backgroundImage = 'url(' + d + ')'; rond.textContent = '';
        meld('Foto klaar · ' + Math.round(d.length * 0.75 / 1024) + ' KB');
      }).catch(function () { meld('Die foto lukte niet'); });
    });
    fotoLabel.appendChild(fotoInvoer);
    voorbeeld.appendChild(fotoLabel);
    blad.appendChild(voorbeeld);

    var naamVeld = el('div', 'veld');
    naamVeld.appendChild(el('label', null, 'Naam'));
    var invoer = el('input'); invoer.type = 'text'; invoer.value = concept.naam;
    invoer.addEventListener('input', function () {
      concept.naam = invoer.value;
      var rond = toon.querySelector('.picto-rond');
      if (!concept.image) rond.textContent = (invoer.value || '?').charAt(0).toUpperCase();
    });
    naamVeld.appendChild(invoer);
    blad.appendChild(naamVeld);

    var kleurVeld = el('div', 'veld');
    kleurVeld.appendChild(el('label', null, 'Kleur'));
    var kleuren = el('div', 'chips');
    KB.KIND_KLEUREN.forEach(function (c) {
      var stip = el('button');
      stip.style.cssText = 'width:34px;height:34px;border-radius:50%;background:' + c +
        ';box-shadow:' + (c === concept.kleur ? '0 0 0 3px var(--vlak),0 0 0 5px ' + c : 'none');
      stip.addEventListener('click', function () {
        concept.kleur = c;
        var rond = toon.querySelector('.picto-rond');
        rond.style.background = c;
        if (concept.image) rond.style.backgroundImage = 'url(' + concept.image + ')';
        kleurVeld.replaceChild(kleurenOpnieuw(), kleuren);
      });
      kleuren.appendChild(stip);
    });
    function kleurenOpnieuw(){
      Array.prototype.forEach.call(kleuren.children, function (stip, i) {
        var c = KB.KIND_KLEUREN[i];
        stip.style.boxShadow = (c === concept.kleur) ? '0 0 0 3px var(--vlak),0 0 0 5px ' + c : 'none';
      });
      return kleuren;
    }
    kleurVeld.appendChild(kleuren);
    blad.appendChild(kleurVeld);

    var knoppen = el('div');
    knoppen.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:20px';
    knoppen.appendChild(knop('Opslaan', 'primair', function () {
      var naam = (concept.naam || '').trim();
      if (!naam) { meld('Vul een naam in'); return; }
      if (nieuw) {
        k.leerlingen.push({ id:'ll' + KB.uid(), naam:naam, kleur:concept.kleur, image:concept.image, lid:true });
      } else {
        l.naam = naam; l.kleur = concept.kleur;
        if (concept.image !== l.image) { l.image = concept.image; l._c = false; }
      }
      bewaarOfKlaag(); sluitBlad(); teken(); meld('Opgeslagen');
    }));
    knoppen.appendChild(knop('Annuleren', 'stil', sluitBlad));
    if (!nieuw) {
      knoppen.appendChild(knop('Verwijderen', 'gevaar', function () {
        sluitBlad();
        vraagBevestiging('Kind verwijderen?', l.naam + ' verdwijnt uit deze groep.', 'Verwijderen', function () {
          k.leerlingen = k.leerlingen.filter(function (x) { return x.id !== l.id; });
          bewaarOfKlaag(); teken(); meld('Verwijderd');
        });
      }));
    }
    blad.appendChild(knoppen);
  });
}

/* ── Hoeken ──────────────────────────────────────────────── */
function tekenHoeken(v){
  var k = KB.klas(), b = KB.bord(k);
  v.appendChild(kopregel('Hoeken', 'De plekken waaruit kinderen kiezen',
    knop('Hoek toevoegen', 'primair', function () { bewerkHoek(null); })));

  var p = paneel();
  if (!(k.hoekLib || []).length) {
    p.appendChild(el('p', 'hint', 'Nog geen hoeken.'));
  } else {
    k.hoekLib.forEach(function (h) {
      var opBord = (b.hoekLibIds || []).indexOf(h.id) >= 0;
      var rij = el('div', 'rij');
      var naam = el('div');
      naam.appendChild(el('div', 'rij-naam', h.naam));
      naam.appendChild(el('div', 'rij-sub', h.maxKinderen + ' plekken · ' +
        (h.timerMinuten ? h.timerMinuten + ' min' : 'timer van de groep')));
      rij.appendChild(naam);
      var acties = el('div', 'rij-acties');
      acties.appendChild((function () {
        var s = schakelaar(opBord, function (aan) {
          if (aan) {
            if ((b.hoekLibIds || []).indexOf(h.id) < 0) b.hoekLibIds.push(h.id);
            if (!b.plaatsingen[h.id]) b.plaatsingen[h.id] = [];
          } else {
            b.hoekLibIds = b.hoekLibIds.filter(function (id) { return id !== h.id; });
          }
          bewaarOfKlaag();
        });
        s.title = 'Op het bord tonen';
        return s;
      })());
      acties.appendChild(knop('Bewerk', 'stil', function () { bewerkHoek(h); }));
      rij.appendChild(acties);
      p.appendChild(rij);
    });
  }
  v.appendChild(p);
}

function bewerkHoek(h){
  var k = KB.klas(), b = KB.bord(k), nieuw = !h;
  var concept = { naam: h ? h.naam : '', max: h ? h.maxKinderen : 4,
                  timer: h ? (h.timerMinuten || 0) : 0, fotoId: h ? h.fotoId : null,
                  nieuweFoto: null };

  toonBlad(function (blad) {
    var t = el('div', null, nieuw ? 'Hoek toevoegen' : h.naam);
    t.style.cssText = 'font-size:1.25rem;font-weight:600;letter-spacing:-.02em;margin-bottom:18px';
    blad.appendChild(t);

    var naamVeld = el('div', 'veld');
    naamVeld.appendChild(el('label', null, 'Naam'));
    var invoer = el('input'); invoer.type = 'text'; invoer.value = concept.naam;
    invoer.addEventListener('input', function () { concept.naam = invoer.value; });
    naamVeld.appendChild(invoer);
    blad.appendChild(naamVeld);

    var maxVeld = el('div', 'veld');
    maxVeld.appendChild(el('label', null, 'Aantal plekken'));
    maxVeld.appendChild(teller(concept.max, 1, 12, function (n) { concept.max = n; }));
    blad.appendChild(maxVeld);

    var timerVeld = el('div', 'veld');
    timerVeld.appendChild(el('label', null, 'Eigen speelduur in minuten'));
    timerVeld.appendChild(teller(concept.timer, 0, 60, function (n) { concept.timer = n; }));
    timerVeld.appendChild(el('p', 'hint',
      'Op 0 gebruikt deze hoek de tijd van de groep (' + KB.instelling('timerMinuten', k) +
      ' minuten). Zet hem hoger voor een hoek waar kinderen langer in willen blijven, ' +
      'zoals de bouwhoek.'));
    blad.appendChild(timerVeld);

    var fotoVeld = el('div', 'veld');
    fotoVeld.appendChild(el('label', null, 'Foto'));
    var voorbeeld = el('div');
    voorbeeld.style.cssText = 'width:100%;height:96px;border-radius:12px;background:var(--vlak-2);' +
                              'background-size:cover;background-position:center;margin-bottom:8px';
    var bestaande = KB.foto(concept.fotoId, k);
    if (bestaande) voorbeeld.style.backgroundImage = 'url(' + bestaande + ')';
    fotoVeld.appendChild(voorbeeld);
    var fotoLabel = el('label', 'knop knop-stil knop-klein uploadvak', 'Foto kiezen');
    var fotoInvoer = el('input'); fotoInvoer.type = 'file'; fotoInvoer.accept = 'image/*';
    fotoInvoer.style.display = 'none';
    fotoInvoer.addEventListener('change', function () {
      var f = fotoInvoer.files && fotoInvoer.files[0];
      if (!f) return;
      KB.verklein(f, KB.FOTO_MAAT.hoek).then(function (d) {
        concept.nieuweFoto = d;
        voorbeeld.style.backgroundImage = 'url(' + d + ')';
        meld('Foto klaar · ' + Math.round(d.length * 0.75 / 1024) + ' KB');
      }).catch(function () { meld('Die foto lukte niet'); });
    });
    fotoLabel.appendChild(fotoInvoer);
    fotoVeld.appendChild(fotoLabel);
    blad.appendChild(fotoVeld);

    var knoppen = el('div');
    knoppen.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:20px';
    knoppen.appendChild(knop('Opslaan', 'primair', function () {
      var naam = (concept.naam || '').trim();
      if (!naam) { meld('Vul een naam in'); return; }
      var fotoId = concept.fotoId;
      if (concept.nieuweFoto) {
        fotoId = 'f' + KB.uid();
        k.fotoLib.push({ id: fotoId, naam: naam, data: concept.nieuweFoto, categorie: 'hoekfoto' });
      }
      if (nieuw) {
        var id = 'hl' + KB.uid();
        k.hoekLib.push({ id:id, naam:naam, maxKinderen:concept.max,
                         timerMinuten:concept.timer || 0, fotoId:fotoId });
        b.hoekLibIds.push(id);
        b.plaatsingen[id] = [];
      } else {
        h.naam = naam; h.maxKinderen = concept.max;
        h.timerMinuten = concept.timer || 0; h.fotoId = fotoId;
      }
      bewaarOfKlaag(); sluitBlad(); teken(); meld('Opgeslagen');
    }));
    knoppen.appendChild(knop('Annuleren', 'stil', sluitBlad));
    if (!nieuw) {
      knoppen.appendChild(knop('Verwijderen', 'gevaar', function () {
        sluitBlad();
        vraagBevestiging('Hoek verwijderen?', h.naam + ' verdwijnt uit deze groep.', 'Verwijderen', function () {
          k.hoekLib = k.hoekLib.filter(function (x) { return x.id !== h.id; });
          b.hoekLibIds = b.hoekLibIds.filter(function (id) { return id !== h.id; });
          delete b.plaatsingen[h.id];
          bewaarOfKlaag(); teken(); meld('Verwijderd');
        });
      }));
    }
    blad.appendChild(knoppen);
  });
}

/* ── Doelen ──────────────────────────────────────────────── */
var doelNiveau = null, doelZoek = '';

function tekenDoelen(v){
  var k = KB.klas();
  var niveaus = KB.klasNiveaus(k);
  if (!doelNiveau || niveaus.indexOf(doelNiveau) < 0) doelNiveau = niveaus[0];

  v.appendChild(kopregel('Doelen',
    Object.keys(k.doelActief || {}).length + ' aangevinkt in ' + k.naam));

  if (!KB.doelen.lijst.length) {
    var leegP = paneel();
    leegP.appendChild(el('p', 'hint',
      'Er is nog geen doelenlijst ingeladen. De lijst hoort bij de app en bevat de ' +
      'leer- en ontwikkelingslijnen jonge kind, geordend per beheersingsniveau.'));
    var rij = el('div');
    rij.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
    rij.appendChild(knop('Doelenlijst inladen', 'primair', haalDoelenOp));
    var label = el('label', 'knop knop-stil knop-klein uploadvak', 'Bestand kiezen');
    var inv = el('input'); inv.type = 'file'; inv.accept = 'application/json,.json'; inv.style.display = 'none';
    inv.addEventListener('change', function () {
      var f = inv.files && inv.files[0]; inv.value = '';
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        var pak; try { pak = JSON.parse(e.target.result); } catch (err) { meld('Onleesbaar bestand'); return; }
        if (KB.doelenNeemOver(pak)) { teken(); meld(KB.doelen.lijst.length + ' doelen ingeladen'); }
        else meld('Dit is geen doelenbestand');
      };
      r.readAsText(f);
    });
    label.appendChild(inv);
    rij.appendChild(label);
    leegP.appendChild(rij);
    v.appendChild(leegP);
    return;
  }

  var balk = paneel();
  var chips = el('div', 'chips');
  niveaus.forEach(function (n) {
    var aantal = KB.doelen.lijst.filter(function (d) { return d.niveau === n; }).length;
    var c = el('button', 'chip' + (n === doelNiveau ? ' aan' : ''), n + ' · ' + aantal);
    c.addEventListener('click', function () { doelNiveau = n; teken(); });
    chips.appendChild(c);
  });
  balk.appendChild(chips);
  var zoek = el('input'); zoek.type = 'text'; zoek.placeholder = 'Zoek in doelen…'; zoek.value = doelZoek;
  zoek.style.cssText = 'width:100%;border:1.5px solid var(--lijn);border-radius:10px;padding:9px 12px;font-size:.9rem';
  zoek.addEventListener('input', function () {
    doelZoek = zoek.value.toLowerCase();
    tekenDoelenLijst(lijstVak);
  });
  balk.appendChild(zoek);
  v.appendChild(balk);

  var lijstVak = paneel();
  v.appendChild(lijstVak);
  tekenDoelenLijst(lijstVak);
}

function tekenDoelenLijst(vak){
  leeg(vak);
  var k = KB.klas();
  var zichtbaar = KB.doelen.lijst.filter(function (d) {
    if (d.niveau !== doelNiveau) return false;
    if (!doelZoek) return true;
    return ((d.aspect || '') + ' ' + d.doel + ' ' + d.leerlijn).toLowerCase().indexOf(doelZoek) >= 0;
  });
  if (!zichtbaar.length) { vak.appendChild(el('p', 'hint', 'Geen doelen gevonden.')); return; }

  var boom = {}, volgorde = [];
  zichtbaar.forEach(function (d) {
    if (!boom[d.domein]) { boom[d.domein] = {}; volgorde.push(d.domein); }
    if (!boom[d.domein][d.leerlijn]) boom[d.domein][d.leerlijn] = [];
    boom[d.domein][d.leerlijn].push(d);
  });

  volgorde.forEach(function (domein) {
    vak.appendChild(el('div', 'paneelkop', domein)).style.marginTop = '16px';
    Object.keys(boom[domein]).forEach(function (leerlijn) {
      var doelen = boom[domein][leerlijn];
      var allesAan = doelen.every(function (d) { return k.doelActief && k.doelActief[d.id]; });

      var kop = el('div');
      kop.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 4px';
      var naam = el('div', null, leerlijn);
      naam.style.cssText = 'font-size:.9rem;font-weight:600';
      kop.appendChild(naam);
      kop.appendChild(knop(allesAan ? 'Alles uit' : 'Alles aan', 'stil', function () {
        if (!k.doelActief) k.doelActief = {};
        doelen.forEach(function (d) {
          if (allesAan) delete k.doelActief[d.id]; else k.doelActief[d.id] = true;
        });
        bewaarOfKlaag(); teken();
      }));
      vak.appendChild(kop);

      doelen.forEach(function (d) {
        var aan = !!(k.doelActief && k.doelActief[d.id]);
        var rij = el('label', 'doelrij' + (aan ? ' aan' : ''));
        var vink = el('input'); vink.type = 'checkbox'; vink.checked = aan;
        vink.addEventListener('change', function () {
          if (!k.doelActief) k.doelActief = {};
          if (vink.checked) k.doelActief[d.id] = true; else delete k.doelActief[d.id];
          rij.classList.toggle('aan', vink.checked);
          bewaarOfKlaag();
        });
        rij.appendChild(vink);
        var tekst = el('span');
        if (d.aspect) tekst.appendChild(el('span', 'aspect', d.aspect + ': '));
        tekst.appendChild(document.createTextNode(d.doel));
        rij.appendChild(tekst);
        vak.appendChild(rij);
      });
    });
  });
}

function haalDoelenOp(){
  // Zit de lijst in de pagina zelf (voorvertoning, of los geopend bestand),
  // dan gebruiken we die. Anders halen we hem op van naast de app.
  var ingebouwd = document.getElementById('doelen-ingebouwd');
  if (ingebouwd) {
    try {
      if (KB.doelenNeemOver(JSON.parse(ingebouwd.textContent))) {
        teken(); meld(KB.doelen.lijst.length + ' doelen ingeladen'); return;
      }
    } catch (e) { /* dan alsnog ophalen */ }
  }
  fetch('data/doelen-gouwe-academie.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (pak) {
      if (KB.doelenNeemOver(pak)) { teken(); meld(KB.doelen.lijst.length + ' doelen ingeladen'); }
      else meld('Dit is geen doelenbestand');
    })
    .catch(function () { meld('Kon de lijst niet ophalen — kies het bestand zelf'); });
}

/* ── Foto's ──────────────────────────────────────────────── */
function tekenFotos(v){
  v.appendChild(kopregel("Foto's", 'De picto\'s blijven op dit apparaat en gaan nooit mee naar GitHub'));

  var p = paneel('Fotokluis');
  var stand = el('p', 'hint', 'Bezig met kijken…');
  p.appendChild(stand);
  KB.fkLees().then(function (kluis) {
    var n = kluis ? Object.keys(kluis).length : 0;
    stand.textContent = n
      ? n + " foto's staan op dit apparaat."
      : "Er staan nog geen foto's op dit apparaat. Kinderen krijgen een gekleurde cirkel met hun beginletter.";
  }).catch(function (e) {
    stand.textContent = 'Fotokluis niet beschikbaar (' + (e.message || 'onbekend') +
                        '). Open de app via een https-adres in plaats van als los bestand.';
  });

  var rij = el('div');
  rij.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
  var label = el('label', 'knop knop-primair knop-klein uploadvak', 'Kluisbestand importeren');
  var inv = el('input'); inv.type = 'file'; inv.accept = 'application/json,.json'; inv.style.display = 'none';
  inv.addEventListener('change', function () {
    var f = inv.files && inv.files[0]; inv.value = '';
    if (!f) return;
    var r = new FileReader();
    r.onload = function (e) {
      var pak; try { pak = JSON.parse(e.target.result); } catch (err) { meld('Onleesbaar bestand'); return; }
      if (!pak || pak.formaat !== 'keuzebord-fotokluis') { meld('Dit is geen fotokluis-bestand'); return; }
      if (pak.versleuteld) { meld('Dit bestand is versleuteld — die stap komt terug in de volgende versie'); return; }
      var map = pak.fotos || {};
      KB.fkBewaar(map).then(function () {
        KB.fkPasToe(map); bewaarOfKlaag(); teken();
        meld(Object.keys(map).length + " foto's op dit apparaat gezet");
      }).catch(function () { meld('Opslaan mislukt'); });
    };
    r.readAsText(f);
  });
  label.appendChild(inv);
  rij.appendChild(label);
  rij.appendChild(knop("Foto's wissen van dit apparaat", 'gevaar', function () {
    vraagBevestiging("Foto's wissen?",
      'De foto\'s verdwijnen alleen van dit apparaat. Zorg dat je een kluisbestand hebt.',
      'Wissen', function () {
        KB.fkWis().then(function () {
          KB.G.klassen.forEach(function (k) {
            (k.leerlingen || []).forEach(function (l) { if (l._c) l.image = null; });
            (k.fotoLib || []).forEach(function (f) { if (f._c) f.data = null; });
          });
          bewaarOfKlaag(); teken(); meld("Foto's gewist");
        }).catch(function () { meld('Wissen mislukt'); });
      });
  }));
  p.appendChild(rij);
  v.appendChild(p);
}

/* ── Functies ────────────────────────────────────────────── */
var FUNCTIES_BORD = [
  ['timerAan',     'Tijdvergrendeling', 'Een kind blijft even in de gekozen hoek. De ring op het picto loopt vol.'],
  ['wachtrijAan',  'Wachtrij bij volle hoek', 'Kinderen melden zich aan en schuiven door zodra er plek is.'],
  ['tellingAan',   'Telling op het picto', 'Laat zien hoe vaak een kind deze week in die hoek was.']
];
var FUNCTIES_BEHEER = [
  ['pinAan', 'PIN op het beheer', 'Vraagt een code voordat je bij de instellingen komt.']
];

function tekenFuncties(v){
  var k = KB.klas();
  if (!k.settings) k.settings = KB.standaardInstellingen();
  v.appendChild(kopregel('Functies', 'Geldt alleen voor ' + k.naam));

  var snel = paneel();
  var kop = el('div');
  kop.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap';
  var tekst = el('div');
  tekst.style.flexGrow = '1';
  tekst.appendChild(el('div', 'rij-naam', 'Snel instellen'));
  tekst.appendChild(el('div', 'rij-sub',
    'Elke groep werkt anders. Begin klein en zet aan wat je nodig hebt.'));
  kop.appendChild(tekst);
  kop.appendChild(knop('Eenvoudig', 'stil', function () {
    k.settings.timerAan = true; k.settings.wachtrijAan = false; k.settings.tellingAan = false;
    bewaarOfKlaag(); teken(); meld('Op eenvoudig gezet');
  }));
  kop.appendChild(knop('Uitgebreid', 'primair', function () {
    k.settings.timerAan = true; k.settings.wachtrijAan = true; k.settings.tellingAan = true;
    bewaarOfKlaag(); teken(); meld('Op uitgebreid gezet');
  }));
  snel.appendChild(kop);
  v.appendChild(snel);

  var rooster = el('div', 'rooster2');

  var bord = paneel('Op het bord');
  FUNCTIES_BORD.forEach(function (f) {
    bord.appendChild(functieRij(k, f[0], f[1], f[2]));
  });
  var duur = el('div');
  duur.style.cssText = 'padding:14px 2px 4px;border-top:1px solid var(--vlak-2);margin-top:6px';
  duur.appendChild(el('div', 'rij-naam', 'Speelduur in minuten'));
  duur.appendChild(el('div', 'rij-sub',
    'Geldt voor alle hoeken zonder eigen tijd. Per hoek instelbaar bij Hoeken.'));
  var t = teller(KB.instelling('timerMinuten', k), 1, 60, function (n) {
    k.settings.timerMinuten = n; bewaarOfKlaag();
  });
  t.style.marginTop = '10px';
  duur.appendChild(t);
  bord.appendChild(duur);
  rooster.appendChild(bord);

  var beheer = paneel('In het beheer');
  FUNCTIES_BEHEER.forEach(function (f) { beheer.appendChild(functieRij(k, f[0], f[1], f[2])); });
  var later = el('div');
  later.style.cssText = 'padding:14px 2px 0;border-top:1px solid var(--vlak-2);margin-top:6px';
  later.appendChild(el('p', 'hint',
    'Weekplanner, werkplaats, doelen bij taken, observaties, statistieken en signalering ' +
    'krijgen hier hun eigen schakelaar zodra ze zijn overgezet.'));
  beheer.appendChild(later);
  rooster.appendChild(beheer);

  v.appendChild(rooster);
}

function functieRij(k, sleutel, naam, uitleg){
  var rij = el('div', 'rij');
  var tekst = el('div');
  tekst.style.flexGrow = '1';
  tekst.appendChild(el('div', 'rij-naam', naam));
  tekst.appendChild(el('div', 'rij-sub', uitleg));
  rij.appendChild(tekst);
  rij.appendChild(schakelaar(KB.instelling(sleutel, k), function (aan) {
    k.settings[sleutel] = aan; bewaarOfKlaag();
  }));
  return rij;
}

/* ── opstarten ───────────────────────────────────────────── */
KB.laad();
KB.doelenLaad();
var start = (location.hash || '').replace('#', '');
if (ONDERDELEN.some(function (o) { return o.id === start; })) huidig = start;

KB.fkLees()
  .then(function (kluis) { if (kluis) KB.fkPasToe(kluis); })
  .catch(function () {})
  .then(function () { tekenMenu(); teken(); });

})();
