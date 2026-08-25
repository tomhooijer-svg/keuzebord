# De app online zetten

## Kan het gratis via GitHub?

Ja, maar met één belangrijke voorwaarde: **GitHub Pages is alleen gratis
op een publieke repository.** Op een privé-repo heb je GitHub Pro nodig
(zo'n vier euro per maand).

Publiek mag hier prima. Er staat namelijk geen enkel kindgegeven meer in
de app zelf — namen, foto's en planning leven allemaal in Supabase, achter
een login. Wat er in de repo staat is de code, en die mag iedereen zien.
De publieke sleutel van Supabase hoort ook gewoon in de browser thuis; wat
iemand daarmee mag zien bepalen de rechtenregels in de database.

## Maar deze repo mag niet zomaar publiek

In de geschiedenis van `tomhooijer-svg/keuzebord` zit nog het bestand
`keuzebordfinal2.html`: de allereerste versie die je uploadde, met echte
voornamen van kleuters en 62 ingebouwde foto's. Dat bestand is uit de map
weg, maar met één commando terug te halen — en bij een publieke repo geldt
dat voor iedereen.

De geschiedenis herschrijven kan, maar GitHub bewaart losgeraakte
bestanden nog een tijd, en dan gaat het over foto's van kleuters. Dat
risico hoef je niet te nemen als er een makkelijkere weg is.

## De makkelijkere weg: een nieuwe, schone repository

Eén commit, alleen de bestanden die de site nodig heeft, geen
geschiedenis. Deze repo blijft privé staan als archief.

`test/publieke-kopie.sh` maakt die kopie en controleert hem meteen:
staat er nog een spoor van het oude bestand in, en staan er echte
e-mailadressen in?

```sh
sh test/publieke-kopie.sh          # komt in /tmp/keuzebord-publiek
```

### Wat jij doet

1. Op github.com → **New repository** → naam `keuzebord-app`,
   **Public**, en zet *Add a README* uit.
2. Zeg hier hoe hij heet, dan zet ik de schone kopie erin.

### Daarna Pages aanzetten

In die nieuwe repo → **Settings** → **Pages** → bij *Source* kies
**Deploy from a branch**, branch `main`, map `/ (root)` → **Save**.

Na een minuut of twee staat de app op:

```
https://tomhooijer-svg.github.io/keuzebord-app/
```

Dat adres zet je op het digibord als startpagina.

## Nog één ding in Supabase

Supabase moet weten dat dat adres bij jou hoort, anders weigert het
inloggen. In Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://tomhooijer-svg.github.io/keuzebord-app/`
- bij **Redirect URLs** hetzelfde adres erbij

## Waarom niet Cloudflare?

Dat kan ook, en dan mag de repo privé blijven. Het zijn een paar klikken
meer en je krijgt er een tweede plek bij om in de gaten te houden. Als je
het toch liever zo doet, zeg het — dan schrijf ik die stappen uit.
