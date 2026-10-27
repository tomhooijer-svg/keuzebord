/* Foto's van kinderen staan standaard uit.

   Dit is de zwaarste knop in de app. Een foto van een kleuter is het
   meest gevoelige wat dit product bewaart, en de kant waarop je moet
   vallen is dus: uit, tenzij iemand er uitdrukkelijk voor kiest.

   Vier dingen bewaakt deze proef:

   1. Een nieuwe school begint met foto's uit. Niet omdat het vriendelijk
      staat, maar omdat een school die er nooit over heeft nagedacht
      anders ongemerkt gezichten van kleuters op een server zet.
   2. Staat het uit, dan komt een foto die er al is niet in beeld --
      niet in het beheer, niet op het digibord. Een schakelaar die alleen
      de uploadknop verbergt is een schakelaar die niets betekent.
   3. Een picto blijft gewoon staan. Een getekend konijn is geen foto, en
      een school die foto's uitzet hoort niet ineens zes lege rondjes te
      hebben.
   4. Uitzetten gooit niets weg. Zet je het weer aan, dan staat de foto
      er weer. Weggooien bij het omzetten van een schakelaar is
      onomkeerbaar werk doen namens iemand anders. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

/* Een piepklein maar echt plaatje: één rode punt. Geen picto -- hij staat
   niet in k.pictos -- dus de app ziet hem als een foto. */
const FOTO = 'data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}

async function apparaat(b, fouten, naam){
  const c = await b.newContext({ viewport:{ width:1340, height:940 } });
  const p = await c.newPage();
  if (fouten) p.on('pageerror', e => fouten.push(naam + ': ' + e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return p;
}
async function inloggen(p, email){
  await p.fill('#email', email);
  await p.fill('#ww', 'proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(3200);
}

/* Wat er in het rondje van het eerste kind staat: een plaatje of een
   letter. Dit is wat een mens ziet, en daar gaat deze proef over. */
async function watStaatErIn(p){
  return p.evaluate(() => {
    const rond = document.querySelector('.leerlingkaart .picto-rond, .kind .picto-rond, .picto-rond');
    if (!rond) return { gevonden:false };
    return { gevonden:true,
             plaatje: (rond.style.backgroundImage || '').indexOf('url(') === 0,
             letter: (rond.textContent || '').trim() };
  });
}

/* De twee kinderen in het geheugen zetten: een met een echte foto, een
   met dezelfde bytes maar met een pictoId erbij. Dat laatste is precies
   waar de app op gaat -- een plaatje met een pictoId is een tekening en
   geen foto. */
async function zetKinderen(p){
  return p.evaluate((foto) => {
    const k = KB.klas();
    k.leerlingen = [
      { id:'ll-foto',  naam:'Sem',  kleur:'#3b6ff0', image:foto, lid:true },
      { id:'ll-picto', naam:'Noor', kleur:'#e8743b', image:foto,
        pictoId:'pb-konijn', lid:true }
    ];
  }, FOTO);
}
async function hertekenen(p){
  await p.click('.zij-knop:has-text("Hoeken")');
  await p.waitForTimeout(400);
  await p.click('.zij-knop:has-text("Leerlingen")');
  await p.waitForTimeout(700);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  // ── 1. een school begint met foto's uit ──
  const standaard = psql("select kindfotos from public.scholen where naam='Mijn school'");
  zeg('een school begint met foto’s van kinderen uit', standaard === 'f',
      standaard === 'f' ? 'uit' : 'AAN');

  const p = await apparaat(b, fouten, 'juf');
  await inloggen(p, 'juf@mijnschool.nl');
  zeg('de leerkracht komt binnen', /beheer\.html/.test(p.url()), p.url().split('/').pop());

  const stand = await p.evaluate(() => ({
    aan: KB.kindfotosAan(),
    opgeslagen: localStorage.getItem('kb_kindfotos')
  }));
  zeg('de app weet dat ze uitstaan', stand.aan === false && stand.opgeslagen === 'nee',
      String(stand.opgeslagen));

  // ── 2. een kind met een foto, en een kind met een picto ──
  /* Deze twee worden in het geheugen gezet en niet bewaard. Dat is met
     opzet: bewaren stuurt ze naar de server en haalt ze weer op, en de
     weg daarheen kent geen pictoId -- dan zou Noor als foto terugkomen
     en zou deze proef het verkeerde meten. Opnieuw tekenen doen we door
     langs een ander onderdeel te lopen en terug te komen. */
  await p.goto(APP + '/beheer.html');
  await p.waitForTimeout(2400);
  await p.click('.zij-knop:has-text("Leerlingen")');
  await p.waitForTimeout(700);
  await zetKinderen(p);
  await hertekenen(p);

  const kaarten = await p.$$eval('.leerlingkaart', ns => ns.map(n => ({
    naam: (n.querySelector('.picto-naam') || {}).textContent || '',
    plaatje: ((n.querySelector('.picto-rond') || {}).style || {}).backgroundImage ? true : false,
    letter: ((n.querySelector('.picto-rond') || {}).textContent || '').trim()
  })));
  const sem  = kaarten.filter(x => x.naam === 'Sem')[0];
  const noor = kaarten.filter(x => x.naam === 'Noor')[0];
  zeg('de foto van een kind komt niet in beeld',
      !!sem && !sem.plaatje && sem.letter === 'S', sem ? ('plaatje=' + sem.plaatje + ' letter=' + sem.letter) : 'Sem niet gevonden');
  zeg('maar een picto blijft gewoon staan',
      !!noor && noor.plaatje, noor ? ('plaatje=' + noor.plaatje) : 'Noor niet gevonden');

  // ── 3. en de knop om er een te kiezen staat er niet ──
  await p.click('.leerlingkaart:has-text("Sem")');
  await p.waitForTimeout(700);
  const inBlad = await p.textContent('#blad');
  zeg('er is geen knop om een foto te kiezen',
      !/Foto kiezen/.test(inBlad), 'geen uploadknop');
  zeg('maar wel om een picto te kiezen', /picto’s kiezen|picto's kiezen/i.test(inBlad),
      'picto kan wel');
  zeg('en het legt uit waarom', /staan uit op deze school/.test(inBlad),
      'uitleg staat erbij');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);

  // ── 4. ook niet op het digibord ──
  /* Het bord tekent zijn kinderen uit dezelfde functie als het beheer
     (KB.kindbeeld; zie src/kb-bord.js). Hier kijken we of die functie
     ook op het bord het goede antwoord geeft. Dat een foto die wél mag
     op het bord in beeld komt, bewaakt test/fotos.test.js -- daar staat
     een echte foto op een echt bord. */
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(2800);
  const opBord = await p.evaluate((foto) => ({
    aan: KB.kindfotosAan(),
    foto:  !!KB.kindbeeld({ naam:'Sem',  image:foto }),
    picto: !!KB.kindbeeld({ naam:'Noor', image:foto, pictoId:'pb-konijn' }),
    fotos: [].slice.call(document.querySelectorAll('.picto-rond'))
             .filter(function (n) { return (n.style.backgroundImage || '')
               .indexOf('url(') === 0 && !n.classList.contains('tekening'); }).length
  }), FOTO);
  zeg('het bord weet ook dat de foto\u2019s uitstaan', opBord.aan === false, 'uit');
  zeg('en laat een foto van een kind daar niet zien', opBord.foto === false, 'niets');
  zeg('terwijl een picto er wel doorheen komt', opBord.picto === true, 'wel');
  zeg('er staat geen enkele foto op het bord', opBord.fotos === 0,
      opBord.fotos + ' foto\u2019s');

  // ── 5. de schoolbeheerder zet ze aan ──
  const baas = await apparaat(b, fouten, 'beheerder');
  await inloggen(baas, 'beheerder@mijnschool.nl');
  await baas.goto(APP + '/school.html');
  await baas.waitForTimeout(2200);
  await baas.click('.zij-knop:has-text("De school")').catch(()=>{});
  await baas.waitForTimeout(900);
  const paneel = await baas.textContent('.inhoud');
  zeg('het schoolbeheer heeft een paneel voor kindfoto’s',
      /Foto’s van kinderen/.test(paneel), 'staat er');
  zeg('en zegt dat ze nu uitstaan', /staan nu uit/.test(paneel), 'stand klopt');

  /* Aanzetten gaat niet met één klik. Niet omdat het technisch iets
     voorstelt, maar omdat dit het ene moment is waarop iemand erover
     moet nadenken -- en dat moment komt nooit meer terug. */
  await baas.click('button:has-text("Foto’s aanzetten")');
  await baas.waitForTimeout(500);
  const waarschuwing = await baas.textContent('#blad');
  zeg('er komt eerst een waarschuwing', /toestemming/.test(waarschuwing),
      waarschuwing.replace(/\s+/g, ' ').slice(0, 56));
  zeg('die zegt dat de school dat regelt en niet de app',
      /regelt de school, niet de app/.test(waarschuwing), 'staat er');
  await baas.click('.blad button:has-text("Aanzetten")');
  await baas.waitForTimeout(2000);

  const inDb = psql("select kindfotos from public.scholen where naam='Mijn school'");
  zeg('de keuze staat op de server', inDb === 't', inDb === 't' ? 'aan' : 'nog uit');
  const logboek = psql("select count(*) from public.handelingen where wat like '%kindfoto%'");
  zeg('en in het logboek', Number(logboek) >= 1, logboek + ' regel(s)');

  // ── 6. en dan is de foto er weer ──
  await p.goto(APP + '/beheer.html');
  await p.waitForTimeout(3000);
  await p.click('.zij-knop:has-text("Leerlingen")');
  await p.waitForTimeout(700);
  await zetKinderen(p);
  await hertekenen(p);
  const nu = await p.$$eval('.leerlingkaart', ns => ns.map(n => ({
    naam: (n.querySelector('.picto-naam') || {}).textContent || '',
    plaatje: ((n.querySelector('.picto-rond') || {}).style || {}).backgroundImage ? true : false
  })));
  const sem2 = nu.filter(x => x.naam === 'Sem')[0];
  zeg('de foto was niet weggegooid en staat er weer',
      !!sem2 && sem2.plaatje, sem2 ? ('plaatje=' + sem2.plaatje) : 'Sem niet gevonden');

  await p.click('.leerlingkaart:has-text("Sem")');
  await p.waitForTimeout(700);
  zeg('en nu staat de knop om een foto te kiezen er wel',
      /Foto kiezen/.test(await p.textContent('#blad')), 'uploadknop terug');
  await p.keyboard.press('Escape');

  // ── 7. een leerkracht zet dit niet om ──
  /* Dit is van de school, niet van één juf. Zou elke leerkracht het
     kunnen omzetten, dan is het geen schoolbeleid maar een voorkeur. */
  const haar = await p.evaluate(async () => {
    const r = await SB.wijzig('scholen', { kindfotos: false },
                              { id:'eq.' + KBV.wie().school.id })
      .then(function () { return 'gelukt'; }, function (e) { return 'geweigerd'; });
    return r;
  });
  const naPoging = psql("select kindfotos from public.scholen where naam='Mijn school'");
  zeg('een leerkracht krijgt de schakelaar niet om', naPoging === 't',
      haar + ', in de database: ' + (naPoging === 't' ? 'nog aan' : 'UIT'));

  const jufZiet = await baas.evaluate(() => 1);  // beheerder blijft open
  const jufPaneel = await (async () => {
    await p.goto(APP + '/school.html');
    await p.waitForTimeout(2200);
    return p.textContent('.inhoud').catch(() => '');
  })();
  zeg('en het scherm zegt haar dat ook',
      !/Foto’s aanzetten|Foto’s uitzetten/.test(jufPaneel) || /Alleen de schoolbeheerder/.test(jufPaneel),
      'geen knop voor haar');

  // ── 8. weet de browser het niet, dan mag het ──
  /* De werkplaats: daar zit geen school achter en staat geen echt kind
     in. Zou de schakelaar daar ook gelden, dan kan niemand de app nog
     uitproberen zonder eerst een school te hebben. Dit kijkt naar de
     regel zelf -- wat de app doet als er niets is opgeslagen. */
  const zonderStand = await p.evaluate(() => {
    const was = localStorage.getItem('kb_kindfotos');
    localStorage.removeItem('kb_kindfotos');
    const uit = KB.kindfotosAan();
    if (was !== null) localStorage.setItem('kb_kindfotos', was);
    return uit;
  });
  zeg('weet de browser van geen school, dan mogen foto\u2019s gewoon',
      zonderStand === true, String(zonderStand));

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
