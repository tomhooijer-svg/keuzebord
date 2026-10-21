/* Niet steeds dezelfde hoek.

   De regel die Digikeuzebord ook heeft: een kind dat deze week al vaak
   in een hoek zat, kiest eerst eens wat anders. Staat standaard uit --
   of een kleuter zeven keer in de bouwhoek mag is een keuze van de
   leerkracht, niet van de software. Deze proef bewaakt vooral dát:
   uit is uit. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  /* De demo geeft ons een groep met kinderen en hoeken zonder server,
     login of proefschool. Precies genoeg om een regel op het bord te
     toetsen. */
  await p.goto(APP + '/demo.html');
  await p.click('#start');
  await p.waitForSelector('.hoek', { timeout: 9000 });

  // wie en waar
  const wie = await p.evaluate(() => {
    const k = KB.klas();
    return { kind: k.leerlingen[0].id, naam: k.leerlingen[0].naam,
             hoek: k.hoekLib[0].id, hoekNaam: k.hoekLib[0].naam,
             andere: k.hoekLib[1].id };
  });

  // ── standaard staat hij uit ──
  const uitStand = await p.evaluate((w) => {
    const r = [];
    for (let i = 0; i < 5; i++) {
      r.push(KB.plaats(w.kind, w.hoek).ok);
      KB.haalWeg(w.kind, w.hoek);
    }
    return r;
  }, wie);
  zeg('standaard mag een kind zo vaak in dezelfde hoek als het wil',
      uitStand.every(Boolean), uitStand.join(' '));

  // ── aan, met een grens van twee ──
  await p.evaluate((w) => {
    const k = KB.klas();
    k.settings.herhaalAan = true;
    k.settings.herhaalMax = 2;
    k.gebeurtenissen = [];           // schoon beginnen
    KB.bewaar();
  }, wie);

  const metGrens = await p.evaluate((w) => {
    const r = [];
    for (let i = 0; i < 3; i++) {
      const u = KB.plaats(w.kind, w.hoek);
      r.push(u.ok ? 'ok' : u.reden);
      KB.haalWeg(w.kind, w.hoek);
    }
    return r;
  }, wie);
  zeg('met de grens op twee mag het twee keer en de derde keer niet',
      metGrens.join(' ') === 'ok ok te-vaak', metGrens.join(' '));

  const aantal = await p.evaluate((w) => KB.kerenDezeWeek(w.kind, w.hoek), wie);
  zeg('en de telling klopt', aantal === 2, aantal + ' keer deze week');

  // ── een andere hoek mag gewoon ──
  const ander = await p.evaluate((w) => {
    const u = KB.plaats(w.kind, w.andere);
    KB.haalWeg(w.kind, w.andere);
    return u.ok;
  }, wie);
  zeg('een andere hoek mag wel', ander === true, String(ander));

  // ── wat het kind op het bord te zien krijgt ──
  /* Via de gewone weg: het picto oppakken en op de hoek loslaten. Het
     bord beslist, niet de proef. */
  await p.reload();
  await p.waitForSelector('.hoek', { timeout: 9000 });
  const picto = await p.$('.strook .picto');
  const hoek = await p.$('.hoek');
  const a = await picto.boundingBox(), c2 = await hoek.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  await p.mouse.move(c2.x + c2.width / 2, c2.y + c2.height / 2, { steps: 14 });
  await p.mouse.up();
  await p.waitForTimeout(900);

  const blad = await p.textContent('.blad').catch(() => '');
  zeg('het bord legt het rustig uit in plaats van te weigeren',
      /al twee keer|al 2 keer|Kies vandaag eens iets anders/.test(blad),
      blad.replace(/\s+/g, ' ').slice(0, 80) || 'geen blad');
  zeg('en noemt het kind bij zijn naam',
      blad.indexOf(wie.naam) >= 0, wie.naam);
  zeg('het kind staat dus nog gewoon beneden',
      (await p.$$('.strook .picto')).length === 16,
      (await p.$$('.strook .picto')).length + ' kinderen beneden');

  // ── maandag begint iedereen weer blanco ──
  const naWeek = await p.evaluate((w) => {
    const k = KB.klas();
    const langGeleden = Date.now() - 1000 * 60 * 60 * 24 * 9;
    (k.gebeurtenissen || []).forEach(e => { e.tijd = langGeleden; });
    KB.bewaar();
    const n = KB.kerenDezeWeek(w.kind, w.hoek);
    const u = KB.plaats(w.kind, w.hoek);
    return { telling: n, mag: u.ok };
  }, wie);
  zeg('wat vorige week gebeurde telt niet mee', naWeek.telling === 0,
      naWeek.telling + ' keer deze week');
  zeg('dus na het weekend mag het weer', naWeek.mag === true, String(naWeek.mag));

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
