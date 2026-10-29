/* Twee adressen tegelijk: het oude GitHub-adres en app.pixelplein.nl.

   Wat hier telt:
   1. Op beide adressen wijzen de knoppen naar de andere app goed. Op het
      subdomein is er geen buurmap ../planbord/, dus daar moet het het
      volledige adres zijn.
   2. Staat de verhuizing aan, dan ziet wie op het oude adres werkt een
      melding -- en zolang er nog iets niet verstuurd is, géén knop naar
      het nieuwe adres. De opslag zit per adres in de browser; wat hier
      nog klaarstaat ziet het nieuwe adres nooit.
   3. Staat hij uit, of zit je niet op het oude adres, dan is er niets. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';
const NIEUW = 'https://app.pixelplein.nl/';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

/* kb-app.js met een eigen staart erachter: zo spelen we het oude adres
   na zonder de werkplaats aan te passen. */
async function metConfig(p, staart){
  await p.unroute('**/src/kb-app.js*').catch(() => {});
  await p.route('**/src/kb-app.js*', async (route) => {
    const r = await route.fetch();
    route.fulfill({ response: r, body: (await r.text()) + '\n' + staart });
  });
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  // ── 1. de knoppen naar de andere app ──
  await p.goto(APP + '/demo.html');
  const adressen = await p.evaluate((APP) => {
    const bewaar = window.KB_APP;
    window.KB_APP = { id:'keuzebord', apps:{
      keuzebord:{ naam:'Keuzebord', map:'keuzebord-app', url:'https://oud.voorbeeld/keuzebord-app/', ook:[APP + '/'] },
      planbord: { naam:'Planbord',  map:'planbord',      url:'https://plan.voorbeeld/planbord/' } } };
    const opOok = KB.appAdres('planbord', 'beheer.html');
    window.KB_APP.apps.keuzebord.ook = [];
    const ergensAnders = KB.appAdres('planbord', 'beheer.html');
    window.KB_APP = bewaar;
    return { opOok, ergensAnders };
  }, APP);
  zeg('op het tweede adres wijst de knop naar het volledige adres van Planbord',
      adressen.opOok.indexOf('https://plan.voorbeeld/planbord/beheer.html') === 0, adressen.opOok);
  zeg('op een onbekend adres (testserver) naar de buurmap, zoals altijd',
      adressen.ergensAnders.indexOf('../planbord/beheer.html') === 0, adressen.ergensAnders);

  // ── 2. de 404 op het tweede adres ──
  await metConfig(p, `KB_APP.id='keuzebord';
    KB_APP.apps.keuzebord.url='https://oud.voorbeeld/keuzebord-app/';
    KB_APP.apps.keuzebord.ook=['${APP}/'];`);
  await p.goto(APP + '/404.html');
  const naar404 = await p.evaluate(() =>
    [...document.querySelectorAll('#wegen a')].map(a => a.getAttribute('href')));
  zeg('de 404-pagina wijst op het tweede adres naar het echte Planbord',
      naar404.indexOf('https://tomhooijer-svg.github.io/planbord/') >= 0, naar404.join(' | '));

  // ── 3. de verhuizing staat uit ──
  await p.unroute('**/src/kb-app.js*');
  await p.goto(APP + '/inloggen.html');
  await p.waitForTimeout(300);
  zeg('zolang de verhuizing uit staat is er geen melding',
      (await p.$('#verhuismelding')) === null);

  // ── 4. aan, op het oude adres, alles verstuurd ──
  await metConfig(p, `KB_APP.verhuizing={aan:true, van:'${APP}/', naar:'${NIEUW}'};`);
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { try { localStorage.removeItem('kb_wachtend'); } catch (e) {} });
  await p.reload();
  await p.waitForSelector('#verhuismelding', { timeout: 5000 }).catch(() => {});
  const leeg = await p.evaluate(() => {
    const m = document.getElementById('verhuismelding');
    const a = m && m.querySelector('.verhuis-heen');
    return m && { tekst: m.textContent, href: a && a.href, zichtbaar: !!a && a.offsetWidth > 0 };
  });
  zeg('op het oude adres staat de verhuismelding', !!leeg);
  zeg('met het nieuwe adres erin', !!leeg && leeg.tekst.indexOf('app.pixelplein.nl') >= 0);
  zeg('niets meer te versturen: dan mag je overstappen',
      !!leeg && /Alles op dit apparaat is verstuurd/.test(leeg.tekst));
  zeg('en de knop brengt je naar hetzelfde scherm op het nieuwe adres',
      !!leeg && leeg.zichtbaar && leeg.href === NIEUW + 'inloggen.html', leeg && leeg.href);

  // ── 5. er staat nog iets klaar ──
  await p.evaluate(() => localStorage.setItem('kb_wachtend', JSON.stringify({ proefgroep: Date.now() })));
  await p.waitForTimeout(3500);
  const vol = await p.evaluate(() => {
    const m = document.getElementById('verhuismelding');
    return { tekst: m.textContent, wacht: m.classList.contains('wacht'),
             knop: m.querySelector('.verhuis-heen').offsetWidth > 0 };
  });
  zeg('staat er nog iets klaar, dan zegt de melding dat',
      /nog wijzigingen die niet verstuurd zijn/.test(vol.tekst), vol.tekst.slice(0, 80));
  zeg('en is er geen knop naar het nieuwe adres', vol.knop === false);
  zeg('de melding kleurt dan als waarschuwing', vol.wacht === true);

  await p.evaluate(() => localStorage.removeItem('kb_wachtend'));
  await p.waitForTimeout(3500);
  zeg('is het verstuurd, dan komt de knop vanzelf terug',
      await p.evaluate(() => document.querySelector('#verhuismelding .verhuis-heen').offsetWidth > 0));

  // ── 6. aan, maar op het nieuwe adres ──
  await metConfig(p, `KB_APP.verhuizing={aan:true, van:'https://oud.voorbeeld/keuzebord-app/', naar:'${APP}/'};`);
  await p.goto(APP + '/inloggen.html');
  await p.waitForTimeout(300);
  zeg('op het nieuwe adres is er geen melding', (await p.$('#verhuismelding')) === null);

  zeg('geen fouten in de pagina', fouten.length === 0, fouten.join(' | '));

  await b.close();
  console.log(uit.join('\n'));
})().catch(e => { console.log(uit.join('\n')); console.log('ER GING IETS MIS', e); process.exit(1); });
