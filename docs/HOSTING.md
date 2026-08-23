# Hosting op Cloudflare Pages

Alles wat hier staat is gratis en blijft gratis bij onze schaal. Deze pagina is
het klikpad; de afweging waaróm Cloudflare staat in `PLAN.md` §8.

> Claude kan deze stappen niet voor je doen: `api.cloudflare.com` en
> `dash.cloudflare.com` zijn vanuit de ontwikkelomgeving niet bereikbaar. Een
> API-token delen helpt dus niet — dat zou alleen een geheim zijn dat je voor
> niets hebt weggegeven. Wat hier staat is voorbereid zodat het klikwerk klein is.

---

## Doe dit in deze volgorde

De volgorde is niet willekeurig. Stap 1 en 2 vóór stap 3, anders publiceer je de
kinderfoto's op nóg een adres.

### 1. Repository op privé

GitHub → `tomhooijer-svg/keuzebord` → **Settings** → **General** → helemaal naar
beneden → **Danger Zone** → **Change repository visibility** → *Make private*.

Zet in hetzelfde scherm **GitHub Pages** uit (Settings → Pages → Source: *None*).
Cloudflare neemt het publiceren over.

### 2. De fotokluis naar `main`

De branch `claude/digikeuzebord-pwa-expansion-askgwf` bevat de versie zonder
ingebouwde foto's. Die moet naar `main` voordat Cloudflare gaat publiceren.

Let op: na het samenvoegen heeft de app op het digibord eenmalig het
kluisbestand nodig — Beheer → Foto's → *Kluisbestand importeren*. Doe dat op elk
apparaat waar het bord draait. Zonder import krijgen kinderen een gekleurde
cirkel met hun beginletter; de app werkt gewoon door.

### 3. Cloudflare Pages koppelen

1. Maak een gratis account op cloudflare.com (e-mailadres, geen creditcard).
2. In het dashboard: **Workers & Pages** → **Create** → tabblad **Pages** →
   **Connect to Git**.
   *De bewoording in het dashboard verschuift wel eens; zoek op "Pages" en
   "Connect to Git".*
3. Autoriseer GitHub en kies de repo `keuzebord`. Geef alleen deze ene repo toegang.
4. Instellingen:

   | Veld | Waarde |
   |---|---|
   | Project name | `keuzebord` |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | *leeg laten* |
   | Build output directory | `/` |

5. **Save and Deploy.** Na ongeveer een minuut staat de app op
   `https://keuzebord.pages.dev`.

Vanaf nu publiceert elke push naar `main` automatisch. Elke andere branch krijgt
een eigen voorbeeld-URL, zodat nieuwe versies eerst getest kunnen worden zonder
dat de klas er last van heeft.

### 4. Zet er een slot op (aanbevolen, ook gratis)

Zolang er nog geen inlogscherm in de app zit, is `keuzebord.pages.dev` voor
iedereen bereikbaar die het adres raadt of ergens tegenkomt — inclusief de
klaslijsten. Cloudflare Access lost dat op tot er echte accounts zijn:

**Zero Trust** → **Access** → **Applications** → **Add an application** →
*Self-hosted* → domein `keuzebord.pages.dev` → policy: *Allow*, met als regel
**Emails** en daarin de zes leerkrachtadressen.

Wie het adres opent, krijgt een eenmalige code per mail en is daarna binnen.
Gratis tot 50 gebruikers. Dit vervalt zodra de app zijn eigen inlogscherm heeft,
maar tot die tijd is het de goedkoopste bescherming die er is.

---

## Wat er al klaarstaat in de repo

| Bestand | Waarvoor |
|---|---|
| `_headers` | Beveiligingsheaders, en `noindex` zodat Google de app niet opneemt |
| `robots.txt` | Zelfde reden, tweede slot |
| `.gitignore` | Houdt fotokluis-bestanden en back-ups buiten de repo |

Er is bewust geen buildstap: de app is statische HTML en JavaScript. Dat betekent
niets om te onderhouden en niets dat kan breken bij een deploy.

---

## Kosten

€0. Cloudflare Pages heeft op het gratis plan onbeperkt verkeer en 500 builds per
maand — wij zullen er hooguit een paar per week doen. Cloudflare Access is gratis
tot 50 gebruikers. Een eigen domeinnaam is niet nodig; wil je het toch, dan kost
dat ongeveer €10 per jaar.
