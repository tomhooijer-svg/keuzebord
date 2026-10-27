/* De huisstijl: de app staat in de kleuren van Pixelplein, en een school
   die hem afneemt mag daar haar eigen kleuren voor in de plaats zetten.

   Twee dingen staan hier op het spel. Het eerste is dat de stijl er
   überhaupt is: de letters moeten laden, de stijlbladen moeten gevonden
   worden, en als er één 404 tussen zit ziet de hele app er anders uit
   zonder dat er ergens een foutmelding verschijnt. Het tweede is dat de
   school haar kleuren krijgt -- op elk scherm, op elk apparaat, en
   zonder dat ze zichzelf onleesbaar kan maken.

   En één ding dat erbij hoort: wie de kleuren mag zetten. Het zijn de
   kleuren van de school, dus de schoolbeheerder. Niet de leerkracht, en
   zeker niet de leverancier. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';
const SERVER = 'http://localhost:5455';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}
async function roep(pad, opties){
  const o = opties || {};
  const koppen = { 'Content-Type':'application/json', apikey:'proefsleutel' };
  if (o.token) koppen.Authorization = 'Bearer ' + o.token;
  const r = await fetch(SERVER + pad, { method:o.method || 'GET', headers:koppen,
                                        body:o.lijf ? JSON.stringify(o.lijf) : undefined });
  const t = await r.text();
  let lijf = null;
  try { lijf = t ? JSON.parse(t) : null; } catch (e) { lijf = t; }
  return { status:r.status, lijf };
}
const login = (e) => roep('/auth/v1/token?grant_type=password', { method:'POST',
  lijf:{ email:e, password:'proefproef' } });

// "rgb(14, 42, 86)" -> "#0e2a56"
const naarHex = (s) => {
  const m = String(s).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return s;
  return '#' + m.slice(1, 4).map(x => (+x).toString(16).padStart(2, '0')).join('');
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];
  const kwijt = [];

  await fetch(SERVER + '/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@platform.nl', password:'proefproef' }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  const tom  = (await login('tom@platform.nl')).lijf.access_token;
  const baas = (await login('beheerder@mijnschool.nl')).lijf.access_token;
  const juf  = (await login('juf@mijnschool.nl')).lijf.access_token;
  const school = (await roep('/rest/v1/scholen?select=id,naam,huisstijl', { token:baas })).lijf[0];

  // ── staat de stijl er? ──
  const c = await b.newContext({ viewport:{width:1280,height:920} });
  const p = await c.newPage();
  p.on('pageerror', e => fouten.push(e.message));
  p.on('response', r => { if (r.status() === 404) kwijt.push(r.url().split('/').slice(-2).join('/')); });

  await p.goto(APP + '/demo.html');
  await p.waitForTimeout(500);

  zeg('de stijlmap wordt gevonden', kwijt.length === 0, kwijt.join(', ') || 'geen enkele 404');

  const lopend = await p.evaluate(() => getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g,''));
  zeg('de lopende tekst staat in Figtree', lopend === 'Figtree', lopend);
  const kop = await p.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0].replace(/"/g,''));
  zeg('de koppen staan in Fraunces', kop === 'Fraunces', kop);

  const geladen = await p.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('1rem Figtree') && document.fonts.check('1rem Fraunces');
  });
  zeg('en die letters zijn ook echt geladen', geladen === true, geladen ? 'allebei' : 'niet gevonden');

  const grond = naarHex(await p.evaluate(() => getComputedStyle(document.body).backgroundColor));
  zeg('de ondergrond is het ijsblauw van het merk', grond === '#d8eafb', grond);

  const merk = await p.evaluate(() => {
    const i = document.querySelector('img.merkwoord');
    return i ? { aan: i.complete && i.naturalWidth > 0, alt: i.alt } : null;
  });
  zeg('het woordmerk staat op de demo', !!merk && merk.aan && merk.alt === 'Pixelplein',
      merk ? merk.alt + ', geladen: ' + merk.aan : 'niet gevonden');

  // ── wie de kleuren mag zetten ──
  const jufPoging = await roep('/rest/v1/scholen?id=eq.' + school.id, { method:'PATCH', token:juf,
    lijf:{ huisstijl:{ inkt:'#123456', grond:'#eeeeee', knop:'#ff0000' } } });
  const naJuf = (await roep('/rest/v1/scholen?select=huisstijl', { token:baas })).lijf[0];
  zeg('een leerkracht kan de kleuren niet veranderen',
      JSON.stringify(naJuf.huisstijl) === '{}',
      'status ' + jufPoging.status + ', ' + JSON.stringify(naJuf.huisstijl));

  const baasPoging = await roep('/rest/v1/scholen?id=eq.' + school.id, { method:'PATCH', token:baas,
    lijf:{ huisstijl:{ inkt:'#2d1b55', grond:'#f3eefb', knop:'#7a3fb0' } } });
  const naBaas = (await roep('/rest/v1/scholen?select=huisstijl', { token:baas })).lijf[0];
  zeg('de schoolbeheerder wel', baasPoging.status < 400 && naBaas.huisstijl.inkt === '#2d1b55',
      'status ' + baasPoging.status + ', ' + JSON.stringify(naBaas.huisstijl));

  // Dit is het verschil met modules: dát koopt een school, haar kleuren
  // zijn gewoon van haar. De trekker op scholen mag ze dus niet tegenhouden.
  const eigenModules = (await roep('/rest/v1/scholen?select=modules', { token:baas })).lijf[0];
  zeg('en de onderdelen staan daar los van',
      JSON.stringify(eigenModules.modules) === '{}', JSON.stringify(eigenModules.modules));

  // ── komen ze ook op het scherm? ──
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','beheerder@mijnschool.nl');
  await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/school\.html|beheer\.html/, { timeout: 9000 });
  await p.waitForTimeout(900);

  const inkt = naarHex(await p.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--pp-color-ink').trim()));
  zeg('de inkt van de school staat op de pagina', inkt === '#2d1b55', inkt);
  const knopkleur = naarHex(await p.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--pp-color-red').trim()));
  zeg('en haar knopkleur ook', knopkleur === '#7a3fb0', knopkleur);

  // Afgeleid, niet ingesteld: de ingedrukte knop is de knop met zwart erdoor.
  const diep = naarHex(await p.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--pp-color-red-press').trim()));
  zeg('de ingedrukte knop is daaruit gerekend', diep !== knopkleur && /^#[0-9a-f]{6}$/.test(diep), diep);

  const onthouden = await p.evaluate(() => localStorage.getItem('kb_huisstijl'));
  zeg('deze browser onthoudt ze voor de volgende pagina',
      !!onthouden && JSON.parse(onthouden).inkt === '#2d1b55', String(onthouden).slice(0, 48));

  // Dít is waar het onthouden voor is: een pagina staat meteen goed, en
  // niet eerst een flits Pixelplein terwijl de school nog binnenkomt.
  //
  // Om dat hard te kunnen zeggen houden we het antwoord van de server
  // tegen. Staat de kleur er dán toch, dan kan hij alleen uit het
  // geheugen van deze browser komen -- en precies dat is de belofte.
  // Een proef die in plaats daarvan "snel genoeg kijken" zou doen is
  // geen proef maar een weddenschap.
  const p2 = await c.newPage();
  await p2.route('**/rest/v1/profielen*', route => { /* nooit antwoorden */ });
  await p2.goto(APP + '/beheer.html', { waitUntil: 'domcontentloaded' });
  const meteen = naarHex(await p2.evaluate(() =>
    document.documentElement.style.getPropertyValue('--pp-color-ink').trim()));
  zeg('en zet ze er meteen op, nog voor de server antwoordt', meteen === '#2d1b55', meteen);
  await p2.close();

  // ── het scherm waar je eraan draait ──
  await p.goto(APP + '/school.html');
  await p.waitForSelector('.zij-knop, .menuknop, button', { timeout: 9000 });
  await p.waitForTimeout(700);
  const naarSchool = await p.$('button:has-text("De school"), .zij-knop:has-text("De school")');
  if (naarSchool) { await naarSchool.click(); await p.waitForTimeout(600); }
  await p.waitForSelector('.huisstijlrij', { timeout: 9000 });
  const kiezers = await p.$$eval('.huisstijlkleur input[type="color"]', n => n.map(x => x.value));
  // Dit waren er eerst drie. Met zes kan een school meer, en kan ze
  // zichzelf ook onleesbaar maken -- vandaar de controle hieronder.
  zeg('er staan zes kleuren om aan te draaien', kiezers.length === 6, kiezers.join(' '));
  zeg('en ze staan op de kleuren van de school',
      kiezers.indexOf('#2d1b55') >= 0 && kiezers.indexOf('#7a3fb0') >= 0, kiezers.join(' '));

  /* Zwijgen als de tekst onleesbaar wordt zou geen dienst zijn. We
     verbieden het niet -- het is hun school -- maar het hoort er wel te
     staan, en er moet bij staan wát er niet leest. */
  const voorHet = (await p.textContent('.leesbaarheid') || '').trim();
  zeg('en er staat of het leesbaar is', voorHet.length > 0, voorHet.slice(0, 44));

  await p.evaluate(() => {
    const k = [...document.querySelectorAll('.huisstijlkleur input[type="color"]')];
    k[0].value = '#eeeeee';                       // inkt bijna wit
    k[0].dispatchEvent(new Event('input', { bubbles: true }));
  });
  await p.waitForTimeout(300);
  const klacht = (await p.textContent('.leesbaarheid') || '').trim();
  zeg('bij lichtgrijze tekst op wit klaagt hij',
      /slecht leesbaar|krap/.test(klacht), klacht.slice(0, 60));
  zeg('en zegt erbij wat er niet leest',
      /Tekst op/.test(klacht), (klacht.match(/Tekst op [^(]*/) || ['\u2014'])[0].slice(0, 40));

  await p.click('button:has-text("Terug naar Pixelplein")');
  await p.waitForTimeout(1200);
  const terug = (await roep('/rest/v1/scholen?select=huisstijl', { token:baas })).lijf[0];
  zeg('"Terug naar Pixelplein" zet ze weer leeg',
      JSON.stringify(terug.huisstijl) === '{}', JSON.stringify(terug.huisstijl));
  const weerStandaard = await p.evaluate(() =>
    document.documentElement.style.getPropertyValue('--pp-color-ink'));
  zeg('en haalt ze ook van de pagina af', weerStandaard === '', '"' + weerStandaard + '"');

  // ── de leverancier blijft erbuiten ──
  // Hij mag wel aan modules komen (dat verkoopt hij), en technisch ook
  // aan de rij zelf; wat hij niet doet is het stiekem doen. Hier gaat het
  // erom dat de kolom bestaat en los staat van wat hij beheert.
  const tomZiet = await roep('/rest/v1/scholen?select=id,naam,modules,huisstijl', { token:tom });
  zeg('de leverancier ziet de school in zijn lijst staan',
      tomZiet.status < 400 && (tomZiet.lijf || []).length >= 1,
      'status ' + tomZiet.status);

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');
  zeg('en nergens een ontbrekend bestand', kwijt.length === 0,
      [...new Set(kwijt)].join(', ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
