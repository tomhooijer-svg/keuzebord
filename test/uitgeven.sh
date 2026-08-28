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
# De stempel die in het adres van de code komt. Dit was eerst de datum,
# en dat ging mis: twee keer publiceren op dezelfde dag gaf twee keer
# hetzelfde adres, dus browsers hielden de oude code vast bij een nieuwe
# pagina -- het nieuwe menu met de oude panelen erachter. Een cachebreker
# die niet verandert als de code verandert, breekt niets.
#
# Nu is het een korte vingerafdruk van de code zelf. Verandert er één
# letter in één bestand, dan verandert de stempel; verandert er niets,
# dan blijft hij staan en hoeft er ook niets opnieuw geladen te worden.
DATUM=$(sed -n "s/^var VERSIE = '\(.*\)';.*/\1/p" "$R/src/kb-data.js" | tr -d ' ' | tr -cd 'A-Za-z0-9')
VINGER=$(cat "$R"/src/*.js "$R"/src/*.css "$R"/*.html 2>/dev/null | sha1sum | cut -c1-8)
V="$DATUM-$VINGER"

rm -rf "$UIT"; mkdir -p "$UIT"

# ── wat elke uitgave krijgt ──────────────────────────────────────────
# De motor: overal hetzelfde.
KERN="kb-app.js kb-data.js kb-supabase.js kb-media.js kb-sync.js kb-verbinding.js kb-statistiek.js kb-beheer.js"
BORD_SCHERMEN="kb-bord.js kb-school.js kb-statistiekpaneel.js kb-docx.js"
PLAN_SCHERMEN="kb-school.js kb-doelzoeker.js kb-verslag.js kb-plan.js kb-thema.js"

bouw(){
  app=$1; naam=$2; ander=$3; anderNaam=$4; anderPad=$5; panelen=$6
  schermen=$7; paginas=$8; heeftBord=$9
  D="$UIT/$app"
  mkdir -p "$D/src" "$D/data" "$D/supabase"

  for f in $paginas robots.txt _headers .nojekyll .gitignore; do
    [ -e "$R/$f" ] && cp "$R/$f" "$D/"
  done
  for f in $KERN $schermen; do cp "$R/src/$f" "$D/src/"; done
  cp "$R/src/kb-stijl.css" "$D/src/"
  cp -r "$R/data/." "$D/data/"
  # De hele supabase-map gaat mee: zonder inrichten.sql en de leesmij
  # daar kun je geen verse database opzetten, en dat is precies wat
  # iemand met deze repo in handen wil doen. De proeven gaan níet mee --
  # die horen bij de werkplaats waar alle schermen nog bij elkaar zitten,
  # en zouden hier over panelen struikelen die deze uitgave niet heeft.
  cp -r "$R/supabase/." "$D/supabase/" 2>/dev/null || true

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
  /* De vingerafdruk van de code in deze uitgave. Staat onder in het
     bordmenu en bij Groep, zodat je twee uitgaven van dezelfde dag uit
     elkaar kunt houden -- en kunt zien of een wijziging bij je is
     aangekomen. */
  bouw: '$VINGER',
  /* Heeft deze uitgave het bord zelf? Planbord niet -- daar wijst een
     knop "Bord openen" naar de andere app, met de groep mee. */
  heeftBord: $heeftBord,
  panelen: [$panelen],
  ander: { id:'$ander', naam:'$anderNaam', adres:'$anderPad' }
};
EOF

  # Het beginscherm stuurt door naar het scherm waar je wilt zijn. In
  # Keuzebord is dat het bord; Planbord heeft geen bord, dus daar het
  # beheer -- anders kom je op een 404 uit.
  if [ -f "$D/index.html" ]; then
    sed -i "s|<title>[^<]*</title>|<title>$naam</title>|" "$D/index.html"
    if [ "$app" != "keuzebord" ]; then
      sed -i 's|bord\.html|beheer.html|g; s|ga naar het keuzebord|ga naar het planbord|' "$D/index.html"
    fi
  fi

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
  "$BORD_SCHERMEN" "index.html inloggen.html bord.html testbord.html school.html beheer.html diagnose.html" true

bouw planbord "Planbord" keuzebord "Keuzebord" "../keuzebord-app/" \
  "'vandaag','week','themas','taken','doelen','observaties','groep'" \
  "$PLAN_SCHERMEN" "index.html inloggen.html school.html beheer.html diagnose.html" false

# ── wat er nooit in mag ──────────────────────────────────────────────
# In de geschiedenis van de werkplaats zit een oud bestand met echte
# voornamen en foto's van kinderen. Dat mag nooit publiek worden, en de
# uitgaven krijgen daarom geen geschiedenis mee -- alleen bestanden.
for d in "$UIT"/keuzebord "$UIT"/planbord; do
  rm -f "$d/oud.html" "$d/keuzebord-preview.html"
  rm -rf "$d/docs"
  [ -f "$R/docs/PUBLIEK-LEESMIJ.md" ] && cp "$R/docs/PUBLIEK-LEESMIJ.md" "$d/README.md"
done

# Elke uitgave zegt op zijn voorpagina wat hij is en waar de andere staat.
kop(){
  d=$1
  { cat "$2"; echo; cat "$d/README.md"; } > "$d/README.tmp" && mv "$d/README.tmp" "$d/README.md"
}
cat > /tmp/kb-kop-keuzebord.md <<'MD'
# Keuzebord

Het digibord in de kleutergroep: kinderen kiezen een hoek, jij ziet wie
waar zit. Hier beheer je de kinderen, de klassen, de picto's, de hoeken
met hun foto's en wat het bord kan -- en je ziet de statistieken over wat
er in de hoeken gebeurde.

Het planwerk -- weekplan, thema's, taken, doelen en observaties -- zit in
**[Planbord](https://tomhooijer-svg.github.io/planbord/)**. De twee delen
dezelfde gegevens en hetzelfde inloggen; een knop onderin het menu brengt
je van de een naar de ander, met de groep mee.

---
MD
cat > /tmp/kb-kop-planbord.md <<'MD'
# Planbord

Het werk van vóór en ná het spelen: de week plannen, thema's uitwerken
langs verwonderen, vragen, onderzoeken en betekenis geven, taken maken
die aan doelen hangen, en observeren wat een kind al kan.

Het bord zelf -- kiezen, hoeken, picto's, statistieken -- zit in
**[Keuzebord](https://tomhooijer-svg.github.io/keuzebord-app/)**. De twee
delen dezelfde gegevens en hetzelfde inloggen; een knop onderin het menu
brengt je van de een naar de ander, met de groep mee.

---
MD
kop "$UIT/keuzebord" /tmp/kb-kop-keuzebord.md
kop "$UIT/planbord"  /tmp/kb-kop-planbord.md

n=$(grep -rlE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" "$UIT" 2>/dev/null \
    | xargs grep -hoE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" 2>/dev/null \
    | grep -vcE "@(school|mijnschool|school-a|school-b)\.nl" || true)
echo "  e-mailadressen die geen voorbeeld zijn: ${n:-0}"
echo "── klaar in $UIT ──"
