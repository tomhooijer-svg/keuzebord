# Keuzebord op Cloud86: app.pixelplein.nl

Het keuzebord verhuist van `tomhooijer-svg.github.io/keuzebord-app/` naar
**`https://app.pixelplein.nl/`**, op je Cloud86-pakket (Webhosting Start,
Plesk). Het oude adres blijft werken tot je zelf de knop omzet (stap 8).
Planbord blijft op GitHub Pages staan.

Hoe het werkt: Plesk haalt de bestanden zelf op uit de publieke repo
`tomhooijer-svg/keuzebord-app`. Dat is dezelfde repo waar GitHub Pages uit
leest. Er is geen bouwstap: wat in de repo staat, staat online.

Je hebt nodig: je inlog bij Mijn Cloud86, je inlog bij TransIP en je inlog
bij Supabase. Reken op een half uur werk, en daarna wachten op DNS en SSL
(meestal binnen een uur, soms langer).

---

## 1. Subdomein aanmaken in Plesk

1. Ga naar Mijn Cloud86 → **Mijn Diensten** → drie puntjes achter je pakket
   → **Bekijk details** → onder *Webhosting beheren* op
   **Websites & domeinen**. Je bent nu in Plesk.
2. Klik bovenin op **Subdomein toevoegen**.
3. Typ bij de naam: `app` (het domein `pixelplein.nl` staat er al achter).
4. Laat de **hoofdmap** (documentmap) staan zoals Plesk hem voorstelt. Schrijf
   op welke map het is, bijv. `/app.pixelplein.nl`. Die heb je in stap 2 nodig.
5. Klik **OK**.

Plesk zet er een eigen welkomstpagina in. Die gaat in stap 2 weg.

Bron: [Plesk: Subdomein of Domeinalias toevoegen](https://support.cloud86.io/hc/nl/articles/360010038557-Plesk-Subdomein-of-Domeinalias-toevoegen)

## 2. Git koppelen aan de repo keuzebord-app

1. Open in Plesk eerst **Bestanden**, ga naar de map van stap 1.4 en
   verwijder wat er in staat (de welkomstpagina van Plesk). De map zelf laat
   je staan.
2. Ga terug naar **Websites & domeinen**, klik bij `app.pixelplein.nl` op
   **Git**.
3. Kies **Externe Git-hosting** (remote repository, zoals GitHub).
4. Repository-URL:
   ```
   https://github.com/tomhooijer-svg/keuzebord-app.git
   ```
   De repo is publiek, dus je hoeft geen SSH-sleutel of wachtwoord in te
   vullen. Plesk leest alleen; het kan niets terugschrijven naar GitHub.
5. Tak (branch): `main`.
6. **Implementatiemodus**: kies **Automatisch** (bij elke keer ophalen
   worden de bestanden meteen neergezet).
7. **Implementatiepad**: de map uit stap 1.4 (bijv. `/app.pixelplein.nl`).
   Niet `httpdocs`, dat is de map van de website.
8. **Implementatieacties** (deploy actions): leeg laten. Er hoeft niets
   gebouwd te worden.
9. Klik **OK**. Plesk haalt de repo op en zet de bestanden in de map.

Controle: in **Bestanden** staan nu o.a. `index.html`, `bord.html`,
`diagnose.html`, `.htaccess` en de mappen `src` en `stijl`.

Bron: [FTP: Handleiding, alinea "FTP Alternatieven"](https://support.cloud86.io/hc/nl/articles/17937695718173-FTP-Handleiding) ("Klik hiervoor op git bij het domein").

## 3. DNS-record bij TransIP

Het domein `pixelplein.nl` staat bij TransIP en blijft daar. Je voegt één
record toe:

1. Zoek het **IP-adres** van je Cloud86-pakket: het staat in de welkomstmail
   van Cloud86, en in Plesk bij **Websites & domeinen** (bij de
   hostinggegevens van het domein). Het is hetzelfde IP-adres als dat van
   `pixelplein.nl` zelf, als de website ook bij Cloud86 staat.
2. Log in bij TransIP → **Domeinen** → `pixelplein.nl` → **DNS**.
3. Voeg een record toe:

   | Naam | Type | Waarde |
   |---|---|---|
   | `app` | **A** | het IP-adres uit 3.1 |

   TTL mag op de standaard blijven.
4. Heeft Cloud86 je ook een IPv6-adres gegeven? Voeg dan ook een
   **AAAA**-record `app` toe met dat adres. Zo niet: niets doen.
5. Opslaan. Raak de andere records (`@`, `www`, MX, TXT) niet aan.

Wachten: meestal binnen een uur. Controle: open `http://app.pixelplein.nl`.
Zie je het keuzebord (of een melding over een certificaat)? Dan werkt DNS.

## 4. SSL (https) aanzetten

Plesk vraagt bij een nieuw subdomein zelf een gratis Let's Encrypt-
certificaat aan. Dat lukt pas als stap 3 werkt, en kan tot 4 uur duren.

1. Wil je niet wachten: Plesk → `app.pixelplein.nl` → **SSL/TLS-
   certificaten** (of **SSL It!**) → **Let's Encrypt** → aanvragen voor
   `app.pixelplein.nl`.
2. Zet daarna in hetzelfde scherm (of bij **Hosting-instellingen**)
   **Permanente SEO-veilige 301-omleiding van HTTP naar HTTPS** aan.

Controle: `https://app.pixelplein.nl` opent met een slotje, en
`http://app.pixelplein.nl` springt vanzelf naar https.

## 5. Supabase: het nieuwe adres toestaan

Ik heb in Supabase niets veranderd. Dit doe je zelf, in het dashboard van
project `zlmunykkhooscnxbfvvg` → **Authentication** → **URL Configuration**:

1. **Redirect URLs** → **Add URL**:
   ```
   https://app.pixelplein.nl/**
   ```
   Laat de bestaande regel voor `https://tomhooijer-svg.github.io/...`
   staan. Die heb je nodig zolang het oude adres in gebruik is.
2. **Site URL**: laat die **nu nog** op het oude adres staan. Pas bij stap 8
   zet je hem op `https://app.pixelplein.nl/`.

Waarom: gewoon inloggen (gebruikersnaam + wachtwoord) werkt op elk adres.
De Redirect URLs gelden alleen voor links in mails van Supabase (inloglink,
wachtwoord vergeten). Die wijzen naar het adres waar de leerkracht op dat
moment werkt, en Supabase weigert een adres dat niet in de lijst staat.

**CORS hoef je niet in te stellen.** Supabase laat de database en de
opslag van elk adres aanspreken. De beveiliging zit in de sleutel en de
regels in de database (RLS), niet in het adres.

Je hoeft hiervoor nooit de `service_role`-sleutel te gebruiken, en die hoort
ook nergens in de app.

## 6. Controleren dat alles werkt

1. Open `https://app.pixelplein.nl/diagnose.html`. Kijk bij de versie: die
   moet hetzelfde zijn als op
   `https://tomhooijer-svg.github.io/keuzebord-app/diagnose.html`.
2. Open `https://app.pixelplein.nl/demo.html` en speel even: picto
   verplaatsen, hoek kiezen.
3. Open `https://app.pixelplein.nl/inloggen.html` en log in met een
   **nep-account** van de proefschool. Open het bord en verplaats een picto.
4. Open hetzelfde bord op het oude adres (andere tab), of op een ander
   apparaat. Na hooguit 30 seconden staat de picto daar ook op de nieuwe
   plek.
5. Typ `https://app.pixelplein.nl/bestaatniet`. Je hoort de pagina "Die
   pagina is er niet" te zien, met een knop terug.

Gaat iets mis? Stuur Claude de tekst onder **Kopieer deze tekst** op
`diagnose.html`.

## 7. Na elke nieuwe uitgave: versie ophalen

Claude publiceert een nieuwe versie naar de repo `keuzebord-app` (via
`test/uitgeven.sh`). GitHub Pages pakt hem vanzelf op; Plesk niet. Dus:

1. Plesk → `app.pixelplein.nl` → **Git**.
2. Klik **Nu ophalen** (*Pull now* / *Updates ophalen*). Omdat de modus op
   Automatisch staat, zet Plesk de bestanden meteen neer.
3. Controle: `https://app.pixelplein.nl/diagnose.html` toont de nieuwe
   versie.

Wil je dat dit vanzelf gaat? Plesk toont bij Git een **webhook-URL**. Die
kun je in GitHub bij `keuzebord-app` → **Settings** → **Webhooks** toevoegen
(alleen het *push*-event). Dan haalt Plesk zelf op na elke uitgave. Dat
mag, maar het hoeft niet.

## 8. Overstappen (pas als stap 6 helemaal goed is)

Zeg tegen Claude: **"zet de verhuizing aan"**. Claude zet dan in
`test/uitgeven.sh` de regel `VERHUISD=true` en publiceert. Daarmee:

- is `app.pixelplein.nl` het hoofdadres van het keuzebord;
- krijgt iedereen die nog op het oude adres werkt onderaan een melding:
  *"Keuzebord verhuist naar app.pixelplein.nl."* Staat er op dat apparaat
  nog iets dat niet naar de server is gestuurd, dan zegt de melding dat, en
  pas als alles verstuurd is verschijnt de knop naar het nieuwe adres. Op
  het bord zelf staat geen knop (kleuters), alleen de tekst.

Daarna doe jij:

1. Stap 7 (nieuwe versie ophalen in Plesk).
2. Supabase → **Site URL** → `https://app.pixelplein.nl/`.
3. Op elk digibord en elke iPad: het oude adres openen, wachten tot de
   melding zegt dat alles verstuurd is, dan het nieuwe adres als
   startpagina of app zetten en **opnieuw inloggen**. Het nieuwe adres is
   voor de browser een andere website: inloggen en de opslag gaan niet
   vanzelf mee. Wat in de demo stond gaat ook niet mee; dat is nepdata.
4. Laat de website-knop "Inloggen" naar `https://app.pixelplein.nl/inloggen.html`
   wijzen (aparte opdracht voor de website-bouwer, `website/tools/brand.py`).

Zijn alle apparaten over, dan kan GitHub Pages voor `keuzebord-app` uit
(Settings → Pages). Dat besluiten we dan apart; de repo zelf blijft nodig,
want Plesk haalt daar de bestanden uit.

## Wat er technisch voor is gedaan

- De app heeft geen vast adres in de code. Alle adressen staan op één plek
  (`test/uitgeven.sh`, en daaruit `src/kb-app.js`), met het oude en het
  nieuwe adres allebei als "eigen adres" van het keuzebord.
- `.htaccess` voor Apache: dezelfde veiligheidskoppen als `_headers`, de
  app niet uit de cache, `noindex` voor zoekmachines, een eigen 404-pagina,
  en `.sql`- en `.md`-bestanden niet op te vragen.
- `src/kb-verhuizing.js`: de melding van stap 8.
