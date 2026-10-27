/* De pictobank.

   Vierenveertig getekende picto's die elke school heeft. Waar het hier om
   gaat is niet dat ze mooi zijn maar dat ze door dezelfde weg lopen als
   een picto die een leerkracht zelf maakt: het bord, het beheer, het
   rondje, en vooral het tweede apparaat. Een juf die thuis een kind de
   Kat geeft, hoort die Kat de volgende ochtend op het digibord te zien.

   En één ding dat er juist níét hoort te gebeuren: een bankpicto wordt
   nergens heen geüpload. Hij staat in de code. Zou hij wel meegaan, dan
   had elke school vierenveertig keer dezelfde kilobyte in haar opslag
   staan -- en dan ook nog in de map van die school, waar hij niets te
   zoeken heeft. */
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

async function alsJuf(p){
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','juf@mijnschool.nl');
  await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/beheer\.html|bord\.html|school\.html/, { timeout: 12000 });
  await p.waitForTimeout(1800);
}

async function roep(pad, opties){
  const o = opties || {};
  const koppen = { 'Content-Type':'application/json', apikey:'proefsleutel' };
  if (o.token) koppen.Authorization = 'Bearer ' + o.token;
  const r = await fetch('http://localhost:5455' + pad,
    { method:o.method || 'GET', headers:koppen,
      body:o.lijf ? JSON.stringify(o.lijf) : undefined });
  const t = await r.text();
  try { return { status:r.status, lijf: t ? JSON.parse(t) : null }; }
  catch (e) { return { status:r.status, lijf:t }; }
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  /* Twee kinderen klaarzetten via de server. Via het scherm zou ook
     kunnen, maar dan gaat deze proef stuk zodra iemand het toevoegscherm
     verandert -- en daar gaat hij niet over. */
  const aanmelden = await roep('/auth/v1/token?grant_type=password',
    { method:'POST', lijf:{ email:'juf@mijnschool.nl', password:'proefproef' } });
  const juf = aanmelden.lijf.access_token;
  const klassen = (await roep('/rest/v1/groepen?select=id,naam&order=volgorde',
    { token:juf })).lijf;
  await roep('/rest/v1/leerlingen', { method:'POST', token:juf,
    lijf:[{ groep_id: klassen[0].id, naam:'Fien' },
          { groep_id: klassen[0].id, naam:'Joep' }] });
  const fouten = [];
  const kwijt = [];

  const c = await b.newContext({ viewport:{ width:1360, height:960 } });
  const p = await c.newPage();
  p.on('pageerror', e => fouten.push(e.message));
  p.on('response', r => { if (r.status() === 404) kwijt.push(r.url().split('/').pop()); });

  // ── de bank zelf ──
  await p.goto(APP + '/pictos.html');
  await p.waitForTimeout(600);

  const aantal = await p.evaluate(() => KB_PICTOBANK.alle().length);
  zeg('de bank heeft vierenveertig picto\'s', aantal === 44, aantal + ' stuks');

  const groepen = await p.evaluate(() => {
    const t = {};
    KB_PICTOBANK.alle().forEach(x => { t[x.groep] = (t[x.groep] || 0) + 1; });
    return t;
  });
  zeg('verdeeld over dieren, voertuigen en dingen',
      groepen.dier > 10 && groepen.voertuig > 5 && groepen.ding > 10,
      Object.keys(groepen).map(g => g + ': ' + groepen[g]).join(', '));

  const dubbel = await p.evaluate(() => {
    const i = KB_PICTOBANK.alle().map(x => x.id);
    return i.length - new Set(i).size;
  });
  zeg('zonder dubbele namen', dubbel === 0, dubbel + ' dubbel');

  // Een hekje in een kleurcode breekt een data-adres af, en dan krijg je
  // een leeg rondje zonder dat er ergens iets klaagt.
  const adressen = await p.evaluate(() =>
    KB_PICTOBANK.alle().map(x => KB_PICTOBANK.dataUri(x.id)));
  zeg('elk picto geeft een bruikbaar data-adres',
      adressen.every(a => a.indexOf('data:image/svg+xml,') === 0 && a.indexOf('#') < 0 && a.length > 120),
      adressen.length + ' adressen, kortste ' + Math.min.apply(null, adressen.map(a => a.length)));

  const kleur = await p.evaluate(() =>
    KB_PICTOBANK.alle().filter(x => x.pad.indexOf('fill="#') >= 0).length);
  zeg('en ze hebben kleur, geen kale lijnen', kleur >= 40, kleur + ' van ' + aantal + ' met vlakken');

  // ── het printvel ──
  const kaartjes = (await p.$$('.kaartje')).length;
  zeg('het printvel toont ze allemaal', kaartjes === 44, kaartjes + ' kaartjes');
  // Een achtergrondplaatje wordt door veel browsers niet meegeprint. Als
  // de svg niet in de pagina zelf staat, print je lege kaders.
  zeg('met de tekening in de pagina, niet als achtergrond',
      (await p.$$('.kaartje svg')).length === 44, 'svg staat erin');
  await p.click('[data-maat="groot"]');
  await p.waitForTimeout(300);
  zeg('en er zijn drie formaten om uit te kiezen',
      await p.evaluate(() => document.querySelector('.rooster').classList.contains('groot')),
      'groot gekozen');

  // ── een kind er een geven, ingelogd ──
  await alsJuf(p);
  await p.goto(APP + '/beheer.html');
  await p.waitForSelector('.zij-knop', { timeout: 12000 });
  /* Wachten tot de kinderen echt binnen zijn. Een vaste pauze zou hier
     soms net te kort zijn, en dan faalt de proef om iets wat er niets
     mee te maken heeft. */
  await p.waitForFunction(
    () => (KB.klas().leerlingen || []).length > 0, null, { timeout: 15000 });
  await p.click('.zij-knop:has-text("Picto\'s")');
  await p.waitForSelector('text=Bibliotheek', { timeout: 9000 });
  await p.waitForTimeout(500);
  const inBibliotheek = (await p.$$('.bibliotheek .leerlingkaart')).length;
  zeg('in het beheer staat de bibliotheek', inBibliotheek === 44, inBibliotheek + ' kaarten');

  await p.fill('.bibliotheek input[type=search]', 'trein');
  await p.waitForTimeout(400);
  const naZoeken = (await p.$$('.bibliotheek .leerlingkaart')).length;
  zeg('zoeken werkt', naZoeken === 1, naZoeken + ' over');
  await p.fill('.bibliotheek input[type=search]', '');
  await p.waitForTimeout(400);

  await p.click('.bibliotheek .leerlingkaart:has-text("Kat")');
  await p.waitForSelector('.blad', { timeout: 6000 });
  await p.waitForTimeout(400);
  zeg('klikken vraagt aan wie je hem geeft',
      /Aan wie geef je dit picto/.test(await p.textContent('.blad')));
  await p.click('.blad .leerlingkaart >> nth=0');
  await p.waitForTimeout(1000);

  const kind = await p.evaluate(() => {
    const k = KB.klas();
    const l = (k.leerlingen || []).filter(x => String(x.pictoId || '').indexOf('bank-') === 0)[0];
    return l ? { naam:l.naam, pictoId:l.pictoId, tekening:KB.isTekening(l) } : null;
  });
  zeg('het kind heeft nu een picto uit de bank', !!kind && kind.pictoId === 'bank-kat',
      kind ? kind.naam + ' → ' + kind.pictoId : 'geen');
  // Een tekening hoort in het rondje te passen; een foto vult het. Staat
  // dit verkeerd, dan wordt de kat aan vier kanten afgesneden.
  zeg('en hij telt als tekening, dus hij past in het rondje',
      !!kind && kind.tekening === true);

  // ── wat er wél en niet naar de server gaat ──
  await p.evaluate(() => KBV.stuurNu());
  await p.waitForTimeout(3000);

  const padInDb = psql("select coalesce(max(foto_pad),'leeg') from public.leerlingen " +
                       "where foto_pad like 'bank:%'");
  zeg('de server onthoudt alleen de naam uit de code', padInDb === 'bank:kat', padInDb);

  const inOpslag = psql("select count(*) from public.media where naam = 'Kat'");
  zeg('en er is niets geüpload', inOpslag === '0', inOpslag + ' media-rijen met die naam');

  // Niet aan de app vragen wat hij van plan was te versturen -- dat is een
  // binnenkant. Wat telt is wat er daadwerkelijk ligt.
  const alleMedia = psql("select count(*) from public.media");
  zeg('er ligt in het geheel geen media voor deze groep', alleMedia === '0',
      alleMedia + ' rijen in media');

  // ── het tweede apparaat ──
  // Dit is waar het om draait: de juf geeft thuis een picto, en het
  // digibord in de klas hoort het de volgende ochtend te weten -- zonder
  // dat er een plaatje over de lijn is gegaan.
  const tweede = await b.newContext({ viewport:{ width:1360, height:960 } });
  const p2 = await tweede.newPage();
  p2.on('pageerror', e => fouten.push('apparaat 2: ' + e.message));
  await alsJuf(p2);
  /* Kijken in het beheer, niet op het bord. Het bord kan uit staan --
     het sluit zichzelf buiten schooltijd -- en dan is er niets te zien
     om een reden die niets met picto's te maken heeft. Bij Leerlingen
     staat elk kind met zijn rondje, altijd. */
  await p2.goto(APP + '/beheer.html');
  await p2.waitForSelector('.zij-knop', { timeout: 12000 });
  await p2.waitForFunction(
    () => (KB.klas().leerlingen || []).some(l => String(l.pictoId || '').indexOf('bank-') === 0),
    null, { timeout: 15000 });
  await p2.click('.zij-knop:has-text("Leerlingen")');
  await p2.waitForTimeout(900);

  const opTweede = await p2.evaluate(() => {
    const k = KB.klas();
    const l = (k.leerlingen || []).filter(x => String(x.pictoId || '').indexOf('bank-') === 0)[0];
    return l ? { naam:l.naam, pictoId:l.pictoId,
                 heeftPlaatje: !!(l.image && l.image.indexOf('svg') > 0) } : null;
  });
  zeg('op een tweede apparaat heeft hetzelfde kind hetzelfde picto',
      !!opTweede && opTweede.pictoId === 'bank-kat' && opTweede.heeftPlaatje,
      opTweede ? opTweede.naam + ' → ' + opTweede.pictoId : 'niet aangekomen');

  const inBeeld = await p2.evaluate(() =>
    [].filter.call(document.querySelectorAll('.picto-rond'),
      function (x) { return (x.style.backgroundImage || '').indexOf('svg') >= 0; }).length);
  zeg('en hij staat daar in beeld', inBeeld >= 1, inBeeld + ' rondjes met een tekening');
  await tweede.close();

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');
  zeg('en nergens een ontbrekend bestand', kwijt.length === 0,
      [...new Set(kwijt)].join(', ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => {
  /* Wat er al goed ging hoort ook op het scherm te komen als de proef
     halverwege omvalt. Zonder dit zie je alleen de crash en moet je
     raden hoe ver hij kwam. */
  if (uit.length) console.log(uit.join('\n'));
  console.error('Error:', e && e.stack || e);
  process.exit(1);
});
