#!/bin/sh
# Zet de hele testomgeving op: een Postgres met het echte schema, de
# nabootsing van Supabase, en een webserver voor de app zelf.
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
. "$R/test/mac.sh"
PG=${PG:-/usr/lib/postgresql/16/bin}
D=/var/tmp/kbpg

# Postgres weigert als root te draaien. Op Linux (waar de proeven als root
# lopen) krijgt hij daarom een eigen gebruiker; op een Mac draait hij
# gewoon als jij.
als_pg(){ if [ -n "$KB_MAC" ]; then sh -c "$1"; else su kb -c "$1"; fi; }
[ -n "$KB_MAC" ] || id kb >/dev/null 2>&1 || useradd -m kb
if [ ! -f $D/PG_VERSION ]; then
  rm -rf $D; mkdir -p $D; [ -n "$KB_MAC" ] || chown kb:kb $D; chmod 700 $D
  als_pg "$PG/initdb -D $D -U postgres --auth=trust" >/dev/null
fi
$PG/pg_isready -h /var/tmp -p 5439 >/dev/null 2>&1 || \
  als_pg "$PG/pg_ctl -D $D -o '-p 5439 -k /var/tmp' -l $D/log.txt start" >/dev/null 2>&1 </dev/null

dropdb   -h /var/tmp -p 5439 -U postgres kb 2>/dev/null || true
createdb -h /var/tmp -p 5439 -U postgres kb
psql -h /var/tmp -p 5439 -U postgres -d kb -q -v ON_ERROR_STOP=1 -f "$R/supabase/test-01-nepsupabase.sql"
psql -h /var/tmp -p 5439 -U postgres -d kb -q -v ON_ERROR_STOP=1 -f "$R/supabase/schema.sql" 2>&1 | grep -v NOTICE || true

pkill -f nep-supabase-server.js 2>/dev/null || true
pkill -f "http.server 8899"     2>/dev/null || true
sleep 0.4
( cd "$R" && node test/nep-supabase-server.js >/var/tmp/nepserver.log 2>&1 </dev/null & )
( cd "$R" && python3 -m http.server 8899 >/dev/null 2>&1 </dev/null & )
sleep 1.2
echo "database, nabootsing (5455) en webserver (8899) draaien"
