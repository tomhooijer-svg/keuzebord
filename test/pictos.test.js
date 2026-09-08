/* Hoe een picto in zijn rondje hoort te staan.

   Een picto is een lijntekening, geen foto. Vullend bijsnijden -- wat bij
   een gezicht juist goed is -- haalde er de randen af: van een
   lieveheersbeestje bleef een rode vlek over. En omdat de kleur inline met
   de verkorte vorm 'background' werd gezet, viel background-size terug op
   'auto' en tekende de browser de plaat zelfs op ware grootte: een
   uitvergrote hoek van 260 bij 180 in een rondje van 62.

   Deze proef kijkt of een tekening helemaal in beeld staat, of een foto
   nog steeds vult, en of de namen eronder heel blijven. */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || 'http://localhost:8899';

const uit = [];
const zeg = (n, ok, extra) => {
  const r = (ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + String(extra).slice(0,140) + ']' : '');
  uit.push(r); console.log(r);
};

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const c = await b.newContext({ viewport:{width:1600,height:900} });
  const p = await c.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));

  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => { localStorage.setItem('kb_server','http://localhost:5455');
                           localStorage.setItem('kb_serversleutel','proefsleutel'); });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','juf@mijnschool.nl'); await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForTimeout(4500);

  /* een groep met tekeningen én één echte foto */
  await p.evaluate(() => {
    const tekening = (kleur) => {
      const c = document.createElement('canvas'); c.width = 260; c.height = 180;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0,0,260,180);
      g.strokeStyle = '#111'; g.lineWidth = 6; g.fillStyle = kleur;
      g.beginPath(); g.ellipse(130,90,105,72,0,0,7); g.fill(); g.stroke();
      return c.toDataURL('image/png');
    };
    const foto = (() => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 300;
      const g = c.getContext('2d'); g.fillStyle = '#8a5a2b'; g.fillRect(0,0,400,300);
      return c.toDataURL('image/jpeg', 0.8);
    })();
    const k = KB.klas(); k.pictos = [];
    const namen = ['benjamin','junia','maeven','sofie','noud'];
    k.leerlingen = namen.map((n, i) => {
      const d = tekening(['#e14b4b','#f0b429','#3b6ff0','#37ab74'][i % 4]);
      const picto = KB.voegPictoToe(n, d, k);
      return { id:'l'+i, naam:n, kleur:KB.KIND_KLEUREN[i % 6], image:d, pictoId:picto.id, lid:true };
    });
    k.leerlingen.push({ id:'lf', naam:'fotokind', kleur:'#b8436d', image:foto, lid:true });
    k.hoekLib = [{ id:'h0', naam:'Huishoek', maxKinderen:4, kleur:'#e14b4b' },
                 { id:'h1', naam:'Werkplaats', maxKinderen:6, werkplaats:true, kleur:'#37ab74' }];
    k.borden[0].hoekLibIds = ['h0','h1'];
    k.borden[0].plaatsingen = {
      h0: [{ leerlingId:'l0', startTijd:Date.now() }, { leerlingId:'lf', startTijd:Date.now() }],
      h1: [{ leerlingId:'l2', startTijd:Date.now() }] };
    k.borden[0].aan = true; k.borden[0].dagOpen = true;
    KB.bewaar();
  });

  await p.waitForTimeout(2600);        // eerst rustig naar de server
  await p.goto(APP + '/bord.html');
  await p.waitForTimeout(3200);

  const beeld = await p.evaluate(() => {
    const van = (n) => n ? getComputedStyle(n).backgroundSize : null;
    const naamMeting = (n) => ({ tekst:n.textContent,
      afgekapt: n.scrollWidth > n.clientWidth + 1,
      staartWeg: n.scrollHeight > n.clientHeight + 1 });
    const bezet = [...document.querySelectorAll('.plek.bezet')];
    const strook = [...document.querySelectorAll('.strook .picto')];
    const vak = document.querySelector('.strook-kinderen');
    const laagsteNaam = [...document.querySelectorAll('.strook .picto-naam')]
      .reduce((m, n) => Math.max(m, n.getBoundingClientRect().bottom), 0);
    return {
      tekeningInHoek: van(document.querySelector('.plek.bezet .picto-rond.tekening')),
      fotoInHoek: van([...document.querySelectorAll('.plek.bezet .picto-rond')]
                        .filter(x => !x.classList.contains('tekening'))[0]),
      tekeningInStrook: van(document.querySelector('.strook .picto-rond.tekening')),
      namenInHoek: [...document.querySelectorAll('.plek.bezet .picto-naam')].map(naamMeting),
      namenInStrook: [...document.querySelectorAll('.strook .picto-naam')].map(naamMeting),
      rondEnLeegGelijk: (() => {
        const vol = document.querySelector('.plek.bezet .picto-rond');
        const leeg = document.querySelector('.plek.vrij');
        if (!vol || !leeg) return null;
        return Math.abs(vol.getBoundingClientRect().width - leeg.getBoundingClientRect().width) < 2;
      })(),
      naamBinnenStrook: vak ? Math.round(vak.getBoundingClientRect().bottom - laagsteNaam) : null,
      aantalBezet: bezet.length, aantalStrook: strook.length
    };
  });

  zeg('een tekening past zich in het rondje in plaats van het te vullen',
      beeld.tekeningInHoek === 'contain', beeld.tekeningInHoek);
  zeg('en dat geldt ook in de strook onderaan',
      beeld.tekeningInStrook === 'contain', beeld.tekeningInStrook);
  zeg('een echte foto vult het rondje nog steeds',
      beeld.fotoInHoek === 'cover', beeld.fotoInHoek);
  zeg('een bezette plek is even groot als een lege ernaast',
      beeld.rondEnLeegGelijk === true, String(beeld.rondEnLeegGelijk));

  const stukInHoek = (beeld.namenInHoek || []).filter(x => x.afgekapt || x.staartWeg);
  zeg('geen naam in een hoek is afgekapt of mist zijn staart',
      (beeld.namenInHoek || []).length > 0 && !stukInHoek.length,
      stukInHoek.map(x => x.tekst).join(', ') || (beeld.namenInHoek || []).length + ' namen heel');
  const stukInStrook = (beeld.namenInStrook || []).filter(x => x.afgekapt || x.staartWeg);
  zeg('en in de strook ook niet',
      (beeld.namenInStrook || []).length > 0 && !stukInStrook.length,
      stukInStrook.map(x => x.tekst).join(', ') || (beeld.namenInStrook || []).length + ' namen heel');
  zeg('de namen in de strook vallen binnen het scrollvak',
      beeld.naamBinnenStrook !== null && beeld.naamBinnenStrook >= 0,
      'ruimte onder de laagste naam: ' + beeld.naamBinnenStrook + 'px');

  /* en in het beheer: de bibliotheek en de kinderen */
  await p.goto(APP + '/beheer.html');
  await p.waitForTimeout(2500);
  const inBeheer = await p.evaluate(() => {
    const naar = (naam) => {
      const b = [...document.querySelectorAll('.zij-knop')].filter(x => x.textContent.trim() === naam)[0];
      if (b) b.click();
    };
    naar('Leerlingen');
    return new Promise(res => setTimeout(() => {
      res([...document.querySelectorAll('.leerlingkaart')].map(k => ({
        naam: (k.querySelector('.picto-naam') || {}).textContent,
        past: getComputedStyle(k.querySelector('.picto-rond')).backgroundSize })));
    }, 900));
  });
  const tekeningen = inBeheer.filter(x => x.naam !== 'fotokind');
  zeg('in het beheer staan de tekeningen ook helemaal in beeld',
      tekeningen.length > 0 && tekeningen.every(x => x.past === 'contain'),
      tekeningen.map(x => x.naam + ':' + x.past).join(' '));
  zeg('en de foto van een kind vult daar zijn rondje',
      (inBeheer.filter(x => x.naam === 'fotokind')[0] || {}).past === 'cover',
      JSON.stringify(inBeheer.filter(x => x.naam === 'fotokind')[0]));

  zeg('geen fouten op de pagina', fouten.length === 0, fouten.slice(0,2).join(' | '));

  const mis = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(mis ? ('\n' + mis + ' van de ' + uit.length + ' fout') : '\nALLES GOED (' + uit.length + ')');
  await b.close();
  process.exit(mis ? 1 : 0);
})();
