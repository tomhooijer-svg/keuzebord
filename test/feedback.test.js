/* De feedbackknop.

   Wat hier bewaakt wordt is niet of het formulier werkt -- dat is het
   makkelijke deel -- maar wat er wel en niet de deur uit gaat.

   1. Er gaat geen schermafdruk mee en geen enkel gegeven van een kind.
      Dit is de belofte waar het hele ding op rust: een melding over een
      knop die niet werkt mag geen foto van een klas met namen worden.
   2. De leerkracht ziet vóór het versturen wat er meegaat. Een melding
      die stilletjes dingen meestuurt is een melding die je de volgende
      keer niet meer durft te sturen.
   3. Alleen de platformbeheerder leest de meldingen. Er staat een
      notitie bij die van hem is, en een melding kan over een collega
      gaan -- een schoolbeheerder die meeleest maakt dat niemand meer
      iets stuurt. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';
const SERVER = 'http://localhost:5455';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

function psql(sql){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-tAq','-v','ON_ERROR_STOP=1','-c', sql]).toString().trim();
}

async function apparaat(b){
  const c = await b.newContext({ viewport:{ width:1340, height:940 } });
  const p = await c.newPage();
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return p;
}

async function inloggen(p, naam, ww){
  await p.fill('#email', naam);
  await p.fill('#ww', ww);
  await p.click('#verstuur');
  await p.waitForTimeout(3400);
  return p.url().split('/').pop();
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  await fetch(SERVER + '/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@keuzebord.invalid', password:'proefproef',
                           data:{ naam:'Tom Hooijer', gebruikersnaam:'tom' } }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null, naam='Tom Hooijer' " +
       "where email='tom@keuzebord.invalid';");
  psql("update public.profielen set naam='Juf Marieke' where gebruikersnaam='juf'");

  // ── een leerkracht meldt iets ──
  const p = await apparaat(b);
  p.on('pageerror', e => fouten.push(e.message));
  const waar = await inloggen(p, 'juf@mijnschool.nl', 'proefproef');
  zeg('de leerkracht komt binnen', waar === 'beheer.html', waar);

  zeg('de knop staat in de zijbalk', await p.isVisible('#knop-melden'), 'Iets melden');
  await p.click('#knop-melden');
  await p.waitForSelector('#fb-tekst', { timeout: 5000 });

  /* Wat er meegaat staat op het scherm, voordat ze op versturen drukt.
     Dit is geen tekstcontrole maar een belofte: als dit lijstje niet
     klopt met wat de app werkelijk verstuurt, liegt het scherm. */
  const bladtekst = await p.textContent('#fb-blad');
  zeg('het scherm zegt welk scherm meegaat', /beheer\.html/.test(bladtekst), 'beheer.html');
  zeg('en welke uitgave', /Uitgave:/.test(bladtekst),
      (bladtekst.match(/Uitgave: [^·]+/) || ['—'])[0].trim());
  zeg('en wat voor apparaat', /Apparaat:/.test(bladtekst),
      (bladtekst.match(/Apparaat: [^·]+·[^·]+/) || ['—'])[0].trim());
  zeg('en het zegt er zelf bij dat er geen schermafdruk meegaat',
      /[Gg]een schermafdruk/.test(bladtekst) && /niets van de kinderen/.test(bladtekst),
      'allebei genoemd');
  zeg('en het vraagt om geen kindernamen op te schrijven',
      /geen namen van kinderen/.test(bladtekst), 'staat er');

  // Leeg versturen hoort niet te kunnen: een lege melding is een melding
  // waar je niets mee kunt en die je wel moet afhandelen.
  await p.click('#fb-versturen');
  await p.waitForTimeout(500);
  zeg('een lege melding gaat niet weg',
      psql("select count(*) from public.feedback") === '0',
      (await p.textContent('#fb-melder')).trim().slice(0, 40));

  await p.click('.blad .chip:has-text("Ik heb een idee")');
  await p.fill('#fb-tekst', 'Als ik een kind naar de bouwhoek sleep, springt hij terug.');
  await p.fill('#fb-contact', '06-12345678');
  await p.click('#fb-versturen');
  await p.waitForSelector('#fb-klaar', { timeout: 8000 });
  zeg('na versturen krijgt ze een bedankje',
      /Dank je wel/.test(await p.textContent('#fb-blad')), 'Dank je wel');

  const rij = psql("select soort || ' | ' || scherm || ' | ' || stand || ' | ' || contact " +
                   "from public.feedback");
  zeg('de melding staat in de database, met het gekozen soort',
      /^idee \| beheer\.html \| nieuw \| 06-12345678$/.test(rij), rij);
  const herkomst = psql("select (wie is not null) || '/' || (school_id is not null) " +
                        "from public.feedback");
  zeg('met haar naam en haar school erbij', herkomst === 'true/true', herkomst);
  const mee = psql("select apparaat || ' | ' || versie from public.feedback");
  zeg('en met apparaat en uitgave', mee.indexOf('|') > 0 && mee.length > 6, mee);

  /* Het kolommenlijstje zelf. Zat er ooit een kolom bij die een
     schermafdruk of iets van een kind bewaart, dan valt deze controle
     om -- en dat is precies waarvoor hij er is. */
  const kolommen = psql("select string_agg(column_name, ',' order by ordinal_position) " +
                        "from information_schema.columns " +
                        "where table_schema='public' and table_name='feedback'");
  zeg('de tabel bewaart geen afbeelding en niets van een kind',
      !/foto|afbeelding|schermafdruk|plaatje|leerling|kind/i.test(kolommen), kolommen);

  /* ── en vanaf het bord ──
     Niet op het bord zelf maar in het menu daarachter: dat zit achter de
     pincode en is dus al van de leerkracht. Kleuters staan met hun handen
     op het bord, en wat niet van hen is hoort daar niet los te staan. */
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(2500);
  const losOpBord = await p.$$('#scherm-bord #knop-melden');
  zeg('op het bord zelf staat geen meldknop', losOpBord.length === 0, 'niets los op het bord');
  await p.click('#knop-menu');
  await p.waitForTimeout(600);
  const bordmenu = await p.$$eval('#blad button', ns => ns.map(n => n.textContent));
  zeg('maar in het menu van de leerkracht staat hij wel',
      bordmenu.indexOf('Iets melden') >= 0, bordmenu.join(', '));
  await p.click('#blad button:has-text("Iets melden")');
  await p.waitForSelector('#fb-tekst', { timeout: 5000 });
  const vanafBord = await p.textContent('#fb-blad');
  zeg('en dan staat er bord.html als scherm bij', /bord\.html/.test(vanafBord),
      (vanafBord.match(/Scherm: [^·]+/) || ['—'])[0].trim());
  await p.click('#fb-blad button:has-text("Annuleren")');

  // ── wie mag het lezen ──
  const token = async (e, w) => (await (await fetch(SERVER + '/auth/v1/token?grant_type=password', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:e, password:w }) })).json()).access_token;
  const lees = async (t) => {
    const r = await fetch(SERVER + '/rest/v1/feedback?select=*', {
      headers:{ apikey:'proefsleutel', Authorization:'Bearer ' + t } });
    const x = await r.text();
    try { return JSON.parse(x); } catch (e) { return x; }
  };
  const jufZiet  = await lees(await token('juf@mijnschool.nl', 'proefproef'));
  const bhZiet   = await lees(await token('beheerder@mijnschool.nl', 'proefproef'));
  const tomZiet  = await lees(await token('tom@keuzebord.invalid', 'proefproef'));
  zeg('de afzender leest haar eigen melding niet terug',
      Array.isArray(jufZiet) && jufZiet.length === 0, JSON.stringify(jufZiet).slice(0, 30));
  zeg('en de schoolbeheerder leest ze ook niet',
      Array.isArray(bhZiet) && bhZiet.length === 0, JSON.stringify(bhZiet).slice(0, 30));
  zeg('alleen de platformbeheerder ziet ze',
      Array.isArray(tomZiet) && tomZiet.length === 1, String((tomZiet || []).length));

  // ── het overzicht ──
  const q = await apparaat(b);
  q.on('pageerror', e => fouten.push('platform: ' + e.message));
  await inloggen(q, 'tom', 'proefproef');
  await q.click('.zij-knop:has-text("Feedback")');
  await q.waitForSelector('.melding-kaart', { timeout: 6000 });
  const kaart = await q.textContent('.melding-kaart');
  zeg('de melding staat in het overzicht', /springt hij terug/.test(kaart), 'de tekst zelf');
  zeg('met wie het stuurde en van welke school',
      /Juf Marieke/.test(kaart) && /Mijn school/.test(kaart), 'Juf Marieke · Mijn school');
  zeg('en met scherm, uitgave en apparaat',
      /beheer\.html/.test(kaart) && /Chrome|Safari|Firefox|Edge/.test(kaart),
      'herkomst staat erbij');

  // ── behandelen ──
  await q.click('.melding-kaart button:has-text("Behandelen")');
  await q.waitForSelector('#fb-notitie', { timeout: 4000 });
  await q.click('.blad .chip:has-text("Opgepakt")');
  await q.fill('#fb-notitie', 'Nagekeken: de veer sprong terug bij een korte sleep.');
  await q.click('.blad button:has-text("Opslaan")');
  await q.waitForTimeout(1500);
  const na = psql("select stand || ' | ' || notitie from public.feedback");
  zeg('de stand en de notitie worden bewaard',
      /^opgepakt \| Nagekeken/.test(na), na.slice(0, 48));
  const opScherm = await q.textContent('.melding-kaart');
  zeg('en staan meteen op het scherm',
      /Opgepakt/.test(opScherm) && /Nagekeken/.test(opScherm), 'bijgewerkt');

  /* De notitie is van jou. Zou de afzender hem kunnen lezen, dan kun je
     er niets eerlijks in zetten. */
  const jufNa = await lees(await token('juf@mijnschool.nl', 'proefproef'));
  zeg('de afzender ziet de notitie niet',
      Array.isArray(jufNa) && jufNa.length === 0, String((jufNa || []).length) + ' rijen');

  // ── filteren ──
  await q.click('.chips .chip:has-text("Afgehandeld")');
  await q.waitForTimeout(400);
  zeg('filteren op een andere stand laat deze melding weg',
      (await q.$$('.melding-kaart')).length === 0, 'leeg');
  await q.click('.chips .chip:has-text("Alles")');
  await q.waitForTimeout(400);
  zeg('en bij Alles staat hij er weer',
      (await q.$$('.melding-kaart')).length === 1, 'één kaart');

  // ── uitvoeren als csv ──
  /* Het bestand zelf nakijken, niet alleen of de knop bestaat. Een
     uitvoer die de tekst kwijtraakt of de puntkomma's niet ontziet is
     een uitvoer waar je in Excel niets aan hebt. */
  const csv = await q.evaluate(async () => {
    const a = document.getElementById('csv-uitvoeren');
    return a ? await (await fetch(a.href)).text() : '';
  });
  zeg('er komt een csv-bestand uit', csv.indexOf('tijd') >= 0 && csv.split('\r\n').length >= 2,
      csv.split('\r\n')[0].slice(0, 46));
  zeg('met de melding erin', /springt hij terug/.test(csv), 'de tekst staat erin');
  zeg('en met de notitie erbij', /Nagekeken/.test(csv), 'notitie staat erin');
  /* Naar de bytes kijken en niet naar de tekst: het uitpakken van utf-8
     haalt de bom er juist af, dus in de tekst staat hij nooit. Excel
     leest wel de bytes, en zonder die drie wordt elke é een Ã©. */
  const eersteBytes = await q.evaluate(async () => {
    const a = document.getElementById('csv-uitvoeren');
    const buf = new Uint8Array(await (await fetch(a.href)).arrayBuffer());
    return [buf[0], buf[1], buf[2]];
  });
  zeg('Excel leest de letters met accenten goed',
      String(eersteBytes) === '239,187,191', String(eersteBytes));

  /* Een veld dat met = begint voert Excel uit als formule. De tekst
     wordt door iemand anders ingetypt, dus daar moet een apostrof voor. */
  psql("insert into public.feedback (wie, soort, tekst) select id, 'probleem', " +
       "'=1+1' from public.profielen where gebruikersnaam='juf'");
  await q.reload();
  await q.waitForSelector('.schoolkaart', { timeout: 9000 });
  await q.click('.zij-knop:has-text("Feedback")');
  await q.waitForSelector('.melding-kaart', { timeout: 6000 });
  const csv2 = await q.evaluate(async () => {
    const a = document.getElementById('csv-uitvoeren');
    return a ? await (await fetch(a.href)).text() : '';
  });
  zeg('een formule in een melding wordt onschadelijk uitgevoerd',
      csv2.indexOf('"\'=1+1"') >= 0, (csv2.match(/"[^"]*=1\+1[^"]*"/) || ['—'])[0]);

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
