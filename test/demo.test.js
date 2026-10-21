/* De meekijk-omgeving: wat een geïnteresseerde ziet als hij op het
   linkje klikt.

   Twee dingen bewaakt deze proef. Eén: de demo komt nooit aan de
   gegevens van een echte leerkracht die in dezelfde browser werkt. Twee:
   de demobalk dekt de kinderen niet af -- die moet je juist kunnen
   slepen, en dat ging de eerste keer mis. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

  const c = await b.newContext({ viewport:{width:1280,height:860} });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  // ── er werkt al een leerkracht in deze browser ──
  await p.goto(APP + '/demo.html');
  const ECHT = JSON.stringify({ klassen:[{ id:'echt', naam:'Groep van de juf', leerlingen:[] }] });
  await p.evaluate((v) => localStorage.setItem('kb_v5', v), ECHT);

  await p.click('#start');
  await p.waitForSelector('#demobalk', { timeout: 9000 });
  zeg('de demo opent het bord', /bord\.html/.test(p.url()), p.url().split('/').pop());

  const kinderen = await p.$$('.strook .picto');
  const hoeken = await p.$$('.hoek');
  zeg('met zestien verzonnen kinderen', kinderen.length === 16, kinderen.length + ' kinderen');
  zeg('en zes hoeken', hoeken.length === 6, hoeken.length + ' hoeken');

  const namen = await p.$$eval('.strook .picto-naam', ns => ns.map(n => n.textContent));
  zeg('het zijn verzonnen namen', namen.indexOf('Bram') >= 0 && namen.indexOf('Maud') >= 0,
      namen.slice(0, 4).join(' '));

  // ── geen serverlaag, en dus geen weg naar een echte school ──
  const lagen = await p.evaluate(() => [typeof window.SB, typeof window.KBV, typeof window.KBSYNC]);
  zeg('de serverlaag bestaat hier niet', lagen.every(t => t === 'undefined'), lagen.join(' '));

  // ── de balk dekt de kinderen niet af ──
  const overlap = await p.evaluate(() => {
    var balk = document.getElementById('demobalk').getBoundingClientRect();
    return Array.prototype.slice.call(document.querySelectorAll('.strook .picto'))
      .filter(function (n) {
        var r = n.getBoundingClientRect();
        return r.bottom > balk.top && r.top < balk.bottom;
      }).length;
  });
  zeg('en de balk ligt niet over de kinderen heen', overlap === 0, overlap + ' kinderen bedekt');

  const laatste = await p.evaluate(() => {
    var ns = document.querySelectorAll('.strook .picto');
    var r = ns[ns.length - 1].getBoundingClientRect();
    return r.bottom <= window.innerHeight && r.width > 0;
  });
  zeg('en het laatste kind past nog op het scherm', laatste === true, String(laatste));

  // ── de gegevens van de juf blijven met rust ──
  const sleutels = await p.evaluate(() => Object.keys(localStorage).sort());
  zeg('de demo bewaart onder eigen sleutels',
      sleutels.every(s => s === 'kb_v5' || s.indexOf('kb_demo') === 0), sleutels.join(' '));
  const echtNog = await p.evaluate(() => localStorage.getItem('kb_v5'));
  zeg('en die van de juf is onaangeroerd', echtNog === ECHT,
      echtNog === ECHT ? 'ongewijzigd' : String(echtNog).slice(0, 40));

  // ── wat je in de demo doet, blijft in de demo ──
  await p.evaluate(() => {
    KB.klas().leerlingen.push({ id:'demo-extra', naam:'Pim', kleur:'#3b6ff0', image:null, lid:true });
    KB.bewaar();
  });
  await p.reload();
  await p.waitForSelector('#demobalk', { timeout: 9000 });
  const naHerladen = await p.$$eval('.strook .picto-naam', ns => ns.map(n => n.textContent));
  zeg('een wijziging blijft staan na herladen', naHerladen.indexOf('Pim') >= 0,
      naHerladen.length + ' kinderen');
  const echtNogSteeds = await p.evaluate(() => localStorage.getItem('kb_v5'));
  zeg('en de juf merkt er nog steeds niets van', echtNogSteeds === ECHT, 'ongewijzigd');

  // ── opnieuw beginnen ──
  await p.click('#demobalk button:has-text("Opnieuw beginnen")');
  await p.waitForSelector('#demobalk', { timeout: 9000 });
  await p.waitForTimeout(600);
  const naReset = await p.$$eval('.strook .picto-naam', ns => ns.map(n => n.textContent));
  zeg('opnieuw beginnen geeft een schone demo',
      naReset.length === 16 && naReset.indexOf('Pim') < 0, naReset.length + ' kinderen');

  // ── de demo verlaten ──
  await p.click('#demobalk button:has-text("Demo verlaten")');
  await p.waitForURL(/inloggen\.html/, { timeout: 9000 }).catch(()=>{});
  zeg('demo verlaten brengt je bij het inloggen', /inloggen\.html/.test(p.url()),
      p.url().split('/').pop());
  const over = await p.evaluate(() => Object.keys(localStorage).filter(s => s.indexOf('kb_demo') === 0));
  zeg('en ruimt zijn eigen sleutels op', over.length === 0, over.join(' ') || 'niets over');
  const echtTotSlot = await p.evaluate(() => localStorage.getItem('kb_v5'));
  zeg('de juf heeft er van begin tot eind niets van gemerkt', echtTotSlot === ECHT, 'ongewijzigd');

  // ── het beheer doet in de demo ook mee ──
  await p.goto(APP + '/demo.html');
  await p.click('#beheer');
  await p.waitForSelector('#demobalk', { timeout: 9000 });
  zeg('je kunt ook in het beheer kijken', /beheer\.html/.test(p.url()), p.url().split('/').pop());
  const menu = await p.$$eval('.zij-knop', ns => ns.length);
  zeg('en daar staat gewoon het menu', menu > 3, menu + ' onderdelen');

  zeg('geen enkele fout in de pagina', fouten.length === 0, fouten.slice(0, 2).join(' | ') || 'geen');

  await p.screenshot({ path: process.env.SCHOT ? 'demo.png' : '/dev/null' }).catch(()=>{});

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
