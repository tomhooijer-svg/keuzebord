/* De testversie-chip.

   Waar het hier om gaat is niet dat er een chip staat, maar dat hij
   klein blijft en weg kan. Een leerkracht die iets geks ziet moet weten
   dat dit een proefversie is, en jij moet bij een melding weten welke
   code ze voor zich had. Maar kleuters staan met hun handen op dat
   scherm, dus wat niet van hen is hoort zo klein mogelijk te zijn.

   En één ding dat net zo belangrijk is: hij moet in één keer uit kunnen.
   Gaat de app echt in gebruik, dan staat KB_APP.testversie op false en
   is hij overal weg -- niet op zeven plekken half. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

async function naarBord(p){
  await p.goto(APP + '/demo.html');
  await p.evaluate(() => { try {
    localStorage.removeItem('kb_demo_v5');
    localStorage.removeItem('kb_testchip_klein');
  } catch (e) {} });
  await p.goto(APP + '/demo.html');
  await p.click('#start');
  await p.waitForSelector('.hoek', { timeout: 12000 });
  await p.waitForTimeout(500);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await naarBord(p);

  zeg('op het bord staat een testchip', await p.isVisible('#testchip'));

  const tekst = (await p.textContent('#testchip')).replace(/\s+/g, ' ').trim();
  zeg('met het versienummer erin', /Testversie · .+/.test(tekst), tekst);

  const datum = await p.evaluate(() => KB.VERSIE);
  zeg('en dat is de versie die de app zelf zegt te zijn',
      tekst.indexOf(datum) >= 0, datum);

  // De bouwvingerafdruk is voor de melder, niet voor de klas: op het
  // bord maakt hij de chip twee keer zo breed voor iemand die er niets
  // aan heeft.
  const bouw = await p.evaluate(() => (window.KB_APP && KB_APP.bouw) || '');
  zeg('maar zonder de bouwcode, die hoort hier niet',
      !bouw || tekst.indexOf(bouw) < 0, bouw ? 'bouw ' + bouw + ' blijft weg' : 'werkplaats, geen bouwcode');

  // Klein met opzet. De bovenbalk is voor de groepsnaam en de klok; een
  // balk over de breedte zou ruimte eten die voor de hoeken is.
  const breed = await p.evaluate(() => document.getElementById('testchip').offsetWidth);
  const scherm = await p.evaluate(() => document.body.clientWidth);
  zeg('hij is klein: hooguit een vijfde van de balk',
      breed < scherm / 5, breed + 'px van ' + scherm + 'px');

  const inBalk = await p.evaluate(() => !!document.querySelector('.balk .balk-links #testchip'));
  zeg('en hij staat in de bovenbalk, niet over het bord heen', inBalk === true);

  // ── inklappen ──
  await p.click('#testchip');
  await p.waitForTimeout(400);
  const klein = await p.evaluate(() => document.getElementById('testchip').offsetWidth);
  zeg('tikken klapt hem in tot een stip', klein < 26 && klein > 0, klein + 'px');
  zeg('en de stip blijft zichtbaar, zodat de juf hem terugvindt',
      await p.isVisible('#testchip'));

  await p.reload();
  await p.waitForSelector('.hoek', { timeout: 12000 });
  await p.waitForTimeout(500);
  const naHerladen = await p.evaluate(() =>
    document.getElementById('testchip').classList.contains('klein'));
  zeg('na herladen is hij nog steeds ingeklapt', naHerladen === true,
      'het digibord onthoudt het');

  await p.click('#testchip');
  await p.waitForTimeout(400);
  zeg('en nog een tik klapt hem weer uit',
      await p.evaluate(() => document.getElementById('testchip').offsetWidth) > 60);

  // ── in het beheer ──
  await p.goto(APP + '/beheer.html');
  await p.waitForSelector('.zij-knop', { timeout: 12000 });
  await p.waitForTimeout(500);
  zeg('in het beheer staat hij in de zijbalk', await p.isVisible('.zijbalk .testmerk'));
  zeg('en hij zit niet in de weg van het menu',
      await p.evaluate(() => {
        const m = document.querySelector('.testmerk').getBoundingClientRect();
        const k = document.querySelector('.zij-menu').getBoundingClientRect();
        return m.bottom <= k.top + 1;
      }) === true);

  // ── de bouwcode ──
  // De werkplaats heeft er geen; een uitgave wel. Zonder die hier te
  // verzinnen zou de controle hieronder altijd slagen en niets bewijzen
  // -- groen, en toch blind voor het geval waar het om gaat.
  await p.evaluate(() => {
    window.KB_APP.bouw = 'abc12345';
    document.querySelectorAll('.testmerk, #testchip').forEach(n => n.remove());
    KBTEST.plaats();
  });
  await p.waitForTimeout(200);
  const zijtekst = (await p.textContent('.testmerk')).replace(/\s+/g, ' ').trim();
  zeg('in het beheer staat de bouwcode er wél bij, want daar kijk jij mee',
      zijtekst.indexOf('abc12345') >= 0, zijtekst);

  await naarBord(p);
  await p.evaluate(() => {
    window.KB_APP.bouw = 'abc12345';
    document.querySelectorAll('.testmerk, #testchip').forEach(n => n.remove());
    KBTEST.plaats();
  });
  await p.waitForTimeout(200);
  const bordtekst = (await p.textContent('#testchip')).replace(/\s+/g, ' ').trim();
  zeg('maar op het bord juist niet', bordtekst.indexOf('abc12345') < 0, bordtekst);

  // ── de schakelaar ──
  // Dit is waar het op aankomt: één regel uit, en hij is overal weg.
  await p.evaluate(() => { window.KB_APP.testversie = false;
                           document.querySelectorAll('.testmerk, #testchip')
                                   .forEach(n => n.remove());
                           KBTEST.plaats(); });
  await p.waitForTimeout(200);
  zeg('staat de schakelaar uit, dan tekent hij niets',
      await p.evaluate(() => document.querySelectorAll('.testmerk, #testchip').length) === 0);

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
