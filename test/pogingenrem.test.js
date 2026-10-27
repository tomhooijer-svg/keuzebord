/* De pogingenrem.

   Na een paar misgeslagen pogingen moet je even wachten, en elke
   volgende keer langer.

   Wees eerlijk over wat dit is. Deze rem zit in de browser, en inloggen
   gaat rechtstreeks naar Supabase: wie deze pagina overslaat en de
   server zelf aanroept, merkt er niets van. Dit remt een mens -- een
   kind dat aan het digibord wachtwoorden zit te proberen, een collega
   die blijft gokken -- en geen programma. De echte rem staat in
   Supabase zelf (Authentication → Rate Limits). Zie DECISIONS.md.

   Deze proef bewaakt daarom twee dingen tegelijk: dat de rem werkt, en
   dat hij geen schade doet. Een rem kan namelijk op twee manieren
   erger zijn dan geen rem:

   1. Hij telt een slechte verbinding als misslag. Dan sluit een school
      met haperende wifi zichzelf buiten.
   2. Hij blijft hangen na een geslaagde inlog. Dan staat een juf die
      zich twee keer vertypte de volgende ochtend voor een dichte deur.

   En één ding dat hij met opzet níét doet: tellen per account op de
   server. Dan kon iemand een juf buitensluiten door tien keer een fout
   wachtwoord voor haar in te typen -- een aanval die zichzelf
   uitvoert. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

async function verseKaart(b){
  const c = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await c.newPage();
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return { c: c, p: p };
}

async function probeer(p, naam, ww){
  await p.fill('#email', naam);
  await p.fill('#ww', ww);
  await p.click('#verstuur');
  await p.waitForTimeout(900);
  /* Lukt het inloggen, dan is deze pagina er niet meer en is er dus ook
     geen melding om te lezen. Dat is geen fout maar het antwoord: leeg
     betekent "ze is binnen". */
  try { return (await p.textContent('#melder', { timeout: 1500 }) || '').trim(); }
  catch (e) { return ''; }
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  /* Een account met een gebruikersnaam, zoals een testleerkracht er een
     krijgt. De proefschool gebruikt nog oude e-mailadressen; die komen
     er ook in, maar deze proef gaat over de nieuwe weg. */
  await fetch('http://localhost:5455/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'marieke@keuzebord.invalid', password:'zandbak-tulp-regen-7',
                           data:{ naam:'Juf Marieke', gebruikersnaam:'marieke' } }) });

  const een = await verseKaart(b);
  const p = een.p;
  p.on('pageerror', e => fouten.push(e.message));

  // ── de eerste paar keer mag je vrijuit ──
  let melding = '';
  for (let i = 1; i <= 5; i++) melding = await probeer(p, 'marieke', 'fout-wachtwoord');
  zeg('de eerste vijf pogingen mogen gewoon',
      /klopt niet/.test(melding) && !/wachten|over /.test(melding), melding.slice(0, 48));

  // ── daarna moet je wachten ──
  melding = await probeer(p, 'marieke', 'nog-een-foute');
  zeg('bij de zesde moet je even wachten', /Te vaak misgeslagen/.test(melding),
      melding.slice(0, 56));
  zeg('en er staat bij hoe lang', /over \d+ seconden|over een minuut|over \d+ minuten/.test(melding),
      (melding.match(/over [^.]+/) || ['—'])[0]);

  // Meteen nog eens proberen hoort niets te doen -- ook niet als je het
  // goede wachtwoord intypt. Anders is het geen rem.
  const metGoed = await probeer(p, 'marieke', 'zandbak-tulp-regen-7');
  zeg('tijdens het wachten lukt zelfs het goede wachtwoord niet',
      /Te vaak misgeslagen/.test(metGoed) && /inloggen\.html/.test(p.url()),
      metGoed.slice(0, 40));

  // ── de rem geldt per naam, niet voor het hele scherm ──
  const andere = await probeer(p, 'beheerder', 'ookfout');
  zeg('een andere gebruikersnaam wordt niet meegeremd',
      /klopt niet/.test(andere) && !/Te vaak/.test(andere), andere.slice(0, 44));

  // ── wachten helpt ──
  // De eerste wachttijd is tien seconden. Vooruitspoelen door de klok
  // in de opslag te verzetten: dertien seconden echt wachten maakt deze
  // proef dertien seconden langer zonder dat hij iets meer bewijst.
  await p.evaluate(() => {
    const alles = JSON.parse(localStorage.getItem('kb_pogingen') || '{}');
    if (alles.marieke) alles.marieke.tot = Date.now() - 1000;
    localStorage.setItem('kb_pogingen', JSON.stringify(alles));
  });
  const naWachten = await probeer(p, 'marieke', 'zandbak-tulp-regen-7');
  zeg('na de wachttijd kom je er met het goede wachtwoord gewoon in',
      !/inloggen\.html/.test(p.url()), p.url().split('/').pop());

  // ── en de teller staat daarna weer op nul ──
  // Anders staat een juf die zich twee keer vertypte de volgende
  // ochtend voor een dichte deur.
  const teller = await p.evaluate(() => localStorage.getItem('kb_pogingen'));
  zeg('na een geslaagde inlog is de teller gewist',
      !teller || JSON.parse(teller).marieke === undefined, String(teller));
  await een.c.close();

  // ── een slechte verbinding is geen misslag ──
  // Zou dat wel zo zijn, dan sluit een school met haperende wifi
  // zichzelf buiten -- precies op het moment dat ze al niets kan.
  const twee = await verseKaart(b);
  await twee.p.route('**/auth/v1/token*', route => route.abort());
  let offline = '';
  for (let i = 1; i <= 8; i++) offline = await probeer(twee.p, 'marieke', 'zandbak-tulp-regen-7');
  zeg('acht keer geen verbinding telt niet als misslag',
      /verbinding/i.test(offline) && !/Te vaak/.test(offline), offline.slice(0, 48));
  const naOffline = await twee.p.evaluate(() => localStorage.getItem('kb_pogingen'));
  zeg('en zet geen rem op haar naam', !naOffline || naOffline === '{}', String(naOffline));
  await twee.c.close();

  // ── de rem zit in deze browser, niet bij het account ──
  // Dit is met opzet: zou hij bij het account zitten, dan kon iemand een
  // juf buitensluiten door tien keer fout te gokken op haar naam.
  const drie = await verseKaart(b);
  const vers = await probeer(drie.p, 'marieke', 'zandbak-tulp-regen-7');
  zeg('op een ander apparaat staat geen rem',
      !/Te vaak/.test(vers) && !/inloggen\.html/.test(drie.p.url()),
      drie.p.url().split('/').pop());
  await drie.c.close();

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
