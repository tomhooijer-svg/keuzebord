# Hosting voor meerdere scholen

Wat het kost om dit als product te draaien, bij 1, 10 en 50 scholen.
Prijzen opgezocht op 21 oktober 2026; onderaan staat wat ik wel en niet
heb kunnen controleren.

Dit gaat over het product. De huidige opzet van jouw eigen school staat
in `HOSTING.md` en blijft gewoon staan.

## Eerst de vondst die het plan verandert

Jouw gedachte was: wildcard-DNS (`*.basisonderwijstools.nl`) naar één
frontend. Dat klopt — maar niet op Cloudflare **Pages**. In de
documentatie van Cloudflare staat het met zoveel woorden: *"If your
project is on Cloudflare Pages, wildcard custom domains are not
supported."* Een wildcard-CNAME erheen leggen geeft een 522. Je zou elk
subdomein met de hand als custom domain moeten toevoegen, en dat is
precies het handwerk dat je bij vijftig scholen niet wilt.

Wat wél kan is Cloudflare **Workers** met statische bestanden
(de opvolger van Pages; er is een officiële migratiegids). Daar zet je
twee routes op — `basisonderwijstools.nl/*` en
`*.basisonderwijstools.nl/*` — en die matchen elk subdomein vanzelf.
Verzoeken die een bestaand bestand opvragen worden als statisch bestand
geserveerd: *"requests to static assets are free and unlimited."* De
teller van 100.000 verzoeken per dag loopt alleen voor verzoeken die je
eigen code uitvoeren, en dat doen wij niet.

Proxyen van een wildcard-DNS-record kan intussen op elk Cloudflare-plan,
ook het gratis. Het certificaat dekt standaard één niveau diep
(`*.basisonderwijstools.nl`), en dieper hebben we niet nodig.

## Moet het eigenlijk wel met subdomeinen?

Even hardop, want het scheelt werk: het subdomein doet functioneel
niets. Wie je bent en bij welke school je hoort staat in je profiel in
de database, en daar kijkt de database zelf naar — dat is de regel uit
`DATAMODEL.md`. Eén adres voor iedereen, school volgt uit de login,
werkt precies zo goed en is vandaag al klaar.

Wat het subdomein wél geeft is hoe het voelt bij de school: *hun* adres
op het digibord, hun naam in de balk. Dat verkoopt. Mijn voorstel is
daarom: bouw op Workers, want daar kan allebei, en begin met één adres.
Het subdomein zetten we aan zodra de eerste school ervoor tekent.

## Drie opties

| | Frontend | Wildcard-subdomeinen | Commercieel gebruik | Kosten frontend |
|---|---|---|---|---|
| **A** | Cloudflare Workers | ja, via routes | geen verbod gevonden | $0, of $5/mnd op het betaalde plan |
| **B** | Netlify | alleen op een betaald plan | mag, doorverkopen van hosting niet | ±$19/mnd |
| **C** | Vercel | onduidelijk | **Hobby mag niet commercieel** | $20/mnd per plek |

GitHub Pages valt af: geen eigen subdomein per school en geen wildcard.

Bij alle drie is de database hetzelfde: **Supabase Pro, $25 per maand**.
Dat is per *organisatie*, niet per project — dus één gedeelde
installatie voor alle scholen kost één keer $25, of er nu één school op
zit of vijftig. Dat is precies waarom het datamodel met `school_id` de
moeite waard is.

Inbegrepen bij Pro: 8 GB databaseschijf, 100 GB bestandsopslag, 250 GB
uitgaand verkeer, 100.000 actieve gebruikers per maand, en $10 aan
rekentegoed (genoeg voor één Micro-machine). Daarboven: $0,125 per GB
schijf, $0,0213 per GB bestandsopslag, $0,09 per GB verkeer.

## Doorgerekend

Aannames per school: 6 groepen, 150 kinderen, 6 digiborden tegelijk aan,
5,5 uur per schooldag, 20 schooldagen per maand. Het bord haalt elke 10
seconden zijn groep op; foto's staan na één keer in de browser zelf.

| Per maand | 1 school | 10 scholen | 50 scholen |
|---|---|---|---|
| Supabase Pro | $25 | $25 | $25 |
| Rekenkracht boven het tegoed | $0 (Micro) | $5 (Small) | ±$50 (Medium) |
| Opslag en verkeer boven de bundel | $0 | $0 | $0–10 |
| Frontend (Cloudflare) | $0 | $0–5 | $5 |
| Domeinnaam | ±€1 | ±€1 | ±€1 |
| **Totaal** | **±$26** | **±$36** | **±$85** |

Bij vijftig scholen is dat $1,70 per school per maand. Daar kun je een
jaarbedrag omheen bouwen zonder dat de hosting ooit het probleem is.

De opslag is geen zorg. Per school zo'n 10 MB aan picto's en hoekfoto's;
vijftig scholen is 500 MB van de 100 GB. De database groeit vooral door
het gebeurtenissenlogboek: ruim 85.000 regels per school per schooljaar,
zo'n 22 MB. Bij vijftig scholen 1,1 GB per jaar, en omdat we na één
schooljaar alleen de totalen bewaren blijft het daaromheen hangen.

## Waar de rekening vandaan zou kunnen komen

Niet de opslag, maar het **ophalen**. Reken mee: elke 10 seconden, 5,5
uur lang, is 1.980 keer per dag. Bij 15 KB per keer is dat 30 MB per
bord per dag, 3,5 GB per school per maand, en bij vijftig scholen 175
GB. Dat past net binnen de 250 GB die bij Pro zit — met weinig lucht.

Zet je het ophaalritme op 5 seconden, dan verdubbelt dat naar 350 GB en
betaal je $9 per maand voor het meerdere. Niet dramatisch, maar het laat
zien waar de knop zit: **de rekening hangt aan hoe vaak het bord
ophaalt, niet aan hoeveel scholen er zijn.**

Twee dingen die dat getal flink omlaag brengen en die we toch al willen
bouwen: alleen ophalen wat veranderd is in plaats van de hele groep, en
minder vaak ophalen als er niemand aan het bord staat. Dat hoeft niet
nu, maar het hoort in het achterhoofd bij mijlpaal 2.

## Risico's

**Het gratis Supabase-plan pauzeert na zeven dagen stilte en heeft geen
back-ups.** Voor jouw eigen school is dat te overzien, voor een
betalende school niet. Zodra er één school betaalt, gaat het project
naar Pro. Dat is de enige vaste kostenpost die er moet komen vóór de
eerste euro binnen is.

**Alles staat bij één leverancier.** Valt Supabase uit, dan ligt elke
school stil. Dat is te dragen omdat het bord zonder wifi doorwerkt — de
kleuters merken het niet, de leerkracht ziet een lampje. Maar in je
afspraken met een school moet je geen uptime beloven die je niet zelf in
de hand hebt.

**De regio.** Dit valt of staat bij een EU-regio. Kijk in Supabase onder
Project Settings → General welke regio er staat. Staat er iets anders
dan Europa, dan is verhuizen het eerste wat er moet gebeuren, vóór er
een tweede school op komt — daarna is het een migratie met data van
andere mensen erin.

**Commercieel gebruik op een gratis plan.** Bij Vercel staat zwart op
wit dat Hobby niet commercieel mag. Bij Cloudflare heb ik geen verbod
kunnen vinden, maar ook geen expliciete toestemming; het sterkste wat ik
vond is iemand die de voorwaarden doornam en er niets over tegenkwam.
Zodra er geld binnenkomt is $5 per maand voor het betaalde plan het niet
waard om hierover na te denken.

## Aanbeveling

**Cloudflare Workers voor de frontend, Supabase Pro voor de database.**

Workers omdat het als enige van de drie wildcard-subdomeinen aankan
zonder per school handwerk, en omdat statische bestanden er gratis en
onbeperkt uitgaan. Supabase omdat we er al op draaien, omdat het per
organisatie afrekent (één keer $25 voor alle scholen) en omdat Postgres
met rechtenregels in de database precies is wat `ROLLEN.md` nodig heeft.

Volgorde: begin op het gratis plan met één adres zolang alleen jouw
school erop staat. Stap over naar Pro op de dag dat de eerste school
tekent, niet eerder. Zet de wildcard aan als de tweede school erbij
komt.

## Wat ik niet heb kunnen controleren

De prijspagina's van Supabase, Cloudflare, Netlify en Vercel zijn vanuit
mijn ontwikkelomgeving niet te bereiken. Alles hierboven komt uit
zoekresultaten, waarbij ik de officiële documentatie heb aangehouden
waar die in de resultaten zat.

Hard, uit officiële documentatie:

- Cloudflare Pages kan geen wildcard custom domains
  ([DNS-docs](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/))
- statische bestanden bij Workers zijn gratis en onbeperkt
  ([billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/))
- routepatronen `voorbeeld.nl/*` en `*.voorbeeld.nl/*`
  ([routes](https://developers.cloudflare.com/workers/configuration/routing/routes/))
- Supabase rekent per organisatie af, Pro $25, extra projecten vanaf $10
  ([org-based billing](https://supabase.com/docs/guides/platform/org-based-billing))
- verkeer $0,09 per GB onbemiddeld, $0,03 per GB uit de cache
  ([egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress))

Minder hard, controleer het zelf voor je tekent:

- de prijs van Medium-rekenkracht bij Supabase (ik reken met ±$60)
- of Cloudflare commercieel gebruik op het gratis plan toestaat
- de prijs van een .nl-domein (indicatie €10–15 per jaar)
- of Netlify wildcard-subdomeinen nog steeds alleen op een betaald plan
  doet — de bron daarvoor is ruim twee jaar oud
