/* Wat er gebeurde na het buitenspelen.

   Het bord staat een half uur stil. De leerkracht wekt het, en op dat
   moment gaat er een ronde naar de server: eerst opsturen, dan ophalen.
   Juist dan staan er acht kleuters te dringen om te kiezen.

   Wie koos terwijl die ronde liep, was zijn keus kwijt. De ronde neemt
   aan het begin een foto van de groep; wie daarna koos stond daar niet
   op, en aan het eind zette de ronde het vlaggetje "er staat nog iets
   klaar" uit -- ook al was het ondertussen door die keus weer aangezet.
   Het ophalen concludeerde dan "alles is weg" en schreef de server over
   het bord heen. Weg kind.

   Hetzelfde overkwam de hoekindeling: verschoof je een hoek terwijl er
   een ronde liep, dan stond hij even later weer waar hij stond. Dat was
   de hoekindeling die "vanzelf" veranderde.

   Deze proef zet de server expres traag -- zoals wifi op school -- en
   doet precies dat: kiezen en schuiven terwijl de ronde loopt. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0, 160) + ']' : '');
  uit.push(r); console.log(r);
};

async function inloggen(p){
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server', 'http://localhost:5455');
                           localStorage.setItem('kb_serversleutel', 'proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email', 'juf@mijnschool.nl'); await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4000);
}

/* De groep klaarzetten zoals hij op een digibord staat: een paar hoeken,
   een paar kinderen, en een bord dat vandaag al geleegd is (anders veegt
   het bord zichzelf schoon zodra het opent -- dat hoort zo, maar dan
   meet deze proef iets anders dan hij denkt). */
async function zetKlaar(p){
  await p.evaluate(() => {
    const k = KB.klas();
    k.leerlingen = ['Sem', 'Noor', 'Liam', 'Julia', 'Mees'].map((n, i) =>
      ({ id: 'l' + i, naam: n, kleur: '#3b6ff0' }));
    k.hoekLib = [{ id: 'h0', naam: 'Bouwhoek', maxKinderen: 4 },
                 { id: 'h1', naam: 'Leeshoek', maxKinderen: 4 },
                 { id: 'h2', naam: 'Zandtafel', maxKinderen: 4 },
                 { id: 'h3', naam: 'Verfhoek', maxKinderen: 4 }];
    k.borden[0].hoekLibIds = ['h0', 'h1', 'h2', 'h3'];
    k.borden[0].plaatsingen = { h0: [], h1: [], h2: [], h3: [] };
    k.borden[0].laatstGeleegd = Date.now();
    KB.bewaar();
  });
  await p.waitForTimeout(4500);
}

const traagSchrijven = (p, ms) => p.evaluate(t => {
  ['schrijf', 'wijzig', 'wis'].forEach(n => {
    const echt = SB[n];
    SB[n] = function () { const a = arguments;
      return new Promise(r => setTimeout(r, t)).then(() => echt.apply(SB, a)); };
  });
}, ms);

const traagLezen = (p, ms) => p.evaluate(t => {
  const echt = SB.lees;
  SB.lees = function () { const a = arguments;
    return new Promise(r => setTimeout(r, t)).then(() => echt.apply(SB, a)); };
}, ms);

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await inloggen(p);
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(4000);
  await zetKlaar(p);

  const stond = await p.evaluate(() => (KB.klas().hoekLib || []).length);
  zeg('de groep staat op het bord', stond === 4, 'hoeken: ' + stond);

  /* ── 1. een kind kiest terwijl de ronde loopt ──────────────────────── */
  await traagSchrijven(p, 60);
  const kiezen = await p.evaluate(async () => {
    const ronde = KBV.haalOp();
    await new Promise(r => setTimeout(r, 20));
    KB.plaats('l1', 'h0');                       // Noor kiest de bouwhoek
    await ronde.catch(e => String(e));
    await new Promise(r => setTimeout(r, 3000)); // en dan de rust van erna
    const b = KB.bord(KB.klas());
    return (b.plaatsingen.h0 || []).map(x => x.leerlingId).join(',');
  });
  zeg('wie koos tijdens een ronde staat er nog', kiezen.indexOf('l1') >= 0, 'bouwhoek: ' + kiezen);

  /* en hij staat ook echt op de server, niet alleen hier */
  await p.evaluate(() => KBV.haalOp());
  await p.waitForTimeout(3500);
  const naOphalen = await p.evaluate(() =>
    (KB.bord(KB.klas()).plaatsingen.h0 || []).map(x => x.leerlingId).join(','));
  zeg('en hij overleeft het ophalen erna', naOphalen.indexOf('l1') >= 0, 'bouwhoek: ' + naOphalen);

  /* ── 2. de hoekindeling verschuiven terwijl de ronde loopt ─────────── */
  const geschoven = await p.evaluate(async () => {
    const ronde = KBV.haalOp();
    await new Promise(r => setTimeout(r, 20));
    const b = KB.bord(KB.klas());
    b.hoekLibIds = ['h3', 'h0', 'h1', 'h2'];     // verfhoek naar linksboven
    KB.bewaar();
    await ronde.catch(e => String(e));
    await new Promise(r => setTimeout(r, 3000));
    return KB.bord(KB.klas()).hoekLibIds.join(',');
  });
  zeg('een hoek die tijdens een ronde verschuift blijft staan',
      geschoven === 'h3,h0,h1,h2', geschoven);

  await p.evaluate(() => KBV.haalOp());
  await p.waitForTimeout(3500);
  const volgordeNa = await p.evaluate(() => KB.bord(KB.klas()).hoekLibIds.join(','));
  zeg('de nieuwe volgorde komt ook van de server terug',
      volgordeNa === 'h3,h0,h1,h2', volgordeNa);

  /* ── 3. een kind kiest terwijl het OPHALEN loopt ───────────────────── */
  await traagLezen(p, 120);
  const tijdensOphalen = await p.evaluate(async () => {
    const ronde = KBV.haalOp();
    await new Promise(r => setTimeout(r, 700));  // nu leest hij de lijsten
    KB.plaats('l2', 'h1');                       // Liam kiest de leeshoek
    await ronde.catch(e => String(e));
    await new Promise(r => setTimeout(r, 3500));
    return (KB.bord(KB.klas()).plaatsingen.h1 || []).map(x => x.leerlingId).join(',');
  });
  zeg('wie koos tijdens het ophalen staat er nog',
      tijdensOphalen.indexOf('l2') >= 0, 'leeshoek: ' + tijdensOphalen);

  await p.evaluate(() => KBV.haalOp());
  await p.waitForTimeout(4000);
  const alles = await p.evaluate(() => {
    const b = KB.bord(KB.klas());
    return Object.keys(b.plaatsingen).map(h => h + ':' +
      (b.plaatsingen[h] || []).map(x => x.leerlingId).join('+')).join(' ');
  });
  zeg('en alle drie de keuzes staan er samen op',
      alles.indexOf('l1') >= 0 && alles.indexOf('l2') >= 0, alles);

  /* ── 4. en dan het echte werk: acht keuzes vlak na elkaar ──────────── */
  /* Zo gaat het in de klas: de leerkracht wekt het bord en iedereen wil
     tegelijk. Als er onderweg iets omvalt, valt het hier om. */
  await p.evaluate(() => {
    const k = KB.klas();
    k.leerlingen = ['Sem','Noor','Liam','Julia','Mees','Fenna','Daan','Bo']
      .map((n, i) => ({ id: 'l' + i, naam: n, kleur: '#3b6ff0' }));
    k.borden[0].plaatsingen = { h0: [], h1: [], h2: [], h3: [] };
    KB.bewaar();
  });
  await p.waitForTimeout(4000);
  const drukte = await p.evaluate(async () => {
    KBV.haalOp();                                 // de ronde na het wekken
    const hoeken = ['h0','h1','h2','h3'];
    for (let i = 0; i < 8; i++) {
      KB.plaats('l' + i, hoeken[i % 4]);
      await new Promise(r => setTimeout(r, 120));
    }
    await new Promise(r => setTimeout(r, 6000));
    const b = KB.bord(KB.klas());
    return Object.keys(b.plaatsingen)
      .reduce((n, h) => n + (b.plaatsingen[h] || []).length, 0);
  });
  zeg('acht kleuters die tegelijk kiezen staan er alle acht op',
      drukte === 8, 'op het bord: ' + drukte);

  await p.evaluate(() => KBV.haalOp());
  await p.waitForTimeout(5000);
  const naServer = await p.evaluate(() => {
    const b = KB.bord(KB.klas());
    return Object.keys(b.plaatsingen)
      .reduce((n, h) => n + (b.plaatsingen[h] || []).length, 0);
  });
  zeg('en ze staan er na het ophalen nog steeds alle acht op',
      naServer === 8, 'op het bord: ' + naServer);

  zeg('geen enkele fout op de pagina', fouten.length === 0, fouten.join(' | '));
  await b.close();
  console.log(uit.filter(r => r.indexOf('FOUT') === 0 || r.indexOf('  FOUT') === 0).length
    ? 'ER GING IETS MIS' : 'klaar');
})();
