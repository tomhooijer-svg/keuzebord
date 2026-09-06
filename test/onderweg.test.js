/* Een wijziging die binnenkomt terwijl er al iets onderweg is naar de
   server. Dat is het geval waarin het weekplan verdween: je plant een
   taak in terwijl de vorige ronde nog loopt, die ronde heeft jouw taak
   niet gezien, en de afdruk die zij achterlaat zegt "alles is bij".
   Daarna denkt niemand meer dat er iets te versturen valt -- tot je
   ververst en de server het lege weekplan terugstuurt. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';
const PAGINA = APP + '/inloggen.html';

async function apparaat(b){
  const c = await b.newContext({ viewport:{width:1280,height:900} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  [fout op de pagina] ' + e.message));
  await p.goto(PAGINA);
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(PAGINA);
  return p;
}

async function laagjes(p){
  for (const src of ['/src/kb-data.js','/src/kb-supabase.js','/src/kb-sync.js']) {
    if (!await p.evaluate(s => {
      const naam = s.includes('data') ? 'KB' : s.includes('supabase') ? 'SB' : 'KBSYNC';
      return typeof window[naam] !== 'undefined';
    }, src)) await p.addScriptTag({ url: src });
  }
  await p.evaluate(() => { KB.laad(); });
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));
  const post = Date.now() + '@school.nl';

  const p1 = await apparaat(b);
  await p1.click('button[data-naar="registreren"]');
  await p1.fill('#naam','Tom'); await p1.fill('#email',post); await p1.fill('#ww','eenwachtwoord');
  await p1.click('#verstuur');
  await p1.waitForURL(/school\.html/, { timeout: 9000 }).catch(()=>{});
  await laagjes(p1);

  const opzet = await p1.evaluate(async () => {
    try {
      await SB.roep('school_beginnen', { schoolnaam: 'De Regenboog' });
      const ik = await SB.wieBenIk();
      const groep = (await SB.schrijf('groepen', [{ school_id: ik.profiel.school_id, naam:'Groep 1A' }]))[0];
      const k = KB.klas();
      k.naam = 'Groep 1A';
      k.leerlingen = ['Sem','Noor'].map((n,i)=>({id:'l'+i, naam:n, kleur:'#3b6ff0'}));
      k.taken = [{ id:'t0', naam:'Knipwerk', omschrijving:'', plekken:4,
                   kleur:'#e79a1f', doelIds:[], gemaakt:Date.now() }];
      KB.bewaar();
      await KBSYNC.duw(k.id, groep.id, ik.profiel.school_id);
      return { groepId: groep.id, schoolId: ik.profiel.school_id, klasId: k.id };
    } catch (e) { return { fout: e.message }; }
  });
  zeg('de groep staat op de server', !opzet.fout, opzet.fout || '');
  if (opzet.fout) { console.log(uit.join('\n')); await b.close(); process.exit(1); }

  // ── de taak wordt ingepland terwijl er al een ronde loopt ──
  const race = await p1.evaluate(async (g) => {
    try {
      const k = KB.klas();
      // de server even traag maken, anders is de ronde klaar voordat er
      // iets tussendoor kan komen -- in de klas duurt hij een seconde
      const echt = SB.schrijf;
      SB.schrijf = function () {
        var a = arguments;
        return new Promise(function (r) { setTimeout(r, 250); })
          .then(function () { return echt.apply(SB, a); });
      };

      // ronde 1: iets kleins, en we wachten er expres niet op
      k.leerlingen.push({ id:'l9', naam:'Tess', kleur:'#37ab74' });
      KB.bewaar();
      const ronde1 = KBSYNC.duw(k.id, g.groepId, g.schoolId);

      // die ronde heeft nu zijn foto van de groep genomen. En nu pas,
      // terwijl hij loopt, plant de leerkracht een taak in.
      await new Promise(function (r) { setTimeout(r, 120); });
      k.weken = { '2026-08-31': { centraleDoelIds:[], notitie:'',
        taken:[{ taakId:'t0', verdeling:{ma:[],di:[],wo:[],do:[],vr:[]}, afgerond:{} }] } };
      KB.bewaar();
      const ronde2 = KBSYNC.duw(k.id, g.groepId, g.schoolId);

      await ronde1; await ronde2;
      SB.schrijf = echt;
      const afdruk = JSON.parse(localStorage.getItem('kb_afdruk') || '{}')[k.id] || {};
      return { inAfdruk: (afdruk.weekplan_taken || []).length,
               inRijen: KBSYNC.naarRijen(k).weekplan_taken.length };
    } catch (e) { return { fout: e.message }; }
  }, opzet);
  zeg('de ingeplande taak zit in de rijen die verstuurd horen te worden',
      race.inRijen === 1, race.fout || race.inRijen);

  // ── wat weet de server ervan? ──
  const p2 = await apparaat(b);
  await p2.fill('#email',post); await p2.fill('#ww','eenwachtwoord');
  await p2.click('#verstuur');
  await p2.waitForURL(/school\.html/, { timeout: 9000 }).catch(()=>{});
  await laagjes(p2);
  const opgehaald = await p2.evaluate(async (g) => {
    try {
      const k = await KBSYNC.haalBinnen(KB.klas().id, g.groepId);
      const w = k.weken['2026-08-31'] || {};
      return { weken: Object.keys(k.weken).length, taken: (w.taken || []).length };
    } catch (e) { return { fout: e.message }; }
  }, opzet);

  zeg('de week staat op de server', opgehaald.weken === 1, opgehaald.fout || opgehaald.weken);
  zeg('de ingeplande taak staat er ook -- ook al kwam hij tijdens een ronde binnen',
      opgehaald.taken === 1, opgehaald.fout || ('taken: ' + opgehaald.taken));
  zeg('de afdruk beweert niet dat de taak al weg is',
      race.inAfdruk === 1, 'in de afdruk: ' + race.inAfdruk);

  console.log(uit.join('\n'));
  const fout = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(fout ? ('\n' + fout + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(fout ? 1 : 0);
})();
