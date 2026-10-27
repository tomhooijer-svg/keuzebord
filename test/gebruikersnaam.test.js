/* Inloggen met een gebruikersnaam.

   Een testleerkracht krijgt een kaartje in haar handen en moet binnen een
   minuut binnen zijn. Een e-mailadres intypen op een digibord is daarvoor
   te veel gedoe, en het betekent ook dat er van elke juf een echt adres
   in dit systeem staat.

   Supabase herkent iemand altijd aan een e-mailadres, dus achter de
   gebruikersnaam zit er een: juf.marieke@keuzebord.invalid. Dat .invalid
   is officieel vastgelegd om nooit te bestaan, dus er kan nooit per
   ongeluk post heen.

   Twee dingen bewaakt deze proef vooral:

   1. De app en de database moeten het eens zijn over hoe een
      gebruikersnaam een adres wordt. Zijn ze dat niet, dan maakt het
      accountscherm iemand aan die daarna niet kan inloggen -- en dat zie
      je pas als er een leerkracht voor een digibord staat.
   2. Bestaande accounts met een echt adres blijven werken. Tijdens het
      omzetten bestaan beide vormen even naast elkaar, en dan hoort
      niemand buiten te staan. */
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

async function probeerInloggen(p, naam, ww){
  /* Eerst naar een lege pagina. Na een geslaagde inlog is de app zelf aan
     het doorsturen, en dan botst onze navigatie daarmee -- de browser
     breekt er een van af en je krijgt ERR_ABORTED over iets wat niets
     met inloggen te maken heeft. */
  await p.goto('about:blank');
  /* Deze eerste keer mag afbreken. Ligt er nog een sessie van de vorige
     poging, dan stuurt het inlogscherm zichzelf meteen door en breekt de
     browser onze navigatie af -- ERR_ABORTED over iets wat niets met
     inloggen te maken heeft. Daarna wissen we de sessie en halen we hem
     opnieuw op; dán hoort hij gewoon te komen. */
  await p.goto(APP + '/inloggen.html', { waitUntil: 'domcontentloaded' })
         .catch(function () {});
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#email', { timeout: 9000 });
  await p.fill('#email', naam);
  await p.fill('#ww', ww);
  await p.click('#verstuur');
  await p.waitForTimeout(2500);
  return p.url();
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await c.newPage();
  p.on('pageerror', e => fouten.push(e.message));

  // ── het scherm vraagt niet meer om een adres ──
  await p.goto(APP + '/inloggen.html');
  await p.waitForTimeout(400);
  const label = (await p.textContent('label[for="email"]')).trim();
  zeg('het inlogscherm vraagt om een gebruikersnaam', label === 'Gebruikersnaam', label);
  // Met type="email" weigert de browser een gebruikersnaam te versturen.
  zeg('en het veld laat een gewone naam toe',
      await p.getAttribute('#email', 'type') === 'text',
      'type=' + await p.getAttribute('#email', 'type'));

  // ── de app en de database rekenen hetzelfde ──
  const proeven = ['Juf Marieke', 'tom', 'JAN-PIET', 'héél  raar!!', 'a'];
  const inApp = await p.evaluate((lijst) => lijst.map(x => SB.inlogadres(x)), proeven);
  const inDb = proeven.map(x =>
    psql("select public.inlogadres(" + "'" + x.replace(/'/g, "''") + "')"));
  zeg('app en database maken van een naam hetzelfde adres',
      JSON.stringify(inApp) === JSON.stringify(inDb),
      inApp.join(' | '));
  zeg('spaties, hoofdletters en rare tekens gaan eruit',
      inApp[0] === 'juf.marieke@keuzebord.invalid' &&
      inApp[3].indexOf(' ') < 0 && inApp[3].indexOf('!') < 0,
      inApp[0] + ' / ' + inApp[3]);
  // Een adres dat iemand toch helemaal intypt blijft staan: tijdens het
  // omzetten bestaan beide vormen naast elkaar.
  const volledig = await p.evaluate(() => SB.inlogadres('Juf@Mijnschool.NL'));
  zeg('een volledig adres blijft een adres', volledig === 'juf@mijnschool.nl', volledig);

  // ── een nieuw account met alleen een gebruikersnaam ──
  const gemaakt = await roep('/auth/v1/signup', { method:'POST',
    lijf:{ email:'juf.marieke@keuzebord.invalid', password:'zandbak-tulp-regen-7',
           data:{ naam:'Juf Marieke', gebruikersnaam:'juf.marieke' } } });
  zeg('een account aanmaken op zo\'n adres lukt', gemaakt.status < 400, 'status ' + gemaakt.status);

  const inProfiel = psql("select gebruikersnaam from public.profielen " +
                         "where email = 'juf.marieke@keuzebord.invalid'");
  zeg('de gebruikersnaam staat in haar profiel', inProfiel === 'juf.marieke', inProfiel);

  const waarheen = await probeerInloggen(p, 'juf.marieke', 'zandbak-tulp-regen-7');
  zeg('en ze logt in met alleen haar gebruikersnaam',
      !/inloggen\.html/.test(waarheen), waarheen.split('/').pop());

  // Hoofdletters zijn de klassieke manier om jezelf buiten te sluiten.
  const metHoofdletters = await probeerInloggen(p, 'Juf.Marieke', 'zandbak-tulp-regen-7');
  zeg('hoofdletters maken niet uit', !/inloggen\.html/.test(metHoofdletters),
      metHoofdletters.split('/').pop());

  // ── bestaande accounts blijven werken ──
  const oud = await probeerInloggen(p, 'juf@mijnschool.nl', 'proefproef');
  zeg('een bestaand account met een echt adres komt er nog in',
      !/inloggen\.html/.test(oud), oud.split('/').pop());

  const bestaandeNaam = psql("select gebruikersnaam from public.profielen " +
                             "where email = 'juf@mijnschool.nl'");
  zeg('en heeft automatisch een gebruikersnaam gekregen', bestaandeNaam === 'juf', bestaandeNaam);

  // ── wat er niet lekt ──
  const mis = await probeerInloggen(p, 'juf.marieke', 'fout-wachtwoord');
  const melding = (await p.textContent('#melder')).trim();
  zeg('een verkeerd wachtwoord houdt je buiten', /inloggen\.html/.test(mis), mis.split('/').pop());
  /* Niet verklappen wélke van de twee fout is. Stond er "die
     gebruikersnaam kennen we niet", dan kan iemand met een lijstje namen
     uitvinden wie er op een school werkt. */
  zeg('zonder te verklappen of de naam bestaat',
      /klopt niet/.test(melding) && !/kennen we niet|bestaat niet/.test(melding), melding);

  const bestaatNiet = await probeerInloggen(p, 'bestaatvastniet', 'wat-dan-ook-8');
  const melding2 = (await p.textContent('#melder')).trim();
  zeg('en een onbekende naam geeft exact dezelfde melding', melding2 === melding, melding2);

  // ── wachtwoord vergeten bestaat niet meer, en dat staat er ook ──
  await p.goto(APP + '/inloggen.html');
  await p.waitForTimeout(400);
  await p.click('button[data-naar="vergeten"]');
  await p.waitForTimeout(300);
  const kwijt = (await p.textContent('#melder')).trim();
  zeg('wachtwoord kwijt verwijst naar een mens, niet naar een mail',
      /schoolbeheerder/.test(kwijt) && !/link/.test(kwijt), kwijt.slice(0, 60));

  // ── is de naam nog vrij? alleen voor wie binnen is ──
  const jufToken = (await roep('/auth/v1/token?grant_type=password', { method:'POST',
    lijf:{ email:'juf@mijnschool.nl', password:'proefproef' } })).lijf.access_token;
  const vrij = await roep('/rest/v1/rpc/gebruikersnaam_vrij', { method:'POST',
    token:jufToken, lijf:{ gewenst:'nog.niemand' } });
  zeg('een ingelogde kan vragen of een naam vrij is', vrij.lijf === true, String(vrij.lijf));
  const bezet = await roep('/rest/v1/rpc/gebruikersnaam_vrij', { method:'POST',
    token:jufToken, lijf:{ gewenst:'Juf.Marieke' } });
  zeg('en krijgt nee als hij bezet is', bezet.lijf === false, String(bezet.lijf));

  /* Zou deze vraag open staan, dan kon iedereen met een lijstje namen
     uitvinden wie er op welke school werkt -- één vraag per naam.

     Dit kijkt in de database en niet via het web, want de nabootsing van
     Supabase let niet op rollen; die zou dus altijd groen geven. En het
     kijkt naar 'public', de rol waar iedereen onder valt: PostgreSQL
     geeft van zichzelf uitvoerrecht aan iedereen, dus zonder een
     uitdrukkelijke revoke staat de deur open terwijl er een grant onder
     staat die doet alsof hij hem dichthoudt. */
  const open = psql("select has_function_privilege('public', " +
                    "'public.gebruikersnaam_vrij(text)', 'execute')");
  zeg('maar niet iedereen mag die vraag stellen', open === 'f',
      open === 'f' ? 'alleen wie is ingelogd' : 'IEDEREEN mag dit');

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
