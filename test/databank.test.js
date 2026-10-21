/* De hoeken-databank: jouw verzameling die elke school ziet, en een
   leerkracht die er een hoek uit naar haar eigen groep kopieert.

   Het punt dat deze proef bewaakt: de kopie is een kopie. Pas jij de
   databank daarna aan, dan verandert er niets in een klas. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';
const SERVER = 'http://localhost:5455';

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}

/* Een geldige PNG van één pixel, zodat er echt een bestand door de
   opslag gaat in plaats van iets dat er alleen op lijkt. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

async function apparaat(b){
  const c = await b.newContext({ viewport:{width:1280,height:900} });
  const p = await c.newPage();
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return p;
}
async function inloggen(p, email){
  await p.fill('#email', email);
  await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

  await fetch(SERVER + '/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@platform.nl', password:'proefproef' }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  // ── jij vult de databank ──
  const p = await apparaat(b);
  await inloggen(p, 'tom@platform.nl');
  await p.waitForURL(/platform\.html/, { timeout: 9000 });
  await p.click('.zij-knop:has-text("Hoeken-databank")');
  await p.waitForSelector('.leegvak, .paneel', { timeout: 5000 });
  zeg('de databank begint leeg', await p.isVisible('.leegvak'));

  await p.click('button:has-text("Hoek toevoegen")');
  await p.waitForSelector('.overlay.open', { timeout: 4000 });
  await p.fill('#hoeknaam', 'Bouwhoek');
  await p.fill('#hoekcategorie', 'Altijd');
  await p.fill('#hoekplekken', '4');
  await p.setInputFiles('#hoekfoto', { name:'bouwhoek.png', mimeType:'image/png', buffer:PIXEL });
  await p.click('.blad button:has-text("Bewaren")');
  await p.waitForSelector('.paneel .logrij', { timeout: 9000 });

  const regel = await p.textContent('.paneel .logrij');
  zeg('de hoek staat in de databank', /Bouwhoek/.test(regel), regel.trim().slice(0, 60));
  zeg('met de omvang van de foto erbij', /B\b|kB/.test(regel), regel.trim().slice(0, 80));
  zeg('en nog niet gebruikt', /nog niet gebruikt/.test(regel), regel.trim().slice(0, 80));

  const inDb = psql("select count(*) from public.hoeken where school_id is null");
  zeg('en hij staat zonder school in de database', inDb === '1', inDb + ' rijen zonder school');
  const pad = psql("select foto_pad from public.hoeken where school_id is null");
  zeg('de foto ligt in de map basis', /^basis\//.test(pad), pad);

  // ── een leerkracht kopieert hem ──
  const q = await apparaat(b);
  await inloggen(q, 'juf@mijnschool.nl');
  await q.waitForURL(/beheer\.html/, { timeout: 9000 });
  await q.waitForTimeout(2500);               // even laten synchroniseren
  await q.click('.zij-knop:has-text("Hoeken")');
  await q.waitForSelector('button:has-text("Uit de databank")', { timeout: 6000 });
  await q.click('button:has-text("Uit de databank")');
  await q.waitForSelector('.blad .rij', { timeout: 9000 });
  const aanbod = await q.textContent('.blad');
  zeg('de leerkracht ziet jouw hoek in de databank', /Bouwhoek/.test(aanbod),
      aanbod.replace(/\s+/g, ' ').slice(0, 70));

  await q.click('.blad button:has-text("Kopieer")');
  await q.waitForTimeout(1200);
  const eigen = await q.evaluate(() => (KB.klas().hoekLib || []).map(h => ({
    naam:h.naam, uit:h.uitDatabank, foto:!!h.fotoId })));
  const kopie = eigen.filter(h => h.naam === 'Bouwhoek')[0];
  zeg('de hoek staat nu in haar groep', !!kopie, JSON.stringify(eigen.map(h => h.naam)));
  zeg('met de foto erbij', !!(kopie && kopie.foto), kopie ? String(kopie.foto) : '—');
  zeg('en met de herkomst erbij', !!(kopie && kopie.uit), kopie ? String(kopie.uit).slice(0, 8) : '—');

  // ── en de kopie is echt een kopie ──
  await q.evaluate(() => (window.KBV && KBV.stuurNu ? KBV.stuurNu() : null));
  await q.waitForTimeout(2500);
  const opServer = psql("select count(*) from public.hoeken where uit_databank is not null");
  zeg('de kopie staat op de server, met herkomst', opServer === '1', opServer + ' kopie');

  psql("update public.hoeken set naam = 'Bouwhoek (vernieuwd)', max_kinderen = 9 " +
       "where school_id is null");
  const naKopie = psql("select naam || ' / ' || max_kinderen from public.hoeken " +
                       "where uit_databank is not null");
  zeg('de databank aanpassen verandert niets in de groep',
      naKopie === 'Bouwhoek / 4', naKopie);

  // ── terug bij jou: de teller loopt ──
  await p.click('.zij-knop:has-text("Scholen")');
  await p.click('.zij-knop:has-text("Hoeken-databank")');
  await p.waitForTimeout(900);
  const regel2 = await p.textContent('.paneel .logrij');
  zeg('je ziet dat hij één keer is gekopieerd',
      /1 keer gekopieerd door 1 school/.test(regel2), regel2.replace(/\s+/g,' ').trim().slice(0, 80));

  // ── wie er niet bij mag ──
  const baas = await fetch(SERVER + '/auth/v1/token?grant_type=password', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'beheerder@mijnschool.nl', password:'proefproef' }) })
    .then(r => r.json());
  const stiekem = await fetch(SERVER + '/rest/v1/hoeken', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel',
                             Authorization:'Bearer ' + baas.access_token },
    body: JSON.stringify([{ school_id:null, groep_id:null, naam:'Mijn eigen databank' }]) });
  zeg('een schoolbeheerder kan niets in de databank zetten', stiekem.status >= 400,
      'status ' + stiekem.status);

  const telNog = psql("select count(*) from public.hoeken where school_id is null");
  zeg('en de databank is onveranderd', telNog === '1', telNog + ' hoeken');

  await p.screenshot({ path: process.env.SCHOT ? 'databank.png' : '/dev/null' }).catch(()=>{});

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
