/* Het blad voor het oudergesprek.

   Eén kind, één vel papier. Wat deze proef bewaakt: er staat wat er
   écht is gebeurd, er staat bij waar het kind níét kwam (dat is vaak
   het gesprek), en op papier blijft alleen het blad over -- geen
   zijbalk, geen knoppen, geen demobalk. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await p.goto(APP + '/demo.html');
  await p.click('#start');
  await p.waitForSelector('.hoek', { timeout: 9000 });

  /* Tien dagen gespeeld. Het eerste kind kiest steeds dezelfde hoek --
     dat is precies het kind waar een oudergesprek over gaat. */
  const opzet = await p.evaluate(() => {
    const k = KB.klas();
    const nu = Date.now();
    k.gebeurtenissen = [];
    const kids = k.leerlingen.slice(0, 4);
    const hoeken = k.hoekLib;
    for (let d = 0; d < 10; d++) {
      kids.forEach((l, i) => {
        const h = hoeken[i === 0 ? 0 : (d + i) % hoeken.length];
        k.gebeurtenissen.push({ soort: 'gekozen', leerlingId: l.id, hoekId: h.id,
                                tijd: nu - (10 - d) * 86400000 + i * 60000 });
        k.gebeurtenissen.push({ soort: 'weg', leerlingId: l.id, hoekId: h.id,
                                tijd: nu - (10 - d) * 86400000 + i * 60000 + 25 * 60000 });
      });
    }
    KB.bewaar();
    return { kind: kids[0].naam, hoek: hoeken[0].naam, aantalHoeken: hoeken.length };
  });

  await p.goto(APP + '/beheer.html');
  await p.waitForSelector('.zij-knop', { timeout: 9000 });
  await p.click('.zij-knop:has-text("Statistieken")');
  await p.waitForSelector('.kindrij-knop', { timeout: 6000 });
  await p.click('.kindrij-knop');
  await p.waitForTimeout(400);

  const knop = await p.$('button:has-text("Blad voor het oudergesprek")');
  zeg('er is een blad voor het oudergesprek', !!knop, knop ? 'knop staat er' : 'niet gevonden');
  await knop.click();
  await p.waitForSelector('.printblad', { timeout: 5000 });
  const tekst = (await p.textContent('.printblad')).replace(/\s+/g, ' ');

  zeg('het blad gaat over één kind, met naam en periode',
      tekst.indexOf(opzet.kind) >= 0 && /de laatste \d+ weken/.test(tekst),
      tekst.slice(0, 44));
  zeg('het begint met één zin die het samenvat',
      /koos 10 keer, verdeeld over 1 hoek/.test(tekst),
      (tekst.match(/koos [^.]+\./) || ['—'])[0]);
  zeg('het noemt de hoek waar hij zat', new RegExp(opzet.hoek).test(tekst), opzet.hoek);
  zeg('en vooral: waar hij niet kwam',
      /Waar .* niet kwam/.test(tekst) && (tekst.match(/,/g) || []).length >= 3,
      (tekst.match(/niet kwam([^.]+)\./) || ['—'])[0].slice(0, 60));
  zeg('en met wie hij speelde', /Met wie/.test(tekst) && /keer samen/.test(tekst),
      (tekst.match(/Met wie(.{0,40})/) || ['—'])[0]);
  zeg('met een voetregel die zegt wat het níét is',
      /niet over wat het kan of heeft geleerd/.test(tekst), 'staat erbij');

  // ── en hoe het op papier komt ──
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(250);
  const opPapier = await p.evaluate(() => ({
    zijbalk: getComputedStyle(document.querySelector('.app')).display,
    knoppen: getComputedStyle(document.querySelector('.nietprinten')).display,
    blad: getComputedStyle(document.querySelector('.blad')).boxShadow,
    balken: getComputedStyle(document.querySelector('.printbalk span')).width
  }));
  zeg('op papier verdwijnt het scherm eromheen', opPapier.zijbalk === 'none', opPapier.zijbalk);
  zeg('en de knoppen ook', opPapier.knoppen === 'none', opPapier.knoppen);
  zeg('het blad zelf heeft geen schaduw op papier',
      opPapier.blad === 'none', opPapier.blad);
  zeg('en de balkjes blijven zichtbaar',
      parseFloat(opPapier.balken) > 0, opPapier.balken);
  await p.emulateMedia({ media: 'screen' });

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
