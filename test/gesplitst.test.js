/* De twee uitgaven.

   Uit één werkplaats komen Keuzebord en Planbord. Deze proef kijkt of
   ze allebei op zichzelf draaien: het juiste menu, geen fouten, geen
   verwijzingen naar code die niet is meegekomen -- en of ze elkaar
   kunnen vinden met de groep mee. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BORD = process.env.BORDAPP || 'http://localhost:8898';
const PLAN = process.env.PLANAPP || 'http://localhost:8897';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,130) + ']' : '');
  uit.push(r); console.log(r);
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  async function bekijk(naam, adres, wie){
    const c = await b.newContext({ viewport:{width:1500,height:1000} });
    const p = await c.newPage();
    const fouten = [];
    p.on('pageerror', e => fouten.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/favicon|fonts\.googleapis|ERR_|net::/.test(m.text()))
        fouten.push('[console] ' + m.text().slice(0,120));
    });
    // 404 op code die niet is meegekomen zou stilletjes gebeuren
    const gemist = [];
    p.on('response', r => { if (r.status() === 404 && /\.js|\.css|\.json/.test(r.url())) gemist.push(r.url().split('/').pop()); });

    await p.goto(adres + '/inloggen.html');
    await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                             localStorage.setItem('kb_serversleutel','proefsleutel'); });
    await p.goto(adres + '/inloggen.html');
    await p.fill('#email', wie || 'juf@mijnschool.nl'); await p.fill('#ww','proefproef');
    await p.click('#verstuur');
    await p.waitForTimeout(4000);
    await p.goto(adres + '/beheer.html');
    await p.waitForTimeout(4000);

    const beeld = await p.evaluate(() => ({
      app: window.KB_APP ? KB_APP.id : null,
      naam: window.KB_APP ? KB_APP.naam : null,
      menu: [...document.querySelectorAll('.zij-knop')].map(x => x.textContent.trim()),
      over: [...document.querySelectorAll('a.zij-over')].map(x => x.getAttribute('href')),
      inhoud: (document.getElementById('inhoud')||{}).textContent.trim().length,
      panelen: window.BH ? Object.keys(BH.panelen).sort() : []
    }));
    return { naam, p, c, fouten, gemist, beeld };
  }

  /* ── Keuzebord ────────────────────────────────────────────────── */
  const bord = await bekijk('Keuzebord', BORD);
  zeg('Keuzebord weet dat hij Keuzebord is', bord.beeld.app === 'keuzebord', bord.beeld.naam);
  zeg('geen code die niet is meegekomen', bord.gemist.length === 0, bord.gemist.join(', ') || 'niets gemist');
  zeg('er viel niets om in Keuzebord', bord.fouten.length === 0,
      bord.fouten.slice(0,2).join(' | ') || 'geen fout');

  const bordMenu = bord.beeld.menu.filter(x => !/^Naar /.test(x));
  zeg('Keuzebord heeft het bordmenu',
      ['Statistieken','Leerlingen',"Picto's",'Hoeken','Uiterlijk','Groep','Functies']
        .every(n => bordMenu.indexOf(n) >= 0), bordMenu.join(', '));
  zeg('en geen planwerk',
      !['Weekplan',"Thema's",'Taken','Doelen','Observaties','Vandaag']
        .some(n => bordMenu.indexOf(n) >= 0), bordMenu.join(', '));
  zeg('het planwerk is er ook echt niet, niet alleen verstopt',
      !bord.beeld.panelen.some(x => ['week','themas','taken','doelen','observaties'].indexOf(x) >= 0),
      bord.beeld.panelen.join(','));
  zeg('Keuzebord opent op een scherm dat hij heeft', bord.beeld.inhoud > 40,
      bord.beeld.inhoud + ' tekens');
  zeg('en wijst de weg naar Planbord',
      bord.beeld.over.length === 1 && /planbord/.test(bord.beeld.over[0]),
      bord.beeld.over.join(' '));
  zeg('met de groep in het adres', /groep=/.test(bord.beeld.over[0] || ''), bord.beeld.over[0]);

  /* het bord zelf moet het ook nog doen */
  await bord.p.goto(BORD + '/bord.html');
  await bord.p.waitForTimeout(3500);
  const bordScherm = await bord.p.evaluate(() => ({
    hoeken: document.querySelectorAll('.hoek').length,
    knoppen: document.querySelectorAll('.bordknop').length
  }));
  zeg('het bord zelf gaat open in Keuzebord', bordScherm.knoppen > 0,
      bordScherm.hoeken + ' hoeken, ' + bordScherm.knoppen + ' knoppen');

  /* ── Planbord ─────────────────────────────────────────────────── */
  const plan = await bekijk('Planbord', PLAN);
  zeg('Planbord weet dat hij Planbord is', plan.beeld.app === 'planbord', plan.beeld.naam);
  zeg('geen code die niet is meegekomen', plan.gemist.length === 0, plan.gemist.join(', ') || 'niets gemist');
  zeg('er viel niets om in Planbord', plan.fouten.length === 0,
      plan.fouten.slice(0,2).join(' | ') || 'geen fout');

  const planMenu = plan.beeld.menu.filter(x => !/^Naar /.test(x));
  zeg('Planbord heeft het planwerk',
      ['Vandaag','Weekplan',"Thema's",'Taken','Doelen','Observaties']
        .every(n => planMenu.indexOf(n) >= 0), planMenu.join(', '));
  zeg('en niet het bordbeheer',
      !['Statistieken',"Picto's",'Hoeken','Uiterlijk','Functies','Leerlingen']
        .some(n => planMenu.indexOf(n) >= 0), planMenu.join(', '));
  zeg('Planbord opent op Vandaag', plan.beeld.inhoud > 40, plan.beeld.inhoud + ' tekens');
  zeg('en wijst de weg naar Keuzebord',
      plan.beeld.over.length === 1 && /keuzebord/.test(plan.beeld.over[0]),
      plan.beeld.over.join(' '));

  /* elk paneel van Planbord één keer openen */
  const planRonde = await plan.p.evaluate(async () => {
    const uitslag = [];
    const knoppen = [...document.querySelectorAll('.zij-knop')].filter(x => x.tagName === 'BUTTON');
    for (const k of knoppen) {
      k.click();
      await new Promise(r => setTimeout(r, 260));
      uitslag.push({ naam: k.textContent.trim(),
                     tekens: (document.getElementById('inhoud')||{}).textContent.trim().length });
    }
    return uitslag;
  });
  zeg('elk paneel van Planbord vult zich',
      planRonde.every(x => x.tekens > 40),
      planRonde.map(x => x.naam + ':' + x.tekens).join(' '));

  /* en van Keuzebord */
  await bord.p.goto(BORD + '/beheer.html');
  await bord.p.waitForTimeout(3500);
  const bordRonde = await bord.p.evaluate(async () => {
    const uitslag = [];
    const knoppen = [...document.querySelectorAll('.zij-knop')].filter(x => x.tagName === 'BUTTON');
    for (const k of knoppen) {
      k.click();
      await new Promise(r => setTimeout(r, 260));
      uitslag.push({ naam: k.textContent.trim(),
                     tekens: (document.getElementById('inhoud')||{}).textContent.trim().length });
    }
    return uitslag;
  });
  zeg('elk paneel van Keuzebord vult zich',
      bordRonde.every(x => x.tekens > 40),
      bordRonde.map(x => x.naam + ':' + x.tekens).join(' '));

  /* ── wijst elke link naar iets dat er is? ─────────────────────── *
     Het uitgeefscript kijkt of elk <script src> bestaat, maar niet naar
     de links die de app tijdens het draaien maakt. Daar zat de fout:
     "Bord openen" wees naar bord.html, en Planbord heeft geen bord --
     dus kwam je op de 404 van GitHub uit in plaats van op je bord. */
  async function linksNa(wat, x, basis){
    const adressen = await x.p.evaluate(async () => {
      const gezien = {};
      const knoppen = [...document.querySelectorAll('.zij-knop')].filter(k => k.tagName === 'BUTTON');
      for (const k of knoppen) {
        k.click();
        await new Promise(r => setTimeout(r, 300));
        [...document.querySelectorAll('a[href]')].forEach(a => {
          const h = a.getAttribute('href');
          if (!h || /^(https?:|mailto:|#|javascript:)/.test(h)) return;
          gezien[h] = (a.textContent || '').trim().slice(0, 30) || a.className;
        });
      }
      /* de knop naar de andere app hoort er ook bij */
      [...document.querySelectorAll('a[href]')].forEach(a => {
        const h = a.getAttribute('href');
        if (h && !/^(https?:|mailto:|#|javascript:)/.test(h)) gezien[h] = (a.textContent||'').trim().slice(0,30);
      });
      return gezien;
    });

    const stuk = [];
    for (const adres of Object.keys(adressen)) {
      const heel = new URL(adres, basis + '/beheer.html').href;
      const r = await x.p.evaluate(async (u) => {
        try { const a = await fetch(u, { method:'GET', cache:'no-store' }); return a.status; }
        catch (e) { return 'onbereikbaar'; }
      }, heel);
      if (r !== 200) stuk.push(adressen[adres] + ' → ' + adres + ' (' + r + ')');
    }
    zeg(wat, stuk.length === 0,
        stuk.length ? stuk.join(' | ') : Object.keys(adressen).length + ' links, allemaal raak');
  }

  await bord.p.goto(BORD + '/beheer.html'); await bord.p.waitForTimeout(3000);
  await linksNa('elke link in Keuzebord wijst naar iets dat bestaat', bord, BORD);
  await plan.p.goto(PLAN + '/beheer.html'); await plan.p.waitForTimeout(3000);
  await linksNa('elke link in Planbord wijst naar iets dat bestaat', plan, PLAN);

  /* ── de oversteek: kom je aan waar je was ─────────────────────── */
  /* Een link maken is niet hetzelfde als aankomen. We zetten Planbord op
     een andere groep dan waar hij nu staat, en lopen dan het adres af
     dat Keuzebord aanbiedt. */
  /* De juf heeft er maar één, en dan bewijs je met een wissel niets.
     Dus doen we dit als schoolbeheerder, die ze allemaal ziet -- in een
     vers venster, want uitloggen en opnieuw inloggen in hetzelfde
     venster is een omweg met eigen valkuilen. */
  const baas = await bekijk('Planbord als beheerder', PLAN, 'beheerder@mijnschool.nl');
  const groepen = await baas.p.evaluate(() => (KB.G.klassen || []).map(k => ({
    naam: k.naam, lokaal: k.id, server: KBSYNC.opServer(k.id)
  })).filter(x => x.server));
  zeg('de beheerder ziet meer dan één groep om tussen te wisselen',
      groepen.length >= 2, groepen.map(g => g.naam).join(', '));

  if (groepen.length >= 2) {
    const doel = groepen[groepen.length - 1];
    const vanaf = await baas.p.evaluate(() => {
      const eerste = KB.G.klassen[0];
      KB.zetBeheerKlas(eerste.id); KB.G.activeKlasId = eerste.id; KB.bewaar();
      return eerste.naam;
    });
    zeg('we beginnen ergens anders dan waar we heen gaan', vanaf !== doel.naam,
        vanaf + ' \u2192 ' + doel.naam);
    await baas.p.goto(PLAN + '/beheer.html?groep=' + encodeURIComponent(doel.server));
    await baas.p.waitForTimeout(3500);
    const aangekomen = await baas.p.evaluate(() => ({
      groep: KB.klas().naam,
      inBeeld: (document.getElementById('zij-groep')||{}).textContent
    }));
    zeg('de groep uit het adres wordt overgenomen bij aankomst',
        aangekomen.groep === doel.naam,
        'gevraagd ' + doel.naam + ', gekregen ' + aangekomen.groep);
    zeg('en staat ook in beeld', aangekomen.inBeeld === doel.naam, aangekomen.inBeeld);
  }

  /* Een adres met een groep die dit apparaat niet kent mag niets slopen. */
  await baas.p.goto(PLAN + '/beheer.html?groep=bestaat-niet-1234');
  await baas.p.waitForTimeout(3000);
  const onzin = await baas.p.evaluate(() => ({
    groep: KB.klas() ? KB.klas().naam : null,
    inhoud: (document.getElementById('inhoud')||{}).textContent.trim().length
  }));
  zeg('een onbekende groep in het adres laat de app gewoon staan',
      !!onzin.groep && onzin.inhoud > 40, onzin.groep + ', ' + onzin.inhoud + ' tekens');

  /* ── twee tabbladen op één apparaat ───────────────────────────── *
     Ze delen dezelfde opslag, en elk tabblad schrijft zijn eigen kopie in
     zijn geheel terug. Dat is het echte risico bij het testen met twee
     groepen. Samenvoegen komt later; nu moet het scherm het in elk geval
     merken en zeggen, in plaats van er stil overheen te schrijven. */
  const samen = await b.newContext();
  const tabA = await samen.newPage();
  const tabB = await samen.newPage();
  await tabA.goto(BORD + '/inloggen.html');
  await tabA.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                              localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await tabA.goto(BORD + '/inloggen.html');
  await tabA.fill('#email','juf@mijnschool.nl'); await tabA.fill('#ww','proefproef');
  await tabA.click('#verstuur'); await tabA.waitForTimeout(4500);
  await tabA.goto(BORD + '/beheer.html');   await tabA.waitForTimeout(3500);
  await tabB.goto(PLAN + '/beheer.html');   await tabB.waitForTimeout(3500);

  const beideOpen = await Promise.all([
    tabA.evaluate(() => !!(window.KB && KB.klas())),
    tabB.evaluate(() => !!(window.KB && KB.klas()))
  ]);
  zeg('twee tabbladen op één apparaat draaien allebei', beideOpen[0] && beideOpen[1],
      beideOpen.join(', '));

  /* in tabblad B iets opslaan */
  await tabB.evaluate(() => { KB.klas().naam = 'Gewijzigd in tabblad B'; KB.bewaar(); });
  await tabA.waitForTimeout(1500);
  const gemerkt = await tabA.evaluate(() => ({
    verouderd: KB.verouderd(),
    melding: (document.getElementById('melding')||{}).textContent || ''
  }));
  zeg('het andere tabblad merkt dat er elders is gewerkt', gemerkt.verouderd === true,
      'verouderd: ' + gemerkt.verouderd);
  zeg('en zegt het ook', /ander tabblad/i.test(gemerkt.melding), gemerkt.melding.slice(0,70));

  /* En nu waar het echt om gaat: tabblad A slaat daarna zelf iets op.
     Vroeger schreef dat de wijziging van B eroverheen. */
  await tabA.evaluate(() => {
    KB.G.settings = KB.G.settings || {};
    KB.G.settings.proefstempel = 'A was hier';
    KB.bewaar();
  });
  await tabA.waitForTimeout(800);
  const eind = await tabA.evaluate(() => {
    const opslag = JSON.parse(localStorage.getItem('kb_v5'));
    return {
      vanB: (opslag.klassen || []).some(k => k.naam === 'Gewijzigd in tabblad B'),
      vanA: !!(opslag.settings || {}).proefstempel,
      groepen: (opslag.klassen || []).length
    };
  });
  zeg('het werk van tabblad B blijft staan als A daarna opslaat', eind.vanB === true,
      eind.groepen + ' groepen, B erin: ' + eind.vanB);
  zeg('en het werk van A staat er ook in', eind.vanA === true);
  await samen.close();

  const alleFouten = bord.fouten.concat(plan.fouten).concat(baas.fouten);
  zeg('er viel nergens iets om', alleFouten.length === 0,
      alleFouten.slice(0,3).join(' | ') || 'geen enkele fout');

  console.log('\n' + uit.filter(x=>/goed/.test(x)).length + ' van ' + uit.length + ' goed');
  console.log(uit.filter(x=>/FOUT/.test(x)).length ? 'ER GING IETS MIS' : 'alles goed');
  await b.close();
})();
