/* Het bord bedienen met een vinger, op een scherm zoals dat van Prowise.

   Op school hangt het bord aan een touchscreen. Tot nu toe werd het altijd
   met een muis beproefd, en een muis is niet hetzelfde als een vinger: een
   browser mag een vingerbeweging opeisen om mee te scrollen, en dan komt
   er van slepen niets terecht. Deze proef stuurt echte aanraakgebeurtenissen
   (touchstart/touchmove/touchend) via de browser zelf, op een scherm dat
   zich voordoet als een digibord van bijna vier meter pixels breed.

   Meteen ook de vraag die erachter zit: kan deze browser het überhaupt?
   Het bord vraagt een stuk of tien dingen van een browser -- opslag, een
   fotokluis, een klok, verbindingen die je kunt afbreken. De proef kijkt
   ze na, zodat we kunnen zeggen welke browser wél en welke niet. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0, 200) + ']' : '');
  uit.push(r); console.log(r);
};

/* Een touchscreen aan een digibord: groot, geen muis, wel vingers. De
   gebruikersnaam van de browser is die van Prowise Central -- een Android
   met Chromium erin -- zodat we ook meten wat zo'n apparaat meldt. */
const PROWISE = 'Mozilla/5.0 (Linux; Android 11; Prowise Central) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';

/* Playwright klikt met een muis, ook op een aanraakscherm. Voor een echte
   vinger moeten we bij de browser zelf aankloppen. */
async function vingerSleep(p, cdp, van, naar){
  const punt = (x, y) => [{ x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punt(van.x, van.y) });
  const stappen = 8;
  for (let i = 1; i <= stappen; i++) {
    const x = van.x + (naar.x - van.x) * i / stappen;
    const y = van.y + (naar.y - van.y) * i / stappen;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: punt(x, y) });
    await p.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
}

const midden = async (p, kiezer) => {
  const doos = await p.locator(kiezer).first().boundingBox();
  if (!doos) return null;
  return { x: doos.x + doos.width / 2, y: doos.y + doos.height / 2 };
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    hasTouch: true, isMobile: false,
    userAgent: PROWISE
  });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));
  const cdp = await c.newCDPSession(p);

  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server', 'http://localhost:5455');
                           localStorage.setItem('kb_serversleutel', 'proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email', 'juf@mijnschool.nl'); await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4000);

  /* ── 1. kan deze browser het? ──────────────────────────────────────── */
  const kan = await p.evaluate(() => ({
    opslag:     (function(){ try { localStorage.setItem('_p','1'); localStorage.removeItem('_p'); return true; } catch(e){ return false; } })(),
    fotokluis:  !!window.indexedDB,
    verbinding: typeof fetch === 'function',
    beloften:   typeof Promise === 'function',
    afbreken:   typeof AbortController === 'function',
    vingers:    'PointerEvent' in window && (navigator.maxTouchPoints || 0) > 0,
    rooster:    CSS.supports('display', 'grid'),
    eigenschappen: CSS.supports('--x', '1'),
    aanvullen:  typeof ''.padStart === 'function',
    adres:      typeof URLSearchParams === 'function',
    aanraakstop: CSS.supports('touch-action', 'none')
  }));
  Object.keys(kan).forEach(function (naam) {
    zeg('deze browser kan: ' + naam, kan[naam] === true, String(kan[naam]));
  });

  /* ── 2. het bord met een vinger bedienen ───────────────────────────── */
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(4000);
  await p.evaluate(() => {
    const k = KB.klas();
    k.leerlingen = ['Sem', 'Noor', 'Liam', 'Julia'].map((n, i) =>
      ({ id: 'l' + i, naam: n, kleur: '#3b6ff0' }));
    k.hoekLib = [{ id: 'h0', naam: 'Bouwhoek', maxKinderen: 4 },
                 { id: 'h1', naam: 'Leeshoek', maxKinderen: 4 }];
    k.borden[0].hoekLibIds = ['h0', 'h1'];
    k.borden[0].plaatsingen = { h0: [], h1: [] };
    k.borden[0].laatstGeleegd = Date.now();
    k.settings = Object.assign(KB.standaardInstellingen(), { timerAan: true, afkoelAan: true });
    KB.bewaar();
  });
  await p.waitForTimeout(3500);
  /* Het bord tekent zichzelf niet opnieuw omdat wij de groep omgooien --
     het weet niet dat wij bestaan. Een verandering van schermgrootte kent
     het wel, en dat is precies wat er op een digibord ook gebeurt. */
  await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(900);

  const kind = await midden(p, '.strook .picto[data-leerling-id="l0"]');
  const hoek = await midden(p, '.hoek[data-hoek-id="h0"]');
  zeg('het kind en de hoek staan op het scherm', !!kind && !!hoek,
      JSON.stringify({ kind: kind, hoek: hoek }));

  if (kind && hoek) {
    await vingerSleep(p, cdp, kind, hoek);
    const waar = await p.evaluate(() =>
      (KB.bord(KB.klas()).plaatsingen.h0 || []).map(x => x.leerlingId).join(','));
    zeg('met één vinger gesleept staat het kind in de bouwhoek',
        waar.indexOf('l0') >= 0, 'bouwhoek: ' + waar);
  }

  /* ── 3. en het kan meteen weer rechtgezet worden ───────────────────── */
  const staatEr = await p.evaluate(() =>
    (KB.bord(KB.klas()).plaatsingen.h0 || []).length > 0);
  if (staatEr) {
    const erin = await midden(p, '.hoek[data-hoek-id="h0"] .picto[data-leerling-id="l0"]');
    const andere = await midden(p, '.hoek[data-hoek-id="h1"]');
    if (erin && andere) {
      await vingerSleep(p, cdp, erin, andere);
      const nu = await p.evaluate(() => ({
        bouw: (KB.bord(KB.klas()).plaatsingen.h0 || []).map(x => x.leerlingId).join(','),
        lees: (KB.bord(KB.klas()).plaatsingen.h1 || []).map(x => x.leerlingId).join(',')
      }));
      zeg('een vergissing mag meteen worden rechtgezet',
          nu.lees.indexOf('l0') >= 0 && nu.bouw.indexOf('l0') < 0, JSON.stringify(nu));
    }
  }

  /* ── 4. de code van het bord met vingers intikken ──────────────────── */
  /* Op een digibord is er geen toetsenbord. Alles wat de leerkracht daar
     doet moet dus met de knoppen op het scherm kunnen. */
  await p.evaluate(() => {
    const k = KB.klas();
    k.settings.pinAan = true; k.settings.pincode = '1234';
    KB.bewaar();
  });
  await p.waitForTimeout(2500);
  await p.tap('#knop-menu');
  await p.waitForTimeout(600);
  const toetsen = await p.locator('.pintoets').count();
  zeg('de code heeft eigen toetsen op het scherm', toetsen >= 10, 'toetsen: ' + toetsen);
  for (const teken of ['1', '2', '3', '4']) {
    await p.locator('.pintoets', { hasText: new RegExp('^' + teken + '$') }).first().tap();
    await p.waitForTimeout(220);
  }
  await p.waitForTimeout(900);
  const menuOpen = await p.locator('.blad, .overlay').first().isVisible().catch(() => false);
  zeg('met vier tikken gaat het menu open', menuOpen === true, String(menuOpen));

  zeg('geen enkele fout op de pagina', fouten.length === 0, fouten.join(' | '));
  await b.close();
})();
