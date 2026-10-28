# Keuzebord – details

## Doel
Digitaal keuzebord voor kleutergroepen: kinderen verplaatsen hun picto naar een hoek/activiteit op het digibord.
Eerst gratis testomgeving voor testscholen (feedbackknoppen, beknopte handleiding, eenvoudige inloggegevens). Cloud-based, werkt op meerdere apparaten.

## Repo's: één bron, twee uitgaven
- **Deze map = `tomhooijer-svg/keuzebord`** (privé): de werkplaats en de enige bron. Hier wordt gebouwd en getest.
- `test/uitgeven.sh` bouwt hieruit twee publieke uitgaven (zonder git-history, zonder `docs/`, `oud.html`, `design/`):
  - `tomhooijer-svg/keuzebord-app` → https://tomhooijer-svg.github.io/keuzebord-app/ (het bord, beheer, statistieken)
  - `tomhooijer-svg/planbord` → https://tomhooijer-svg.github.io/planbord/ (weekplan, thema's, taken, doelen, observaties)
- Nooit direct in keuzebord-app of planbord werken; altijd via `uitgeven.sh`.
- `keuzebord-product` is een afgeleide kopie (`test/product-kopie.sh`), niets uniek erin.
- Deze repo blijft privé: in de history staan kindernamen en foto's.

## Functies
Al gebouwd (stand 28-10-2026, commit 2ff2a46):
- Bord met picto's/foto's, hoeken per thema, tijdsvergrendeling (juf kan overrulen), werkt offline door (local-first)
- Beheer per leerkracht, schoolbeheer, platformbeheer als CMS (accounts/rollen/verplaatsen/verwijderen/school hernoemen, feedbackoverzicht)
- Inloggen met gebruikersnaam (intern `<naam>@keuzebord.invalid`), wachtwoord 3 woorden + cijfer, kaartje om te printen
- Meekijken (school zet zelf de deur open), statistieken, verslag per kind (oudergesprek)
- Thema-vormgeving, 44 getekende picto's, demo zonder account, rondleiding in de paginastroom, handleiding, privacyverklaring (nog in te vullen), feedbackknop
- Kindfoto's standaard uit, per school, alleen schoolbeheerder zet ze aan

Planbord: blijft live, maar wordt nu niet doorontwikkeld.

## Techniek
- Stack: vanilla JS + HTML/CSS, geen bouwstap. PWA (`manifest.json`). Supabase (auth, Postgres met RLS, bucket `kb-media`, regio eu-west-1). Stijl uit `stijl/` (Pixelplein-stijlpakket, `--pp-…`-tokens). Alleen voor testen: Node (`pg`, `playwright`).
- Bestanden:
  - Schermen: `bord.html`, `beheer.html`, `school.html`, `platform.html`, `inloggen.html`, `demo.html`, `handleiding.html`, `privacy.html`, `pictos.html`, `testbord.html`, `diagnose.html`, `index.html`; `oud.html` gaat niet mee in de uitgave
  - `src/kb-verbinding.js` start elk scherm; `kb-data.js` lokale gegevens (+ `VERSIE`); `kb-sync.js` sync; `kb-supabase.js` verbinding; `kb-media.js` foto's; `kb-app.js` welke panelen per uitgave
  - Bord: `kb-bord.js`, `kb-school.js`, `kb-platform.js`, `kb-statistiekpaneel.js`, `kb-docx.js`. Planbord: `kb-plan.js`, `kb-thema.js`, `kb-doelzoeker.js`, `kb-verslag.js`. Gedeeld: `kb-beheer.js`, `kb-statistiek.js`, `kb-kaartje.js` (wachtwoorden), `kb-pictobank.js`, `kb-demo.js`, `kb-rondleiding.js`, `kb-feedback.js`, `kb-testbanner.js`
  - `supabase/schema.sql` (alles, herhaalbaar), `inrichten.sql`, `test-0*.sql` (RLS-proeven)
  - `DECISIONS.md` – alle keuzes met reden (onderaan toevoegen, terugdraaien = oude regel laten staan); `docs/` – PLAN, DATAMODEL, ROLLEN, HOSTING(-PRODUCT), HERSTEL (zelf niet meer binnenkomen), PUBLIEK-/PRODUCT-LEESMIJ
  - `design/*.dc.html` – ontwerpcanvas
- Supabase-tabellen (project `zlmunykkhooscnxbfvvg`):
  - School/accounts: `scholen`, `profielen`, `uitnodigingen`, `groepen`, `groep_leden`, `groep_verzoeken`, `ondersteuning`, `handelingen` (logboek), `feedback`
  - Bord: `leerlingen`, `media`, `hoeken`, `themas`, `thema_hoeken`, `borden`, `bord_hoeken`, `plaatsingen`, `wachtrij`, `gebeurtenissen`
  - Planwerk: `doelen`, `groep_doelen`, `thema_doelen`, `taken`, `taak_doelen`, `weekplannen`, `week_doelen`, `weekplan_taken`, `taak_toewijzing`, `observaties`
  - Rechten via functies o.a. `mijn_school()`, `mag_bij_groep()`, `ben_schoolbeheerder()`, `ben_platformbeheerder()`; login via `inlogadres()`
  - Rem: 30 in-/aanmeldingen per 5 min per IP (Supabase), herkend door `SB.isTeVaak()`
- Hosting: GitHub Pages via de twee uitgaverepo's. Eén adres voor iedereen; de school volgt uit de login (geen pad of subdomein per school).
- Lokaal testen:
  - Snel kijken: `python3 -m http.server 8000 --bind 127.0.0.1`, open http://127.0.0.1:8000/demo.html (geen account, alles in de browser)
  - Proeven (Postgres + nep-Supabase op 5455 + webserver op 8899): `npm install`, `sh test/opzetten.sh`, `sh test/proefschool.sh`, `sh test/alles.sh` (of `sh test/alles.sh doelen verslag`). Laatste volle ronde: 54 proeven, 890 controles, groen. Zie `test/LEESMIJ.md`.
  - Uitgeven: `sh test/uitgeven.sh` → `/tmp/keuzebord-uitgaven/{keuzebord,planbord}`; controleert zelf op echte e-mailadressen
  - Op het digibord: na publiceren `diagnose.html` voor de versie

## Regels
- Touch-first: grote raakvlakken, geen hover-afhankelijkheid, werkt op Prowise-digibord.
- Een 4-jarige moet het zonder lezen kunnen bedienen.
- Alleen nepdata: nooit echte kindernamen of foto's in de repo, proeven of schermafdrukken.
- Rechten horen in de database (RLS in `schema.sql`), niet alleen in de app. Tabel wijzigen → `privacy-avg` laten meekijken.
- De leverancier ziet nooit kinderen, borden of statistieken; meekijken alleen als de school de deur openzet.
- Grenzen: geen AI, geen per-kind-statistiek bij de leverancier, geen ParnasSys, geen betalingen in de app.
- De `service_role`-sleutel nooit vragen, tonen of committen.
- Nieuwe keuze → onderaan in `DECISIONS.md`, met datum en reden.
