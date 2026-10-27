/* Een wachtwoord opnieuw instellen.

   Inloggen gaat met een gebruikersnaam, dus er is geen adres om een
   herstelmail heen te sturen. Wie het kwijt is krijgt een nieuw van een
   mens. Dat betekent dat er een knop bestaat waarmee de ene persoon het
   wachtwoord van de andere vervangt -- en dan is de vraag wie dat van
   wie mag de belangrijkste van allemaal.

   Wat hier bewaakt wordt:

   1. Het werkt. Na het zetten komt zij binnen met het nieuwe en niet
      meer met het oude. Dat is geen vanzelfsprekendheid: de functie
      schrijft in auth.users, een tabel van Supabase zelf, en als
      Supabase ooit verandert hoe wachtwoorden worden opgeslagen breekt
      dat stil -- "gezet" en "kan niet inloggen" zien er van buiten
      hetzelfde uit.

   2. Het mag niet van iedereen. Een leerkracht mag niet aan het
      wachtwoord van haar collega, en al helemaal niet aan dat van een
      andere school. Eén gaatje hier en het hele rollenverhaal is leeg.

   3. Er komt een regel in het logboek. Een wachtwoord vervangen is een
      ingreep in andermans account; dat hoort na te lezen te zijn. */
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

async function roep(pad, o){
  o = o || {};
  const koppen = { 'Content-Type':'application/json', apikey:'proefsleutel' };
  if (o.token) koppen.Authorization = 'Bearer ' + o.token;
  const r = await fetch(SERVER + pad, { method:o.method || 'GET', headers:koppen,
                                        body:o.lijf ? JSON.stringify(o.lijf) : undefined });
  const t = await r.text();
  try { return { status:r.status, lijf: t ? JSON.parse(t) : null }; }
  catch (e) { return { status:r.status, lijf:t }; }
}
const inloggen = (naam, ww) => roep('/auth/v1/token?grant_type=password',
  { method:'POST', lijf:{ email:naam, password:ww } });

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  // ── mensen klaarzetten ──
  await roep('/auth/v1/signup', { method:'POST',
    lijf:{ email:'tom@platform.nl', password:'platformwachtwoord' } });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  const tom  = (await inloggen('tom@platform.nl', 'platformwachtwoord')).lijf.access_token;
  const baas = (await inloggen('beheerder@mijnschool.nl', 'proefproef')).lijf.access_token;
  const juf  = (await inloggen('juf@mijnschool.nl', 'proefproef')).lijf.access_token;

  const ids = {};
  (await roep('/rest/v1/profielen?select=id,rol,email', { token:baas })).lijf
    .forEach(p => { ids[p.email] = p.id; });
  const jufId = ids['juf@mijnschool.nl'];
  const baasId = ids['beheerder@mijnschool.nl'];

  // ── wie mag het niet ──
  const doorJuf = await roep('/rest/v1/rpc/wachtwoord_zetten', { method:'POST', token:juf,
    lijf:{ wie: baasId, nieuw: 'ietsanders-dan-dit' } });
  zeg('een leerkracht mag niet aan het wachtwoord van haar beheerder',
      doorJuf.status >= 400, 'status ' + doorJuf.status);

  const zonderInloggen = await roep('/rest/v1/rpc/wachtwoord_zetten', { method:'POST',
    lijf:{ wie: jufId, nieuw: 'zomaar-van-buiten' } });
  zeg('en van buitenaf al helemaal niet', zonderInloggen.status >= 400,
      'status ' + zonderInloggen.status);

  // Een wachtwoord dat te kort is, is geen wachtwoord.
  const tekort = await roep('/rest/v1/rpc/wachtwoord_zetten', { method:'POST', token:baas,
    lijf:{ wie: jufId, nieuw: 'kort' } });
  zeg('een te kort wachtwoord wordt geweigerd', tekort.status >= 400,
      (tekort.lijf && tekort.lijf.message || '').slice(0, 44));

  // Het oude moet na al die mislukte pogingen nog gewoon werken.
  const nogSteeds = await inloggen('juf@mijnschool.nl', 'proefproef');
  zeg('en het oude wachtwoord werkt dan nog steeds', nogSteeds.status < 400,
      'status ' + nogSteeds.status);

  // ── wie het wel mag ──
  const door = await roep('/rest/v1/rpc/wachtwoord_zetten', { method:'POST', token:baas,
    lijf:{ wie: jufId, nieuw: 'zandbak-tulp-regen-7' } });
  zeg('de schoolbeheerder mag het voor haar eigen team', door.status < 400,
      'status ' + door.status);

  /* Op het kaartje staat haar gebruikersnaam, niet haar oude adres. Het
     terugzetten zet het account daarom meteen om; anders staat er op
     papier iets dat niet werkt. */
  const naOmzetten = psql("select email from public.profielen where id = '" + jufId + "'");
  zeg('het account staat nu op haar gebruikersnaam',
      naOmzetten === 'juf@keuzebord.invalid', naOmzetten);

  const metNieuw = await inloggen('juf@keuzebord.invalid', 'zandbak-tulp-regen-7');
  zeg('daarna komt zij binnen met het nieuwe wachtwoord',
      metNieuw.status < 400 && !!(metNieuw.lijf && metNieuw.lijf.access_token),
      'status ' + metNieuw.status);

  const metOud = await inloggen('juf@mijnschool.nl', 'proefproef');
  zeg('en haar oude adres met oude wachtwoord werkt niet meer',
      metOud.status >= 400, 'status ' + metOud.status);

  const oudAdresNieuwWw = await inloggen('juf@mijnschool.nl', 'zandbak-tulp-regen-7');
  zeg('het oude adres werkt sowieso niet meer', oudAdresNieuwWw.status >= 400,
      'status ' + oudAdresNieuwWw.status);

  // Dit is waar het stil mis kan gaan: opgeslagen zoals Supabase het
  // zelf doet, gehasht en niet in platte tekst.
  const hoeOpgeslagen = psql(
    "select case when encrypted_password like '$2%' then 'gehasht' " +
    "else coalesce(encrypted_password, 'leeg') end from auth.users " +
    "where lower(email) = 'juf@keuzebord.invalid'");
  zeg('het staat gehasht in de database, niet leesbaar',
      hoeOpgeslagen === 'gehasht', hoeOpgeslagen);

  // ── de leverancier mag het ook, maar krijgt er niets bij te zien ──
  const doorTom = await roep('/rest/v1/rpc/wachtwoord_zetten', { method:'POST', token:tom,
    lijf:{ wie: baasId, nieuw: 'vijver-wolk-schelp-4' } });
  zeg('de leverancier mag een schoolbeheerder terugzetten', doorTom.status < 400,
      'status ' + doorTom.status);
  const baasNieuw = await inloggen('beheerder@keuzebord.invalid', 'vijver-wolk-schelp-4');
  zeg('en die komt binnen met haar nieuwe kaartje', baasNieuw.status < 400,
      'status ' + baasNieuw.status);

  const kinderen = await roep('/rest/v1/leerlingen?select=naam', { token:tom });
  zeg('maar hij ziet daarmee nog steeds geen kinderen',
      (kinderen.lijf || []).length === 0, (kinderen.lijf || []).length + ' kinderen');

  // ── het logboek ──
  const regels = psql("select count(*) from public.handelingen " +
                      "where wat = 'wachtwoord opnieuw ingesteld'");
  zeg('elke keer komt er een regel in het logboek', regels === '2', regels + ' regels');
  const zonderWachtwoord = psql(
    "select count(*) from public.handelingen where wat = 'wachtwoord opnieuw ingesteld' " +
    "and (gegevens::text like '%zandbak%' or gegevens::text like '%vijver%')");
  // Een logboek dat het wachtwoord bewaart is erger dan geen logboek.
  zeg('zonder dat het wachtwoord erin staat', zonderWachtwoord === '0',
      zonderWachtwoord + ' regels met een wachtwoord erin');

  // ── en zo gaat het in het scherm ──
  const c = await b.newContext({ viewport:{ width:1360, height:960 } });
  const p = await c.newPage();
  p.on('pageerror', e => fouten.push(e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  // Vanaf nu met haar gebruikersnaam, zoals op het kaartje.
  await p.fill('#email','beheerder');
  await p.fill('#ww','vijver-wolk-schelp-4');
  await p.click('#verstuur');
  await p.waitForURL(/school\.html/, { timeout: 12000 });
  await p.waitForTimeout(2500);
  await p.click('.zij-knop:has-text("Accounts")');
  await p.waitForTimeout(900);

  zeg('bij elke collega staat een knop voor een nieuw wachtwoord',
      (await p.$$('.ledenrij button:has-text("Nieuw wachtwoord")')).length >= 1,
      (await p.$$('.ledenrij button:has-text("Nieuw wachtwoord")')).length + ' knoppen');

  await p.click('.ledenrij button:has-text("Nieuw wachtwoord")');
  await p.waitForSelector('.blad', { timeout: 6000 });
  await p.waitForTimeout(400);
  const waarschuwing = (await p.textContent('.blad')).replace(/\s+/g, ' ');
  zeg('er wordt eerst gewaarschuwd dat het oude vervalt',
      /werkt daarna niet meer/.test(waarschuwing), waarschuwing.slice(0, 56));

  await p.click('.blad button:has-text("Nieuw wachtwoord")');
  await p.waitForSelector('.kaartje', { timeout: 12000 });
  await p.waitForTimeout(500);
  const kaart = await p.evaluate(() => {
    const r = [...document.querySelectorAll('.kaartje-regel')]
      .map(x => [x.querySelector('.l').textContent, x.querySelector('.w').textContent]);
    const zoek = (l) => (r.filter(x => x[0] === l)[0] || [])[1] || '';
    return { gebruiker: zoek('Gebruikersnaam'), wachtwoord: zoek('Wachtwoord') };
  });
  zeg('en er rolt een kaartje uit met de gebruikersnaam erop',
      !!kaart.gebruiker, kaart.gebruiker || 'leeg');
  zeg('met een nieuw wachtwoord van drie woorden',
      /^[a-z]+-[a-z]+-[a-z]+-[2-9]$/.test(kaart.wachtwoord), kaart.wachtwoord);

  /* De laatste en enige vraag die telt: typ letterlijk over wat er op
     het kaartje staat, in het inlogscherm. Niet via de API -- die kent
     de omzetting van gebruikersnaam naar adres niet, want die zit in de
     app. En het is de app waar een juf voor staat. */
  const haar = await b.newContext({ viewport:{ width:1280, height:900 } });
  const hp = await haar.newPage();
  await hp.goto(APP + '/inloggen.html');
  await hp.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await hp.goto(APP + '/inloggen.html');
  await hp.fill('#email', kaart.gebruiker);
  await hp.fill('#ww', kaart.wachtwoord);
  await hp.click('#verstuur');
  await hp.waitForTimeout(3500);
  const waarZij = hp.url().split('/').pop();
  zeg('en met dat kaartje overgetypt komt zij er ook echt in',
      !/inloggen\.html/.test(waarZij), waarZij);
  await haar.close();

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => {
  if (uit.length) console.log(uit.join('\n'));
  console.error('Error:', e && e.stack || e);
  process.exit(1);
});
