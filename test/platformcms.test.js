/* Het platformbeheer als beheeromgeving.

   De vorige proef (platform.test.js) gaat over het aanmaken van een
   school. Deze gaat over alles wat er daarna nog moet kunnen: een
   account aanpassen, verhuizen, verwijderen, erbij maken, en de naam
   van een school wijzigen.

   Drie dingen bewaakt deze proef vooral, en ze zijn alle drie van het
   soort dat je pas merkt als het te laat is:

   1. Een school houdt altijd minstens één schoolbeheerder. Degradeer je
      de enige, dan kan niemand daar nog collega's toevoegen of groepen
      regelen -- en dat merkt de school pas op het moment dat ze het
      nodig heeft.
   2. Verhuis je iemand, dan gaan haar groepen eraf. Blijven ze staan,
      dan kijkt zij op haar nieuwe school nog in de kinderen van haar
      oude. Dat is precies het lek waar de hele rollenscheiding tegen is.
   3. Verwijder je een account, dan gaan de kinderen en de borden niet
      mee. Die horen bij de school en niet bij de leerkracht die
      toevallig was ingelogd.

   En één ding dat hij vooral níét wil zien: een kindernaam op het
   scherm van de platformbeheerder. Zie docs/ROLLEN.md. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}

async function maakAccount(gebruikersnaam, naam, ww){
  await fetch('http://localhost:5455/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email: gebruikersnaam + '@keuzebord.invalid', password: ww,
                           data:{ naam: naam, gebruikersnaam: gebruikersnaam } }) });
}

async function apparaat(b){
  const c = await b.newContext({ viewport:{ width:1360, height:950 } });
  const p = await c.newPage();
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return p;
}

/* De rijen zoals ze op het scherm staan: naam, onderregel en rol. Dit is
   wat een mens ziet, en daar gaat deze proef over. */
async function rijen(p){
  return p.$$eval('.mensrij', ns => ns.map(n => ({
    naam:  n.querySelector('.mensnaam').textContent,
    onder: n.querySelector('.mensonder').textContent,
    rol:   (n.querySelector('.rolmerk') || {}).textContent || '',
    knoppen: [...n.querySelectorAll('button')].map(k => k.textContent)
  })));
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  // ── twee scholen, zodat verhuizen iets betekent ──
  const tweede = psql("insert into public.scholen (naam) values ('De Tweede School') returning id");
  /* Drie verzonnen kinderen in Groep 1A. Zonder kinderen zegt "de
     kinderen blijven staan" niets: nul is nul, ook als het misgaat. */
  psql("insert into public.leerlingen (groep_id, naam, volgorde) " +
       "select g.id, x.naam, x.n from public.groepen g, " +
       "(values ('Bram',1),('Isa',2),('Kees',3)) as x(naam,n) where g.naam='Groep 1A'");
  await maakAccount('tom', 'Tom Hooijer', 'proefproef');
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null, naam='Tom Hooijer' " +
       "where email='tom@keuzebord.invalid';");

  const p = await apparaat(b);
  p.on('pageerror', e => fouten.push(e.message));
  await p.fill('#email','tom');
  await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/platform\.html/, { timeout: 9000 }).catch(()=>{});
  await p.waitForSelector('.schoolkaart', { timeout: 9000 });

  // ── de lijst met alle accounts ──
  await p.click('.zij-knop:has-text("Accounts")');
  await p.waitForSelector('.mensrij', { timeout: 6000 });
  let lijst = await rijen(p);
  zeg('alle accounts staan in één lijst', lijst.length === 3,
      lijst.map(r => r.naam).join(' / '));
  zeg('met hun school erbij',
      lijst.some(r => /Mijn school/.test(r.onder)), lijst.map(r => r.onder).join(' | '));
  /* Tom hoort bij geen school. Juist die accounts raak je kwijt in een
     lijstje per school -- en dat zijn er in de praktijk een paar. */
  zeg('ook een account zonder school staat erin',
      lijst.some(r => /geen school/.test(r.onder)), lijst.map(r => r.onder).join(' | '));
  zeg('en de rol staat erbij',
      lijst.filter(r => r.rol === 'Schoolbeheerder').length === 1 &&
      lijst.filter(r => r.rol === 'Platformbeheerder').length === 1,
      lijst.map(r => r.rol).join(' / '));

  // Geen knoppen bij jezelf. Een knop die altijd een foutmelding geeft
  // is erger dan geen knop.
  const ik = lijst.filter(r => r.naam === 'Tom Hooijer')[0];
  zeg('bij jezelf staan geen knoppen', ik && ik.knoppen.length === 0, 'Dat ben jij');

  const schermtekst = await p.textContent('.inhoud');
  zeg('er staat geen kindernaam in de accountslijst',
      !/Bram|Isa|Kees|Yara|Fenne/.test(schermtekst), 'alleen volwassenen');

  // ── zoeken en filteren ──
  await p.fill('.zoekveld', 'juf');
  await p.waitForTimeout(350);
  lijst = await rijen(p);
  zeg('zoeken op gebruikersnaam laat één account over',
      lijst.length === 1 && /juf/.test(lijst[0].onder), lijst.map(r => r.onder).join(' | '));

  await p.fill('.zoekveld', '');
  await p.waitForTimeout(350);
  await p.click('.chips .chip:has-text("Schoolbeheerders")');
  await p.waitForTimeout(250);
  lijst = await rijen(p);
  zeg('filteren op rol laat alleen die rol zien',
      lijst.length === 1 && lijst[0].rol === 'Schoolbeheerder', lijst.map(r => r.rol).join(' / '));
  await p.click('.chips .chip:has-text("Alle rollen")');
  await p.waitForTimeout(250);

  await p.selectOption('.kiesveld', { label: 'Zonder school' });
  await p.waitForTimeout(250);
  lijst = await rijen(p);
  zeg('filteren op "zonder school" vindt de losse accounts',
      lijst.length === 1 && lijst[0].naam === 'Tom Hooijer', lijst.map(r => r.naam).join(' / '));
  await p.selectOption('.kiesveld', { label: 'Alle scholen' });
  await p.waitForTimeout(250);

  // ── deur dicht: bij een school met kinderen kan de leverancier niets ──
  /* Mijn school heeft drie kinderen (Bram, Isa, Kees) en heeft de deur niet
     opengezet. Een rol geven of een account erbij maken zou de leverancier
     dan langs een omweg bij die kinderen brengen: een account met een
     wachtwoord dat hij kent. Dus: geweigerd, met een melding die zegt wat
     je moet doen in plaats van een foutcode. DECISIONS.md, 29-10-2026. */
  const DICHT = 'Deze school heeft kinderen. Vraag de schoolbeheerder om meekijken aan te zetten.';
  const logVoor = psql("select count(*) from public.handelingen where gegevens->>'door' = 'leverancier'");
  {
    const rij = p.locator('.mensrij', { hasText: 'juf' }).first();
    await rij.locator('button:has-text("Aanpassen")').click();
    await p.waitForSelector('.overlay.open', { timeout: 4000 });
    await p.click('.blad .chip:has-text("Schoolbeheerder")');
    await p.waitForTimeout(200);
    await p.click('.blad button:has-text("Opslaan")');
    await p.waitForTimeout(1200);
    const m = (await p.textContent('#melding')).trim();
    zeg('deur dicht: een rol geven wordt geweigerd met een duidelijke melding', m === DICHT, m.slice(0, 60));
    zeg('zonder "Dat lukte niet" ervoor', !/lukte niet/i.test(m));
    zeg('en de rol is niet veranderd',
        psql("select rol from public.profielen where gebruikersnaam='juf'") === 'leerkracht');
    await p.click('.blad button:has-text("Annuleren")');
    await p.waitForTimeout(300);
  }
  {
    await p.click('button:has-text("Account toevoegen")');
    await p.waitForSelector('.overlay.open', { timeout: 4000 });
    await p.selectOption('.blad select', { label: 'Mijn school' });
    await p.fill('.blad input >> nth=0', 'Stiekem Account');
    await p.waitForTimeout(500);
    await p.click('.blad button:has-text("Aanmaken")');
    await p.waitForTimeout(1500);
    const m = (await p.textContent('#melding')).trim();
    zeg('deur dicht: een account aanmaken wordt geweigerd met dezelfde melding', m === DICHT, m.slice(0, 60));
    zeg('er is geen account bijgekomen',
        psql("select count(*) from auth.users where email like 'stiekem%'") === '0');
    zeg('en er rolt geen kaartje uit', (await p.$('.kaartje')) === null);
    await p.click('.blad button:has-text("Annuleren")').catch(() => {});
    await p.waitForTimeout(300);
  }
  zeg('een geweigerde actie komt niet als iets wat gebeurd is in het logboek',
      psql("select count(*) from public.handelingen where gegevens->>'door' = 'leverancier'") === logVoor);

  /* De schoolbeheerder zet de deur open (twee uur). Daarna loopt alles
     hieronder zoals het altijd liep. */
  psql("insert into public.ondersteuning (school_id, door, reden, tot) " +
       "select p.school_id, p.id, 'proef', now() + interval '2 hours' " +
       "from public.profielen p where p.gebruikersnaam='beheerder'");

  // ── de enige schoolbeheerder mag je niet degraderen ──
  // Dit is de regel waar de hele beheerkant op staat of valt: een school
  // zonder beheerder is een school die stilstaat zodra er iets moet.
  async function openAccount(naam){
    const rij = p.locator('.mensrij', { hasText: naam });
    await rij.locator('button:has-text("Aanpassen")').click();
    await p.waitForSelector('.overlay.open', { timeout: 4000 });
  }
  const beheerderNaam = psql("select coalesce(nullif(naam,''), gebruikersnaam) " +
                             "from public.profielen where gebruikersnaam='beheerder'");
  await openAccount(beheerderNaam);
  await p.click('.blad .chip:has-text("Leerkracht")');
  await p.waitForTimeout(200);
  await p.click('.blad button:has-text("Opslaan")');
  await p.waitForTimeout(900);
  const melding = (await p.textContent('#melding')).trim();
  zeg('de enige schoolbeheerder kan geen leerkracht worden',
      /enige schoolbeheerder/.test(melding), melding.slice(0, 54));
  const nogSteeds = psql("select rol from public.profielen where gebruikersnaam='beheerder'");
  zeg('en haar rol staat er nog gewoon', nogSteeds === 'schoolbeheerder', nogSteeds);
  await p.click('.blad button:has-text("Annuleren")');
  await p.waitForTimeout(300);

  // ── een naam en een rol aanpassen ──
  await openAccount('juf');
  await p.fill('.blad input', 'Juf Marieke');
  await p.click('.blad .chip:has-text("Schoolbeheerder")');
  await p.waitForTimeout(200);
  await p.click('.blad button:has-text("Opslaan")');
  await p.waitForTimeout(1400);
  const naJuf = psql("select naam || '/' || rol from public.profielen where gebruikersnaam='juf'");
  zeg('een naam en een rol in één keer aanpassen lukt',
      naJuf === 'Juf Marieke/schoolbeheerder', naJuf);
  lijst = await rijen(p);
  zeg('en de lijst is meteen bij',
      lijst.some(r => r.naam === 'Juf Marieke' && r.rol === 'Schoolbeheerder'),
      lijst.map(r => r.naam + '=' + r.rol).join(' / '));

  // ── verhuizen, met de waarschuwing erbij ──
  // Zij zit aan Groep 1A gekoppeld. Die koppeling hoort eraf te gaan:
  // anders kijkt ze op haar nieuwe school nog in de kinderen van haar oude.
  const koppelingenVoor = psql("select count(*) from public.groep_leden gl " +
    "join public.profielen p on p.id = gl.profiel_id where p.gebruikersnaam='juf'");
  zeg('zij hangt nu aan een groep', koppelingenVoor === '1', koppelingenVoor + ' koppeling(en)');

  await openAccount('Juf Marieke');
  await p.selectOption('.blad select', { label: 'De Tweede School' });
  await p.waitForTimeout(250);
  const waarschuwing = (await p.textContent('.blad .waarschuwing')).trim();
  zeg('de waarschuwing staat er vóór je opslaat',
      /groepen gaan niet mee/.test(waarschuwing), waarschuwing.slice(0, 60));
  zeg('en noemt beide scholen bij naam',
      /Mijn school/.test(waarschuwing) && /De Tweede School/.test(waarschuwing),
      waarschuwing.slice(0, 70));
  await p.click('.blad button:has-text("Opslaan")');
  await p.waitForTimeout(1600);
  const naVerhuizing = psql("select s.naam from public.profielen p " +
    "join public.scholen s on s.id = p.school_id where p.gebruikersnaam='juf'");
  zeg('zij staat daarna bij de andere school', naVerhuizing === 'De Tweede School', naVerhuizing);
  const koppelingenNa = psql("select count(*) from public.groep_leden gl " +
    "join public.profielen p on p.id = gl.profiel_id where p.gebruikersnaam='juf'");
  zeg('en haar groepen zijn eraf', koppelingenNa === '0', koppelingenNa + ' koppeling(en)');
  const kinderenNog = psql("select count(*) from public.leerlingen l " +
    "join public.groepen g on g.id = l.groep_id where g.naam='Groep 1A'");
  zeg('de kinderen van haar oude groep staan er nog', kinderenNog === '3',
      kinderenNog + ' kinderen');

  // ── een account erbij op een bestaande school ──
  await p.click('button:has-text("Account toevoegen")');
  await p.waitForSelector('.overlay.open', { timeout: 4000 });
  await p.selectOption('.blad select', { label: 'Mijn school' });
  await p.fill('.blad input >> nth=0', 'Juf Noor');
  await p.waitForTimeout(700);
  const voorstel = await p.inputValue('.blad input >> nth=1');
  zeg('de gebruikersnaam volgt uit de naam', voorstel === 'juf.noor', voorstel);
  await p.click('.blad button:has-text("Aanmaken")');
  await p.waitForSelector('.kaartje', { timeout: 12000 });
  const kaartje = await p.evaluate(() => {
    const r = [...document.querySelectorAll('.kaartje-regel')]
      .map(x => [x.querySelector('.l').textContent, x.querySelector('.w').textContent]);
    const zoek = (l) => (r.filter(x => x[0] === l)[0] || [])[1] || '';
    return { gebruiker: zoek('Gebruikersnaam'), wachtwoord: zoek('Wachtwoord'),
             kop: (document.querySelector('.kaartje-kop') || {}).textContent || '' };
  });
  zeg('er rolt een kaartje uit met haar school erop',
      kaartje.gebruiker === 'juf.noor' && /Mijn school/.test(kaartje.kop),
      kaartje.kop.replace(/\s+/g, ' ').slice(0, 50));
  await p.click('.blad button:has-text("Klaar")');
  await p.waitForTimeout(400);

  /* En de enige vraag die telt: komt zij er met dat kaartje in, en bij
     de goede school? Een account aanmaken waar niemand mee binnenkomt is
     erger dan geen account -- dan denk je dat het klaar is. */
  const haar = await apparaat(b);
  await haar.fill('#email', kaartje.gebruiker);
  await haar.fill('#ww', kaartje.wachtwoord);
  await haar.click('#verstuur');
  await haar.waitForTimeout(3200);
  const zijZiet = await haar.evaluate(() => ({
    waar: location.pathname.split('/').pop(),
    school: (window.KBV && KBV.wie() && KBV.wie().school || {}).naam || ''
  }));
  /* Een leerkracht komt uit bij het groepsbeheer en niet bij het
     schoolbeheer -- dat laatste is van de schoolbeheerder. Waar het om
     gaat is dat ze binnen is en niet terug op het inlogscherm staat. */
  zeg('zij komt binnen met haar kaartje',
      zijZiet.waar === 'beheer.html' || zijZiet.waar === 'school.html', zijZiet.waar);
  zeg('bij de school die jij koos', zijZiet.school === 'Mijn school', zijZiet.school);
  await haar.context().close();

  // ── een account echt weghalen ──
  const kinderenVoor = psql("select count(*) from public.leerlingen");
  const groepenVoor  = psql("select count(*) from public.groepen");
  await p.reload();
  await p.waitForSelector('.schoolkaart', { timeout: 9000 });
  await p.click('.zij-knop:has-text("Accounts")');
  await p.waitForSelector('.mensrij', { timeout: 6000 });
  const rij = p.locator('.mensrij', { hasText: 'Juf Noor' });
  await rij.locator('button:has-text("Verwijderen")').click();
  await p.waitForSelector('.overlay.open', { timeout: 4000 });
  const tekstWeg = await p.textContent('.blad');
  zeg('het blad zegt wat er weggaat en wat niet',
      /kan niet terug/.test(tekstWeg) && /kinderen/.test(tekstWeg), 'beide kanten genoemd');
  await p.click('.blad button:has-text("Verwijderen")');
  await p.waitForTimeout(1500);
  const nogInDb = psql("select count(*) from auth.users where email='juf.noor@keuzebord.invalid'");
  zeg('het account is echt weg, niet op inactief', nogInDb === '0', nogInDb + ' gevonden');
  const profielWeg = psql("select count(*) from public.profielen where gebruikersnaam='juf.noor'");
  zeg('en haar profiel ging mee', profielWeg === '0', profielWeg + ' gevonden');
  zeg('maar de kinderen en de groepen staan er nog',
      psql("select count(*) from public.leerlingen") === kinderenVoor &&
      psql("select count(*) from public.groepen") === groepenVoor,
      kinderenVoor + ' kinderen, ' + groepenVoor + ' groepen');

  // ── de naam van een school aanpassen ──
  await p.click('.zij-knop:has-text("Scholen")');
  await p.waitForSelector('.schoolkaart', { timeout: 6000 });
  const kaart = p.locator('.schoolkaart', { hasText: 'De Tweede School' });
  await kaart.locator('button:has-text("Hernoemen")').click();
  await p.waitForSelector('.overlay.open', { timeout: 4000 });
  await p.fill('#schoolnaamveld', 'Kindcentrum De Tweede');
  await p.click('.blad button:has-text("Opslaan")');
  await p.waitForTimeout(1500);
  const namen = await p.$$eval('.schoolnaam', ns => ns.map(n => n.textContent));
  zeg('een school hernoemen lukt',
      namen.indexOf('Kindcentrum De Tweede') >= 0, namen.join(' / '));

  // ── alles komt in het logboek ──
  // Een school mag kunnen nakijken wat de leverancier bij haar heeft
  // gedaan. Dan moet het er wel in staan.
  await p.click('.zij-knop:has-text("Logboek")');
  await p.waitForSelector('.logrij', { timeout: 6000 });
  const regels = await p.$$eval('.logrij .logwat', ns => ns.map(n => n.textContent));
  zeg('de rolwijziging staat in het logboek',
      regels.some(r => /rol gewijzigd/.test(r)), regels.slice(0,2).join(' | '));
  zeg('de verhuizing ook', regels.some(r => /account verplaatst/.test(r)),
      String(regels.length) + ' regels');
  zeg('en het verwijderde account', regels.some(r => /account verwijderd/.test(r)),
      String(regels.length) + ' regels');
  zeg('en de nieuwe schoolnaam', regels.some(r => /schoolnaam gewijzigd/.test(r)),
      String(regels.length) + ' regels');

  // ── en de school ziet het in haar eigen logboek ──
  const bijSchool = psql("select count(*) from public.handelingen h " +
    "join public.scholen s on s.id = h.school_id " +
    "where s.naam = 'Mijn school' and h.gegevens->>'door' = 'leverancier'");
  zeg('wat de leverancier met de deur open deed, staat bij de school als leverancier',
      Number(bijSchool) >= 3, bijSchool + ' regels');
  {
    const baas = await apparaat(b);
    await baas.fill('#email', 'beheerder@mijnschool.nl');
    await baas.fill('#ww', 'proefproef');
    await baas.click('#verstuur');
    await baas.waitForTimeout(3000);
    if (!/school\.html/.test(baas.url())) await baas.goto(APP + '/school.html');
    // het logboek staat onder "De school"
    await baas.waitForSelector('.zij-knop', { timeout: 9000 }).catch(() => {});
    await baas.click('.zij-knop:has-text("De school")').catch(() => {});
    await baas.waitForSelector('.paneelkop:has-text("Logboek")', { timeout: 9000 }).catch(() => {});
    await baas.waitForTimeout(800);
    const tekst = await baas.textContent('body');
    zeg('het schoolbeheer zet er "Pixelplein (leverancier)" voor',
        /Pixelplein \(leverancier\): (rol gewijzigd|account aangemaakt)/.test(tekst));
    await baas.context().close();
  }

  // ── wie geen platformbeheerder is, kan hier niets ──
  /* Dit kijkt in de database en niet via het scherm. De nabootsing van
     Supabase let niet op rollen, dus via het web zou alles altijd groen
     geven. En het kijkt naar 'public': PostgreSQL geeft van zichzelf
     uitvoerrecht aan iedereen, dus zonder een uitdrukkelijke revoke
     staat de deur open terwijl er een grant onder staat die doet alsof
     hij hem dichthoudt. */
  const open = ['public.account_rol(uuid, text)',
                'public.account_verplaatsen(uuid, uuid)',
                'public.account_verwijderen(uuid)']
    .map(f => psql("select has_function_privilege('public', '" + f + "', 'execute')"));
  zeg('niet iedereen mag deze functies aanroepen', open.every(x => x === 'f'),
      open.join(' '));

  /* En de functie zelf houdt het ook tegen, niet alleen het recht erop.
     Een leerkracht die het adres van de functie kent komt er niet in. */
  const jufId = psql("select id from public.profielen where gebruikersnaam='juf'");
  let geweigerd = '';
  try {
    psql("select set_config('test.uid', '" + jufId + "', false); " +
         "select public.account_verwijderen('" + jufId + "'::uuid);");
  } catch (e) { geweigerd = String(e.stderr || e.message || ''); }
  zeg('en de functie weigert een leerkracht',
      /Alleen de platformbeheerder/.test(geweigerd), geweigerd.slice(0, 60).replace(/\n/g, ' '));

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  if (process.env.SCHOT) {
    await p.click('.zij-knop:has-text("Accounts")');
    await p.waitForTimeout(600);
    await p.screenshot({ path: 'platform-accounts.png', fullPage: true });
  }

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
