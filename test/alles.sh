#!/bin/sh
# Alle proeven achter elkaar. Elke proef krijgt een verse database met een
# verse proefschool, zodat de ene proef de andere niet in de weg zit.
R=$(cd "$(dirname "$0")/.." && pwd)
LIJST=${*:-"inloggen sync rollen keten fotos beheerder accounts losgeraakt doelen browsers werkmomenten statistiek verslag themas aanuit dubbel plaatshouder uiterste juf gesplitst knoppen doorloop"}
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
  if node "$R/test/$naam.test.js" 2>&1 | tee /var/tmp/kb-$naam.log \
       | grep -E "^  FOUT|^  \[fout\]|^[A-Za-z]*Error|ER GING IETS MIS" ; then mis=1; fi
  grep -cE "^  (goed|ja) " /var/tmp/kb-$naam.log | sed 's/^/   goed: /'
done
[ $mis -eq 0 ] && echo "ALLES GOED" || echo "ER GING IETS MIS"
