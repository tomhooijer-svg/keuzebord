/* Het einde van de keuzemomenten, en de speling aan het begin.

   Twee dingen die met de klok te maken hebben en dus alleen met de klok
   te beproeven zijn.

   1. De afkoelperiode. Een kleuter sleept zijn plaatje net naast de hoek
      die hij bedoelde. De eerste seconden mag hij dat zelf rechtzetten;
      daarna geldt de speeltijd van de hoek en zit hij vast.

   2. Afsluiten. Handmatig via het menu, en vanzelf -- op een tijdstip of
      na een tijdsduur. Wat er dan nog op het bord staat gaat het logboek
      in, want de statistiek van de week hoort te kloppen ook als het bord
      dichtgaat terwijl de leerkracht al in de kring zit. De volgende
      ochtend staat het bord weer open. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0, 200) + ']' : '');
  uit.push(r); console.log(r);
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server', 'http://localhost:5455');
                           localStorage.setItem('kb_serversleutel', 'proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email', 'juf@mijnschool.nl'); await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4000);
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(4000);

  const opzet = async (extra) => p.evaluate(function (meer) {
    const k = KB.klas();
    k.leerlingen = ['Sem', 'Noor', 'Liam'].map((n, i) => ({ id: 'l' + i, naam: n, kleur: '#3b6ff0' }));
    k.hoekLib = [{ id: 'h0', naam: 'Bouwhoek', maxKinderen: 4 },
                 { id: 'h1', naam: 'Leeshoek', maxKinderen: 4 }];
    k.borden[0].hoekLibIds = ['h0', 'h1'];
    k.borden[0].plaatsingen = { h0: [], h1: [] };
    k.borden[0].laatstGeleegd = Date.now();
    k.borden[0].gesloten = false;
    k.borden[0].laatstGesloten = 0;
    k.borden[0].sluitingGedaan = 0;
    k.borden[0].geopendOp = Date.now();
    k.settings = Object.assign(KB.standaardInstellingen(),
      { timerAan: true, timerMinuten: 20, bordLegen: 'nooit' }, meer || {});
    KB.bewaar();
  }, extra);

  /* ── 1. de afkoelperiode ───────────────────────────────────────────── */
  await opzet({ afkoelAan: true, afkoelSeconden: 20 });
  await p.waitForTimeout(3000);

  const netGekozen = await p.evaluate(() => {
    KB.plaats('l0', 'h0');
    const b = KB.bord(KB.klas());
    const plaatsing = b.plaatsingen.h0[0];
    return {
      koelt: KB.afkoelRest(plaatsing) > 0,
      losVast: KB.vergrendeldTot(plaatsing, KB.hoekVan('h0')),
      verhuizen: KB.plaats('l0', 'h1').ok
    };
  });
  zeg('net gekozen: de speling loopt', netGekozen.koelt === true, JSON.stringify(netGekozen));
  zeg('net gekozen: het kind zit nog niet vast', netGekozen.losVast === 0, String(netGekozen.losVast));
  zeg('net gekozen: het kind mag zelf naar een andere hoek',
      netGekozen.verhuizen === true, String(netGekozen.verhuizen));

  const naDeSpeling = await p.evaluate(() => {
    const b = KB.bord(KB.klas());
    // de klok een halve minuut terugzetten: de speling is voorbij
    b.plaatsingen.h1[0].startTijd = Date.now() - 30000;
    KB.bewaar();
    const plaatsing = b.plaatsingen.h1[0];
    return {
      koelt: KB.afkoelRest(plaatsing) > 0,
      vastMs: KB.vergrendeldTot(plaatsing, KB.hoekVan('h1')),
      verhuizen: KB.plaats('l0', 'h0')
    };
  });
  zeg('na de speling zit het kind wel vast',
      naDeSpeling.koelt === false && naDeSpeling.vastMs > 0, JSON.stringify(naDeSpeling.vastMs));
  zeg('en dan mag het niet meer zelf verhuizen',
      naDeSpeling.verhuizen.ok === false && naDeSpeling.verhuizen.reden === 'vergrendeld',
      JSON.stringify(naDeSpeling.verhuizen));

  const uitgezet = await p.evaluate(() => {
    KB.klas().settings.afkoelAan = false; KB.bewaar();
    const b = KB.bord(KB.klas());
    b.plaatsingen.h1[0].startTijd = Date.now();
    return KB.vergrendeldTot(b.plaatsingen.h1[0], KB.hoekVan('h1')) > 0;
  });
  zeg('staat de speling uit, dan zit een kind meteen vast', uitgezet === true, String(uitgezet));

  /* ── 2. zelf afsluiten ─────────────────────────────────────────────── */
  await opzet({ sluitenSoort: 'nooit' });
  await p.waitForTimeout(3000);
  const zelf = await p.evaluate(() => {
    KB.plaats('l0', 'h0'); KB.plaats('l1', 'h1');
    const voor = KB.klas().gebeurtenissen.filter(g => g.soort === 'opgeruimd').length;
    const aantal = KB.sluitBord();
    const b = KB.bord(KB.klas());
    return {
      aantal: aantal,
      dicht: KB.bordGesloten(),
      leeg: Object.keys(b.plaatsingen).every(h => (b.plaatsingen[h] || []).length === 0),
      opgeruimdErbij: KB.klas().gebeurtenissen.filter(g => g.soort === 'opgeruimd').length - voor,
      nogPlaatsen: KB.plaats('l2', 'h0').ok
    };
  });
  zeg('afsluiten ruimt het bord op', zelf.aantal === 2 && zelf.leeg === true, JSON.stringify(zelf));
  zeg('en legt vast wie waar zat, voor de statistiek',
      zelf.opgeruimdErbij === 2, 'logregels erbij: ' + zelf.opgeruimdErbij);
  zeg('een afgesloten bord staat dicht', zelf.dicht === true, String(zelf.dicht));

  /* Op een dicht bord mag KB.plaats nog wel iets doen -- dat is de laag
     eronder -- maar het scherm laat het niet toe. Dat kijken we na op het
     scherm zelf: het vlak staat ervoor en de knop om te openen staat er. */
  await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(900);
  const scherm = await p.evaluate(() => ({
    afgesloten: document.getElementById('scherm-bord').classList.contains('afgesloten'),
    kop: (document.getElementById('pauzekop') || {}).textContent,
    knop: !(document.getElementById('knop-openen') || {}).hidden
  }));
  zeg('het bord zegt zelf dat het klaar is voor vandaag',
      scherm.afgesloten === true && /klaar voor vandaag/i.test(scherm.kop || ''),
      JSON.stringify(scherm));
  zeg('en er staat een knop om hem weer te openen', scherm.knop === true, String(scherm.knop));

  const weerOpen = await p.evaluate(() => { KB.openBord(); return KB.bordGesloten(); });
  zeg('weer openen kan meteen', weerOpen === false, String(weerOpen));

  /* ── 3. vanzelf, op een tijdstip ───────────────────────────────────── */
  /* Hier zat een val, en hij ging pas af in de middag. Deze opzet zette
     "sluit op een tijdstip" aan terwijl de tijd nog op de standaard 14:30
     stond. Draaide de ronde 's ochtends, dan gebeurde er niets en slaagde
     de proef. Draaide hij na half drie, dan zag het bord in de 2,5 seconde
     die hierna volgt zelf dat het al over tijd was, sloot zichzelf af, en
     daarna klopte de rest van dit stuk niet meer -- een afgesloten bord
     sluit niet nog een keer.

     Dus zetten we de manier van sluiten pas aan op het moment dat we ook
     een tijd meegeven. Dan is er geen tel waarin er een tijdstip geldt
     dat deze proef niet zelf heeft gekozen. */
  /* En hier zat een tweede val van dezelfde soort, die pas 's avonds
     laat afging. "Een uur later" is om tien voor twaalf 's nachts geen
     tijdstip van vandaag meer, en de app rekent een sluitingstijd altijd
     op de dag van vandaag -- 00:50 is dan drieëntwintig uur geleden. De
     proef zag dus "hij sluit" waar hij "hij sluit nog niet" verwachtte,
     en dat is geen fout in de app.

     Dus kiezen we een tijdstip dat gegarandeerd later vandaag valt. Zit
     het einde van de dag te dichtbij om dat te kunnen, dan wachten we
     die laatste minuut af in plaats van de controle over te slaan -- een
     proef die 's nachts stilletjes verdwijnt is erger dan een proef die
     een minuut langer duurt. */
  const totMiddernacht = () => {
    const nu = new Date();
    return (24 * 60) - (nu.getHours() * 60 + nu.getMinutes());
  };
  if (totMiddernacht() <= 2) {
    await p.waitForTimeout((totMiddernacht() * 60 + 20) * 1000);
  }

  await opzet({ sluitenSoort: 'nooit' });
  await p.waitForTimeout(2500);
  const opTijd = await p.evaluate((ruimte) => {
    const k = KB.klas();
    /* Een uur later als dat nog vandaag is, anders de laatste minuut van
       deze dag. Allebei liggen ze in de toekomst, en dat is wat deze
       controle nodig heeft. */
    const straks = ruimte > 61 ? new Date(Date.now() + 60 * 60000)
                               : new Date(new Date().setHours(23, 59, 0, 0));
    k.settings.sluitenTijd = String(straks.getHours()).padStart(2, '0') + ':' +
                             String(straks.getMinutes()).padStart(2, '0');
    k.settings.sluitenSoort = 'tijd';
    KB.bewaar();
    const nogNiet = KB.moetSluiten();
    const net = new Date(Date.now() - 60000);
    k.settings.sluitenTijd = String(net.getHours()).padStart(2, '0') + ':' +
                             String(net.getMinutes()).padStart(2, '0');
    KB.bewaar();
    return { nogNiet: nogNiet, welNu: KB.moetSluiten(),
             gekozen: k.settings.sluitenTijd };
  }, totMiddernacht());
  zeg('voor de sluitingstijd gebeurt er niets', opTijd.nogNiet === false,
      'de tijd stond op ' + opTijd.gekozen);
  zeg('een minuut erna sluit het bord zichzelf af', opTijd.welNu === true, String(opTijd.welNu));

  /* het bord doet dat ook echt, uit zichzelf, zonder dat wij iets klikken */
  await p.waitForTimeout(2200);
  const vanzelfDicht = await p.evaluate(() => KB.bordGesloten());
  zeg('en het bord op het scherm doet het uit zichzelf', vanzelfDicht === true, String(vanzelfDicht));

  const nietTweeKeer = await p.evaluate(() => {
    KB.openBord();                       // de leerkracht opent hem weer
    return KB.moetSluiten();             // dan gaat hij niet meteen weer dicht
  });
  zeg('opent de leerkracht hem weer, dan blijft hij open',
      nietTweeKeer === false, String(nietTweeKeer));

  const morgen = await p.evaluate(() => {
    const b = KB.bord(KB.klas());
    b.gesloten = true;
    b.laatstGesloten = Date.now() - 26 * 3600 * 1000;   // gisteren afgesloten
    KB.bewaar();
    return KB.bordGesloten();
  });
  zeg('een sluiting van gisteren telt vandaag niet meer', morgen === false, String(morgen));

  /* ── 4. vanzelf, na een tijdsduur ──────────────────────────────────── */
  await opzet({ sluitenSoort: 'duur', sluitenNaMinuten: 45 });
  await p.waitForTimeout(2500);
  const naDuur = await p.evaluate(() => {
    const b = KB.bord(KB.klas());
    b.geopendOp = Date.now() - 10 * 60000;   // tien minuten bezig
    KB.bewaar();
    const nogNiet = KB.moetSluiten();
    b.geopendOp = Date.now() - 50 * 60000;   // vijftig minuten bezig
    KB.bewaar();
    return { nogNiet: nogNiet, welNu: KB.moetSluiten() };
  });
  zeg('na tien van de vijfenveertig minuten gebeurt er niets',
      naDuur.nogNiet === false, String(naDuur.nogNiet));
  zeg('na vijftig minuten sluit het bord zichzelf af', naDuur.welNu === true, String(naDuur.welNu));

  /* ── 5. de afsluiting gaat mee naar het andere apparaat ────────────── */
  await p.evaluate(() => { KB.sluitBord(); });
  await p.waitForTimeout(4000);
  const opDeServer = await p.evaluate(async () => {
    const gid = KBSYNC.opServer(KB.klas().id);
    const rijen = await SB.lees('borden', { kies: 'stand', waar: { groep_id: 'eq.' + gid } });
    return (rijen || []).map(r => (r.stand || {}).gesloten === true).join(',');
  });
  zeg('de afsluiting staat ook op de server', opDeServer.indexOf('true') >= 0, opDeServer);

  zeg('geen enkele fout op de pagina', fouten.length === 0, fouten.join(' | '));
  await b.close();
})();
