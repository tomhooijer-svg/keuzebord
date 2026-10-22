/* Weggaan: je gegevens meekrijgen, en ze daarna kwijtraken.

   Twee kanten, en wie wat mag is hier het punt. Uitdraaien doet de
   school zelf -- het zijn haar gegevens en de leverancier kan er niet
   bij. Opheffen doet de platformbeheerder, en daar is geen inzage in de
   inhoud voor nodig.

   En één ding dat blijft staan: het logboek. Het opheffen van een school
   hoort niet ook het bewijs te wissen van wat er bij die school is
   gebeurd. */
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
async function roep(pad, opties){
  const o = opties || {};
  const koppen = { 'Content-Type':'application/json', apikey:'proefsleutel' };
  if (o.token) koppen.Authorization = 'Bearer ' + o.token;
  const r = await fetch(SERVER + pad, { method:o.method || 'GET', headers:koppen,
                                        body:o.lijf ? JSON.stringify(o.lijf) : undefined });
  const t = await r.text();
  let lijf = null;
  try { lijf = t ? JSON.parse(t) : null; } catch (e) { lijf = t; }
  return { status:r.status, lijf };
}
const login = (e) => roep('/auth/v1/token?grant_type=password', { method:'POST',
  lijf:{ email:e, password:'proefproef' } });

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const fouten = [];

  await fetch(SERVER + '/auth/v1/signup', {
    method:'POST', headers:{ 'Content-Type':'application/json', apikey:'proefsleutel' },
    body: JSON.stringify({ email:'tom@platform.nl', password:'proefproef' }) });
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  const tom  = (await login('tom@platform.nl')).lijf.access_token;
  const baas = (await login('beheerder@mijnschool.nl')).lijf.access_token;
  const juf  = (await login('juf@mijnschool.nl')).lijf.access_token;

  const groepen = (await roep('/rest/v1/groepen?select=id,naam&order=volgorde', { token:baas })).lijf;
  await roep('/rest/v1/leerlingen', { method:'POST', token:baas,
    lijf:[{ groep_id: groepen[0].id, naam:'Fien' }, { groep_id: groepen[0].id, naam:'Joep' }] });

  // ── uitdraaien: de school zelf ──
  const pak = (await roep('/rest/v1/rpc/school_export', { method:'POST', token:baas, lijf:{} })).lijf;
  zeg('de schoolbeheerder kan alles uitdraaien',
      !!(pak && pak.school && pak.school.naam), pak && pak.school && pak.school.naam);
  zeg('met de kinderen erin',
      (pak.leerlingen || []).map(l => l.naam).sort().join(',') === 'Fien,Joep',
      (pak.leerlingen || []).map(l => l.naam).join(','));
  zeg('en de groepen', (pak.groepen || []).length === 6, (pak.groepen || []).length + ' groepen');
  zeg('en wie er bij de school horen', (pak.mensen || []).length >= 2,
      (pak.mensen || []).map(m => m.rol).join(', '));
  zeg('met een datum erop', !!pak.uitgedraaid_op, String(pak.uitgedraaid_op).slice(0, 10));

  const jufPak = await roep('/rest/v1/rpc/school_export', { method:'POST', token:juf, lijf:{} });
  zeg('een leerkracht kan dat niet', jufPak.status >= 400, 'status ' + jufPak.status);

  const tomPak = await roep('/rest/v1/rpc/school_export', { method:'POST', token:tom, lijf:{} });
  zeg('en de leverancier al helemaal niet', tomPak.status >= 400, 'status ' + tomPak.status);

  // ── welke onderdelen een school heeft, regelt de leverancier ──
  const school0 = (await roep('/rest/v1/scholen?select=id,naam,modules', { token:baas })).lijf[0];
  zeg('een school begint zonder extra onderdelen',
      JSON.stringify(school0.modules) === '{}', JSON.stringify(school0.modules));

  const zelfAan = await roep('/rest/v1/scholen?id=eq.' + school0.id, { method:'PATCH', token:baas,
    lijf:{ modules:{ planbord:true } } });
  const naPoging = (await roep('/rest/v1/scholen?select=modules', { token:baas })).lijf[0];
  zeg('een schoolbeheerder kan ze niet zelf aanzetten',
      JSON.stringify(naPoging.modules) === '{}',
      'status ' + zelfAan.status + ', modules ' + JSON.stringify(naPoging.modules));

  const naamAan = await roep('/rest/v1/scholen?id=eq.' + school0.id, { method:'PATCH', token:baas,
    lijf:{ naam:'Mijn school' } });
  zeg('maar de naam van haar school wel', naamAan.status < 400, 'status ' + naamAan.status);

  const doorTom = await roep('/rest/v1/scholen?id=eq.' + school0.id, { method:'PATCH', token:tom,
    lijf:{ modules:{ planbord:true } } });
  const naTom = (await roep('/rest/v1/scholen?select=modules', { token:baas })).lijf[0];
  zeg('de leverancier wel', naTom.modules && naTom.modules.planbord === true,
      'status ' + doorTom.status + ', modules ' + JSON.stringify(naTom.modules));

  await roep('/rest/v1/scholen?id=eq.' + school0.id, { method:'PATCH', token:tom,
    lijf:{ modules:{} } });

  // ── opheffen: alleen de platformbeheerder, en alleen met de naam ──
  const school = (await roep('/rest/v1/scholen?select=id,naam', { token:baas })).lijf[0];
  const doorBaas = await roep('/rest/v1/rpc/school_verwijderen', { method:'POST', token:baas,
    lijf:{ school: school.id, naam_ter_controle: school.naam } });
  zeg('een schoolbeheerder kan haar eigen school niet opheffen',
      doorBaas.status >= 400, 'status ' + doorBaas.status);

  const verkeerd = await roep('/rest/v1/rpc/school_verwijderen', { method:'POST', token:tom,
    lijf:{ school: school.id, naam_ter_controle: 'iets anders' } });
  zeg('met de verkeerde naam gebeurt er niets', verkeerd.status >= 400,
      (verkeerd.lijf && verkeerd.lijf.message || '').slice(0, 44));
  zeg('en de school staat er dan nog',
      psql("select count(*) from public.scholen where id = '" + school.id + "'") === '1',
      'nog 1');

  // ── zo ziet dat eruit in het scherm ──
  const c = await b.newContext({ viewport:{width:1280,height:920} });
  const p = await c.newPage();
  p.on('pageerror', e => fouten.push(e.message));
  await p.goto(APP + '/inloggen.html');
  await p.evaluate(() => {
    localStorage.setItem('kb_server','http://localhost:5455');
    localStorage.setItem('kb_serversleutel','proefsleutel');
  });
  await p.goto(APP + '/inloggen.html');
  await p.fill('#email','tom@platform.nl');
  await p.fill('#ww','proefproef');
  await p.click('#verstuur');
  await p.waitForURL(/platform\.html/, { timeout: 9000 });
  await p.waitForSelector('.schoolkaart', { timeout: 9000 });
  await p.click('button:has-text("Opheffen")');
  await p.waitForSelector('#schoolnaamcontrole', { timeout: 5000 });
  const waarschuwing = (await p.textContent('.blad')).replace(/\s+/g, ' ');
  zeg('het venster zegt wat er precies weggaat',
      /2 kinderen/.test(waarschuwing) && /kan niet terug/.test(waarschuwing),
      (waarschuwing.match(/Alles van deze school[^.]+\./) || ['—'])[0].slice(0, 70));
  zeg('en raadt aan eerst te laten uitdraaien',
      /Uitdraaien/.test(waarschuwing), 'staat erbij');

  await p.fill('#schoolnaamcontrole', school.naam);
  await p.click('.blad button:has-text("Opheffen")');
  await p.waitForSelector('.leegvak, .schoolkaart', { timeout: 9000 });
  await p.waitForTimeout(600);

  zeg('daarna is de school weg',
      psql("select count(*) from public.scholen where id = '" + school.id + "'") === '0',
      'nul scholen met dat id');
  zeg('en haar kinderen ook',
      psql("select count(*) from public.leerlingen") === '0', 'nul kinderen');

  // ── maar het logboek blijft ──
  const logregels = psql("select count(*) from public.handelingen where wat = 'school verwijderd'");
  zeg('dat het is gebeurd staat in het logboek', logregels === '1', logregels + ' regel');
  const zonderSchool = psql("select school_id is null from public.handelingen where wat = 'school verwijderd'");
  zeg('en die regel blijft staan zonder school erbij', zonderSchool === 't',
      'school_id leeg, regel blijft');
  const watErWeg = psql("select gegevens::text from public.handelingen where wat = 'school verwijderd'");
  zeg('met erbij hoeveel er is weggegaan', /"leerlingen": ?2/.test(watErWeg), watErWeg.slice(0, 54));

  zeg('geen enkele fout in de pagina', fouten.length === 0,
      fouten.slice(0, 2).join(' | ') || 'geen');

  console.log(uit.join('\n'));
  const fout = uit.filter(x => x.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  await b.close();
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
