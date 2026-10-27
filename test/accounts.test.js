/* Uitloggen, wisselen van account, en iemand uitnodigen vanuit het
   schoolbeheer -- inclusief de nieuwe leerkracht die zich daarna aanmeldt
   en meteen bij de goede groep zit. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

async function apparaat(b, naam){
  const c = await b.newContext({ viewport:{width:1440,height:960} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  [' + naam + '] ' + e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  return p;
}
async function inloggen(p, email, waarheen){
  await p.fill('#email', email); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(waarheen, { timeout: 12000 }).catch(()=>{});
  await p.waitForTimeout(1800);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const uit = [];
  const zeg = (n, ok, extra) => uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

  // ── het naamplaatje in het schoolbeheer ──
  const p = await apparaat(b, 'beheer');
  await inloggen(p, 'beheerder@mijnschool.nl', /school\.html/);
  const plaat = await p.evaluate(() => {
    const a = document.querySelector('.account');
    if (!a) return null;
    return { naam: (a.querySelector('.account-naam')||{}).textContent,
             rol:  (a.querySelector('.account-rol')||{}).textContent };
  });
  zeg('het schoolbeheer laat zien wie er is ingelogd', !!plaat, plaat ? plaat.naam + ' / ' + plaat.rol : 'geen plaatje');
  zeg('en met welke rol', plaat && plaat.rol === 'Schoolbeheerder', plaat && plaat.rol);

  await p.click('.account-knop');
  await p.waitForTimeout(300);
  const menu = await p.evaluate(() => ({
    open: !!document.querySelector('.account.open'),
    knoppen: [...document.querySelectorAll('.account-menu button')].map(x=>x.textContent)
  }));
  zeg('het menu gaat open met uitloggen erin',
      menu.open && menu.knoppen.includes('Uitloggen'), menu.knoppen.join(', '));
  await p.screenshot({ path:'/tmp/account-menu.png' });

  // ── een collega erbij: dat staat onder het onderdeel Accounts ──
  //
  // Hiervoor zette de schoolbeheerder een uitnodiging klaar op een
  // e-mailadres en meldde de collega zich daarna zelf aan. Nu maakt zij
  // het account meteen aan en krijgt ze een kaartje om uit te printen.
  //
  // Wat deze proef bewaakte blijft hetzelfde: een collega bij een
  // bepaalde groep zetten, en die collega komt dáár binnen, met haar
  // naam en haar rol. Er komt één ding bij, en dat is het punt van de
  // hele verbouwing: de juf logt in met wat er op het kaartje staat.
  // Klopt dat niet, dan staat ze voor een digibord en komt ze er niet in.
  await p.keyboard.press('Escape');
  await p.evaluate(() => {
    [...document.querySelectorAll('.zij-knop')]
      .filter(b => /Accounts/.test(b.textContent))[0].click();
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .filter(x => x.textContent === 'Collega toevoegen')[0];
    b.click();
  });
  await p.waitForSelector('#blad .invoer', { timeout: 8000 });
  await p.waitForTimeout(300);

  const velden = await p.$$('#blad .invoer');
  await velden[0].fill('Juf Sanne');
  await p.waitForTimeout(800);
  const voorstel = await velden[1].inputValue();
  zeg('de gebruikersnaam volgt vanzelf uit de naam', voorstel === 'sanne', voorstel);
  const vrij = await p.textContent('#blad .veldrij .hint');
  zeg('en het scherm zegt meteen of hij vrij is', /Vrij/.test(vrij || ''), (vrij || '').slice(0, 44));

  await p.evaluate(() => {
    const c = [...document.querySelectorAll('#blad .chip')]
      .filter(x => x.textContent === 'Groep 2A')[0];
    if (c) c.click();
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path:'/tmp/account-toevoegen.png' });
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('#blad button')]
      .filter(x => x.textContent === 'Account aanmaken')[0];
    b.click();
  });
  await p.waitForSelector('.kaartje', { timeout: 12000 });
  await p.waitForTimeout(600);

  const kaartje = await p.evaluate(() => {
    const regels = [...document.querySelectorAll('.kaartje-regel')]
      .map(r => [r.querySelector('.l').textContent, r.querySelector('.w').textContent]);
    const zoek = (l) => (regels.filter(x => x[0] === l)[0] || [])[1] || '';
    return { naam: zoek('Voor'), gebruiker: zoek('Gebruikersnaam'),
             wachtwoord: zoek('Wachtwoord'),
             voet: (document.querySelector('.kaartje-voet') || {}).textContent || '' };
  });
  await p.screenshot({ path:'/tmp/account-kaartje.png' });
  zeg('er komt een kaartje met haar gebruikersnaam',
      kaartje.gebruiker === 'sanne' && kaartje.naam === 'Juf Sanne',
      kaartje.naam + ' / ' + kaartje.gebruiker);
  // Drie woorden en een cijfer, over te typen vanaf een vel papier.
  zeg('en een wachtwoord van drie woorden en een cijfer',
      /^[a-z]+-[a-z]+-[a-z]+-[2-9]$/.test(kaartje.wachtwoord), kaartje.wachtwoord);
  // Een pad zonder domein is op papier niets waard.
  zeg('met volledige adressen erop, niet alleen bord.html',
      /https?:\/\/[^ ]+bord\.html/.test(kaartje.voet),
      (kaartje.voet.match(/Het bord: \S+/) || ['—'])[0].slice(0, 54));

  // ── zij logt in met wat er op het kaartje staat ──
  const nieuw = await apparaat(b, 'nieuwe juf');
  await nieuw.fill('#email', kaartje.gebruiker);
  await nieuw.fill('#ww', kaartje.wachtwoord);
  await nieuw.click('#verstuur');
  await nieuw.waitForURL(/beheer\.html/, { timeout: 12000 }).catch(()=>{});
  await nieuw.waitForTimeout(2000);
  const zijZiet = await nieuw.evaluate(() => ({
    groepen: KB.G.klassen.map(k => k.naam),
    naam: (document.querySelector('.account-naam')||{}).textContent,
    rol: (document.querySelector('.account-rol')||{}).textContent
  }));
  zeg('met het kaartje in de hand komt ze binnen bij haar groep',
      zijZiet.groepen.length === 1 && zijZiet.groepen[0] === 'Groep 2A', zijZiet.groepen.join(', '));
  zeg('het beheer toont haar naam onderin', zijZiet.naam === 'Juf Sanne', zijZiet.naam);
  zeg('en haar rol', zijZiet.rol === 'Leerkracht', zijZiet.rol);
  await nieuw.screenshot({ path:'/tmp/account-beheer.png' });

  // ── en de schoolbeheerder is zelf niet uitgelogd geraakt ──
  // Aanmelden levert normaal een sessie op; die zou de hare overschrijven.
  const nogSteeds = await p.evaluate(() =>
    (document.querySelector('.account-rol') || {}).textContent);
  zeg('de schoolbeheerder zit zelf nog gewoon ingelogd',
      nogSteeds === 'Schoolbeheerder', nogSteeds);

  await p.reload(); await p.waitForTimeout(2200);
  await p.evaluate(() => {
    [...document.querySelectorAll('.zij-knop')]
      .filter(b => /Accounts/.test(b.textContent))[0].click();
  });
  await p.waitForTimeout(600);
  const na = await p.evaluate(() => ({
    wacht: [...document.querySelectorAll('.ledenrij.wacht')].length,
    rijen: [...document.querySelectorAll('.ledenrij')].map(r => r.textContent.slice(0,40))
  }));
  zeg('er blijft niets staan wachten', na.wacht === 0, 'nog wachtend: ' + na.wacht);
  zeg('zij staat nu tussen de accounts', na.rijen.some(r => /Juf Sanne/.test(r)), na.rijen.join(' | ').slice(0,110));

  // ── uitloggen en als iemand anders inloggen ──
  await p.click('.account-knop'); await p.waitForTimeout(250);
  await p.evaluate(() => {
    [...document.querySelectorAll('.account-menu button')].filter(x => x.textContent === 'Uitloggen')[0].click();
  });
  await p.waitForURL(/inloggen\.html/, { timeout: 12000 }).catch(()=>{});
  zeg('uitloggen brengt je naar het inlogscherm', /inloggen\.html/.test(p.url()), p.url().split('/').pop());
  const leeg = await p.evaluate(() => !!(window.SB && SB.ingelogd()));
  zeg('en de sessie is echt weg', leeg === false, 'nog ingelogd: ' + leeg);

  await inloggen(p, 'juf@mijnschool.nl', /beheer\.html/);
  const anders = await p.evaluate(() => (document.querySelector('.account-rol')||{}).textContent);
  zeg('daarna kun je als iemand anders inloggen', anders === 'Leerkracht', anders);

  // ── het bord kent zijn uitlogknop ──
  // eerst een hoek, anders toont het bord het keuzescherm en niet het bord
  await p.evaluate(() => {
    const k = KB.klas();
    if (!(k.hoekLib || []).length) {
      k.hoekLib = [{ id:'h0', naam:'Bouwhoek', maxKinderen:4 }];
      k.borden[0].hoekLibIds = ['h0'];
      KB.bewaar();
    }
  });
  await p.waitForTimeout(2500);
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(2500);
  await p.click('#knop-menu'); await p.waitForTimeout(500);
  const bordmenu = await p.evaluate(() => ({
    tekst: (document.getElementById('blad')||{}).textContent || '',
    knoppen: [...document.querySelectorAll('#blad button')].map(x=>x.textContent)
  }));
  zeg('het bordmenu heeft een uitlogknop', bordmenu.knoppen.includes('Uitloggen'), bordmenu.knoppen.join(', '));
  // Bewust niet: bij het bord staat het digibord voor de klas, en dan hoeft
  // er niet in beeld te komen op wiens account het draait.
  zeg('maar zegt niet wie er is ingelogd',
      !/Ingelogd als/.test(bordmenu.tekst) &&
      !/@mijnschool\.nl/.test(bordmenu.tekst), bordmenu.tekst.slice(0, 80));

  console.log(uit.join('\n'));
  const goed = uit.filter(x => x.startsWith('  goed')).length;
  console.log('\n' + goed + ' van ' + uit.length + ' goed');
  await b.close();
  process.exit(goed === uit.length ? 0 : 1);
})();
