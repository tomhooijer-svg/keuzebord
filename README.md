# Keuzebord

Digitaal keuzebord voor kleutergroepen. Drie omgevingen op één gedeelde
datalaag:

| Bestand | Voor wie | Wat je er doet |
|---|---|---|
| `bord.html` | de klas | kiezen, timers, wachtrij, werkplaats |
| `beheer.html` | de leerkracht | één groep: leerlingen, hoeken, doelen, taken, weekplan, observaties |
| `school.html` | de beheerder | alle groepen aanmaken en overzien |

`index.html` stuurt door naar het bord. `oud.html` is de vorige versie,
alleen als terugvaloptie.

## Werkwijze

Elke week staan er een of meer **taken** klaar die aan **doelen** hangen.
Het weekplan verdeelt alle kinderen over de dagen, zodat iedereen aan de
beurt komt — wie het langst niet is geweest staat vooraan. Ze werken eraan
in de **werkplaats**, een hoek op het bord met een beperkt aantal plekken.
Na afloop vink je per kind per doel af: nog niet, bezig of behaald.

Wat er op het bord gebeurt wordt geteld: welke hoek een kind vaak kiest,
met wie het daar zit, en welke hoeken blijven liggen. Dat staat bij
**Statistieken**, en gaat mee in het **verslag** dat je per kind kunt
afdrukken of als PDF bewaren voor een oudergesprek.

## Gegevens

Alles staat in Supabase, achter een login, gescheiden per school en per
groep — met rechtenregels in de database zelf, niet alleen in de app. Zie
`supabase/schema.sql`. Het apparaat houdt een kopie in de browser
(localStorage en IndexedDB), zodat het bord blijft werken als de
verbinding wegvalt; wat er verschilt reist bij de eerstvolgende
gelegenheid heen en weer.

**In deze repository staan geen namen, foto's of planning van kinderen.**

De doelenlijst in `data/` komt uit de leer- en ontwikkelingslijnen jonge
kind, geordend per beheersingsniveau.

## Draaien

Statische bestanden, geen buildstap. Lokaal:

```
python3 -m http.server 8000
```

en open `http://localhost:8000`. Dubbelklikken op het bestand werkt maar
half: browsers blokkeren dan de opslag die de fotokluis gebruikt.
