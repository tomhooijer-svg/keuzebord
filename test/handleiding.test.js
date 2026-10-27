/* De uitleg: de rondleiding, de handleiding op papier en de
   privacyverklaring.

   Drie dingen bewaakt deze proef:

   1. De rondleiding komt één keer vanzelf en daarna nooit meer
      ongevraagd. Een rondleiding die elke ochtend opnieuw verschijnt is
      geen hulp maar een hindernis -- en wie hem wél terug wil, hoort
      hem te kunnen vinden.
   2. Hij staat niet in de weg. Dit is met opzet een kaart in de hoek en
      geen venster over het scherm: wie hem negeert moet gewoon kunnen
      doorwerken. Zou hij het scherm afdekken, dan dwingt hij je vijf
      keer op Verder voordat je iets mag.
   3. De handleiding is op papier bruikbaar. Een school wil hem
      uitgeprind in de teamkamer hebben liggen, en dan is een
      inhoudsopgave waar je niet op kunt klikken alleen maar inkt. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

async function apparaat(b, fouten){
  const c = await b.newContext({ viewport:{ width:1340, height:940 } });
  const p = await c.newPage();
  if (fouten) p.on('pageerror', e => fouten.push(e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email', 'juf@mijnschool.nl');
  await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4000);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  // ── de rondleiding komt vanzelf ──
  const p = await apparaat(b, fouten);
  zeg('de leerkracht komt in het beheer', /beheer\.html/.test(p.url()), p.url().split('/').pop());
  await p.waitForSelector('#rl-kaart', { timeout: 6000 }).catch(()=>{});
  zeg('de rondleiding komt de eerste keer vanzelf',
      await p.isVisible('#rl-kaart'), 'kaart staat er');
  zeg('en zegt waar je bent in de reeks',
      /Stap 1 van 5/.test(await p.textContent('#rl-kaart')), 'stap 1 van 5');

  /* Hij mag niets afdekken. Dit stond eerst als zwevende kaart in de
     hoek, en die lag op het scherm Vandaag precies over "Taak
     inplannen" -- een leerkracht drukt op een knop en er gebeurt niets,
     op haar eerste dag, door iets wat haar zou moeten helpen. Nu staat
     hij in de stroom van de pagina en duwt hij de inhoud omlaag.

     Deze controle kijkt niet naar hoe hij staat maar naar wat hij doet:
     van elke knop op het scherm het middelpunt nemen en vragen wie daar
     ligt. Ligt de kaart daar, dan is die knop onbereikbaar. */
  const inStroom = await p.evaluate(() => {
    const k = document.getElementById('rl-kaart');
    return { ouder: k.parentNode.id || k.parentNode.tagName,
             positie: getComputedStyle(k).position };
  });
  zeg('hij staat in de pagina en niet erover',
      inStroom.ouder === 'inhoud' && inStroom.positie === 'static',
      inStroom.ouder + ' / ' + inStroom.positie);

  const afgedekt = await p.evaluate(() => {
    const k = document.getElementById('rl-kaart');
    const kapot = [];
    [].slice.call(document.querySelectorAll('button, a[href], .zij-knop'))
      .forEach(function (kn) {
        if (k.contains(kn)) return;
        const r = kn.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.top < 0 || r.bottom > innerHeight) return;
        const boven = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (boven && k.contains(boven)) kapot.push((kn.textContent || '').trim().slice(0, 24));
      });
    return kapot;
  });
  zeg('geen enkele knop op het scherm wordt afgedekt', afgedekt.length === 0,
      afgedekt.length ? afgedekt.join(' | ') : 'niets afgedekt');

  /* Het beheer tekent zijn inhoud opnieuw bij elke menuklik. Een
     rondleiding die daarbij verdwijnt is geen rondleiding. */
  await p.click('.zij-knop:has-text("Hoeken")');
  await p.waitForTimeout(600);
  zeg('hij overleeft een klik in het menu',
      await p.isVisible('#rl-kaart'), 'staat er nog');

  // ── vijf stappen, heen en terug ──
  let standen = [await p.evaluate(() => document.body.className)];
  for (let i = 0; i < 4; i++) {
    await p.click('#rl-verder');
    await p.waitForTimeout(220);
    standen.push(await p.evaluate(() => document.body.className));
  }
  zeg('je loopt in vijf stappen door',
      /rondleiding-5/.test(standen[4]) && /Stap 5 van 5/.test(await p.textContent('#rl-kaart')),
      'stap 5');
  /* De stand staat ook op body. Dat is geen sierlijkheid: zonder dat is
     Verder voor test/knoppen.test.js niet te onderscheiden van een knop
     die stuk is. */
  zeg('en elke stap verandert ook de stand van het scherm',
      new Set(standen).size === 5, standen.length + ' stappen, ' +
      new Set(standen).size + ' verschillende standen');

  await p.click('#rl-vorige');
  await p.waitForTimeout(220);
  zeg('terug kan ook', /Stap 4 van 5/.test(await p.textContent('#rl-kaart')), 'stap 4');

  // ── en daarna nooit meer ongevraagd ──
  await p.click('#rl-overslaan');
  await p.waitForTimeout(300);
  zeg('wegklikken haalt hem van het scherm',
      !(await p.isVisible('#rl-kaart').catch(() => false)), 'weg');
  zeg('en haalt de stand van het scherm af',
      !/rondleiding/.test(await p.evaluate(() => document.body.className)),
      await p.evaluate(() => document.body.className));

  await p.reload();
  await p.waitForTimeout(3200);
  zeg('bij de volgende keer komt hij niet meer vanzelf',
      !(await p.isVisible('#rl-kaart').catch(() => false)), 'blijft weg');

  // ── maar je kunt hem terugvinden ──
  await p.goto(APP + '/handleiding.html');
  await p.waitForTimeout(700);
  zeg('de handleiding heeft een knop om hem opnieuw te zien',
      await p.isVisible('#knop-rondleiding'), 'Laat me in vijf stappen zien');
  await p.click('#knop-rondleiding');
  await p.waitForTimeout(3200);
  zeg('en dan staat hij er weer, ook al heb je hem gezien',
      await p.isVisible('#rl-kaart'), p.url().split('/').pop());
  await p.click('#rl-overslaan').catch(()=>{});

  // ── de handleiding op papier ──
  await p.goto(APP + '/handleiding.html');
  await p.waitForTimeout(600);
  const opScherm = await p.evaluate(() => ({
    inhoud: getComputedStyle(document.querySelector('.inhoudsopgave')).display,
    knoppen: getComputedStyle(document.querySelector('.kopknoppen')).display
  }));
  zeg('op het scherm staat de inhoudsopgave er gewoon',
      opScherm.inhoud !== 'none', opScherm.inhoud);

  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(300);
  const opPapier = await p.evaluate(() => ({
    inhoud: getComputedStyle(document.querySelector('.inhoudsopgave')).display,
    knoppen: getComputedStyle(document.querySelector('.kopknoppen')).display,
    terug: getComputedStyle(document.querySelector('.terug')).display,
    achtergrond: getComputedStyle(document.body).backgroundColor,
    schaduw: getComputedStyle(document.querySelector('.stuk')).boxShadow
  }));
  zeg('op papier gaat de inhoudsopgave eruit', opPapier.inhoud === 'none', opPapier.inhoud);
  zeg('en de knoppen ook',
      opPapier.knoppen === 'none' && opPapier.terug === 'none',
      opPapier.knoppen + ' / ' + opPapier.terug);
  zeg('het papier is wit, geen gekleurd vlak',
      /rgb\(255,\s*255,\s*255\)/.test(opPapier.achtergrond), opPapier.achtergrond);
  zeg('en er staan geen schaduwen op',
      opPapier.schaduw === 'none', opPapier.schaduw.slice(0, 24));
  await p.emulateMedia({ media: 'screen' });

  // ── de tekst klopt nog met hoe je inlogt ──
  /* Dit is een regressie die niemand ziet: de app ging over op
     gebruikersnamen en de handleiding bleef over e-mailadressen praten.
     Een handleiding die het verkeerde zegt is erger dan geen. */
  const tekst = await p.textContent('.blad-smal, main');
  zeg('de handleiding legt het kaartje uit en niet een e-mailadres',
      /gebruikersnaam/i.test(tekst) && !/logt in met je e-mailadres/i.test(tekst),
      'gebruikersnaam');

  // ── de privacyverklaring ──
  await p.goto(APP + '/privacy.html');
  await p.waitForTimeout(600);
  const pv = await p.textContent('body');
  zeg('er is een privacyverklaring', /Privacyverklaring/.test(pv), 'staat er');
  zeg('die zegt waar de gegevens staan', /Ierland/.test(pv) && /Europese Unie/.test(pv),
      'Ierland, EU');
  zeg('dat er geen meetsoftware van derden is',
      /Geen Google Analytics|geen trackers/i.test(pv), 'geen analytics');
  zeg('dat foto’s van kinderen standaard uitstaan',
      /standaard uit/.test(pv), 'standaard uit');
  zeg('wat er NIET van een kind wordt bewaard',
      /[Gg]een achternaam/.test(pv) && /geboortedatum/.test(pv), 'geen achternaam');
  zeg('en dat de leverancier geen kinderen ziet',
      /geen kinderen/.test(pv), 'staat erin');
  /* Wat er nog moet gebeuren staat er ook in, en opvallend. Een
     verklaring met een gat erin die eruitziet alsof hij af is, is
     gevaarlijker dan een verklaring die zegt wat er mist. */
  zeg('en het zegt wat er nog moet worden ingevuld',
      /Nog in te vullen/.test(pv) && /verwerkersovereenkomst/i.test(pv),
      'eerlijk over het gat');
  zeg('de handleiding verwijst ernaar',
      await p.evaluate(async () => {
        const r = await fetch('handleiding.html');
        return /privacy\.html/.test(await r.text());
      }), 'link staat er');

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => {
  if (uit.length) console.log(uit.join('\n'));
  console.error('Error:', e && e.stack || e);
  process.exit(1);
});
