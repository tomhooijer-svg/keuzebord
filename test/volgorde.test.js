/* Waar staat welke hoek op het bord.

   Het bord vult van linksboven naar rechts, in de volgorde van de lijst.
   Die volgorde moet je kunnen veranderen -- "de werkplaats linksbovenin" --
   en hij moet meegaan naar het digibord in de klas. Dat laatste ging mis:
   de koppeling bord-hoek heeft een volgorde-kolom, maar bij het opsturen
   stond "niets om te wijzigen" voor dat soort rijen. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,140) + ']' : '');
  uit.push(r); console.log(r);
};

async function apparaat(b){
  const c = await b.newContext({ viewport:{width:1500,height:1000} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  [fout] ' + e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','juf@mijnschool.nl'); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4500);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  /* ── de laptop van de leerkracht ─────────────────────────────────── */
  const laptop = await apparaat(b);
  await laptop.evaluate(() => {
    const k = KB.klas();
    const namen = [['Huishoek',4],['Bouwhoek',4],['Leeshoek',3],
                   ['Verfhoek',4],['Zandtafel',2],['Werkplaats',6]];
    k.hoekLib = namen.map(([n,m],i) => ({ id:'h'+i, naam:n, maxKinderen:m,
      werkplaats:n === 'Werkplaats', kleur:KB.HOEKKLEUREN[i % KB.HOEKKLEUREN.length] }));
    k.borden[0].hoekLibIds = k.hoekLib.map(h => h.id);
    k.borden[0].plaatsingen = {};
    k.hoekLib.forEach(h => { k.borden[0].plaatsingen[h.id] = []; });
    k.leerlingen = ['Sem','Noor'].map((n,i) => ({ id:'l'+i, naam:n, kleur:'#3b6ff0', lid:true }));
    k.borden[0].aan = true; k.borden[0].dagOpen = true;
    KB.bewaar();
  });
  await laptop.waitForTimeout(2600);

  await laptop.goto(APP + '/beheer.html');
  await laptop.waitForSelector('.zij-knop', { timeout: 20000 }).catch(()=>{});
  await laptop.waitForTimeout(2800);
  await laptop.evaluate(() => {
    [...document.querySelectorAll('.zij-knop')].filter(x => x.textContent.trim() === 'Hoeken')[0].click();
  });
  await laptop.waitForTimeout(1200);

  const voor = await laptop.evaluate(() => ({
    kaartje: [...document.querySelectorAll('.bordkaartje-naam')].map(x => x.textContent),
    plaatsen: [...document.querySelectorAll('.bordkaartje')].length
      ? [...document.querySelectorAll('.paneel .rij .rij-sub')].map(x => x.textContent).slice(-6) : []
  }));
  zeg('het kaartje laat zien waar elke hoek komt',
      voor.kaartje.length === 6 && voor.kaartje[0] === 'Huishoek', voor.kaartje.join(', '));
  zeg('en zegt het ook in woorden',
      /links/.test((voor.plaatsen[0] || '')), voor.plaatsen[0]);

  /* de werkplaats naar linksboven */
  await laptop.evaluate(() => {
    const rij = [...document.querySelectorAll('.paneel .rij')]
      .filter(r => /Werkplaats/.test(r.textContent) && /Vooraan/.test(r.textContent))[0];
    [...rij.querySelectorAll('.knop')].filter(x => x.textContent === 'Vooraan')[0].click();
  });
  await laptop.waitForTimeout(1500);

  const na = await laptop.evaluate(() => ({
    kaartje: [...document.querySelectorAll('.bordkaartje-naam')].map(x => x.textContent),
    volgorde: KB.bord(KB.klas()).hoekLibIds.map(id => KB.hoekVan(id).naam)
  }));
  zeg('de werkplaats staat nu vooraan', na.kaartje[0] === 'Werkplaats', na.kaartje.join(', '));
  zeg('en dat staat ook zo in de groep', na.volgorde[0] === 'Werkplaats', na.volgorde.join(', '));

  await laptop.waitForTimeout(2600);   // naar de server

  /* ── het bord op dit apparaat ────────────────────────────────────── */
  await laptop.goto(APP + '/bord.html');
  await laptop.waitForTimeout(3200);
  const opBord = await laptop.evaluate(() =>
    [...document.querySelectorAll('.hoek .hoek-naam')].map(x => x.textContent));
  zeg('het bord zet de werkplaats linksbovenin',
      opBord[0] === 'Werkplaats', opBord.join(', '));

  /* ── en het digibord in de klas: een ander apparaat ──────────────── */
  const digibord = await apparaat(b);
  await digibord.goto(APP + '/bord.html');
  await digibord.waitForTimeout(3800);
  const daar = await digibord.evaluate(() =>
    [...document.querySelectorAll('.hoek .hoek-naam')].map(x => x.textContent));
  zeg('en op het digibord in de klas staat hij er ook vooraan',
      daar.length === 6 && daar[0] === 'Werkplaats', daar.join(', '));

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
