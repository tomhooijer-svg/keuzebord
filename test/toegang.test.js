/* Accounts, uitnodigingen en toegang tot een groep.

   Twee wegen naar binnen: de mail die Supabase stuurt, en de code die je
   gewoon kunt doorgeven. De tweede moet het ook doen als de collega zich
   met een ánder adres heeft aangemeld dan jij had ingevuld -- dat is
   precies waar het in de klas op stukliep.

   En de weg naar een tweede groep: vragen mag, zelf pakken niet. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,140) + ']' : '');
  uit.push(r); console.log(r);
};

async function apparaat(b){
  const c = await b.newContext({ viewport:{width:1400,height:1000} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  [fout] ' + e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  return p;
}
async function inloggen(p, mail, ww){
  await p.fill('#email', mail); await p.fill('#ww', ww);
  await p.click('#verstuur');
  await p.waitForTimeout(4000);
}
async function registreren(p, naam, mail, ww){
  await p.click('button[data-naar="registreren"]');
  await p.fill('#naam', naam); await p.fill('#email', mail); await p.fill('#ww', ww);
  await p.click('#verstuur');
  await p.waitForTimeout(4500);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const stempel = Date.now();
  const uitgenodigd = 'uitgenodigd' + stempel + '@school.nl';   // wat de beheerder invult
  const echtAdres   = 'haareigen'  + stempel + '@school.nl';    // waarmee zij zich aanmeldt

  /* ── de beheerder nodigt uit ─────────────────────────────────────── */
  const baas = await apparaat(b);
  await inloggen(baas, 'beheerder@mijnschool.nl', 'proefproef');

  const groepId = await baas.evaluate(async () => {
    const g = (await SB.lees('groepen', { kies:'id,naam', volgorde:'naam' }));
    return { eerste: g[0].id, eersteNaam: g[0].naam, tweede: g[1].id, tweedeNaam: g[1].naam };
  });

  const code = await baas.evaluate(async ({ mail, groep }) => {
    const rij = { school_id: KBV.wie().profiel.school_id, email: mail,
                  rol: 'leerkracht', groep_id: groep, code: 'PROEF' + String(Date.now()).slice(-3) };
    await SB.schrijf('uitnodigingen', [rij]);
    return rij.code;
  }, { mail: uitgenodigd, groep: groepId.eerste });
  zeg('de uitnodiging krijgt een code mee', !!code, code);

  /* ── de collega meldt zich aan met een ánder adres ───────────────── */
  const collega = await apparaat(b);
  await registreren(collega, 'Juf Anne', echtAdres, 'eenwachtwoord');

  const zonderSchool = await collega.evaluate(() => ({
    adres: location.pathname,
    school: (KBV.wie() && KBV.wie().profiel || {}).school_id,
    tekst: (document.getElementById('inhoud') || {}).textContent || ''
  }));
  zeg('zij hoort nog bij geen school', !zonderSchool.school, zonderSchool.school);
  zeg('en krijgt de twee wegen te zien, geen doodlopende knop',
      /Ik ben uitgenodigd/.test(zonderSchool.tekst) &&
      /Ik begin een nieuwe school/.test(zonderSchool.tekst) &&
      !/Zes groepen aanmaken/.test(zonderSchool.tekst),
      zonderSchool.tekst.replace(/\s+/g,' ').slice(0,120));

  /* de code invullen */
  await collega.fill('#inhoud input[type=text]', code);
  await collega.evaluate(() => {
    [...document.querySelectorAll('#inhoud .knop')]
      .filter(x => /Aanmelden bij de school/.test(x.textContent))[0].click();
  });
  await collega.waitForTimeout(5000);

  const binnen = await collega.evaluate(async () => {
    const ik = await SB.wieBenIk();
    const groepen = await SB.lees('groepen', { kies:'id,naam' });
    return { school: ik.profiel.school_id, rol: ik.profiel.rol,
             groepen: (groepen || []).map(g => g.naam) };
  });
  zeg('met de code komt zij alsnog bij de goede school binnen',
      !!binnen.school, JSON.stringify(binnen));
  zeg('en meteen bij de groep uit de uitnodiging',
      binnen.groepen.length === 1 && binnen.groepen[0] === groepId.eersteNaam,
      binnen.groepen.join(', '));
  zeg('zij is leerkracht, geen beheerder', binnen.rol === 'leerkracht', binnen.rol);

  const nogEens = await collega.evaluate(async (c) => {
    try { await SB.roep('uitnodiging_verzilveren', { toegangscode: c }); return 'gelukt'; }
    catch (e) { return e.message; }
  }, code);
  zeg('dezelfde code werkt geen tweede keer', /al bij een school|klopt niet/i.test(nogEens), nogEens);

  /* ── zelf een groep pakken kan niet ──────────────────────────────── */
  const zelfPakken = await collega.evaluate(async (g) => {
    try {
      await SB.schrijf('groep_leden', [{ groep_id: g, profiel_id: (await SB.wieBenIk()).profiel.id }]);
      return 'gelukt';
    } catch (e) { return 'geweigerd'; }
  }, groepId.tweede);
  zeg('zij kan zichzelf niet bij een andere groep zetten', zelfPakken === 'geweigerd', zelfPakken);

  /* ── maar vragen mag ─────────────────────────────────────────────── */
  const gevraagd = await collega.evaluate(async (g) => {
    try {
      await SB.schrijf('groep_verzoeken', [{ groep_id: g,
        profiel_id: (await SB.wieBenIk()).profiel.id, reden: 'ik sta er op donderdag' }]);
      const lijst = await SB.roep('groepen_van_mijn_school', {});
      return { gelukt: true, lijst: (lijst || []).map(x => x.naam + (x.gevraagd ? '?' : '')) };
    } catch (e) { return { gelukt: false, fout: e.message }; }
  }, groepId.tweede);
  zeg('zij kan wel toegang vragen', gevraagd.gelukt === true, gevraagd.fout || '');
  zeg('en ziet de namen van de groepen van haar school',
      (gevraagd.lijst || []).length >= 2, (gevraagd.lijst || []).join(', '));

  const nietVanVreemden = await collega.evaluate(async () => {
    try {
      // een groep die niet bestaat op deze school
      await SB.schrijf('groep_verzoeken', [{ groep_id:'00000000-0000-0000-0000-000000000000',
        profiel_id: (await SB.wieBenIk()).profiel.id }]);
      return 'gelukt';
    } catch (e) { return 'geweigerd'; }
  });
  zeg('en niet voor een groep buiten haar school', nietVanVreemden === 'geweigerd', nietVanVreemden);

  /* ── de beheerder keurt goed ─────────────────────────────────────── */
  await baas.goto(APP + '/school.html');
  await baas.waitForTimeout(3500);
  await baas.evaluate(() => {
    [...document.querySelectorAll('.zij-knop')].filter(x => /Accounts/.test(x.textContent))[0].click();
  });
  await baas.waitForTimeout(1500);
  const inBeeld = await baas.evaluate(() => (document.getElementById('inhoud')||{}).textContent || '');
  zeg('de beheerder ziet het verzoek staan',
      /Vraagt toegang/.test(inBeeld) && /donderdag/.test(inBeeld),
      inBeeld.replace(/\s+/g,' ').slice(0, 140));

  await baas.evaluate(() => {
    [...document.querySelectorAll('#inhoud .knop')].filter(x => x.textContent === 'Goedkeuren')[0].click();
  });
  await baas.waitForTimeout(4000);

  const naGoedkeuren = await collega.evaluate(async () => {
    const groepen = await SB.lees('groepen', { kies:'naam', volgorde:'naam' });
    return (groepen || []).map(g => g.naam);
  });
  zeg('na goedkeuren mag zij bij allebei de groepen',
      naGoedkeuren.length === 2 &&
      naGoedkeuren.indexOf(groepId.tweedeNaam) >= 0, naGoedkeuren.join(', '));

  const weg = await baas.evaluate(() => (document.getElementById('inhoud')||{}).textContent || '');
  zeg('en het verzoek staat niet meer open', !/Vraagt toegang/.test(weg),
      weg.replace(/\s+/g,' ').slice(0,90));

  /* ── een leerkracht keurt niets goed ─────────────────────────────── */
  const nietZelfKeuren = await collega.evaluate(async (g) => {
    try {
      const eigen = (await SB.wieBenIk()).profiel.id;
      await SB.schrijf('groep_verzoeken', [{ groep_id: g, profiel_id: eigen, reden:'nog eens' }]);
      const mijne = await SB.lees('groep_verzoeken', { kies:'id', waar:{ behandeld:'is.null' } });
      await SB.roep('verzoek_behandelen', { verzoek: mijne[0].id, toekennen: true });
      return 'gelukt';
    } catch (e) { return 'geweigerd: ' + e.message; }
  }, groepId.eerste);
  zeg('een leerkracht keurt haar eigen verzoek niet goed',
      /geweigerd/.test(nietZelfKeuren), nietZelfKeuren);

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
