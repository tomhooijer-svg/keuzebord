# Keuzebord v2 — technisch plan

Status: voorstel, nog niet gebouwd. Opgesteld op basis van de wensenlijst (Digikeuzebord-achtige
uitbreiding) en de beantwoorde scopevragen.

---

## 0. Eerst dit: een acuut privacypunt

De repository `tomhooijer-svg/keuzebord` is **publiek** en **GitHub Pages staat aan**. In
`index.html` zitten 55 pasfoto's met voornamen van kinderen uit groep 1C en 1D, hard in de code
(`GROEP_1C_LL` en `GROEP_1D_LL`, samen ~1,35 MB base64). Die zijn nu voor iedereen te downloaden,
via github.com én via de gepubliceerde Pages-site.

Dit moet gedicht worden voordat we iets anders doen. Aanbevolen volgorde:

1. **Repo op privé zetten** (Settings → General → Danger Zone → Change visibility). Dit haalt in
   één klap zowel de code als de Pages-site publiek van het net af.
2. **Pages uitzetten** en de site opnieuw publiceren via Cloudflare Pages (zie §8) — die kan wél
   gratis vanaf een privé-repo publiceren.
3. **Foto's uit de git-geschiedenis halen.** Privé zetten is voor nu voldoende, maar de foto's
   zitten ook in oude commits. Bij fase 0 halen we ze definitief uit de historie en verhuizen ze
   naar de app-opslag, zodat de repo alleen nog code bevat.

> Praktisch: hierna staat de app op een niet-geïndexeerde URL achter een login. Het is verstandig
> dit bij je directie/IB'er te melden als "geconstateerd en dezelfde dag opgelost".

---

## 1. Wat er al staat

De app in deze repo is verder dan een simpel keuzebord. Aanwezig in `index.html`
(1,5 MB totaal; ~150 KB eigen code, de rest zijn ingebouwde foto's):

| Onderdeel | Staat er | Opmerking |
|---|---|---|
| Meerdere klassen | ja | `G.klassen[]`, wisselen via klasselect-scherm |
| Meerdere borden per klas | ja | met thema-skins (herfst, kerst, carnaval, ...) |
| Hoeken met capaciteit | ja | `hoekLib[] { naam, maxKinderen, fotoId }` |
| Leerlingen met eigen foto | ja | precies wat je wilde: geen standaardsetje |
| Slepen naar hoek | ja | pointer-events, werkt op touch |
| Tijdsvergrendeling | ja | globaal, met vulcirkel op het picto — mist alleen per-hoek instelling |
| Groepjes + auto-indeling | ja | inclusief suggestiealgoritme |
| Werkplaatstaken | ja | met capaciteit en vrije-tekst "leerlijnen" |
| Weekplanner | ja | activiteiten per dag, opmerking, tijdslot, koppeling aan werkje |
| Statistieken | ja | basaal, afgeleid van `weekData` |
| PIN op beheer | ja | 4 cijfers, per klas instelbaar |

**Het echte knelpunt is de opslag.** Alles staat als één JSON-blob in `localStorage` onder de sleutel
`kb_v5`. Dat betekent:

- de data leeft alleen in die ene browser op dat ene apparaat;
- de limiet ligt rond 5 MB, en de app zit met de ingebouwde foto's al ver over de helft;
- bij een volle quota gooit `save()` **stilzwijgend alle foto's weg** (regel 553-560) om ruimte te
  maken. Je merkt dat pas als de picto's leeg zijn.

Multi-tenant over 6 groepen, met toegang vanuit de klas én van huis, kan hier niet op. Dat wordt
een database. Dat is de kern van fase 1.

---

## 2. Digikeuzebord als referentie — met een bronvoorbehoud

De website digikeuzebord.nl is vanuit deze ontwikkelomgeving niet bereikbaar (de netwerkproxy
blokkeert het domein, net als de SLO-rapportage-PDF). Het functiebeeld hieronder komt daarom uit
zoekresultaten en secundaire bronnen (basisonderwijs.online, SLRO, hetjongekindteltmee.nl,
jufmaike.nl, meestersander.nl). Controleer het zelf even op de site voordat we op details bouwen.

| Module | Wat het doet | Nemen we over? |
|---|---|---|
| Planbord | kinderen kiezen zelf, activiteiten hebben plekken | staat al |
| Dagplanner | activiteiten klaarzetten; kind kiest via kleurcodes op welke dag | deels — fase 2 |
| Weekplanner | activiteiten per dag voor de hele week | staat al, wordt uitgebreid |
| Jaar-/themaplanner | thema's per week/periode, activiteiten verschijnen automatisch | fase 2, jouw variant: ook handmatig thema-sets |
| Statistieken | samenspel, speelduur, populaire hoeken | fase 3, opnieuw opgezet |
| Observatiesysteem | afvinken per kind per doel, SLO-leerlijnen | fase 3, met eigen doelenlijst |
| Monitor | analyses per kind/periode/domein voor IB'er | fase 3, light versie |
| Groepsdoorbroken werken | kiezen in een andere groep | **niet** — buiten scope |

Prijsindicatie ter vergelijking: het observatiesysteem van Digikeuzebord kost €125 per jaar voor
één groep, €270 voor drie of meer groepen (bron: basisonderwijs.online). Ons doel is €0.

---

## 3. Jouw scopekeuzes

| Vraag | Antwoord | Gevolg |
|---|---|---|
| Devices | klas + thuis, meerdere apparaten | database is nodig, geen localStorage-oplossing |
| Beheer | eigen account per leerkracht | Supabase Auth + rollen + RLS per groep |
| Doelenlijst | lege lijst, zelf opbouwen | structuur wél bouwen, geen 100 doelen voorvullen |
| Groepsdoorbroken | niet nodig | scheelt een hoop; groep = harde grens in het datamodel |
| Ouders | nee, jij print/exporteert | geen ouderaccounts, geen deelbare links |
| Offline | bord blijft werken, synct later | local-first architectuur (§6) |
| Foto's/AVG | nog uitzoeken op school | schakelaar: foto's lokaal óf in de cloud |
| Extra's | timer per hoek, wachtrij, signalering + weekexport | fase 4. Voorlezen gaat naar de later-lijst |

---

## 4. Architectuur

```
   Klasdevice (digibord/tablet)            Jouw laptop thuis
   ┌───────────────────────────┐          ┌───────────────────────────┐
   │  Keuzebord PWA            │          │  Keuzebord PWA            │
   │  ┌─────────────────────┐  │          │  ┌─────────────────────┐  │
   │  │ UI (vanilla JS)     │  │          │  │ UI (vanilla JS)     │  │
   │  ├─────────────────────┤  │          │  ├─────────────────────┤  │
   │  │ lokale store        │  │          │  │ lokale store        │  │
   │  │ (IndexedDB)         │  │          │  │ (IndexedDB)         │  │
   │  ├─────────────────────┤  │          │  ├─────────────────────┤  │
   │  │ outbox + sync       │  │          │  │ outbox + sync       │  │
   │  └──────────┬──────────┘  │          │  └──────────┬──────────┘  │
   └─────────────┼─────────────┘          └─────────────┼─────────────┘
                 │      wifi weg? UI draait door        │
                 └──────────────┬───────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │ Supabase (EU/Frankfurt)│
                    │  Postgres + RLS        │
                    │  Auth (e-mail/ww)      │
                    │  Storage (picto's)     │
                    └───────────────────────┘
```

**Frontend.** Blijft vanilla JavaScript, geen framework, **geen buildstap**. Wel opgesplitst van
één bestand van 2600 regels naar losse ES-modules (`src/board.js`, `src/sync.js`, `src/doelen.js`,
...), die de browser zelf inlaadt. Reden: React/Vue erbij halen betekent npm, een bundler en een
deploypipeline onderhouden — dat is precies het "gedoe" dat je niet wilt. ES-modules geven je de
overzichtelijkheid zonder de gereedschapskist. Alles blijft statische bestanden.

**PWA.** Service worker cachet de app-bestanden en de picto's, manifest maakt hem installeerbaar
op het digibord. Dit botst niet met de data-eisen, omdat de service worker alleen de *app* cachet;
de *data* loopt via de local-first laag hieronder.

**Backend.** Supabase, regio Frankfurt (EU). Alleen de standaardonderdelen: Postgres, Auth, Storage.
Geen eigen serverfuncties, geen server om te onderhouden.

**Waarom Supabase en niet Firebase?** Postgres met Row Level Security laat je "leerkracht ziet
alleen de eigen groep" in ~15 regels SQL vastleggen, in de database zelf. Bij Firebase zit die logica
in een aparte regeltaal die lastiger te controleren is. En je data blijft gewone SQL: exporteren en
weglopen kan altijd.

---

## 5. Datamodel

Alles hangt onder `groep_id`. Dat is de multi-tenant grens en meteen de RLS-grens.

```
scholen          id, naam
profielen        id (= auth user), naam, school_id, rol            rol: beheerder | leerkracht | assistent | ib
groepen          id, school_id, naam, schooljaar, archief
groep_leden      groep_id, profiel_id, rol                          wie mag bij welke groep

leerlingen       id, groep_id, naam, kleur, media_id, actief
media            id, groep_id, soort, bestandsnaam, opslag          opslag: 'cloud' | 'lokaal'
hoeken           id, groep_id, naam, max_kinderen, media_id, timer_minuten
themas           id, groep_id, naam, van_datum, tot_datum, kleuren
borden           id, groep_id, naam, thema_id, actief
bord_hoeken      bord_id, hoek_id, volgorde
plaatsingen      id, bord_id, leerling_id, hoek_id, gestart_op, vergrendeld_tot, status
wachtrij         id, bord_id, leerling_id, hoek_id, aangemeld_op

doelen           id, groep_id, domein, code, omschrijving, niveau, actief
taken            id, groep_id, naam, omschrijving, max_tegelijk, thema_id, media_id
taak_doelen      taak_id, doel_id
groepjes         id, groep_id, naam, kleur
groepje_leden    groepje_id, leerling_id
taak_toewijzing  id, taak_id, groepje_id | leerling_id, week, status   geplande taken per groepje

weekplan         id, groep_id, week (ma-datum), thema_id, notitie
weekplan_items   id, weekplan_id, dag, taak_id, tijdslot, opmerking
week_doelen      weekplan_id, doel_id                                weekbord met doelen centraal

observaties      id, groep_id, leerling_id, doel_id, niveau, datum, notitie, door_profiel_id
gebeurtenissen   id, groep_id, soort, leerling_id, hoek_id, taak_id, tijdstip, payload
```

Twee ontwerpkeuzes die het verschil maken:

**`gebeurtenissen` is een append-only logboek.** Elke plaatsing, elk vertrek, elke afgeronde taak
gaat er als losse regel in. Statistieken (wie speelde met wie, hoe lang, welke hoek is favoriet)
worden daaruit *berekend* in plaats van bijgehouden. Voordeel: nieuwe statistieken kun je met
terugwerkende kracht maken, en omdat er alleen bij komt en nooit iets verandert, kan de synchronisatie
hier per definitie geen conflict opleveren.

**Statistieken en observaties zijn een eigen scherm** (jouw punt 6). Ze schrijven niets in het
keuzebord. De koppeling loopt uitsluitend via `taak_doelen`: het bord meldt "taak X afgerond door
kind Y", de observatiemodule pikt dat op en zet het klaar als suggestie om af te vinken. Jij vinkt
af in je eigen scherm. Wil je de module niet gebruiken, dan werkt het bord precies hetzelfde.

**Doelen.** De lijst begint leeg, zoals je koos. De structuur (domein → doel → optioneel niveau)
bouwen we wel, met vier vaste domeinen als indeling: taal, rekenen, motoriek, sociaal-emotioneel.
Je kunt domeinen hernoemen en doelen toevoegen, deactiveren en herordenen. Ik zet er één knop
"voorbeelddoelen inladen" bij met een handvol SLO-achtige voorbeelden per domein — puur om het
lege scherm te doorbreken. Negeren mag.

---

## 6. Offline werken en synchroniseren

De UI praat **nooit rechtstreeks** met Supabase. Zo werkt het:

1. Je sleept een kind naar de bouwhoek. De wijziging gaat direct naar IndexedDB → het scherm
   ververst meteen, ook zonder internet.
2. Dezelfde wijziging komt als regel in een lokale **outbox**.
3. Een sync-lus stuurt de outbox naar Supabase zodra er verbinding is, en haalt op wat er elders
   is gewijzigd (alles met `updated_at` nieuwer dan de vorige keer).
4. Botsen twee wijzigingen op dezelfde regel, dan wint de nieuwste (`updated_at`). Bij 1 leerkracht
   per groep is dat in de praktijk vrijwel nooit aan de orde, en het logboek uit §5 kan niet botsen.

In de header komt een klein statuslampje: **synchroon** / **offline, X wijzigingen wachten** /
**bezig**. Zodat je in de klas ziet wat er aan de hand is zonder erover na te hoeven denken.

Verwijderen gebeurt "zacht" (`verwijderd_op` vullen in plaats van de regel weggooien), anders komt
een verwijderd kind bij de volgende sync van een ander apparaat weer terug.

---

## 7. Beveiliging en AVG

- **Inloggen** met e-mail + wachtwoord. Op het klasdevice log je één keer in; de sessie blijft
  staan. De bestaande **PIN blijft** en beschermt het beheer-scherm tegen kinderhanden — dat is
  precies de goede rolverdeling: login = wie ben je, PIN = mag je nu bij de instellingen.
- **Row Level Security** op elke tabel: je ziet alleen rijen waarvan `groep_id` in jouw
  `groep_leden` staat. Een schoolbeheerder ziet alle groepen van de eigen school. Dit wordt in de
  database afgedwongen, niet in de app — een fout in de frontend kan het niet omzeilen.
- **Rollen**: `leerkracht` (alles binnen de eigen groep), `assistent` (bord en planning ja, doelen
  en observaties alleen lezen), `ib` (observaties en monitor lezen over groepen heen),
  `beheerder` (groepen en gebruikers aanmaken).
- **Foto's**: één schakelaar per groep. Stand *lokaal* = foto's blijven in IndexedDB op het
  apparaat en verlaten de school niet (je laadt ze per apparaat opnieuw in). Stand *cloud* =
  Supabase Storage, EU-regio, achter login. Je kunt later omzetten zonder de app te verbouwen.
- **Voor je school**: zodra er persoonsgegevens naar Supabase gaan, wil je directie waarschijnlijk
  een verwerkersovereenkomst. Supabase heeft een standaard-DPA. Ik lever bij fase 1 een A4'tje met
  wat er precies wordt opgeslagen, waar, en hoe lang, zodat je dat kunt voorleggen.
- **Bewaartermijn**: aan het eind van het schooljaar archiveer je een groep. Observaties blijven,
  foto's worden opgeruimd. Eén knop.

---

## 8. Hosting en kosten — kan dit echt gratis?

**Ja, volledig gratis, mits de repo privé is en je de twee valkuilen hieronder afdekt.** De cijfers:

| Onderdeel | Keuze | Kosten | Marge bij jouw schaal |
|---|---|---|---|
| Code | GitHub, privé | €0 | onbeperkt |
| Frontend | **Cloudflare Pages** | €0 | onbeperkt verkeer, 500 builds/mnd |
| Database | Supabase free | €0 | 500 MB; jij zit rond 5-20 MB |
| Bestanden | Supabase Storage | €0 | 1 GB; 170 kinderfoto's ≈ 10 MB |
| Gebruikers | Supabase Auth | €0 | 50.000/mnd; jij hebt er 6 |
| Uitgaand verkeer | Supabase | €0 | 5 GB/mnd; met caching enkele tientallen MB |

Een rekensom voor de opslag: 6 groepen × ~28 kinderen = ~170 foto's. De app verkleint ze bij het
uploaden naar 256 px WebP, ~30 KB per stuk. Dat is ~5 MB, plus hoekfoto's. Van de 1 GB gebruik je
dus onder de 2%. De database groeit vooral door het gebeurtenissenlogboek: ruwweg 6 groepen × 28
kinderen × 3 keuzes per dag × 40 schoolweken × 5 dagen ≈ 400.000 regels per jaar, ~40 MB. Ook binnen
de 500 MB, en we ruimen logboekregels ouder dan twee schooljaren automatisch op.

**Waarom Cloudflare Pages en niet GitHub Pages?** GitHub Pages publiceert alleen gratis vanaf een
**publieke** repo; vanaf een privé-repo heb je GitHub Pro nodig ($4/mnd). Gezien §0 wil je die repo
privé. Cloudflare Pages (en Netlify, even goed) publiceert gratis vanaf een privé-repo, geeft je
automatisch HTTPS, en maakt bij elke branch een aparte voorbeeld-URL — handig om v2 te testen
terwijl v1 in de klas gewoon doordraait.

Een eigen domeinnaam is niet nodig (je krijgt `keuzebord.pages.dev`), maar kan voor ~€10 per jaar.

**Twee valkuilen, en de simpelste oplossing:**

*Valkuil 1 — het gratis Supabase-project pauzeert na 7 dagen zonder activiteit.* In de zomervakantie
gebeurt dat gegarandeerd. Twee opties:

- **Simpelst en gratis: een GitHub Action die elke 3 dagen één klein verzoek doet.** Tien regels
  YAML, kost je niets (Actions zijn gratis, en dit is een paar seconden per week). Kanttekening die
  je moet kennen: GitHub zet geplande workflows na 60 dagen zonder repo-activiteit zélf stil. Dus
  ergens midden in de zomervakantie eenmalig een commit maken, óf accepteren dat je in augustus
  één keer op "Restore" klikt.
- **Nog simpeler: niets doen.** Herstarten na de vakantie is één klik in het Supabase-dashboard en
  duurt een paar minuten. Je data blijft gewoon staan; pauzeren is geen wissen.

Mijn advies: bouw de Action (hij kost niets), maar reken erop dat je in augustus toch even kijkt.

*Valkuil 2 — geen automatische back-ups op de gratis laag.* Dat is echt zo, en dat is de reden om
dit serieus te nemen: observaties van een heel jaar wil je niet kwijt. Aanpak:

- Een knop **"Back-up downloaden"** in de app: alle data van je groep als één JSON-bestand naar je
  eigen laptop of de schoolomgeving. Plus een herinnering in beeld als je het langer dan een maand
  niet hebt gedaan.
- Optioneel daarnaast een wekelijkse GitHub Action die de observaties als CSV wegschrijft. Let op:
  dan staan kindgegevens in je repo — alleen doen als die privé is en je school akkoord is.
- Voor exportformaat: CSV per kind per domein, zodat je het ook in Excel kunt bekijken.

**Wanneer wordt het niet meer gratis?** Pas als je school garanties wil (uptime, automatische
back-ups, herstel naar een tijdstip). Dat is Supabase Pro, $25 per maand. Voor 6 kleutergroepen met
een goede eigen back-uproutine is dat niet nodig. Zolang je binnen deze schaal blijft, is er geen
verborgen moment waarop er ineens een rekening komt — Supabase zet een gratis project op pauze in
plaats van door te factureren.

---

## 9. Migratiepad vanaf de huidige app

Belangrijk: **de app in de klas mag geen dag stilliggen.** Het schooljaar begint nu.

1. `index.html` blijft ongewijzigd de draaiende v1. We raken hem niet aan, op één kleine
   toevoeging na: een knop **"Data exporteren"** die je hele `kb_v5`-blob als bestand opslaat.
   Dat is een paar regels en kan niets breken.
2. v2 wordt gebouwd onder `/v2/` in dezelfde repo, met een eigen voorbeeld-URL. Je kunt hem naast
   v1 uitproberen zonder risico.
3. In v2 komt **"Importeren uit oud keuzebord"**: je kiest het geëxporteerde bestand, en klassen,
   leerlingen, hoeken, borden, groepjes, werkjes en weekplanning worden omgezet naar het nieuwe
   model. De foto's uit de code (`GROEP_1C_LL`/`GROEP_1D_LL`) worden daarbij losse bestanden.
4. Werkt v2 een week goed in de klas, dan wordt v2 de hoofd-app en verhuist v1 naar `/v1/` als
   terugvaloptie.
5. Pas als je zeker bent: de foto's uit de git-geschiedenis wissen.

Je raakt op geen enkel moment data kwijt, en je kunt op elk moment terug naar v1.

---

## 10. Fasering en tijdsinschatting

De inschatting gaat uit van ongeveer één bouwsessie met mij per week, en 2-4 uur van jou per week
voor testen en beslissen. Ik noem per fase het aantal sessies (mijn werk) en jouw uren.

| Fase | Wat | Sessies | Jouw uren | Doorlooptijd |
|---|---|---|---|---|
| **0. Opruimen** | repo privé, Pages → Cloudflare, foto's uit de code, code opsplitsen in modules, PWA-basis, exportknop in v1 | 1-2 | 2-3 | **week 1** |
| **1. Multi-tenant basis** | Supabase-project, schema + RLS, inloggen, rollen, local-first sync, offline-wachtrij, importeren uit v1, foto-schakelaar | 3-4 | 6-8 | **week 2-4** |
| **2. Thema's, taken, doelen** | thematische bordsets, doelenbeheer (leeg opbouwbaar), taken ↔ doelen, geplande taken per groepje, weekbord met doelen centraal | 2-3 | 5-7 | **week 5-7** |
| **3. Observatie + statistiek** | apart scherm, afvinken per kind per doel, gebeurtenissenlogboek, samenspel/duur/favorieten, monitor-light per kind en periode | 2-3 | 6-8 | **week 8-10** |
| **4. Extra's** | timer per hoek + rustige cue, wachtrij bij volle hoek, signalering niet-gekozen doelen, printbaar weekoverzicht per kind | 1-2 | 3-5 | **week 11-12** |

**Totaal: ongeveer 3 maanden doorlooptijd, 22-31 uur van jouw kant**, grotendeels testen in de klas
in plaats van achter de computer.

Realistische kanttekeningen:

- Fase 1 is veruit de lastigste en de minst zichtbare. Er komt weken niets nieuws op het bord bij,
  terwijl er onder water het meeste verandert. Dat voelt traag; het is de investering die de rest
  mogelijk maakt.
- De doorlooptijd loopt uit zodra de AVG-afstemming met je directie langer duurt. Fase 0 en de
  bouw van fase 1 kunnen wel doorlopen; alleen het moment dat er échte kindgegevens naar Supabase
  gaan hangt ervan af. Met de foto-schakelaar op *lokaal* kun je zelfs beginnen zonder dat er ooit
  een foto de school verlaat.
- Fase 3 gaat het meeste werk kosten aan *jouw* kant, niet aan de mijne: doelen formuleren die je
  echt wilt volgen is denkwerk, geen typewerk.

**Op de later-lijst** (bewust niet in dit plan): voorlezen van activiteitnamen, groepsdoorbroken
werken, ouderportaal, dagplanner met kleurcodes zoals Digikeuzebord, geluidscue bij wisselmoment.
Allemaal later toe te voegen zonder verbouwing.

---

## 11. Wat ik van jou nodig heb om te beginnen

1. **Akkoord op dit plan**, of aangeven wat je anders wilt.
2. **Repo op privé zetten** — dat kan alleen jij, en het is punt §0.
3. **Is `kb_stable_v7.html` nieuwer dan de `index.html` in deze repo?** Deze versie heeft opslagsleutel
   `kb_v5` en de titel "Keuzebord – Het Kompas". Als jouw v7 verder is, deel dat bestand dan, dan
   bouw ik daarop verder.
4. **Voor fase 1**: een gratis Supabase-account (10 minuten, regio Frankfurt). Ik lever het complete
   SQL-script; jij plakt het en stuurt me de project-URL en de publieke `anon`-sleutel. Die sleutel
   is bedoeld om in de frontend te staan — de beveiliging zit in de RLS-regels, niet in geheimhouding
   van die sleutel. De `service_role`-sleutel deel je nooit, ook niet met mij.
