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

## Gegevens

Alle gegevens staan in de browser van het apparaat zelf (localStorage en
IndexedDB). **Er staat niets in deze repository en niets op een server.**
Foto's van kinderen leven in een aparte fotokluis op het apparaat en
worden uitgewisseld via een los bestand, bij voorkeur met een wachtwoord
versleuteld.

De doelenlijst in `data/` komt uit de leer- en ontwikkelingslijnen jonge
kind, geordend per beheersingsniveau.

## Draaien

Statische bestanden, geen buildstap. Lokaal:

```
python3 -m http.server 8000
```

en open `http://localhost:8000`. Dubbelklikken op het bestand werkt maar
half: browsers blokkeren dan de opslag die de fotokluis gebruikt.
