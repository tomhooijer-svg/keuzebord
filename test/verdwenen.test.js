/* De toets die de leerkracht zelf deed: plan een taak in en ververs hard.
   Staat hij er dan nog?

   Twee keer, want er zijn twee manieren om hem kwijt te raken. Eén: je
   plant in terwijl er nog iets onderweg is naar de server -- dan ging je
   taak niet mee en werd hij bij het ophalen overschreven. Twee: het
   versturen lukt niet (geen wifi) -- dan mag het ophalen hem hier niet
   weggooien. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,140) + ']' : '');
  uit.push(r); console.log(r);
};

async function inloggen(p){
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','beheerder@mijnschool.nl'); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/school\.html/, { timeout: 25000 }).catch(()=>{});
  await p.waitForTimeout(2500);
}

const weekVan = () => {
  const d = new Date(); const dag = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dag);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport:{width:1500,height:1000} });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await inloggen(p);

  // een groep met één taak erin, en een leeg weekplan
  await p.evaluate(async () => {
    const g = KB.G.klassen.filter(x => x.naam === 'Groep 1A')[0];
    await KBV.naarGroep(g.id);
    const k = KB.klas();
    k.leerlingen = ['Sem','Noor','Liam','Julia'].map((n,i)=>({ id:'l'+i, naam:n, kleur:'#3b6ff0' }));
    k.hoekLib = [{ id:'h0', naam:'Werkplaats', maxKinderen:6, werkplaats:true }];
    k.borden[0].hoekLibIds = ['h0'];
    k.taken = []; KB.nieuweTaak({ naam:'Knipwerk', omschrijving:'knippen', plekken:4 }, k);
    k.weken = {};
    KB.bewaar();
  });
  await p.waitForTimeout(2500);   // alles netjes naar de server

  /* ── 1. inplannen terwijl er iets onderweg is ─────────────────────── */
  await p.goto(APP + '/beheer.html#week');
  await p.waitForTimeout(2500);

  // de server traag maken, zoals wifi op school
  await p.evaluate(() => {
    const echt = SB.schrijf;
    window._echtSchrijf = echt;
    SB.schrijf = function () { const a = arguments;
      return new Promise(r => setTimeout(r, 400)).then(() => echt.apply(SB, a)); };
  });
  // iets kleins opslaan: daar gaat een ronde van lopen
  await p.evaluate(() => { const k = KB.klas();
    k.leerlingen.push({ id:'l8', naam:'Tess', kleur:'#37ab74' }); KB.bewaar(); });
  await p.waitForTimeout(1800);   // de ronde is nu bezig

  // en nu, midden in die ronde, plant de leerkracht een taak in
  await p.click('button:has-text("Taak inplannen")');
  await p.waitForTimeout(400);
  await p.click('.kiesrij:has-text("Knipwerk")');
  await p.waitForTimeout(4000);   // ruim de tijd om alsnog weg te komen

  const voor = await p.evaluate(w => ({
    inGeheugen: ((KB.klas().weken[w] || {}).taken || []).length,
    wachtend: KBSYNC.wachtErIetsOp(KB.klas().id)
  }), weekVan());
  zeg('de taak staat ingepland voor het verversen', voor.inGeheugen === 1, JSON.stringify(voor));

  await p.reload();               // de harde ververs
  await p.waitForTimeout(4000);
  const na = await p.evaluate(w => ((KB.klas().weken[w] || {}).taken || []).length, weekVan());
  zeg('en hij staat er na een harde ververs nog steeds', na === 1, 'taken: ' + na);

  /* ── 2. inplannen terwijl de server onbereikbaar is ───────────────── */
  await p.evaluate(() => {
    SB.schrijf = function () { const e = new Error('geen verbinding'); e.offline = true;
                               return Promise.reject(e); };
  });
  await p.evaluate(() => { const k = KB.klas();
    KB.nieuweTaak({ naam:'Verven', omschrijving:'met een kwast', plekken:3 }, k); KB.bewaar(); });
  await p.waitForTimeout(400);
  await p.click('button:has-text("Taak inplannen")');
  await p.waitForTimeout(400);
  await p.click('.kiesrij:has-text("Verven")');
  await p.waitForTimeout(3000);

  const zonderNet = await p.evaluate(w => ({
    taken: ((KB.klas().weken[w] || {}).taken || []).length,
    wachtend: KBSYNC.wachtErIetsOp(KB.klas().id)
  }), weekVan());
  zeg('zonder verbinding blijft de tweede taak hier staan',
      zonderNet.taken === 2, JSON.stringify(zonderNet));
  zeg('en de app weet dat er nog iets weg moet', zonderNet.wachtend === true, JSON.stringify(zonderNet));

  // het scherm haalt intussen op -- dat mag het werk hier niet wissen
  await p.evaluate(() => KBV.haalOp().catch(()=>{}));
  await p.waitForTimeout(1500);
  const naOphalen = await p.evaluate(w => ((KB.klas().weken[w] || {}).taken || []).length, weekVan());
  zeg('ophalen gooit weg wat nog niet verstuurd is niet weg', naOphalen === 2, 'taken: ' + naOphalen);

  // en zodra de verbinding er weer is, gaat het alsnog mee
  await p.evaluate(() => { SB.schrijf = window._echtSchrijf; });
  await p.evaluate(() => KBV.stuurNu().catch(()=>{}));
  await p.waitForTimeout(2500);
  await p.reload();
  await p.waitForTimeout(4000);
  const eind = await p.evaluate(w => ((KB.klas().weken[w] || {}).taken || []).length, weekVan());
  zeg('als de verbinding terug is staan beide taken er nog na een ververs', eind === 2, 'taken: ' + eind);

  zeg('geen fouten op de pagina', fouten.length === 0, fouten.slice(0,3).join(' | '));

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
