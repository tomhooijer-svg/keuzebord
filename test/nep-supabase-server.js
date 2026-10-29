/* Een nabootsing van de stukjes Supabase die het keuzebord gebruikt:
   inloggen, de tabellen via PostgREST, en aanroepen van een functie.
   Genoeg om de app hier echt te kunnen uitproberen. Dit hoort alleen bij
   het testen -- op de echte site praat de app met Supabase zelf. */
const http = require('http');
const crypto = require('crypto');
const { Client, types } = require('pg');
/* Een datum (zonder tijd) als tekst laten, zoals PostgREST dat doet.
   Standaard maakt node-pg er een Date van om middernacht in de tijdzone
   van deze computer; in JSON wordt dat de dag ervoor in UTC. Op een
   server in UTC zie je dat niet, op een Mac in Nederland wel: dan stond
   elk weekplan een dag te vroeg. */
types.setTypeParser(1082, v => v);

/* De opslag nabootsen: bestanden in het geheugen, met dezelfde adressen
   als Supabase gebruikt. De rechten komen uit dezelfde regels als de rest,
   dus we vragen de database of dit pad bij de school van deze persoon hoort. */
const bestanden = new Map();

const VERBINDING = { host: process.env.PGHOST || '/var/tmp', port: Number(process.env.PGPORT) || 5439,
                     user: process.env.PGUSER || 'postgres', database: process.env.PGDATABASE || 'kb' };
const sessies = new Map();     // token -> { uid, ververs }
const verversers = new Map();  // ververstoken -> uid

async function metRol(uid, werk){
  const c = new Client(VERBINDING);
  await c.connect();
  try {
    await c.query('begin');
    if (uid) await c.query("select set_config('test.uid', $1, true)", [uid]);
    await c.query('set local role authenticated');
    const uit = await werk(c);
    await c.query('commit');
    return uit;
  } catch (e) { try { await c.query('rollback'); } catch (_) {} throw e; }
  finally { await c.end(); }
}

async function alsBeheer(werk){
  const c = new Client(VERBINDING);
  await c.connect();
  try { return await werk(c); } finally { await c.end(); }
}

function nieuweSessie(uid, gebruiker){
  const token = crypto.randomBytes(24).toString('hex');
  const ververs = crypto.randomBytes(24).toString('hex');
  sessies.set(token, { uid, ververs });
  verversers.set(ververs, uid);
  return { access_token: token, refresh_token: ververs, expires_in: 3600,
           token_type: 'bearer', user: gebruiker };
}

function uidVan(req){
  const kop = req.headers['authorization'] || '';
  const t = kop.replace(/^Bearer\s+/i, '');
  const s = sessies.get(t);
  return s ? s.uid : null;
}

/* ── PostgREST nabootsen ─────────────────────────────────────────────── */

const VERGELIJK = { eq:'=', neq:'<>', gt:'>', gte:'>=', lt:'<', lte:'<=', like:'like', is:'is' };

function bouwWaar(zoek, waarden){
  const stukken = [];
  for (const [kolom, ruw] of zoek.entries()) {
    if (['select','order','limit','on_conflict','offset'].includes(kolom)) continue;
    const m = /^([a-z]+)\.(.*)$/s.exec(ruw);
    if (!m) continue;
    if (m[1] === 'in') {
      const lijst = m[2].replace(/^\(|\)$/g, '').split(',').filter(Boolean);
      if (!lijst.length) { stukken.push('false'); continue; }
      stukken.push(`"${kolom}" in (${lijst.map(v => { waarden.push(v.replace(/^"|"$/g,'')); return '$' + waarden.length; }).join(',')})`);
      continue;
    }
    if (!VERGELIJK[m[1]]) continue;
    if (m[1] === 'is') { stukken.push(`"${kolom}" is ${m[2] === 'null' ? 'null' : 'not null'}`); continue; }
    waarden.push(m[2]);
    stukken.push(`"${kolom}" ${VERGELIJK[m[1]]} $${waarden.length}`);
  }
  return stukken.length ? ' where ' + stukken.join(' and ') : '';
}

function lijfLezen(req){
  return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); });
}
function ruwLezen(req){
  return new Promise(r => { const s = []; req.on('data', c => s.push(c)); req.on('end', () => r(Buffer.concat(s))); });
}
/* Zelfde regel als op storage.objects in het schema: de eerste map is het
   id van een school, behalve 'basis' -- dat is de hoeken-databank, die
   elke school mag lezen en die alleen de platformbeheerder vult. */
async function magBijPad(uid, pad, schrijven){
  const map = (pad || '').split('/')[0];
  if (!uid || !map) return false;
  const r = await metRol(uid, c => c.query(
    'select public.mijn_school()::text as s, public.ben_platformbeheerder() as p'));
  if (map === 'basis') return schrijven ? r.rows[0].p === true : true;
  return r.rows[0].s === map;
}

/* Wat voor soort kolom is dit? PostgREST weet dat en gedraagt zich ernaar:
   een JavaScript-lijst wordt bij een text[] een echte Postgres-array en bij
   een jsonb gewoon json. Wij moeten dat hier nadoen, anders slikt Postgres
   `["a","b"]` als tekst en klaagt hij over "malformed array literal". */
const kolomsoorten = new Map();
async function soortVan(tabel, kolom){
  if (!kolomsoorten.has(tabel)) {
    const r = await alsBeheer(c => c.query(
      `select column_name, data_type from information_schema.columns
        where table_schema='public' and table_name=$1`, [tabel]));
    const m = {};
    r.rows.forEach(x => { m[x.column_name] = x.data_type; });
    kolomsoorten.set(tabel, m);
  }
  return (kolomsoorten.get(tabel) || {})[kolom] || '';
}
/* Geeft de waarde terug zoals pg hem moet krijgen. Een array blijft een
   array (node-postgres maakt er zelf een Postgres-array van), json gaat
   als tekst mee, en de rest verandert niet. */
async function klaarVoorPg(tabel, kolom, waarde){
  if (waarde === null || typeof waarde !== 'object') return waarde;
  const soort = await soortVan(tabel, kolom);
  if (soort === 'ARRAY') return Array.isArray(waarde) ? waarde : [waarde];
  return JSON.stringify(waarde);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const pad = u.pathname;
  const stuur = (code, lijf) => {
    res.writeHead(code, { 'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'*', 'Access-Control-Allow-Methods':'*' });
    res.end(JSON.stringify(lijf === undefined ? null : lijf));
  };
  if (req.method === 'OPTIONS') return stuur(200, {});

  try {
    // ── de opslag ──
    const mOpslag = /^\/storage\/v1\/object\/(?:(sign)\/)?kb-media\/(.+)$/.exec(pad);
    if (mOpslag) {
      const pad2 = decodeURIComponent(mOpslag[2]);
      const uid2 = uidVan(req);
      if (mOpslag[1] === 'sign') {                   // een tijdelijke link vragen
        if (!await magBijPad(uid2, pad2)) return stuur(403, { message:'geen toegang' });
        return stuur(200, { signedURL: '/object/kb-media/' + encodeURI(pad2) + '?token=proef' });
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        if (!await magBijPad(uid2, pad2, true)) return stuur(403, { message:'geen toegang' });
        bestanden.set(pad2, { bytes: await ruwLezen(req),
                              type: req.headers['content-type'] || 'application/octet-stream' });
        return stuur(200, { Key: 'kb-media/' + pad2 });
      }
    }
    // een bestand ophalen met zo'n link
    const mHaal = /^\/storage\/v1\/object\/kb-media\/(.+)$/.exec(pad);
    if (mHaal && req.method === 'GET') {
      const b = bestanden.get(decodeURIComponent(mHaal[1]));
      if (!b) return stuur(404, { message:'niet gevonden' });
      res.writeHead(200, { 'Content-Type': b.type, 'Access-Control-Allow-Origin':'*' });
      return res.end(b.bytes);
    }

    const ruwLijf = await lijfLezen(req);
    const lijf = ruwLijf ? JSON.parse(ruwLijf) : {};

    // ── inloggen ──
    if (pad === '/auth/v1/signup') {
      const bestaat = await alsBeheer(c => c.query('select id from auth.users where lower(email)=lower($1)', [lijf.email]));
      if (bestaat.rows.length) return stuur(400, { message: 'Dit e-mailadres heeft al een account.' });
      if (!lijf.password || lijf.password.length < 6) return stuur(400, { message: 'Kies een wachtwoord van minstens 6 tekens.' });
      // Gehasht opslaan, net als Supabase: zie de toelichting bij
      // auth.users in supabase/test-01-nepsupabase.sql.
      const r = await alsBeheer(c => c.query(
        'insert into auth.users (email, encrypted_password, raw_user_meta_data) ' +
        "values ($1, extensions.crypt($2, extensions.gen_salt('bf')), $3) returning id, email",
        [lijf.email, lijf.password, JSON.stringify(lijf.data || {})]));
      const g = r.rows[0];
      return stuur(200, nieuweSessie(g.id, g));
    }
    if (pad === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
      // Vergelijken zoals Supabase: de hash opnieuw maken met het
      // opgeslagen zout en kijken of hij gelijk uitkomt.
      const r = await alsBeheer(c => c.query(
        'select id, email, (encrypted_password is not null and ' +
        'encrypted_password = extensions.crypt($2, encrypted_password)) as klopt ' +
        'from auth.users where lower(email)=lower($1)', [lijf.email, lijf.password || '']));
      const g = r.rows[0];
      if (!g || !g.klopt) return stuur(400, { message: 'Dit e-mailadres of wachtwoord klopt niet.' });
      return stuur(200, nieuweSessie(g.id, { id: g.id, email: g.email }));
    }
    if (pad === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token') {
      const uid = verversers.get(lijf.refresh_token);
      if (!uid) return stuur(400, { message: 'Verlopen.' });
      verversers.delete(lijf.refresh_token);
      const r = await alsBeheer(c => c.query('select id, email from auth.users where id=$1', [uid]));
      return stuur(200, nieuweSessie(uid, r.rows[0]));
    }
    /* Een inloglink of een herstelmail: hier gaat niets de deur uit. Wat we
       wél nabootsen is het gevolg dat ertoe doet -- bij een inloglink maakt
       Supabase het account alvast aan, en dan pakt de trekker de uitnodiging
       op dat adres op. */
    if (pad === '/auth/v1/otp') {
      const adres = String((lijf && lijf.email) || '').trim().toLowerCase();
      if (!adres) return stuur(400, { message: 'geen adres' });
      const bestaat = await alsBeheer(c => c.query(
        'select id from auth.users where lower(email) = $1', [adres]));
      if (!bestaat.rows.length && lijf.create_user) {
        await alsBeheer(c => c.query(
          'insert into auth.users (email) values ($1)', [adres]));
      }
      return stuur(200, {});
    }
    if (pad === '/auth/v1/recover') return stuur(200, {});
    if (pad === '/auth/v1/logout') return stuur(204, null);

    // ── de tabellen ──
    const uid = uidVan(req);
    const mRpc = /^\/rest\/v1\/rpc\/(\w+)$/.exec(pad);
    if (mRpc) {
      const naam = mRpc[1];
      const sleutels = Object.keys(lijf);
      const args = sleutels.map((k,i)=>`${k} => $${i+1}`).join(',');
      /* Een functie die rijen teruggeeft levert bij PostgREST een lijst op,
         geen enkele waarde. Dat verschil moeten we hier ook maken, anders
         ziet de app alleen de eerste rij. */
      const soort = await alsBeheer(c => c.query(
        'select proretset from pg_proc where proname = $1 limit 1', [naam]));
      const geeftRijen = soort.rows[0] && soort.rows[0].proretset;
      const vraag = geeftRijen
        ? `select coalesce(json_agg(t), '[]'::json) as uit from public.${naam}(${args}) t`
        : `select public.${naam}(${args}) as uit`;
      const r = await metRol(uid, c => c.query(vraag, sleutels.map(k => lijf[k])));
      return stuur(200, r.rows[0].uit);
    }

    const mTabel = /^\/rest\/v1\/([\w]+)$/.exec(pad);
    if (mTabel) {
      const tabel = mTabel[1];
      const kies = (u.searchParams.get('select') || '*');
      const kolommen = kies === '*' ? '*' : kies.split(',').map(k => `"${k.trim()}"`).join(',');
      const waarden = [];
      const waar = bouwWaar(u.searchParams, waarden);
      /* PostgREST schrijft de richting achter de kolom: order=tijd.desc.
         Zonder dit stuk werd dat één kolomnaam "tijd.desc" en viel de
         vraag om. */
      const orde = u.searchParams.get('order') ? ' order by ' +
        u.searchParams.get('order').split(',').map(k => {
          const d = k.trim().split('.');
          const kol = `"${d[0]}"`;
          if (d[1] === 'desc') return kol + ' desc';
          if (d[1] === 'asc')  return kol + ' asc';
          return kol;
        }).join(',') : '';
      const limiet = u.searchParams.get('limit') ? ' limit ' + Number(u.searchParams.get('limit')) : '';

      if (req.method === 'GET') {
        const r = await metRol(uid, c => c.query(`select ${kolommen} from public."${tabel}"${waar}${orde}${limiet}`, waarden));
        return stuur(200, r.rows);
      }
      if (req.method === 'POST') {
        const rijen = [].concat(lijf);
        const kols = Object.keys(rijen[0]);
        const w = []; const stukken = [];
        for (const rij of rijen) {
          const stuk = [];
          for (const k of kols) { w.push(await klaarVoorPg(tabel, k, rij[k])); stuk.push('$' + w.length); }
          stukken.push('(' + stuk.join(',') + ')');
        }
        const bots = u.searchParams.get('on_conflict');
        // Zijn alle kolommen onderdeel van de sleutel, dan valt er niets bij te
        // werken en moet het 'do nothing' zijn -- 'do update set' zonder
        // kolommen is geen geldige SQL.
        let opBotsing = '';
        if (bots) {
          const sleutels = bots.split(',');
          const rest = kols.filter(k => !sleutels.includes(k));
          opBotsing = ` on conflict (${sleutels.map(k=>`"${k}"`).join(',')}) ` +
            (rest.length ? 'do update set ' + rest.map(k => `"${k}"=excluded."${k}"`).join(',')
                         : 'do nothing');
        }
        const r = await metRol(uid, c => c.query(
          `insert into public."${tabel}" (${kols.map(k=>`"${k}"`).join(',')}) values ${stukken.join(',')}${opBotsing} returning *`, w));
        return stuur(201, r.rows);
      }
      if (req.method === 'PATCH') {
        const kols = Object.keys(lijf); const w = []; const delen = [];
        for (const k of kols) { w.push(await klaarVoorPg(tabel, k, lijf[k])); delen.push(`"${k}"=$${w.length}`); }
        const zet = delen.join(',');
        const waar2 = bouwWaar(u.searchParams, w);
        const r = await metRol(uid, c => c.query(`update public."${tabel}" set ${zet}${waar2} returning *`, w));
        return stuur(200, r.rows);
      }
      if (req.method === 'DELETE') {
        const r = await metRol(uid, c => c.query(`delete from public."${tabel}"${waar} returning *`, waarden));
        return stuur(200, r.rows);
      }
    }
    return stuur(404, { message: 'Onbekend adres: ' + pad });
  } catch (e) {
    const code = /row-level security|policy/i.test(e.message) ? 403 : 400;
    stuur(code, { message: e.message, code: e.code });
  }
});

server.listen(5455, () => console.log('nep-supabase luistert op 5455'));
