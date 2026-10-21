/* Meerdere scholen op één installatie.

   De vraag die deze proef beantwoordt: ziet de platformbeheerder de
   kinderen van een school? Het antwoord moet nee zijn, tenzij die school
   de deur zelf heeft opengezet. En twee scholen moeten elkaar nergens
   kunnen zien. Zie docs/ROLLEN.md. */
const { execFileSync } = require('child_process');
const SERVER = process.env.SERVER || 'http://localhost:5455';
const WW = 'proefproef';

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
  const r = await fetch(SERVER + pad, {
    method: o.method || 'GET', headers: koppen,
    body: o.lijf ? JSON.stringify(o.lijf) : undefined });
  let tekst = await r.text();
  let lijf = null;
  try { lijf = tekst ? JSON.parse(tekst) : null; } catch (e) { lijf = tekst; }
  return { status: r.status, lijf: lijf };
}

const maak  = (e) => roep('/auth/v1/signup', { method:'POST', lijf:{ email:e, password:WW } });
const login = (e) => roep('/auth/v1/token?grant_type=password', { method:'POST', lijf:{ email:e, password:WW } });
const lees  = (token, pad) => roep('/rest/v1/' + pad, { token });
const rpc   = (token, naam, args) => roep('/rest/v1/rpc/' + naam, { method:'POST', token, lijf: args || {} });

(async () => {
  // ── de platformbeheerder bestaat niet in de app; die maak je met de hand ──
  await maak('tom@platform.nl');
  /* De trekker op profielen laat niemand zomaar een rol veranderen --
     ook de database-eigenaar niet. Het slot gaat binnen één transactie
     open; dat is precies de weg die in docs/ROLLEN.md staat. */
  psql("select set_config('kb.systeem','aan',true); " +
       "update public.profielen set rol='platformbeheerder', school_id=null " +
       "where lower(email)='tom@platform.nl';");

  const tom = (await login('tom@platform.nl')).lijf.access_token;
  const baas = (await login('beheerder@mijnschool.nl')).lijf.access_token;
  const juf  = (await login('juf@mijnschool.nl')).lijf.access_token;

  // de schoolbeheerder zet een paar kinderen neer om naar te kijken
  const groepen = (await lees(baas, 'groepen?select=id,naam&order=volgorde')).lijf;
  const groep1A = groepen.find(g => g.naam === 'Groep 1A');
  await roep('/rest/v1/leerlingen', { method:'POST', token: baas,
    lijf: [{ groep_id: groep1A.id, naam:'Fien' }, { groep_id: groep1A.id, naam:'Joep' }] });
  const eigen = (await lees(baas, 'leerlingen')).lijf;
  zeg('de schoolbeheerder ziet haar eigen kinderen', eigen.length === 2, eigen.length + '');

  // ── wat de platformbeheerder wel mag ──
  const scholen = (await lees(tom, 'scholen')).lijf;
  zeg('de platformbeheerder ziet de scholen', scholen.length >= 1, scholen.length + ' school(en)');
  const accounts = (await lees(tom, 'profielen')).lijf;
  zeg('en de accounts', accounts.length >= 3, accounts.length + ' profielen');
  const grs = (await lees(tom, 'groepen')).lijf;
  zeg('en de groepsnamen', grs.length === 6, grs.length + ' groepen');

  // ── en wat niet ──
  const kinderen = (await lees(tom, 'leerlingen')).lijf;
  zeg('maar GEEN kinderen', Array.isArray(kinderen) && kinderen.length === 0,
      Array.isArray(kinderen) ? kinderen.length + ' rijen' : String(kinderen));
  const borden = (await lees(tom, 'borden')).lijf;
  zeg('en GEEN borden', Array.isArray(borden) && borden.length === 0,
      Array.isArray(borden) ? borden.length + ' rijen' : String(borden));
  const gebeur = (await lees(tom, 'gebeurtenissen')).lijf;
  zeg('en GEEN statistiek', Array.isArray(gebeur) && gebeur.length === 0,
      Array.isArray(gebeur) ? gebeur.length + ' rijen' : String(gebeur));
  const stiekem = await roep('/rest/v1/leerlingen', { method:'POST', token: tom,
    lijf: [{ groep_id: groep1A.id, naam:'Stiekem' }] });
  zeg('en hij kan er ook niets bijzetten', stiekem.status >= 400, 'status ' + stiekem.status);

  // ── maar wel de getallen, want anders kan hij niet factureren ──
  const cijfers = (await rpc(tom, 'schoolcijfers')).lijf;
  const mijn = Array.isArray(cijfers) ? cijfers.find(c => c.naam) : null;
  zeg('de cijfers geven wel aantallen', !!mijn && mijn.leerlingen === 2 && mijn.groepen === 6,
      mijn ? mijn.leerlingen + ' kinderen, ' + mijn.groepen + ' groepen' : 'niets');
  const cijfersBaas = await rpc(baas, 'schoolcijfers');
  zeg('een schoolbeheerder krijgt uit de cijfers niets',
      Array.isArray(cijfersBaas.lijf) && cijfersBaas.lijf.length === 0,
      JSON.stringify(cijfersBaas.lijf));

  // ── een tweede school ──
  const nieuw = (await rpc(tom, 'school_aanmaken',
    { schoolnaam:'De Tweede School', beheerder_email:'baas@tweede.nl' })).lijf;
  zeg('hij maakt een tweede school aan', !!(nieuw && nieuw.school_id), JSON.stringify(nieuw));
  zeg('met een toegangscode voor de beheerder', !!(nieuw && nieuw.code), nieuw && nieuw.code);

  const magNiet = await rpc(baas, 'school_aanmaken',
    { schoolnaam:'Stiekeme School', beheerder_email:'x@y.nl' });
  zeg('een schoolbeheerder kan dat niet', magNiet.status >= 400,
      'status ' + magNiet.status);

  const scholenBaas = (await lees(baas, 'scholen')).lijf;
  zeg('en ziet die tweede school ook niet',
      scholenBaas.length === 1 && scholenBaas[0].naam !== 'De Tweede School',
      scholenBaas.map(s => s.naam).join(', '));

  // ── de school zet de deur open ──
  const jufMag = await rpc(juf, 'ondersteuning_toestaan', { reden:'nieuwsgierig', uren:4 });
  zeg('een leerkracht kan de deur niet openzetten', jufMag.status >= 400, 'status ' + jufMag.status);

  const open = await rpc(baas, 'ondersteuning_toestaan', { reden:'bord doet raar', uren:4 });
  zeg('de schoolbeheerder wel', open.status === 200, String(open.lijf).slice(0, 25));

  const nu = (await lees(tom, 'leerlingen')).lijf;
  zeg('nu ziet de platformbeheerder de kinderen wel', nu.length === 2, nu.length + ' kinderen');
  const nuBorden = (await lees(tom, 'borden')).lijf;
  zeg('en de borden', nuBorden.length === 6, nuBorden.length + ' borden');

  await rpc(baas, 'ondersteuning_intrekken');
  const weerDicht = (await lees(tom, 'leerlingen')).lijf;
  zeg('en na intrekken weer niet', weerDicht.length === 0, weerDicht.length + ' kinderen');

  // ── het logboek ──
  const logboek = (await lees(baas, 'handelingen?order=tijd')).lijf;
  const soorten = logboek.map(r => r.wat);
  zeg('de school ziet in het logboek wat er is gebeurd',
      soorten.indexOf('ondersteuning aangezet') >= 0 && soorten.indexOf('ondersteuning ingetrokken') >= 0,
      soorten.join(' / '));

  const wijzig = await roep('/rest/v1/handelingen?id=eq.' + logboek[0].id,
    { method:'PATCH', token: baas, lijf:{ wat:'niets aan de hand' } });
  const geraakt = (await lees(baas, 'handelingen?id=eq.' + logboek[0].id)).lijf;
  zeg('maar kan het niet herschrijven',
      geraakt.length === 1 && geraakt[0].wat === logboek[0].wat,
      'staat er nog als "' + geraakt[0].wat + '"');

  const weg = await roep('/rest/v1/handelingen?id=eq.' + logboek[0].id,
    { method:'DELETE', token: baas });
  const erNog = (await lees(baas, 'handelingen?id=eq.' + logboek[0].id)).lijf;
  zeg('en ook niet wissen', erNog.length === 1, erNog.length + ' rij over');

  const logTom = await roep('/rest/v1/handelingen?id=eq.' + logboek[0].id,
    { method:'DELETE', token: tom });
  const erNogTom = (await lees(baas, 'handelingen?id=eq.' + logboek[0].id)).lijf;
  zeg('de platformbeheerder evenmin', erNogTom.length === 1, erNogTom.length + ' rij over');

  console.log(uit.join('\n'));
  const fout = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
