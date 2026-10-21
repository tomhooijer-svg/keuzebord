/* Thema's: de kleuren van het bord in één keer om.

   Let op het verschil met test/themas.test.js -- dat gaat over thema's
   in de zin van thematisch werken (de vraag, de doelen, de weken). Dit
   gaat over hoe het bord eruitziet.

   Wat deze proef vooral bewaakt: een thema is alleen een stel kleuren.
   Er komt geen tweede bord, de opbouw van het scherm blijft gelijk, en
   een hoek waar de leerkracht zelf een kleur voor koos houdt die. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

async function bordBeeld(p) {
  return p.evaluate(() => ({
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    randen: [...document.querySelectorAll('.hoek')]
      .map(n => getComputedStyle(n, '::before').backgroundColor),
    hoeken: document.querySelectorAll('.hoek').length,
    plekken: document.querySelectorAll('.plek').length,
    kinderen: document.querySelectorAll('.strook .picto').length
  }));
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await p.goto(APP + '/demo.html');
  await p.click('#start');
  await p.waitForSelector('.hoek', { timeout: 9000 });
  const standaard = await bordBeeld(p);
  zeg('standaard staat het bord op de gewone kleuren',
      standaard.accent === '#3b6ff0', standaard.accent);
  zeg('en de hoeken hebben elk hun eigen randje',
      new Set(standaard.randen).size === standaard.randen.length,
      standaard.randen.length + ' hoeken, ' + new Set(standaard.randen).size + ' kleuren');

  // ── een thema kiezen ──
  await p.evaluate(() => {
    const u = KB.uiterlijk();
    u.thema = 'kerst'; u.soort = 'sfeer'; u.sfeer = 'winter';
    KB.bewaar();
  });
  await p.reload();
  await p.waitForSelector('.hoek', { timeout: 9000 });
  const kerst = await bordBeeld(p);
  zeg('met Kerst staat de accentkleur om', kerst.accent === '#2f7a4f', kerst.accent);
  zeg('en de randjes boven de hoeken ook',
      kerst.randen.join() !== standaard.randen.join(), kerst.randen.slice(0, 2).join(' '));

  zeg('maar het bord is verder precies hetzelfde bord',
      kerst.hoeken === standaard.hoeken && kerst.plekken === standaard.plekken
      && kerst.kinderen === standaard.kinderen,
      kerst.hoeken + ' hoeken, ' + kerst.plekken + ' plekken, ' + kerst.kinderen + ' kinderen');

  // ── een eigen kleur wint van het thema ──
  await p.evaluate(() => {
    KB.klas().hoekLib[0].kleur = '#d94f4f';
    KB.bewaar();
  });
  await p.reload();
  await p.waitForSelector('.hoek', { timeout: 9000 });
  const metEigen = await bordBeeld(p);
  zeg('een hoek met een eigen kleur houdt die',
      metEigen.randen[0] === 'rgb(217, 79, 79)', metEigen.randen[0]);
  zeg('en de rest volgt het thema nog steeds',
      metEigen.randen[1] === kerst.randen[1], metEigen.randen[1]);

  // ── alle thema's leveren echte kleuren ──
  const alle = await p.evaluate(() => KB.THEMAS.map(t => ({
    id: t.id, naam: t.naam, accent: t.accent, aantal: (t.hoeken || []).length,
    geldig: /^#[0-9a-f]{6}$/i.test(t.accent) && (t.hoeken || []).every(c => /^#[0-9a-f]{6}$/i.test(c))
  })));
  zeg('er staan negen thema’s klaar', alle.length === 9,
      alle.map(t => t.naam).join(', '));
  zeg('en alle kleuren erin zijn geldig', alle.every(t => t.geldig && t.aantal >= 6),
      alle.filter(t => !t.geldig || t.aantal < 6).map(t => t.id).join(', ') || 'allemaal goed');

  // ── het thema blijft staan ──
  await p.goto(APP + '/beheer.html');
  await p.waitForSelector('.zij-knop', { timeout: 9000 });
  await p.click('.zij-knop:has-text("Uiterlijk")');
  await p.waitForSelector('.sfeerknop', { timeout: 5000 });
  const gekozen = await p.$$eval('.sfeerknop.aan span', ns => ns.map(n => n.textContent));
  zeg('het beheer laat zien welk thema aanstaat', gekozen.indexOf('Kerst') >= 0,
      gekozen.join(', '));

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
