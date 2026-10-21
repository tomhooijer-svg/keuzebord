/* De school in elke rij: werkt dat ook voor gegevens die er al stonden?

   Dit is de proef op de migratie. We zetten een school vol, halen daarna
   de kolommen weg zoals ze vóór de verhuizing waren, draaien het schema
   opnieuw, en kijken of er precies hetzelfde staat. Blijft er iets
   onzichtbaar, dan is dat voor een leerkracht niet te onderscheiden van
   gegevens die kwijt zijn. */
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
function schemaOpnieuw(){
  return execFileSync('psql', ['-h','/var/tmp','-p','5439','-U','postgres','-d','kb',
                               '-q','-v','ON_ERROR_STOP=1','-f','supabase/schema.sql'],
                      { stdio:['ignore','pipe','pipe'] }).toString();
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
const login = (e) => roep('/auth/v1/token?grant_type=password', { method:'POST', lijf:{ email:e, password:WW } });
const lees  = (token, pad) => roep('/rest/v1/' + pad, { token });

/* De tabellen die een school in hun rij hebben gekregen, met de kolommen
   die er toen bij kwamen. Zelfde lijst als in het schema. */
const ALLEEN_SCHOOL = ['leerlingen','borden','groep_doelen','taken','weekplannen',
                       'observaties','gebeurtenissen'];
const SCHOOL_EN_GROEP = ['bord_hoeken','plaatsingen','wachtrij','thema_hoeken',
                         'thema_doelen','taak_doelen','week_doelen',
                         'weekplan_taken','taak_toewijzing'];

(async () => {
  const baas = (await login('beheerder@mijnschool.nl')).lijf.access_token;
  const juf  = (await login('juf@mijnschool.nl')).lijf.access_token;

  // ── een school vullen ──
  const groepen = (await lees(baas, 'groepen?select=id,naam&order=volgorde')).lijf;
  const g1A = groepen.find(g => g.naam === 'Groep 1A');
  const g1B = groepen.find(g => g.naam === 'Groep 1B');

  const kinderen = (await roep('/rest/v1/leerlingen', { method:'POST', token:baas,
    lijf:[{ groep_id:g1A.id, naam:'Fien' }, { groep_id:g1A.id, naam:'Joep' },
          { groep_id:g1B.id, naam:'Nora' }] })).lijf;
  /* hoeken had school_id altijd al, dus die stuurt de app zelf mee --
     anders dan bij de tabellen die hem nu pas krijgen. */
  const school = (await lees(baas, 'scholen?select=id')).lijf[0].id;
  const hoeken = (await roep('/rest/v1/hoeken', { method:'POST', token:baas,
    lijf:[{ school_id:school, groep_id:g1A.id, naam:'Bouwhoek', max_kinderen:4 }] })).lijf;
  const borden = (await lees(baas, 'borden?select=id,groep_id')).lijf;
  const bord1A = borden.find(b => b.groep_id === g1A.id);
  await roep('/rest/v1/bord_hoeken', { method:'POST', token:baas,
    lijf:[{ bord_id:bord1A.id, hoek_id:hoeken[0].id, volgorde:0 }] });
  await roep('/rest/v1/plaatsingen', { method:'POST', token:baas,
    lijf:[{ bord_id:bord1A.id, hoek_id:hoeken[0].id, leerling_id:kinderen[0].id }] });

  const voor = {
    leerlingen:  (await lees(baas, 'leerlingen')).lijf.length,
    borden:      (await lees(baas, 'borden')).lijf.length,
    bord_hoeken: (await lees(baas, 'bord_hoeken')).lijf.length,
    plaatsingen: (await lees(baas, 'plaatsingen')).lijf.length
  };
  zeg('de school staat vol', voor.leerlingen === 3 && voor.plaatsingen === 1,
      JSON.stringify(voor));
  const jufVoor = (await lees(juf, 'leerlingen')).lijf;
  zeg('de leerkracht ziet alleen haar eigen groep', jufVoor.length === 2,
      jufVoor.map(l => l.naam).join(' '));

  // ── terug naar hoe het was: geen school in de rij ──
  const alle = ALLEEN_SCHOOL.concat(SCHOOL_EN_GROEP);
  alle.forEach(t => psql('drop trigger if exists school_erbij on public.' + t));
  ALLEEN_SCHOOL.forEach(t => psql(
    'alter table public.' + t + ' alter column school_id drop not null; ' +
    'update public.' + t + ' set school_id = null;'));
  SCHOOL_EN_GROEP.forEach(t => psql(
    'alter table public.' + t + ' alter column school_id drop not null; ' +
    'update public.' + t + ' set school_id = null, groep_id = null;'));

  const leegTeller = Number(psql('select count(*) from public.leerlingen where school_id is null'));
  zeg('de kolommen zijn echt leeggehaald', leegTeller === 3, leegTeller + ' rijen zonder school');
  const kwijt = (await lees(baas, 'leerlingen')).lijf;
  zeg('en dan ziet de beheerder niets meer — zo hoort het fout te gaan',
      Array.isArray(kwijt) && kwijt.length === 0, kwijt.length + ' kinderen');

  // ── het schema opnieuw draaien vult ze weer ──
  const uitvoer = schemaOpnieuw();
  zeg('het schema draait zonder klachten over lege scholen',
      !/LET OP/.test(uitvoer), (uitvoer.match(/LET OP[^\n]*/g) || ['geen']).join(' | ').slice(0, 70));

  const na = {
    leerlingen:  (await lees(baas, 'leerlingen')).lijf.length,
    borden:      (await lees(baas, 'borden')).lijf.length,
    bord_hoeken: (await lees(baas, 'bord_hoeken')).lijf.length,
    plaatsingen: (await lees(baas, 'plaatsingen')).lijf.length
  };
  zeg('na de verhuizing staat er precies hetzelfde',
      JSON.stringify(na) === JSON.stringify(voor),
      'voor ' + JSON.stringify(voor) + ' na ' + JSON.stringify(na));

  const nogSteedsLeeg = Number(psql(
    "select sum(c) from (select count(*) c from public.plaatsingen where school_id is null or groep_id is null" +
    " union all select count(*) from public.bord_hoeken where school_id is null or groep_id is null) x"));
  zeg('elke rij heeft weer een school én een groep', nogSteedsLeeg === 0,
      nogSteedsLeeg + ' rijen zonder');

  const jufNa = (await lees(juf, 'leerlingen')).lijf;
  zeg('en de leerkracht ziet nog steeds alleen haar eigen groep',
      jufNa.length === 2 && jufNa.every(l => l.naam !== 'Nora'),
      jufNa.map(l => l.naam).join(' '));

  // ── en de kolom is weer verplicht ──
  const verplicht = psql("select is_nullable from information_schema.columns" +
                         " where table_schema='public' and table_name='plaatsingen' and column_name='school_id'");
  zeg('de kolom is weer verplicht', verplicht === 'NO', verplicht);

  // ── de trekker vult hem ook bij een nieuwe rij ──
  const nieuw = (await roep('/rest/v1/leerlingen', { method:'POST', token:baas,
    lijf:[{ groep_id:g1B.id, naam:'Cas' }] })).lijf;
  const gevuld = psql("select school_id is not null from public.leerlingen where id = '" + nieuw[0].id + "'");
  zeg('een nieuwe rij krijgt de school vanzelf', gevuld === 't', gevuld);

  // ── en de app hoeft hem niet mee te sturen; liegen kan ook niet ──
  const andere = psql("select id from public.scholen where naam <> 'Mijn school' limit 1")
              || psql("insert into public.scholen (naam) values ('Elders') returning id");
  const gelogen = (await roep('/rest/v1/leerlingen', { method:'POST', token:baas,
    lijf:[{ groep_id:g1B.id, naam:'Mol', school_id:andere }] })).lijf;
  const echt = psql("select school_id from public.leerlingen where id = '" + gelogen[0].id + "'");
  zeg('en een meegestuurde school wordt overschreven door de trekker',
      echt !== andere, echt === andere ? 'de leugen bleef staan' : 'overschreven');

  console.log(uit.join('\n'));
  const fout = uit.filter(r => r.indexOf('FOUT') >= 0).length;
  console.log(fout ? '\n' + fout + ' fout(en)' : '\ngeen enkele fout');
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('Error:', e && e.stack || e); process.exit(1); });
