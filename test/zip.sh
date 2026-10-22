#!/bin/sh
# De app als één zip, om door te geven of op de website te zetten.
#
# Wat erin zit is de uitgave Keuzebord zoals die ook publiek staat: de
# pagina's, de code, de gegevens, de huisstijl en het databaseschema.
# Geen geschiedenis, geen docs, geen proeven -- precies wat een server
# nodig heeft om de app te serveren, en niets dat niet publiek kan.
#
# Pak hem uit op een webserver en de app draait. Er hoeft niets
# gebouwd te worden; het zijn gewone bestanden.
#
# Gebruik:  sh test/zip.sh [doelmap]
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
DOEL=${1:-/tmp}
WERK=$(mktemp -d)

sh "$R/test/uitgeven.sh" "$WERK/uitgaven" >/dev/null

VERSIE=$(sed -n "s/^var VERSIE = '\(.*\)';.*/\1/p" "$R/src/kb-data.js" | tr -d ' ' | tr -cd 'A-Za-z0-9')
VINGER=$(sed -n "s/.*bouw: '\(.*\)',.*/\1/p" "$WERK/uitgaven/keuzebord/src/kb-app.js")
NAAM="keuzebord-$VERSIE-$VINGER"

mkdir -p "$WERK/$NAAM"
cp -r "$WERK/uitgaven/keuzebord/." "$WERK/$NAAM/"

mkdir -p "$DOEL"
rm -f "$DOEL/$NAAM.zip"
( cd "$WERK" && zip -rq "$DOEL/$NAAM.zip" "$NAAM" -x '*/.DS_Store' )
rm -rf "$WERK"

echo "$DOEL/$NAAM.zip"
echo "  $(unzip -l "$DOEL/$NAAM.zip" | tail -1 | awk '{print $2}') bestanden, $(du -h "$DOEL/$NAAM.zip" | cut -f1)"
