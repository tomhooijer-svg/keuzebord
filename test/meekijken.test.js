/* De deur die een school zelf openzet.

   Dit is de kant van de school. Wie dit product levert komt niet bij de
   kinderen, de borden en de statistieken -- tenzij de schoolbeheerder
   hier de deur openzet, en dan alleen zolang die openstaat. Zie
   docs/ROLLEN.md.

   Wat deze proef bewaakt: alleen de schoolbeheerder kan het, het staat
   er zichtbaar bij zolang het aanstaat, het kan weer dicht, en elke stap
   komt in een logboek dat niemand kan herschrijven. */
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

async function apparaat(b){
  const c = await b.newContext({ viewport:{width:1280,height:980} });
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
  const uitFouten = [];

  // de leverancier bestaat alleen als je hem met de hand benoemt
  await fetch(SERVER + '/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@platform.nl', password:'proefproef' }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  const tom = (await roep('/auth/v1/token?grant_type=password', { method:'POST',
    lijf:{ email:'tom@platform.nl', password:'proefproef' } })).lijf.access_token;

  // de schoolbeheerder zet een kind neer om naar te kunnen kijken
  const baas = (await roep('/auth/v1/token?grant_type=password', { method:'POST',
    lijf:{ email:'beheerder@mijnschool.nl', password:'proefproef' } })).lijf.access_token;
  const groepen = (await roep('/rest/v1/groepen?select=id,naam&order=volgorde', { token:baas })).lijf;
  const school = (await roep('/rest/v1/scholen?select=id', { token:baas })).lijf[0].id;
  const kids = (await roep('/rest/v1/leerlingen', { method:'POST', token:baas,
    lijf:[{ groep_id: groepen[0].id, naam:'Fien' }] })).lijf;
  /* Een echt bord: zonder hoeken valt er bij het meekijken niets te zien,
     en dan toetst de proef alleen het lege geval. */
  const hoeken = (await roep('/rest/v1/hoeken', { method:'POST', token:baas,
    lijf:[{ school_id: school, groep_id: groepen[0].id, naam:'Bouwhoek', max_kinderen:4 },
          { school_id: school, groep_id: groepen[0].id, naam:'Huishoek', max_kinderen:3 }] })).lijf;
  const borden = (await roep('/rest/v1/borden?select=id,groep_id', { token:baas })).lijf;
  const bord = borden.filter(x => x.groep_id === groepen[0].id)[0];
  await roep('/rest/v1/bord_hoeken', { method:'POST', token:baas,
    lijf: hoeken.map((h, i) => ({ bord_id: bord.id, hoek_id: h.id, volgorde: i })) });
  await roep('/rest/v1/plaatsingen', { method:'POST', token:baas,
    lijf:[{ bord_id: bord.id, hoek_id: hoeken[0].id, leerling_id: kids[0].id }] });

  const dichtVoor = (await roep('/rest/v1/leerlingen', { token:tom })).lijf;
  zeg('voordat de deur opengaat ziet de leverancier niets',
      Array.isArray(dichtVoor) && dichtVoor.length === 0, dichtVoor.length + ' kinderen');

  // ── de leerkracht mag dit niet ──
  const juf = await apparaat(b);
  juf.on('pageerror', e => uitFouten.push(e.message));
  await inloggen(juf, 'juf@mijnschool.nl');
  await juf.waitForURL(/beheer\.html/, { timeout: 9000 }).catch(()=>{});
  await juf.goto(APP + '/school.html');
  await juf.waitForSelector('.zij-knop', { timeout: 9000 });
  await juf.click('.zij-knop:has-text("De school")');
  await juf.waitForTimeout(1200);
  const jufZiet = await juf.textContent('.inhoud');
  zeg('een leerkracht krijgt geen knop om de deur open te zetten',
      /Alleen de schoolbeheerder kan dit aanzetten/.test(jufZiet)
      && !/Deur openzetten/.test(jufZiet), 'alleen de uitleg');

  // ── de schoolbeheerder wel ──
  const p = await apparaat(b);
  p.on('pageerror', e => uitFouten.push(e.message));
  await inloggen(p, 'beheerder@mijnschool.nl');
  await p.waitForURL(/school\.html/, { timeout: 9000 }).catch(()=>{});
  await p.waitForSelector('.zij-knop', { timeout: 9000 });
  await p.click('.zij-knop:has-text("De school")');
  await p.waitForSelector('button:has-text("Deur openzetten")', { timeout: 9000 });
  zeg('de schoolbeheerder ziet de knop wel', true, 'staat er');

  await p.click('button:has-text("Deur openzetten")');
  await p.waitForSelector('.overlay.open', { timeout: 4000 });
  await p.click('.blad button:has-text("Deur openzetten")');
  await p.waitForTimeout(500);
  const zonderReden = await p.isVisible('.overlay.open');
  zeg('zonder reden gaat hij niet open', zonderReden === true, 'blad blijft staan');

  await p.fill('.blad input[type="text"]', 'Het bord van 1A loopt vast');
  await p.click('.blad .chip:has-text("Een uur")');
  await p.click('.blad button:has-text("Deur openzetten")');
  await p.waitForSelector('text=Er kan nu worden meegekeken', { timeout: 9000 });
  const open = await p.textContent('.inhoud');
  zeg('daarna staat er zichtbaar dat er kan worden meegekeken',
      /Er kan nu worden meegekeken/.test(open), 'met tot-tijdstip');
  zeg('met de reden erbij', /loopt vast/.test(open), 'de reden staat erbij');

  // ── en nu ziet de leverancier het wél ──
  const nu = (await roep('/rest/v1/leerlingen', { token:tom })).lijf;
  zeg('nu ziet de leverancier de kinderen', nu.length === 1,
      nu.map(l => l.naam).join(', '));

  // ── het staat in het logboek, bij de school zelf ──
  const log = await p.textContent('.inhoud');
  zeg('het staat meteen in het logboek van de school',
      /ondersteuning aangezet/.test(log), 'regel staat er');
  zeg('met de belofte dat niemand hem kan herschrijven',
      /kan niemand wijzigen of wissen/.test(log), 'staat erbij');

  const onherschrijfbaar = await roep(
    '/rest/v1/handelingen?wat=eq.ondersteuning%20aangezet',
    { method:'PATCH', token:baas, lijf:{ wat:'niets aan de hand' } });
  const nogSteeds = psql("select count(*) from public.handelingen where wat = 'ondersteuning aangezet'");
  zeg('en dat klopt ook echt', nogSteeds === '1',
      nogSteeds + ' regel, status ' + onherschrijfbaar.status);

  // ── en zo ziet dat eruit bij de leverancier ──
  const tp = await apparaat(b);
  tp.on('pageerror', e => uitFouten.push(e.message));
  await inloggen(tp, 'tom@platform.nl');
  await tp.waitForURL(/platform\.html/, { timeout: 9000 });
  await tp.waitForSelector('.schoolkaart', { timeout: 9000 });
  zeg('bij een school met een open deur staat een knop Meekijken',
      await tp.isVisible('button:has-text("Meekijken")'), 'knop staat er');

  await tp.click('button:has-text("Meekijken")');
  await tp.waitForSelector('.blad .logrij', { timeout: 6000 });
  const groepenInBlad = await tp.$$eval('.blad .logwat', ns => ns.map(n => n.textContent));
  zeg('hij kan kiezen uit de groepen van die school',
      groepenInBlad.indexOf('Groep 1A') >= 0, groepenInBlad.slice(0, 3).join(', '));

  await tp.click('.blad button:has-text("Openen")');
  await tp.waitForSelector('#meekijkbalk', { timeout: 9000 });
  const balk = (await tp.textContent('#meekijkbalk')).replace(/\s+/g, ' ');
  zeg('er staat een balk die zegt waar hij meekijkt',
      /Je kijkt mee.*Groep 1A van Mijn school/.test(balk), balk.slice(0, 50));
  const balkWeg = await tp.evaluate(() => {
    const el = document.getElementById('meekijkbalk');
    /* Een klik ernaast mag hem niet wegkrijgen; alleen Stoppen. */
    el.click();
    return !document.getElementById('meekijkbalk');
  });
  zeg('en die balk is niet weg te klikken', balkWeg === false, 'blijft staan');

  await tp.waitForSelector('text=Wie staat waar', { timeout: 9000 });
  const bordTekst = (await tp.textContent('.inhoud')).replace(/\s+/g, ' ');
  zeg('hij ziet wie er in welke hoek staat',
      /Bouwhoek\s*Fien/.test(bordTekst), (bordTekst.match(/Bouwhoek[^0-9]{0,20}/) || ['—'])[0]);
  zeg('en dat hij alleen kijkt, niet bedient',
      /Bedienen zit hier nog niet in/.test(bordTekst), 'staat erbij');

  const gekeken = psql("select count(*) from public.handelingen where wat = 'meegekeken'");
  zeg('dat hij heeft gekeken staat in het logboek van de school',
      gekeken === '1', gekeken + ' regel');

  await tp.click('#meekijkbalk button:has-text("Stoppen")');
  await tp.waitForSelector('#meekijkbalk', { state: 'detached', timeout: 9000 });
  zeg('met Stoppen gaat de balk weg', true, 'weg');

  // ── weer dicht ──
  await p.click('button:has-text("Nu dichtdoen")');
  /* Wachten tot de melding wég is, niet tot de knop er is: "Deur
     openzetten" staat ook in het venster dat net is gesloten, en dan
     gaat de proef door terwijl het scherm nog niet is bijgewerkt. */
  await p.waitForSelector('text=Er kan nu worden meegekeken',
                          { state: 'detached', timeout: 9000 });
  const dicht = (await roep('/rest/v1/leerlingen', { token:tom })).lijf;
  zeg('na dichtdoen ziet de leverancier weer niets', dicht.length === 0,
      dicht.length + ' kinderen');
  /* Wachten tot de regel er staat in plaats van één keer kijken: het
     logboek wordt opnieuw opgehaald nadat de knop al is omgewisseld,
     dus een losse meting valt er net naast. */
  const gelogd = await p.waitForSelector('text=ondersteuning ingetrokken', { timeout: 9000 })
                        .then(() => true, () => false);
  zeg('en ook het dichtdoen staat in het logboek', gelogd,
      gelogd ? 'regel staat er' : 'niet verschenen binnen 9 seconden');

  await tp.reload();
  await tp.waitForSelector('.schoolkaart', { timeout: 9000 });
  zeg('met de deur dicht is er ook geen knop Meekijken meer',
      !(await tp.isVisible('button:has-text("Meekijken")')), 'knop weg');

  zeg('geen enkele fout in de pagina', uitFouten.length === 0,
      uitFouten.slice(0, 2).join(' | ') || 'geen');

  await p.screenshot({ path: process.env.SCHOT ? 'meekijken.png' : '/dev/null' }).catch(()=>{});

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
