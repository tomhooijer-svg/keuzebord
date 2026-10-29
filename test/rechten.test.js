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
} catch (e) {
  console.log(uit.join('\n'));
  console.log('ER GING IETS MIS', e.message, e.stdout ? e.stdout.toString().slice(-800) : '');
  process.exit(1);
}
try { draai(['-d','postgres','-q','-c','drop database if exists ' + DB + ' with (force)']); } catch (e) {}
console.log(uit.join('\n'));
