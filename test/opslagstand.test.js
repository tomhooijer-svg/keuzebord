/* Is het opgeslagen? Dat moet je kunnen zien, en je moet het zelf kunnen
   afdwingen. De stand staat onderin de zijbalk en onderaan het weekplan. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

// Naar een paneel gaan doe je via het menu. Het adres met #week erachter
// werkt alleen bij het openen van de pagina; staat de pagina er al, dan
// verandert er niets en kijk je nog steeds naar Vandaag.
async function naarPaneel(p, naam){
  await p.evaluate(n => {
    const b = [...document.querySelectorAll('.zij-knop')].filter(x => x.textContent.trim() === n)[0];
    if (b) b.click();
  }, naam);
  await p.waitForTimeout(700);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport:{width:1500,height:1000} });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));
  const uit = [];
  const zeg = (n, ok, extra) => {
    const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,120) + ']' : '');
    uit.push(r); console.log(r);
  };

  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','juf@mijnschool.nl'); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/beheer\.html/, { timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(2500);

  await p.evaluate(() => {
    const k = KB.klas();
    k.leerlingen = Array.from({length:6}, (_,i)=>({ id:'l'+i, naam:'Kind '+(i+1), kleur:'#3b6ff0' }));
    k.hoekLib = [{ id:'wp', naam:'Werkplaats', maxKinderen:4, werkplaats:true }];
    k.borden[0].hoekLibIds = ['wp'];
    k.taken = []; KB.nieuweTaak({ naam:'Knipwerk', omschrijving:'', plekken:4 }, k);
    KB.bewaar();
  });
  await p.waitForTimeout(3200);          // eerst rustig naar de server

  const lezen = sel => p.evaluate(s => {
    const z = document.querySelector(s);
    return z ? { klasse:z.className, tekst:z.textContent } : null;
  }, sel);

  zeg('de stand staat onderin de zijbalk',
      !!(await lezen('.zij-onder .opslagstand')), JSON.stringify(await lezen('.zij-onder .opslagstand')));

  await naarPaneel(p, 'Weekplan');
  const inWeek = await lezen('.opslagstrook .opslagstand');
  zeg('en onderaan het weekplan', !!inWeek, JSON.stringify(inWeek));
  zeg('hij zegt dat het opgeslagen is', !!inWeek && /stand-klaar/.test(inWeek.klasse) &&
      /Opgeslagen/.test(inWeek.tekst), inWeek && inWeek.tekst);

  // iets veranderen: dan is hij even bezig en daarna weer klaar
  await p.click('button:has-text("Taak inplannen")'); await p.waitForTimeout(400);
  await p.click('.kiesrij:has-text("Knipwerk")'); await p.waitForTimeout(150);
  const bezig = await lezen('.opslagstrook .opslagstand');
  zeg('zodra je iets verandert staat hij op bezig',
      !!bezig && /stand-bezig/.test(bezig.klasse), bezig && bezig.klasse);
  await p.waitForTimeout(3500);
  const weerKlaar = await lezen('.opslagstrook .opslagstand');
  zeg('en daarna staat hij weer op opgeslagen',
      !!weerKlaar && /stand-klaar/.test(weerKlaar.klasse), weerKlaar && weerKlaar.tekst);

  // zonder verbinding: hij zegt het, en hij liegt niet dat het weg is
  await p.evaluate(() => {
    window.__echt = SB.schrijf;
    SB.schrijf = function () { const e = new Error('geen verbinding'); e.offline = true;
                               return Promise.reject(e); };
    const k = KB.klas(); KB.nieuweTaak({ naam:'Verven', omschrijving:'', plekken:3 }, k); KB.bewaar();
  });
  await p.waitForTimeout(3000);
  const zonderNet = await lezen('.opslagstrook .opslagstand');
  zeg('zonder verbinding zegt hij dat het nog niet verstuurd is',
      !!zonderNet && /stand-wacht/.test(zonderNet.klasse), zonderNet && zonderNet.tekst);

  // de knop zelf: hij probeert het opnieuw en meldt eerlijk dat het niet lukt
  await p.click('button:has-text("Weekplan opslaan")');
  await p.waitForTimeout(1800);
  const melding = await p.evaluate(() => (document.getElementById('melding')||{}).textContent);
  zeg('de knop zegt eerlijk dat het op dit apparaat staat',
      /dit apparaat/.test(melding || ''), melding);

  // en met de verbinding terug is het alsnog weg
  await p.evaluate(() => { SB.schrijf = window.__echt; });
  await p.click('button:has-text("Weekplan opslaan")');
  await p.waitForTimeout(2500);
  const naKnop = await lezen('.opslagstrook .opslagstand');
  const melding2 = await p.evaluate(() => (document.getElementById('melding')||{}).textContent);
  zeg('met verbinding meldt de knop dat het opgeslagen is', /Opgeslagen/.test(melding2 || ''), melding2);
  zeg('en de stand staat weer op groen',
      !!naKnop && /stand-klaar/.test(naKnop.klasse), naKnop && naKnop.klasse);

  zeg('geen fouten op de pagina', fouten.length === 0, fouten.slice(0,3).join(' | '));

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
