/* Wat er gebeurt als een kind in een hoek landt.

   Het ging eerst zo: het picto vloog naar het midden van de kaart en
   sprong daarna naar zijn plekje -- precies op het moment dat een kleuter
   kijkt of het gelukt is. Nu vliegt hij naar de plek zelf en laat hij
   even zien dat hij daar zit. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await p.goto(APP + '/demo.html');
  await p.click('#start');
  await p.waitForSelector('.hoek', { timeout: 9000 });

  /* Waar hoort hij heen? Naar de eerste vrije plek, niet naar het midden
     van de kaart. Die twee liggen ver genoeg uit elkaar om het verschil
     te kunnen meten. */
  const doelen = await p.evaluate(() => {
    const k = document.querySelector('.hoek');
    const v = k.querySelector('.plek.vrij');
    const mk = k.getBoundingClientRect(), mp = v.getBoundingClientRect();
    return { kaart: { x: mk.left + mk.width / 2, y: mk.top + mk.height / 2 },
             plek: { x: mp.left + mp.width / 2, y: mp.top + mp.height / 2 } };
  });
  const afstand = Math.hypot(doelen.kaart.x - doelen.plek.x, doelen.kaart.y - doelen.plek.y);
  zeg('de vrije plek ligt niet op het midden van de kaart', afstand > 40,
      Math.round(afstand) + ' px ertussen');

  // ── slepen ──
  const picto = await p.$('.strook .picto');
  const hoek = await p.$('.hoek');
  const a = await picto.boundingBox(), c = await hoek.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  /* Loslaten bóven in de kaart, ver van de plek: zo zie je of hij
     doorvliegt naar de plek of blijft hangen waar je losliet. */
  await p.mouse.move(c.x + c.width / 2, c.y + 30, { steps: 12 });
  await p.mouse.up();

  /* Wachten tot de vlucht klaar is in plaats van een vast aantal
     milliseconden. De plek krijgt 'netgeland' pas als het kind is
     geland, en die klasse blijft maar 800 ms staan -- duurt de veer
     net iets langer dan de pauze hier, dan kijkt de proef naar een
     landing die nog moet beginnen. De zwevende bol verdwijnt precies
     op het moment dat de vlucht eindigt, dus daar wachten we op.
     Zie ook test/aanraken.test.js, waar dit twee van de drie keer
     misging. */
  await p.waitForFunction(() => !document.querySelector('.sleep-geest'),
                          null, { timeout: 6000 });
  await p.waitForTimeout(60);
  const tijdens = await p.evaluate(() => {
    const n = document.querySelector('.plek.netgeland');
    if (!n) return null;
    const r = n.querySelector('.picto-rond');
    return { ring: getComputedStyle(n, '::after').width,
             maat: n.style.getPropertyValue('--ringmaat'),
             kind: n.dataset.leerling,
             rond: r ? r.offsetWidth : 0 };
  });
  zeg('tijdens de landing laat de plek zien dat er net iemand is geland',
      !!tijdens, tijdens ? 'ring ' + tijdens.ring : 'geen landing te zien');
  zeg('en de ring is op de maat van de cirkel gemeten',
      !!tijdens && Math.abs(parseInt(tijdens.maat, 10) - tijdens.rond) <= 2,
      tijdens ? tijdens.maat + ' om een cirkel van ' + tijdens.rond + 'px' : '—');

  // ── en daarna is het gewoon weer stil ──
  await p.waitForTimeout(1000);
  const na = await p.evaluate(() => ({
    nogAan: !!document.querySelector('.plek.netgeland'),
    inHoek: document.querySelectorAll('.hoek .plek.bezet').length,
    beneden: document.querySelectorAll('.strook .picto').length,
    stijl: (document.querySelector('.hoek .plek.bezet') || {}).style
             ? document.querySelector('.hoek .plek.bezet').getAttribute('style')
             : null
  }));
  zeg('daarna is de landing voorbij', na.nogAan === false, String(na.nogAan));
  zeg('en ruimt hij zijn eigen stijl weer op',
      !na.stijl || na.stijl.indexOf('ringmaat') < 0, na.stijl || 'geen stijl over');
  zeg('het kind staat in de hoek', na.inHoek === 1, na.inHoek + ' in de hoek');
  zeg('en niet meer in de rij beneden', na.beneden === 15, na.beneden + ' beneden');

  // ── en er blijft niets zweven ──
  const resten = await p.evaluate(() => document.querySelectorAll('.sleep-geest').length);
  zeg('er zweeft geen sleepbeeld meer rond', resten === 0, resten + ' over');

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
