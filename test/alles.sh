#!/bin/sh
# Alle proeven achter elkaar. Elke proef krijgt een verse database met een
# verse proefschool, zodat de ene proef de andere niet in de weg zit.
R=$(cd "$(dirname "$0")/.." && pwd)
LIJST=${*:-"inloggen sync rollen keten fotos beheerder accounts losgeraakt doelen browsers werkmomenten statistiek verslag themas aanuit dubbel plaatshouder uiterste onderweg verdwenen naarhetbord opslagstand leerkracht tabbladen gesplitst knoppen doorloop"}
mis=0
for naam in $LIJST; do
  sh "$R/test/opzetten.sh"   >/dev/null
  sh "$R/test/proefschool.sh" >/dev/null 2>&1
  # De proef op de twee uitgaven heeft die uitgaven nodig, en een
  # webserver per stuk. Opzetten.sh ruimt de vorige ronde op, dus dit
  # hoort hier en niet ervoor.
  # De twee uitgaven moeten staan zoals ze bij GitHub Pages staan: één
  # adres met twee mappen ernaast. Ze op twee poorten zetten is voor een
  # browser twee verschillende websites -- dan deel je geen opslag en
  # geen sessie, en dan klopt "../planbord/" ook niet meer. Precies de
  # fout die de proef juist moet vangen.
  if [ "$naam" = "gesplitst" ]; then
    sh "$R/test/uitgeven.sh" /tmp/kb-uitgaven >/dev/null 2>&1
    rm -rf /tmp/kb-pages && mkdir -p /tmp/kb-pages
    cp -r /tmp/kb-uitgaven/keuzebord /tmp/kb-pages/keuzebord-app
    cp -r /tmp/kb-uitgaven/planbord  /tmp/kb-pages/planbord
    ( cd /tmp/kb-pages && python3 -m http.server 8896 >/dev/null 2>&1 & )
    sleep 1.2
    export BORDAPP=http://localhost:8896/keuzebord-app
    export PLANAPP=http://localhost:8896/planbord
  fi
  echo "── $naam ──"
  # Alleen echte fouten. Let op de vorm: "geen fout" en "geen enkele fout"
  # staan in geslaagde regels, en die mogen niet meetellen.
  # stdbuf: zonder dat houdt node zijn uitvoer in een buffer zodra er een
  # pijp achter staat, en bij een crash gaat die buffer verloren. Dan zie
  # je alleen de crash en geen enkele van de controles die er al waren.
  # Wat als fout telt. Let op de eerste stap: onze eigen geslaagde regels
  # beginnen met twee spaties en "goed", en die mogen nooit meetellen --
  # er staat weleens het woord Error in de toelichting. Al het andere met
  # "Error:" erin is een crash, ook als de regel begint met "page.evaluate:".
  # Zonder dat laatste gleed een halverwege omgevallen proef er stil
  # doorheen zolang hij één controle had opgeleverd.
  if stdbuf -o0 -e0 node "$R/test/$naam.test.js" 2>&1 | tee /var/tmp/kb-$naam.log \
       | grep -vE "^  goed " \
       | grep -E "^  FOUT|^  \[fout\]|Error:|ER GING IETS MIS|triggerUncaughtException" ; then mis=1; fi
  n=$(grep -cE "^  (goed|ja) " /var/tmp/kb-$naam.log)
  echo "   goed: $n"
  # Een proef die niets oplevert is niet geslaagd maar omgevallen. Zonder
  # deze regel meldde de ronde "ALLES GOED" terwijl een hele proef stuk was.
  if [ "$n" -eq 0 ]; then echo "   GEEN ENKELE CONTROLE — deze proef is omgevallen"; mis=1; fi
done
[ $mis -eq 0 ] && echo "ALLES GOED" || echo "ER GING IETS MIS"
