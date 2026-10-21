# Keuzebord

Een digitaal keuzebord voor kleutergroepen. Kinderen slepen hun eigen
pictogram naar een hoek; de hoek heeft een aantal plekken, en als het vol
is kun je in de rij. De leerkracht ziet achteraf waar een kind speelt,
hoe lang en met wie.

Gemaakt voor een Prowise digibord in de klas, dus: groot, met de vinger
te bedienen, en het blijft werken als de wifi wegvalt.

## Hoe het in elkaar zit

Gewone JavaScript, geen framework en **geen buildstap**. De bestanden die
je hier ziet zijn de bestanden die de browser inlaadt. Wie hier iets wil
veranderen heeft niets meer nodig dan een teksteditor.

| | |
|---|---|
| `bord.html` | het bord zelf, voor op het digibord |
| `beheer.html` | wat een leerkracht met haar eigen groep doet |
| `school.html` | wat een schoolbeheerder met de hele school doet |
| `platform.html` | scholen aanmaken en de aantallen bekijken |
| `inloggen.html` | inloggen en een school beginnen |
| `src/` | de code: bord, beheer, gegevens, synchronisatie |
| `supabase/schema.sql` | de database, de rechten en de functies |
| `test/` | de proeven |
| `docs/` | hoe het bedoeld is |

De app houdt zijn eigen kopie in de browser en praat die bij met de
server. Daardoor kiezen de kleuters door als het netwerk hapert, en
daardoor is synchronisatie het lastigste deel van deze code. In
`src/kb-sync.js` staat waarom het is zoals het is.

## Het draaien

Je hebt Postgres 16, node en een Chromium nodig.

```sh
npm install              # alleen voor de proeven; de app zelf heeft niets nodig
sh test/opzetten.sh      # database, nabootsing van Supabase, webserver
sh test/proefschool.sh   # een school met twee accounts en zes groepen
```

Daarna staat de app op `http://localhost:8899`. Inloggen met
`beheerder@mijnschool.nl` of `juf@mijnschool.nl`, wachtwoord
`proefproef`.

## De proeven

```sh
sh test/alles.sh         # alles, elke proef op een verse database
sh test/alles.sh scholen # één proef
```

Ze draaien tegen een echte Postgres met het echte schema, dus de
rechtenregels worden ook echt getoetst. Dat is geen luxe: de proeven
vingen in oktober drie fouten waardoor kinderen van het bord verdwenen.

## Waar je verder moet kijken

- `DECISIONS.md` — wat er besloten is en waarom. Begin hier.
- `docs/DATAMODEL.md` — hoe de gegevens van scholen gescheiden worden.
- `docs/ROLLEN.md` — wie wat mag, en waarom de leverancier de kinderen
  niet ziet.
- `docs/HOSTING-PRODUCT.md` — wat het kost bij 1, 10 en 50 scholen.

## Over de gegevens van kinderen

Van een kind bewaart dit systeem een voornaam, eventueel een pictogram,
en waar het heeft gespeeld. Geen achternaam, geen geboortedatum, geen
klasnummer. De school is daarvan de baas; wie dit draait komt er niet bij
tenzij de school de deur zelf openzet, en dat komt in een logboek dat de
school kan nakijken. In `docs/ROLLEN.md` staat hoe dat is afgedwongen en
wat het niet oplost.

Zet hier nooit echte namen of foto's in de code of in een proef. Daar is
de database voor.
