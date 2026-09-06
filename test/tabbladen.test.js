/* Twee tabbladen, één opslag.

   Keuzebord en Planbord staan op hetzelfde adres en delen dus dezelfde
   browseropslag. Elk tabblad houdt alles in het geheugen en schreef dat
   bij het opslaan in zijn geheel terug: wie het laatst opsloeg won, en
   het werk van de ander was stil weg -- ook zonder tegelijk op te slaan,
   want het tweede tabblad werkte met wat het bij het openen las.

   Deze proef heeft geen browser nodig. Hij laadt de gegevenslaag in een
   kale omgeving met een nagebootste opslag, en speelt na wat er tussen
   twee tabbladen gebeurt. */
const fs = require('fs'), vm = require('vm');

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,110) + ']' : '');
  uit.push(r); console.log(r);
};

function verseOpslag(){
  return { _d:{},
    getItem(k){ return this._d[k] === undefined ? null : this._d[k]; },
    setItem(k,v){ this._d[k] = String(v); },
    removeItem(k){ delete this._d[k]; } };
}

/* Eén tabblad: een eigen kopie van de gegevenslaag, met een gedeelde
   opslag eronder. Precies zoals twee tabbladen in één browser. */
function tabblad(opslag){
  const zand = { console, setTimeout, clearTimeout, JSON, Math, Date,
                 localStorage: opslag,
                 document: { getElementById(){ return null; } },
                 addEventListener(){}, fetch: undefined };
  zand.window = zand; zand.globalThis = zand;
  vm.createContext(zand);
  vm.runInContext(fs.readFileSync(__dirname + '/../src/kb-data.js','utf8'), zand);
  return zand.KB;
}

const leeg = (id, naam) => ({ id, naam, leerlingen:[], hoekLib:[], borden:[],
                              settings:{}, wachtrij:[], doelActief:{}, taken:[], themas:[], weken:{} });

const opslag = verseOpslag();
const A = tabblad(opslag);
const B = tabblad(opslag);

/* ── A richt twee groepen in ─────────────────────────────────────────── */
A.laad();
A.G.klassen = [leeg('a','Groep 1A'), leeg('b','Groep 1B')];
A.G.activeKlasId = 'a';
A.bewaar();
zeg('tabblad A heeft twee groepen opgeslagen',
    JSON.parse(opslag.getItem('kb_v5')).klassen.length === 2);

/* ── B opent en ziet dezelfde twee ───────────────────────────────────── */
B.laad();
zeg('tabblad B ziet dezelfde twee', B.G.klassen.length === 2,
    B.G.klassen.map(k => k.naam).join(', '));

/* ── allebei wijzigen iets, om beurten ───────────────────────────────── */
B.G.klassen.find(k => k.id === 'b').naam = 'Groep 1B — door B';
B.G.klassen.find(k => k.id === 'b').leerlingen = [{ id:'l9', naam:'Kind van B' }];
B.bewaar();

A.G.klassen.find(k => k.id === 'a').naam = 'Groep 1A — door A';
A.bewaar();

const na = JSON.parse(opslag.getItem('kb_v5'));
const gA = na.klassen.find(k => k.id === 'a'), gB = na.klassen.find(k => k.id === 'b');
zeg('het werk van A staat erin', gA.naam === 'Groep 1A — door A', gA.naam);
zeg('en dat van B is niet overschreven', gB.naam === 'Groep 1B — door B', gB.naam);
zeg('inclusief het kind dat B toevoegde', (gB.leerlingen || []).length === 1,
    (gB.leerlingen || []).length + ' kinderen');

/* ── een groep die alleen het andere tabblad kent ────────────────────── */
B.laad();
B.G.klassen.push(leeg('c','Groep 1C'));
B.bewaar();
A.G.klassen.find(k => k.id === 'a').naam = 'Groep 1A — nog eens';
A.bewaar();
const na2 = JSON.parse(opslag.getItem('kb_v5'));
zeg('een groep die alleen B kent blijft bestaan',
    !!na2.klassen.find(k => k.id === 'c'), na2.klassen.map(k => k.id).join(','));

/* ── een uitgeklede groep mag een volle versie niet vervangen ────────── */
A.G.klassen.push(leeg('d','Groep 2A'));
A.G.klassen.find(k => k.id === 'd').leerlingen = [{ id:'x', naam:'Vol' }];
A.bewaar();
const kaal = JSON.parse(opslag.getItem('kb_v5'));
kaal.klassen.find(k => k.id === 'd').leerlingen = [];
kaal.klassen.find(k => k.id === 'd').magOpnieuwOphalen = true;
opslag.setItem('kb_v5', JSON.stringify(kaal));
A.G.klassen.find(k => k.id === 'a').naam = 'Groep 1A — derde keer';
A.bewaar();
const na3 = JSON.parse(opslag.getItem('kb_v5'));
zeg('een uitgeklede groep in de opslag vervangt een volle versie niet',
    (na3.klassen.find(k => k.id === 'd').leerlingen || []).length === 1,
    (na3.klassen.find(k => k.id === 'd').leerlingen || []).length + ' kinderen');

/* ── het gewone geval blijft gewoon ──────────────────────────────────── */
const alleen = verseOpslag();
const C = tabblad(alleen);
C.laad();
C.G.klassen = [leeg('x','Enige groep')];
C.bewaar();
C.G.klassen[0].naam = 'Enige groep — gewijzigd';
C.bewaar();
zeg('één tabblad in zijn eentje werkt gewoon door',
    JSON.parse(alleen.getItem('kb_v5')).klassen[0].naam === 'Enige groep — gewijzigd');

/* ── en een verwijdering blijft een verwijdering ─────────────────────── *
   Zonder opnieuw laden, want dat is het echte geval: A heeft die groep
   nog in het geheugen staan terwijl B hem al heeft weggehaald. Zette A
   hem dan terug, dan kreeg je een groep die niet weg te krijgen was. */
B.laad();
B.G.klassen = B.G.klassen.filter(k => k.id !== 'c');
B.bewaar();
zeg('A heeft de weggehaalde groep nog in het geheugen',
    !!A.G.klassen.find(k => k.id === 'c'));
A.G.klassen.find(k => k.id === 'a').naam = 'Groep 1A — vierde keer';
A.bewaar();
const na4 = JSON.parse(opslag.getItem('kb_v5'));
zeg('een groep die B weghaalde komt niet terug',
    !na4.klassen.find(k => k.id === 'c'), na4.klassen.map(k => k.id).join(','));
zeg('en het werk van A staat er nog steeds in',
    na4.klassen.find(k => k.id === 'a').naam === 'Groep 1A — vierde keer');

/* Maar: heeft A er zelf nog in gewerkt, dan houden we hem. Werk
   kwijtraken is erger dan een groep die terugkomt. */
B.laad();
B.G.klassen.push(leeg('e','Groep 2B'));
B.bewaar();
A.laad();
B.laad();
B.G.klassen = B.G.klassen.filter(k => k.id !== 'e');
B.bewaar();
A.G.klassen.find(k => k.id === 'e').naam = 'Groep 2B — A werkte er nog in';
A.bewaar();
const na5 = JSON.parse(opslag.getItem('kb_v5'));
zeg('een groep waar A nog in werkte blijft wel staan',
    !!na5.klassen.find(k => k.id === 'e'), na5.klassen.map(k => k.id).join(','));

console.log('\n' + uit.filter(x => /goed/.test(x)).length + ' van de ' + uit.length + ' goed');
console.log(uit.filter(x => /FOUT/.test(x)).length ? 'ER GING IETS MIS' : 'alles goed');
