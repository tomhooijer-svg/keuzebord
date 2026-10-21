#!/bin/sh
# Zet de inhoud van de productrepo klaar: het keuzebord als product voor
# meerdere scholen, zonder de geschiedenis van de werkplaats.
#
# Anders dan publieke-kopie.sh is dit geen kale site maar een volledige
# werkplaats: bron, proeven, schema en de productdocumenten gaan mee. Wat
# niet meegaat staat hieronder met de reden erbij.
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
UIT=${1:-/tmp/keuzebord-product}

rm -rf "$UIT"; mkdir -p "$UIT"
cd "$R"

# Uit de lijst van git, niet van de schijf: dan glipt er geen losse
# download, geen node_modules en geen half bestand mee.
#
#   oud.html      de v1 van één school, buiten scope
#   design/       schetsen uit een eerdere ronde, blijven in de werkplaats
#   *.whl         python-pakketjes die hier ooit zijn beland
#   docs/PLAN.md  beschrijven hoe de werkplaats is ontstaan, inclusief wat
#   docs/HOSTING.md   er in die geschiedenis zit -- een wegwijzer die niet
#                 hoort bij een repo die gedeeld kan worden
#   docs/ADVIES-AGENDA-EN-KOPPELING.md   gaat over het planbord
#   docs/PRODUCT-LEESMIJ.md              wordt hier de README
git ls-files \
  | grep -vE '^(oud\.html|docs/PLAN\.md|docs/HOSTING\.md|docs/ADVIES-AGENDA-EN-KOPPELING\.md|docs/PRODUCT-LEESMIJ\.md)$' \
  | grep -vE '^design/' \
  | grep -vE '\.whl$' \
  | while read -r f; do
      mkdir -p "$UIT/$(dirname "$f")"
      cp "$f" "$UIT/$f"
    done

cp "$R/docs/PRODUCT-LEESMIJ.md" "$UIT/README.md" 2>/dev/null || true

echo "── klaar in $UIT ──"
echo
echo "controle: staat er nog iets persoonlijks in?"
oud=$(grep -rIl "keuzebord""final" "$UIT" 2>/dev/null || true)
if [ -n "$oud" ]; then echo "  LET OP, wegwijzer naar het oude bestand in: $oud"
else echo "  geen spoor van het oude bestand"; fi

wijs=$(grep -rIln "voornamen van kleuters\|pasfoto's met voornamen\|GROEP_1C_LL" "$UIT" 2>/dev/null || true)
if [ -n "$wijs" ]; then echo "  LET OP, wegwijzer naar de oude gegevens in: $wijs"
else echo "  geen wegwijzer naar de oude gegevens"; fi

echo "  echte e-mailadressen:"
grep -rIoh "[a-zA-Z0-9._%-]*@[a-zA-Z0-9.-]*\.\(nl\|com\|org\)" "$UIT" 2>/dev/null \
  | grep -v "school-a.nl\|school-b.nl\|mijnschool.nl\|school.nl\|voorbeeld.nl\|tweede.nl\|platform.nl\|anthropic.com\|noreply@" \
  | sort -u | sed 's/^/    /'
echo
echo "grootte: $(du -sh "$UIT" | cut -f1), $(find "$UIT" -type f | wc -l) bestanden"
