/* Het platformbeheer, bediend zoals jij het bedient.

   De vraag: kan de platformbeheerder een school aanmaken en een
   voorbeeldschool neerzetten, en blijft het scherm leeg van kinderen?
   Zie docs/ROLLEN.md. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}

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

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

  // ── het account bestaat alleen als je het met de hand benoemt ──
  await fetch('http://localhost:5455/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@platform.nl', password:'proefproef' }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  // ── inloggen stuurt hem naar het platformbeheer ──
  const q = await apparaat(b);
  await q.fill('#email','tom@platform.nl');
  await q.fill('#ww','proefproef');
  await q.click('#verstuur');
  await q.waitForURL(/platform\.html/, { timeout: 9000 }).catch(()=>{});
  zeg('inloggen komt uit bij het platformbeheer', /platform\.html/.test(q.url()),
      q.url().split('/').pop());

  await q.waitForSelector('.schoolkaart, .leegvak', { timeout: 9000 });
  const eersteNaam = await q.textContent('.schoolnaam').catch(()=>null);
  zeg('de bestaande school staat erop', eersteNaam === 'Mijn school', String(eersteNaam));

  const cijfers = await q.$$eval('.schoolkaart .cijfer', ns =>
    ns.map(n => n.querySelector('span').textContent + '=' + n.querySelector('b').textContent));
  zeg('met zes groepen als getal', cijfers.indexOf('groepen=6') >= 0, cijfers.join(' '));
  zeg('en nul kinderen, want die zijn er nog niet',
      cijfers.indexOf('kinderen=0') >= 0, cijfers.join(' '));

  const tekst = await q.textContent('.inhoud');
  zeg('er staat geen kindernaam op het scherm',
      !/Bram|Isa|Kees|Yara/.test(tekst), 'geen van de testnamen');

  // ── een school erbij ──
  // Hiervoor vulde je hier een e-mailadres in en kreeg je een code om
  // door te geven; die persoon moest zich dan zelf aanmelden en de code
  // intikken. Nu rolt er een kaartje uit waarmee ze meteen binnen is.
  await q.click('button:has-text("Nieuwe school")');
  await q.waitForSelector('.overlay.open', { timeout: 4000 });
  const velden = await q.$$('.blad input');
  await velden[0].fill('Kindcentrum De Regenboog');
  await velden[1].fill('Marloes de Vries');
  await q.waitForTimeout(800);
  const voorstel = await velden[2].inputValue();
  zeg('de gebruikersnaam volgt uit de naam van de beheerder',
      voorstel === 'marloes.de.vries', voorstel);

  await q.click('.blad button:has-text("Aanmaken")');
  await q.waitForSelector('.kaartje', { timeout: 12000 });
  const kaartje = await q.evaluate(() => {
    const r = [...document.querySelectorAll('.kaartje-regel')]
      .map(x => [x.querySelector('.l').textContent, x.querySelector('.w').textContent]);
    const zoek = (l) => (r.filter(x => x[0] === l)[0] || [])[1] || '';
    return { naam: zoek('Voor'), gebruiker: zoek('Gebruikersnaam'),
             wachtwoord: zoek('Wachtwoord'),
             kop: (document.querySelector('.kaartje-kop') || {}).textContent || '' };
  });
  zeg('er komt een kaartje voor de schoolbeheerder',
      kaartje.gebruiker === 'marloes.de.vries' && /Schoolbeheerder/.test(kaartje.kop),
      kaartje.naam + ' / ' + kaartje.gebruiker);
  zeg('met de naam van haar school erop',
      /Kindcentrum De Regenboog/.test(kaartje.kop), kaartje.kop.replace(/\s+/g, ' ').slice(0, 54));
  zeg('en een wachtwoord van drie woorden en een cijfer',
      /^[a-z]+-[a-z]+-[a-z]+-[2-9]$/.test(kaartje.wachtwoord), kaartje.wachtwoord);
  await q.click('.blad button:has-text("Klaar")');

  await q.waitForTimeout(400);
  const namen1 = await q.$$eval('.schoolnaam', ns => ns.map(n => n.textContent));
  zeg('en staat in de lijst', namen1.indexOf('Kindcentrum De Regenboog') >= 0, namen1.join(' / '));

  /* En dan de enige vraag die er echt toe doet: komt zij met dat kaartje
     binnen? Een school aanmaken waar de beheerder niet in kan is erger
     dan geen school aanmaken -- dan denk je dat het klaar is. */
  const haar = await b.newContext({ viewport:{ width:1280, height:900 } });
  const hp = await haar.newPage();
  await hp.goto(APP + '/inloggen.html');
  await hp.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await hp.goto(APP + '/inloggen.html');
  await hp.fill('#email', kaartje.gebruiker);
  await hp.fill('#ww', kaartje.wachtwoord);
  await hp.click('#verstuur');
  await hp.waitForTimeout(3500);
  const zijZiet = await hp.evaluate(() => ({
    waar: location.pathname.split('/').pop(),
    school: (window.KBV && KBV.wie() && KBV.wie().school || {}).naam || '',
    rol: (window.KBV && KBV.wie() && KBV.wie().profiel || {}).rol || ''
  }));
  zeg('de schoolbeheerder komt binnen met haar kaartje',
      zijZiet.waar === 'school.html', zijZiet.waar);
  zeg('bij haar eigen school, als schoolbeheerder',
      zijZiet.school === 'Kindcentrum De Regenboog' && zijZiet.rol === 'schoolbeheerder',
      zijZiet.school + ' / ' + zijZiet.rol);
  await haar.close();

  // ── de voorbeeldschool ──
  await q.click('button:has-text("Voorbeeldschool")');
  await q.waitForSelector('.overlay.open', { timeout: 4000 });
  await q.click('.blad button:has-text("Aanmaken")');
  await q.waitForTimeout(1400);
  const namen2 = await q.$$eval('.schoolnaam', ns => ns.map(n => n.textContent));
  zeg('de voorbeeldschool staat er', namen2.indexOf('Voorbeeldschool') >= 0, namen2.join(' / '));

  const kaarten = await q.$$eval('.schoolkaart', ns => ns.map(n => ({
    naam: n.querySelector('.schoolnaam').textContent,
    cijfers: Array.from(n.querySelectorAll('.cijfer')).map(c =>
      c.querySelector('span').textContent + '=' + c.querySelector('b').textContent)
  })));
  const voorbeeld = kaarten.find(k => k.naam === 'Voorbeeldschool');
  zeg('met drie groepen en vijftien kinderen',
      !!voorbeeld && voorbeeld.cijfers.indexOf('groepen=3') >= 0
                  && voorbeeld.cijfers.indexOf('kinderen=15') >= 0,
      voorbeeld ? voorbeeld.cijfers.join(' ') : 'niet gevonden');

  const tekst2 = await q.textContent('.inhoud');
  zeg('ook van de voorbeeldschool geen enkele naam op het scherm',
      !/Bram|Isa|Kees|Yara/.test(tekst2), 'alleen getallen');

  // ── het logboek ──
  await q.click('.zij-knop:has-text("Logboek")');
  await q.waitForSelector('.logrij', { timeout: 4000 });
  const regels = await q.$$eval('.logrij .logwat', ns => ns.map(n => n.textContent));
  zeg('het logboek vermeldt de nieuwe school',
      regels.some(r => /school aangemaakt/.test(r)), regels.slice(0,3).join(' | '));
  zeg('en de voorbeeldschool',
      regels.some(r => /voorbeeldschool aangemaakt/.test(r)), String(regels.length) + ' regels');

  // ── een schoolbeheerder hoort hier niet ──
  const r = await apparaat(b);
  await r.fill('#email','beheerder@mijnschool.nl');
  await r.fill('#ww','proefproef');
  await r.click('#verstuur');
  await r.waitForURL(/school\.html/, { timeout: 9000 }).catch(()=>{});
  await r.goto(APP + '/platform.html');
  await r.waitForTimeout(1500);
  zeg('een schoolbeheerder wordt weggestuurd van het platformbeheer',
      !/platform\.html/.test(r.url()), r.url().split('/').pop());

  await q.screenshot({ path: process.env.SCHOT ? 'platform.png' : '/dev/null' }).catch(()=>{});

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
