/* De rechtenproeven in SQL: supabase/test-02-opzet.sql, test-03-rechten.sql
   en test-04-platform.sql.

   Die waren om met de hand te lezen: bij elke stap staat "verwacht: ...",
   en daaronder wat er uitkwam. Dat las niemand meer -- en zo stond
   test-02 maandenlang stuk zonder dat iemand het zag (twee accounts met
   dezelfde gebruikersnaam). Deze proef legt elke uitkomst naast zijn
   verwachting.

   Ze draaien op een eigen database (kbrechten), niet op 'kb': de
   proefschool van de andere proeven staat daar, en deze bestanden zetten
   hun eigen scholen neer. */
const { execFileSync } = require('child_process');
const path = require('path');
const R = path.join(__dirname, '..');
const DB = 'kbrechten';
const PSQL = ['-h','/var/tmp','-p','5439','-U','postgres'];

const uit = [];
const zeg = (n, ok, extra) =>
  uit.push((ok ? '  goed  ' : '  FOUT  ') + n + (extra ? '   [' + extra + ']' : ''));

function draai(args){
  return execFileSync('psql', PSQL.concat(args), { stdio:['ignore','pipe','pipe'] }).toString();
}
function bestand(naam, stopBijFout){
  // stdout en de NOTICE-regels (stderr) in de goede volgorde: via de shell
  return execFileSync('sh', ['-c',
    'psql ' + PSQL.join(' ') + ' -d ' + DB + (stopBijFout ? ' -v ON_ERROR_STOP=1' : '') +
    ' -f "' + path.join(R, 'supabase', naam) + '" 2>&1'], { maxBuffer: 1 << 24 }).toString();
}

/* Klopt deze uitkomst met de verwachting? Streng waar het kan: een
   gewone uitkomst moet precies gelijk zijn. Drie losse gevallen:
   - "geweigerd: <tekst>": de melding moet met die tekst beginnen;
   - een verwachting in woorden ("rol blijft leerkracht"): de uitkomst
     moet erin staan;
   - "geweigerd" bij een wijziging die niets raakt ("0 rijen geraakt"):
     een rechtenregel weigert niet, hij laat de rij gewoon niet zien. */
function klopt(verwacht, regels){
  if (regels.some(r => /FOUT/.test(r))) return false;
  return regels.some(r =>
    r === verwacht ||
    (/^geweigerd/.test(verwacht) && r.indexOf(verwacht) === 0) ||
    (r.length >= 4 && verwacht.indexOf(r) >= 0 && /\s/.test(verwacht)) ||
    (verwacht === 'geweigerd' && r === '0 rijen geraakt'));
}

function stappen(tekst){
  const lijst = [];
  let nu = null;
  tekst.split('\n').forEach(regel => {
    const r = regel.replace(/^psql:[^:]*:\d+:\s*/, '').replace(/^NOTICE:\s+/, '').trim();
    const kop = r.match(/^(P?\d+)\s+(.*?)\s+verwacht:\s*(.*)$/);
    if (kop) { nu = { nr: kop[1], wat: kop[2], verwacht: kop[3], regels: [] }; lijst.push(nu); return; }
    if (!nu || !r) return;
    if (/^(SET|RESET|INSERT|UPDATE|DO|CONTEXT|Pager|Output format|Tuples only)/.test(r)) return;
    nu.regels.push(r);
  });
  return lijst;
}

/* Eén stuk SQL; geeft de laatste regel terug, of de foutmelding. */
function sql(tekst){
  try {
    const r = execFileSync('psql', PSQL.concat(['-d', DB, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', tekst]),
                           { stdio:['ignore','pipe','pipe'] }).toString().trim().split('\n');
    return r[r.length - 1];
  } catch (e) {
    return 'geweigerd: ' + ((e.stderr || '').toString().match(/ERROR:\s*(.*)/) || ['', '?'])[1];
  }
}
const alsAnon = (q) => sql('set role anon; ' + q);
const alsIemand = (uid, q) => sql("select set_config('test.uid', '" + uid + "', false); set role authenticated; " + q);

/* De functies van dit schema: alles in public behalve die van de
   startpagina (sp_, app_) en van de oude observatie-app (obs_). */
const EIGEN = "pronamespace = 'public'::regnamespace and proname !~ '^(sp|app|obs)_'";

/* Het project wordt gedeeld met de startpagina en de oude observatie-app.
   Hun regels en rechten mag dit schema niet aanraken, ook niet als het
   opnieuw draait. Twee neptabellen met elk een regel, en een functie die
   wél voor anon open hoort te staan. */
function gedeeldProject(){
  const opzet = sql(`
    create table if not exists public.sp_proef (id int);
    alter table public.sp_proef enable row level security;
    drop policy if exists "sp proefregel" on public.sp_proef;
    create policy "sp proefregel" on public.sp_proef for select using (true);
    create table if not exists public.observatie_proef (id int);
    alter table public.observatie_proef enable row level security;
    drop policy if exists "obs proefregel" on public.observatie_proef;
    create policy "obs proefregel" on public.observatie_proef for select using (true);
    create or replace function public.obs_proef() returns int language sql as 'select 1';
    grant execute on function public.obs_proef() to anon;
    create table if not exists public.periode_proef (id bigserial primary key);
    revoke all on table public.sp_proef, public.observatie_proef, public.periode_proef from authenticated;
    revoke all on sequence public.periode_proef_id_seq from authenticated;
    select 'klaar'`);
  zeg('gedeeld project: neptabellen van andere apps staan klaar', opzet === 'klaar', opzet);

  const tweede = bestand('schema.sql', true);
  zeg('het schema nog een keer draaien gaat goed', !/ERROR/.test(tweede), (tweede.match(/ERROR:.*/) || [''])[0]);

  const regels = sql("select count(*) from pg_policies where schemaname = 'public' " +
                     "and tablename in ('sp_proef','observatie_proef')");
  zeg('na opnieuw draaien staan de regels van andere apps er nog (2)', regels === '2', regels);
  zeg('... en hun functie is nog voor anon open', alsAnon('select public.obs_proef()') === '1',
      alsAnon('select public.obs_proef()'));
  /* Vroeger gaf dit schema authenticated rechten op álle tabellen en
     tellers in public. Die van andere apps blijven nu zoals ze waren. */
  const vreemd = sql("select count(*) from (values ('public.sp_proef'), ('public.observatie_proef'), " +
                     "('public.periode_proef')) v(t) where has_table_privilege('authenticated', v.t, " +
                     "'select,insert,update,delete')");
  zeg('... en hun tabellen krijgen geen rechten voor authenticated', vreemd === '0', vreemd);
  const teller = sql("select has_sequence_privilege('authenticated', 'public.periode_proef_id_seq', 'usage,select')");
  zeg('... en hun tellers ook niet', teller === 'f', teller);
  sql('drop table public.sp_proef; drop table public.observatie_proef; drop table public.periode_proef; ' +
      'drop function public.obs_proef()');
}

/* anon heeft de standaardrechten van Supabase gekregen (test-01): alles
   in public open. Na het schema mag daar van het keuzebord niets meer
   van over zijn, en een ingelogd account mag nog alles wat het mocht. */
function anonRechten(){
  const open = sql("select coalesce(string_agg(proname, ','), '') from pg_proc p where " + EIGEN +
                   " and has_function_privilege('anon', p.oid, 'execute')");
  const totaal = sql('select count(*) from pg_proc where ' + EIGEN);
  zeg('anon kan geen enkele van de ' + totaal + ' keuzebord-functies aanroepen', open === '' && +totaal >= 39, open);

  [ "public.gebruikersnaam_vrij('juf.proef')",
    "public.inlogadres('juf.proef')",
    "public.school_heeft_kinderen(gen_random_uuid())",
    "public.laatste_beheerder(gen_random_uuid())",
    "public.mijn_school()",
    "public.school_beginnen('Stiekeme school')" ].forEach(f => {
    const r = alsAnon('select ' + f);
    zeg('anon: ' + f.replace(/\(.*/, '()') + ' geweigerd', /permission denied for function/.test(r), r);
  });
  const tabel = alsAnon('select count(*) from public.scholen');
  zeg('anon: tabel scholen geweigerd', /permission denied/.test(tabel), tabel);
  const tabellen = sql("select count(*) from pg_class c where relnamespace = 'public'::regnamespace " +
                       "and relkind in ('r','S') and relname !~ '^(sp|app|obs)_' " +
                       "and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert'))");
  zeg('anon: geen enkele keuzebord-tabel of -teller open', tabellen === '0', tabellen);

  const dicht = sql("select coalesce(string_agg(proname, ','), '') from pg_proc p where " + EIGEN +
                    " and prorettype <> 'trigger'::regtype and not has_function_privilege('authenticated', p.oid, 'execute')");
  zeg('ingelogd: alle gewone keuzebord-functies blijven aan te roepen', dicht === '', dicht);
  const KB_TABELLEN = ['scholen','profielen','uitnodigingen','groepen','groep_leden','groep_verzoeken',
    'leerlingen','media','hoeken','themas','thema_hoeken','thema_doelen','borden','bord_hoeken',
    'groep_doelen','plaatsingen','wachtrij','doelen','taken','taak_doelen','weekplannen','week_doelen',
    'weekplan_taken','taak_toewijzing','observaties','gebeurtenissen','ondersteuning','handelingen','feedback'];
  const zonderRecht = sql("select coalesce(string_agg(t, ','), '') from unnest(array['" +
    KB_TABELLEN.join("','") + "']) t where not has_table_privilege('authenticated', 'public.' || t, " +
    "'select,insert,update,delete')");
  zeg('ingelogd: alle 29 keuzebord-tabellen lezen en schrijven (rechtenregels beslissen per rij)',
      zonderRecht === '', zonderRecht);
  const tellers = sql("select count(*) from unnest(array['gebeurtenissen','handelingen']) t " +
    "where has_sequence_privilege('authenticated', pg_get_serial_sequence('public.' || t, 'id'), 'usage,select')");
  zeg('ingelogd: de twee tellers (gebeurtenissen, handelingen)', tellers === '2', tellers);
  const trekkers = sql("select count(*) from pg_proc p where " + EIGEN +
                       " and prorettype = 'trigger'::regtype and has_function_privilege('authenticated', p.oid, 'execute')");
  zeg('ingelogd: de trekkerfuncties zijn voor niemand aan te roepen', trekkers === '0', trekkers);
  const vrij = alsIemand('11111111-1111-1111-1111-111111111111', "select public.gebruikersnaam_vrij('nog.niemand')");
  zeg('ingelogd: gebruikersnaam_vrij werkt nog', vrij === 't', vrij);

  /* Een nieuw account komt binnen via de inlogdienst van Supabase, met
     een eigen rol zonder uitvoerrecht op onze functies. De trekker die
     het profiel maakt moet dan toch vuren. */
  const aanmelden = sql(`
    do $$ begin create role nep_auth_admin; exception when duplicate_object then null; end $$;
    grant usage on schema auth to nep_auth_admin;
    grant insert, select on auth.users to nep_auth_admin;
    set role nep_auth_admin;
    insert into auth.users (email, raw_user_meta_data)
      values ('nieuw.proef@keuzebord.invalid', '{"gebruikersnaam":"nieuw.proef"}');
    reset role;
    select gebruikersnaam from public.profielen where email = 'nieuw.proef@keuzebord.invalid'`);
  zeg('aanmelden: de trekker maakt het profiel, ook zonder uitvoerrecht', aanmelden === 'nieuw.proef', aanmelden);
}

/* Een account van de startpagina heeft in profielen geen school, en zag
   er voor school_beginnen() uit als een nieuw keuzebord-account. Met een
   rij in app_leden wordt het nu geweigerd. app_leden staat hier niet
   (dat is van de startpagina), dus maken we een kale nep. */
function andereApp(){
  const a = 'a0000000-0000-0000-0000-00000000000a', b = 'b0000000-0000-0000-0000-00000000000b';
  sql(`insert into auth.users (id, email) values
         ('${a}', 'alleen.startpagina@keuzebord.invalid'),
         ('${b}', 'nieuw.keuzebord@keuzebord.invalid')`);
  const zonder = alsIemand(b, "select public.school_beginnen('School zonder app_leden') is not null");
  zeg('school_beginnen werkt als app_leden niet bestaat', zonder === 't', zonder);
  sql(`create table public.app_leden (profiel_id uuid, app text);
       insert into public.app_leden values ('${a}', 'startpagina')`);
  const geweigerd = alsIemand(a, "select public.school_beginnen('Stiekeme school')");
  zeg('school_beginnen weigert een account uit app_leden',
      /andere Pixelplein-app/.test(geweigerd), geweigerd);
  const geenSchool = sql(`select count(*) from public.scholen where naam = 'Stiekeme school'`);
  zeg('... en er is geen school bijgekomen', geenSchool === '0', geenSchool);

  /* Dezelfde deur via een uitnodigingscode. */
  const c = 'c0000000-0000-0000-0000-00000000000c';
  sql(`insert into auth.users (id, email) values ('${c}', 'nog.een.keuzebord@keuzebord.invalid');
       select set_config('kb.systeem', 'aan', false);
       insert into public.uitnodigingen (school_id, email, rol, code)
       select id, 'iemand.a@keuzebord.invalid', 'leerkracht', 'PROEFAPP1'
         from public.scholen where naam = 'School zonder app_leden';
       insert into public.uitnodigingen (school_id, email, rol, code)
       select id, 'iemand.c@keuzebord.invalid', 'leerkracht', 'PROEFAPP2'
         from public.scholen where naam = 'School zonder app_leden'`);
  const codeGeweigerd = alsIemand(a, "select public.uitnodiging_verzilveren('PROEFAPP1')");
  zeg('uitnodiging_verzilveren weigert een account uit app_leden',
      /andere Pixelplein-app/.test(codeGeweigerd), codeGeweigerd);
  const naCode = sql(`select coalesce(school_id::text, 'geen') || '/' ||
                             (select coalesce(code_gebruikt::text, 'ongebruikt') from public.uitnodigingen
                               where code = 'PROEFAPP1')
                        from public.profielen where id = '${a}'`);
  zeg('... het account blijft zonder school en de code blijft ongebruikt', naCode === 'geen/ongebruikt', naCode);
  const codeGewoon = alsIemand(c, "select public.uitnodiging_verzilveren('PROEFAPP2') is not null");
  zeg('... een gewoon nieuw account verzilvert zijn code wel', codeGewoon === 't', codeGewoon);
  sql('drop table public.app_leden');
}

try {
  try { draai(['-d','postgres','-q','-c','drop database if exists ' + DB + ' with (force)']); } catch (e) {}
  draai(['-d','postgres','-q','-c','create database ' + DB]);
  bestand('test-01-nepsupabase.sql', true);
  const schema = bestand('schema.sql', true);
  zeg('het schema laadt zonder fouten', !/ERROR/.test(schema));

  for (const naam of ['test-02-opzet.sql', 'test-03-rechten.sql', 'test-04-platform.sql']) {
    const tekst = bestand(naam, naam === 'test-02-opzet.sql');
    if (naam === 'test-02-opzet.sql') {
      zeg('test-02: de twee proefscholen staan klaar', !/ERROR/.test(tekst),
          (tekst.match(/ERROR:.*/) || [''])[0]);
      continue;
    }
    const lijst = stappen(tekst);
    zeg(naam + ': de stappen zijn gevonden', lijst.length > 0, lijst.length + ' stappen');
    lijst.forEach(s => zeg(naam.slice(0, 7) + ' ' + s.nr + ' ' + s.wat, klopt(s.verwacht, s.regels),
                           'verwacht ' + s.verwacht + ', kreeg ' + (s.regels.join(' / ') || '(niets)')));
  }

  gedeeldProject();
  anonRechten();
  andereApp();
} catch (e) {
  console.log(uit.join('\n'));
  console.log('ER GING IETS MIS', e.message, e.stdout ? e.stdout.toString().slice(-800) : '');
  process.exit(1);
}
try { draai(['-d','postgres','-q','-c','drop database if exists ' + DB + ' with (force)']); } catch (e) {}
console.log(uit.join('\n'));
