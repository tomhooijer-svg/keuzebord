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

## De school staat in elke rij — gebouwd

Elke tabel die bij een school hoort heeft `school_id` als eigen kolom
gekregen, ook waar die via de groep liep: `leerlingen`, `borden`,
`groep_doelen`, `taken`, `weekplannen`, `observaties`, `gebeurtenissen`,
`bord_hoeken`, `plaatsingen`, `wachtrij`, `thema_hoeken`, `thema_doelen`,
`taak_doelen`, `week_doelen`, `weekplan_taken` en `taak_toewijzing`. De
tabellen die onderaan een ketting hingen kregen er `groep_id` bij, zodat
ook de groep in de rij zelf staat.

Dat is dubbelop, en dat is de bedoeling.

**Eén ding klopte niet aan het voorstel hierboven.** Er stond dat de
regel overal `school_id = mijn_school()` zou worden. Dat is te kort: dan
ziet een leerkracht alles van haar school in plaats van alleen haar eigen
groepen. De school is de ene grens, de groep is de andere, en allebei
moeten ze in de regel staan. Het zijn dus twee vormen geworden:

    van_mijn_school(school_id) and mag_bij_groep(groep_id)

en voor wat van de hele school mag zijn — een thema dat aan geen groep
hangt:

    van_mijn_school(school_id)
      and (groep_id is null or mag_bij_groep(groep_id))

Geen ketting meer, geen tabel die zijn eigen regel heeft, en allebei de
kolommen staan in de rij zelf. Wijkt er één regel af van de andere, dan
zie je dat nu meteen.

Dat de twee helften elkaar overlappen — `mag_bij_groep()` kijkt zelf ook
naar de school — is met opzet. Klopt de school in een rij niet met de
groep, dan valt die rij buiten allebei en wordt hij onzichtbaar in plaats
van zichtbaar voor de verkeerde. Dat is de goede kant om fout te gaan.

**De app hoeft `school_id` niet mee te sturen.** Een trigger in de
database vult hem bij het opslaan vanuit de ouderrij. Zo kan de app zich
niet vergissen, en ook niet liegen — stuurt ze er toch een mee, dan
overschrijft de trigger hem. Daar staat een proef op.

Daardoor hoefde er aan de synchronisatie niets te veranderen: die bouwt
haar rijen uit een vaste lijst kolommen en vergelijkt alleen haar eigen
momentopnamen, dus de nieuwe kolommen komen er niet in voor.

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

De migratie staat in `supabase/schema.sql` zelf en doet drie dingen,
in deze volgorde: de kolom toevoegen (leeg toegestaan), vullen vanuit de
ouderrij, en dan per tabel apart verplicht maken. Dat laatste per tabel,
zodat één achtergebleven rij één tabel tegenhoudt en niet het hele
bestand; blijft er iets over, dan zegt het script welke tabel.

Het mag zo vaak draaien als je wilt. `test/verhuizing.test.js` doet
precies dat: een school vullen, de kolommen weer leeghalen zoals ze vóór
de verhuizing waren, het schema opnieuw draaien, en nakijken of er daarna
precies hetzelfde staat. Die proef controleert ook het geval dat het erg
maakt — met lege kolommen ziet de beheerder níéts meer, en dat is voor
een leerkracht niet te onderscheiden van gegevens die kwijt zijn.

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

**Besloten:** het speelgedrag blijft één schooljaar bewaard. Dat is
genoeg voor een oudergesprek in juni; daarna blijven alleen de totalen
per kind per hoek staan en gaan de losse momenten weg. Dat scheelt opslag
én het is wat de AVG bedoelt met niet langer bewaren dan nodig.
