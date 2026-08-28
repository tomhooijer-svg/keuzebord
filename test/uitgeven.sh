#!/bin/sh
# Uit één werkplaats twee uitgaven.
#
#   Keuzebord  het bord, de kinderen, de klassen, de picto's, de hoeken
#              met hun foto's, wat het bord kan, en de statistieken.
#   Planbord   het weekplan, de thema's, de taken, de doelen en de
#              observaties.
#
# Ze delen alles daaronder. Wat verschilt is kb-app.js (welke panelen,
# en waar de andere app staat) en welke schermbestanden meegaan. Verder
# is het dezelfde code -- daarom staat hij ook maar op één plek.
#
# Gebruik:  sh test/uitgeven.sh [doelmap]
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
UIT=${1:-/tmp/keuzebord-uitgaven}
V=$(sed -n "s/^var VERSIE = '\(.*\)';.*/\1/p" "$R/src/kb-data.js" | tr -d ' ' | tr -cd 'A-Za-z0-9')

rm -rf "$UIT"; mkdir -p "$UIT"

# ── wat elke uitgave krijgt ──────────────────────────────────────────
# De motor: overal hetzelfde.
KERN="kb-app.js kb-data.js kb-supabase.js kb-media.js kb-sync.js kb-verbinding.js kb-statistiek.js kb-beheer.js"
BORD_SCHERMEN="kb-bord.js kb-school.js kb-statistiekpaneel.js kb-docx.js"
PLAN_SCHERMEN="kb-school.js kb-doelzoeker.js kb-verslag.js kb-plan.js kb-thema.js"

bouw(){
  app=$1; naam=$2; ander=$3; anderNaam=$4; anderPad=$5; panelen=$6
  schermen=$7; paginas=$8
  D="$UIT/$app"
  mkdir -p "$D/src" "$D/data" "$D/supabase"

  for f in $paginas robots.txt _headers .nojekyll .gitignore; do
    [ -e "$R/$f" ] && cp "$R/$f" "$D/"
  done
  for f in $KERN $schermen; do cp "$R/src/$f" "$D/src/"; done
  cp "$R/src/kb-stijl.css" "$D/src/"
  cp -r "$R/data/." "$D/data/"
  cp "$R/supabase/schema.sql" "$D/supabase/" 2>/dev/null || true

  # kb-app.js: het enige bestand dat per uitgave verschilt
  cat > "$D/src/kb-app.js" <<EOF
/* Welke app dit is. Geschreven door test/uitgeven.sh -- pas de
   werkplaats aan, niet dit bestand.

   $naam is één van twee uitgaven van dezelfde motor. Ze delen de
   gegevens, de database en het inloggen; de splitsing zit in de
   schermen. Allebei mogen ze alles lezen -- ze laten alleen wat
   anders zien. */
window.KB_APP = {
  id: '$app',
  naam: '$naam',
  panelen: [$panelen],
  ander: { id:'$ander', naam:'$anderNaam', adres:'$anderPad' }
};
EOF

  # de schermen die deze uitgave niet heeft uit beheer.html knippen
  if [ -f "$D/beheer.html" ]; then
    weg=$([ "$app" = "keuzebord" ] && echo planbord || echo keuzebord)
    sed -i "/<!-- $weg -->/,/<!-- \/$weg -->/d" "$D/beheer.html"
    sed -i "/<!-- $app -->/d; /<!-- \/$app -->/d" "$D/beheer.html"
  fi

  # de versie in de adressen van de code: GitHub Pages leest _headers
  # niet, dus dit is wat een oude versie uit de cache tegenhoudt
  if [ -n "$V" ]; then
    for f in "$D"/*.html; do
      [ -e "$f" ] || continue
      sed -i "s|\(src=\"src/[a-z-]*\.js\)\"|\1?v=$V\"|g; s|\(href=\"src/[a-z-]*\.css\)\"|\1?v=$V\"|g" "$f"
    done
  fi

  # controle: verwijst een pagina naar code die niet is meegekomen?
  mis=0
  for f in "$D"/*.html; do
    [ -e "$f" ] || continue
    for s in $(sed -n 's|.*src="src/\([a-z-]*\.js\).*|\1|p' "$f"); do
      [ -f "$D/src/$s" ] || { echo "  ONTBREEKT in $app: $s (gevraagd door $(basename "$f"))"; mis=1; }
    done
  done
  [ $mis -eq 0 ] || exit 1

  echo "  $naam: $(ls "$D"/*.html | wc -l | tr -d ' ') pagina's, $(ls "$D/src" | wc -l | tr -d ' ') codebestanden, $(du -sh "$D" | cut -f1)"
}

echo "── uitgeven ($V) ──"
bouw keuzebord "Keuzebord" planbord "Planbord" "../planbord/" \
  "'statistiek','leerlingen','pictos','hoeken','uiterlijk','groep','functies'" \
  "$BORD_SCHERMEN" "index.html inloggen.html bord.html testbord.html school.html beheer.html"

bouw planbord "Planbord" keuzebord "Keuzebord" "../keuzebord-app/" \
  "'vandaag','week','themas','taken','doelen','observaties','groep'" \
  "$PLAN_SCHERMEN" "index.html inloggen.html school.html beheer.html"

# ── wat er nooit in mag ──────────────────────────────────────────────
# In de geschiedenis van de werkplaats zit een oud bestand met echte
# voornamen en foto's van kinderen. Dat mag nooit publiek worden, en de
# uitgaven krijgen daarom geen geschiedenis mee -- alleen bestanden.
for d in "$UIT"/keuzebord "$UIT"/planbord; do
  rm -f "$d/oud.html" "$d/keuzebord-preview.html"
  rm -rf "$d/docs"
  [ -f "$R/docs/PUBLIEK-LEESMIJ.md" ] && cp "$R/docs/PUBLIEK-LEESMIJ.md" "$d/README.md"
done

n=$(grep -rlE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" "$UIT" 2>/dev/null \
    | xargs grep -hoE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" 2>/dev/null \
    | grep -vcE "@(school|mijnschool|school-a|school-b)\.nl" || true)
echo "  e-mailadressen die geen voorbeeld zijn: ${n:-0}"
echo "── klaar in $UIT ──"
