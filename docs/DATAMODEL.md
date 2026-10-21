# Datamodel voor meerdere scholen

Dit document beschrijft hoe de gegevens gescheiden worden als meerdere
scholen dezelfde installatie gebruiken. Nog geen code — eerst moet dit
kloppen.

## Hoe het nu werkt, en waar het wringt

Vandaag hangt alles aan de **groep**. Een bord hoort bij een groep, een
groep bij een school. De rechten lopen via één functie, `mag_bij_groep()`,
die drie dingen tegelijk nakijkt: hoort deze groep bij mijn school, en ben
ik schoolbeheerder of zit ik in deze groep.

Voor tabellen die geen `groep_id` hebben wordt dat een ketting. Zo ziet de
regel voor plaatsingen eruit:

    exists (select 1 from borden b
            where b.id = bord_id and mag_bij_groep(b.groep_id))

Dat werkt, maar er zitten twee problemen in zodra er geld mee gemoeid is.

**Eén: je kunt het niet in één oogopslag nalopen.** De scheiding tussen
twee scholen hangt aan een ketting van drie schakels. Eén verkeerd
geschreven regel en de gegevens van school A komen bij school B. Dat is
geen theoretisch risico: de regel voor `groep_verzoeken` was in oktober
fout, en die fout was alleen zichtbaar doordat een proef omviel.

**Twee: wat je niet opschrijft, kun je niet afdwingen.** De school staat
nergens in de rij van een plaatsing. Hij is af te leiden, maar afleiden is
iets anders dan vastleggen.

## Voorstel: de school staat in elke rij

Elke tabel die bij een school hoort, krijgt `school_id` als eigen kolom —
ook waar die nu via de groep loopt: `leerlingen`, `borden`, `bord_hoeken`,
`plaatsingen`, `wachtrij`, `gebeurtenissen`.

Dat is dubbelop, en dat is de bedoeling. De regel wordt overal dezelfde
korte vergelijking:

    school_id = mijn_school()

Eén regel, geen ketting, voor elke tabel hetzelfde. Een fout erin valt op
omdat hij afwijkt van alle andere. En hij is sneller, want de database
hoeft niet drie tabellen langs om te weten of jij deze rij mag zien.

De rol binnen de school (leerkracht of schoolbeheerder) blijft bepalen
wélke groepen je ziet. Dat is een tweede vraag en die blijft lopen zoals
hij loopt.

**De app hoeft `school_id` niet mee te sturen.** Een trigger in de
database vult hem bij het opslaan vanuit de ouderrij. Zo kan de app zich
niet vergissen, en ook niet liegen.

## Het subdomein

`scholen` krijgt een kolom `subdomein` (uniek, kleine letters). De app
leest het subdomein uit het adres, zoekt de school erbij, en houdt die
vast zolang je ingelogd bent. Een onbekend subdomein geeft een nette
404-pagina.

**Let op: het subdomein is gemak, geen beveiliging.** Wie je bent en wat
je mag staat in je profiel in de database, en daar kijkt de database zelf
naar. Zou de scheiding aan het subdomein hangen, dan kwam je bij een
andere school door het adres te veranderen. Het subdomein zorgt alleen
dat je op de goede plek binnenkomt en dat het logo klopt.

## Modules per school aan- en uitzetten

`scholen` krijgt een kolom `modules` (json), bijvoorbeeld:

    { "planbord": false, "statistieken": true, "databank": true }

Daarmee kan het planbord blijven bestaan terwijl het voor nieuwe scholen
uitstaat, en kun je later pakketten maken zonder de code te splitsen.

## Wat dit met de bestaande gegevens doet

Een migratie in drie stappen, zonder verlies en terug te draaien:

1. de kolom toevoegen, leeg toegestaan;
2. vullen vanuit de ouderrij (`update ... from ...`);
3. verplicht maken en de regels omzetten.

Pas daarna gaan de oude kettingregels weg. Tussen stap 2 en 3 gelden ze
allebei, dus er is geen moment waarop er niets staat.

## Het minimum dat we van kinderen bewaren

Voor de statistieken die je wilt — waar speelt een kind, hoe lang, en met
wie — is dit genoeg, en dus is dit het maximum:

| Wat | Waar | Waarom nodig |
|---|---|---|
| voornaam of roepnaam | `leerlingen` | het kind moet zichzelf herkennen op het bord |
| picto | `media` | hetzelfde, voor wie nog niet leest |
| kind, hoek, moment, soort | `gebeurtenissen` | waar, hoe lang, en met wie |

Verder niets. Geen achternaam, geen geboortedatum, geen klasnummer. "Met
wie speelt dit kind" hoeft nergens apart te staan: dat volgt uit twee
kinderen die in dezelfde hoek dezelfde tijd overlappen, en dat rekent de
statistiek zelf uit.

De foto is optioneel. Een gekleurde cirkel met de beginletter werkt ook,
en dat is de veiligste stand voor een school die daar nog niets over heeft
afgesproken.

**Nog te beslissen:** hoe lang het speelgedrag bewaard blijft. Een
schooljaar is genoeg voor een oudergesprek; daarna zijn totalen per kind
per hoek voldoende en kunnen de losse momenten weg. Dat scheelt opslag én
het is wat de AVG bedoelt met niet langer bewaren dan nodig.
