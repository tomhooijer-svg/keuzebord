/* Wat je op het Planbord indeelt, hoort op het Keuzebord te staan -- ook
   als dat een ander apparaat is. De leerkracht plant de werkplaats in op
   haar laptop; het digibord in de klas moet die kinderen laten zien.

   Dit is de proef bij de klacht "de kinderen die ik vooraf heb ingedeeld
   verschijnen niet in de hoek". */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

async function apparaat(b, waarheen){
  const c = await b.newContext({ viewport:{width:1500,height:1000} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  [fout] ' + e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','juf@mijnschool.nl'); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/beheer\.html/, { timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(2500);
  if (waarheen) { await p.goto(APP + waarheen); await p.waitForTimeout(2800); }
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => {
    const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,120) + ']' : '');
    uit.push(r); console.log(r);
  };

  // ── de laptop van de leerkracht ──
  const laptop = await apparaat(b);
  await laptop.evaluate(() => {
    const k = KB.klas();
    k.leerlingen = Array.from({length:8}, (_,i)=>({ id:'l'+i, naam:'Kind '+(i+1), kleur:'#3b6ff0' }));
    k.hoekLib = [{ id:'wp', naam:'Werkplaats', maxKinderen:4, werkplaats:true },
                 { id:'h1', naam:'Bouwhoek', maxKinderen:4 }];
    k.borden[0].hoekLibIds = ['wp','h1'];
    k.borden[0].plaatsingen = { wp:[], h1:[] };
    k.settings.werkplaatsAan = true;
    k.taken = [{ id:'t0', naam:'Knipwerk', omschrijving:'', plekken:4, kleur:'#e79a1f',
                 doelIds:[], gemaakt:Date.now() }];
    k.weken = {};
    KB.bewaar();
  });
  await laptop.waitForTimeout(2800);

  // en nu de indeling: vier kinderen op vandaag
  const ingedeeld = await laptop.evaluate(() => {
    const k = KB.klas(), ws = KB.weekSleutel(), dag = KB.dagVanVandaag();
    KB.weekTaak(ws, 't0', k);
    const wt = KB.week(ws, k).taken[0];
    KB.DAGEN_KORT.forEach(d => { wt.verdeling[d] = []; });
    wt.verdeling[dag] = ['l0','l1','l2','l3'];
    KB.bewaar();
    return { dag: dag, week: ws, aantal: wt.verdeling[dag].length };
  });
  zeg('vier kinderen ingedeeld op ' + ingedeeld.dag, ingedeeld.aantal === 4, ingedeeld.aantal);
  await laptop.waitForTimeout(3500);   // ruim de tijd om te versturen

  // ── het digibord in de klas: een ánder apparaat ──
  const digibord = await apparaat(b, '/bord.html');
  const opBord = await digibord.evaluate(() => {
    const kaart = [...document.querySelectorAll('.hoek')]
      .filter(h => /Werkplaats/.test(h.textContent))[0];
    if (!kaart) return { fout: 'geen werkplaatskaart' };
    const k = KB.klas(), ws = KB.weekSleutel(), dag = KB.dagVanVandaag();
    const w = k.weken[ws] || {};
    return { gereserveerd: kaart.querySelectorAll('.plek.gereserveerd').length,
             straks: kaart.querySelectorAll('.plek.straks').length,
             wekenHier: Object.keys(k.weken || {}).length,
             takenInDeWeek: (w.taken || []).length,
             opVandaag: (((w.taken || [])[0] || {}).verdeling || {})[dag] || [],
             schakelaar: KB.instelling('werkplaatsAan', k) };
  });
  zeg('het weekplan is op het digibord aangekomen',
      opBord.takenInDeWeek === 1, JSON.stringify(opBord));
  zeg('de vier ingedeelde kinderen staan er ook',
      (opBord.opVandaag || []).length === 4, JSON.stringify(opBord.opVandaag));
  zeg('en ze staan in de werkplaatshoek klaar',
      opBord.gereserveerd === 4, 'gereserveerd: ' + opBord.gereserveerd + ', grijs: ' + opBord.straks);
  await digibord.screenshot({ path:'/tmp/naarhetbord.png' });

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
