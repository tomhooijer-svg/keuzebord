# Keuzen

Kort wat we besloten hebben en waarom. Zo hoeven we het niet opnieuw te
bespreken, en weet een volgende sessie waarom iets is zoals het is.

Nieuwe keuzen onderaan toevoegen, met datum. Draaien we iets terug, dan
blijft de oude regel staan met de reden erbij — een doorgestreepte keuze
zegt meer dan een verdwenen keuze.

---

## 2026-10-21 · Doorbouwen, niet opnieuw beginnen

Het keuzebord wordt een product voor meerdere scholen. De vraag was of we
daarvoor opnieuw moeten beginnen.

Nee. Alles wat erbij moet — subdomeinen, een platformbeheerder, de
hoeken-databank, meekijken — komt *bovenop* wat er staat en niet in
plaats daarvan. En het duurste wat we zouden weggooien zijn de 33
proeven: die vingen in oktober drie fouten waardoor kinderen van het bord
verdwenen. Zonder dat vangnet vinden we dezelfde fouten opnieuw, maar dan
bij een school die ervoor betaalt.

## 2026-10-21 · Het bord blijft werken zonder wifi

Het bord houdt zijn eigen kopie in de browser en praat die bij met de
server. Valt de wifi weg midden in een keuzemoment, dan kiezen de
kleuters gewoon door.

Dat heeft een prijs en die nemen we bewust: dit is de bron van de
moeilijkste fouten die we hebben gehad (werk dat verdween omdat twee
kanten tegelijk iets wisten), en het maakt "meekijken en bedienen" van
een bord op afstand ingewikkeld — wat jij ziet kan net iets anders zijn
dan wat er op het digibord staat. Bij het ontwerp van het meekijken
moeten we daar een antwoord op geven; het is geen detail dat we later
even oplossen.

Overwogen en niet gekozen: rechtstreeks met de server praten. Dat maakt
meekijken bijna gratis en haalt een hele klasse fouten weg, maar laat het
bord stilstaan voor de klas zodra het netwerk hapert. Een klas kan niet
wachten op de wifi.

## 2026-10-21 · Het planbord gaat naar een tag én achter een schakelaar

Buiten scope, maar niet weg. De code blijft staan en gaat per school uit;
zo kan er later een duurder pakket van gemaakt worden. Dit kost bijna
niets omdat de knip tussen bord en planbord al in `test/uitgeven.sh` zit.

## 2026-10-21 · Het product krijgt een verse repo

In de geschiedenis van `tomhooijer-svg/keuzebord` staan voornamen en
foto's van echte kleuters. Zolang dat zo is mag die repo nooit openbaar
worden of gedeeld met een meebouwer of koper — ook niet als de huidige
bestanden schoon zijn, want oude commits blijven bestaan.

Het product begint daarom in een nieuwe repo zonder die geschiedenis.
Deze blijft bestaan als Toms eigen werkplaats.

Overwogen en niet gekozen: de geschiedenis van deze repo herschrijven.
Dat kan, maar het is één keer goed opletten en kopieën die elders al
staan worden er niet schoner van.

## 2026-10-21 · De hoeken-databank is van jou én van de school

Tom onderhoudt een basisdatabank die elke school ziet. Daarnaast kan een
school eigen hoeken maken die alleen van hen zijn. Een leerkracht
kopieert uit allebei naar het eigen bord.

Dit is wat een school koopt: meteen bruikbaar, zonder eerst zelf twintig
platen te zoeken. Alleen een databank per school betekent dat een nieuwe
school begint met een leeg scherm, en dat is het slechtste eerste
kwartier dat je een koper kunt geven.

## 2026-10-21 · Platformbeheerder wordt een echte rol in de database

Niet "Tom doet het wel even in Supabase". Een rol met rechten over alle
scholen, zodat meekijken, een school aanmaken en een wachtwoord
terugzetten gewoon in de app kunnen — en zodat elke handeling in het
auditlog komt. Buiten de app om is er geen auditlog, en dan weet je bij
een vraag van een school niet wat er gebeurd is.

*Bijgesteld op 2026-10-21: de rol blijft, maar zonder inhoud. Zie
hieronder.*

## 2026-10-21 · Speelgedrag blijft één schooljaar bewaard

De losse momenten (welk kind, welke hoek, wanneer) gaan na een schooljaar
weg; daarna blijven alleen de totalen per kind per hoek staan. Genoeg
voor een oudergesprek in juni over het hele jaar, en daarna bewaren we
niet langer dan nodig.

## 2026-10-21 · Bij een botsing wint het digibord

Kijkt een beheerder mee en verplaatst die een kind terwijl het bord
offline hetzelfde kind al had verplaatst, dan wint het bord in de klas.
Daar staat het kind immers echt. De beheerder krijgt te zien dat zijn
handeling is ingehaald.

Dit volgt uit de keuze dat het bord zonder wifi doorwerkt: er is altijd
een moment waarop twee kanten iets anders weten, en dan moet van tevoren
vastliggen wie er wint. De andere kant op zou betekenen dat het plaatje
van een kleuter zonder aanleiding verspringt terwijl het kind ernaar kijkt.

## 2026-10-21 · De platformbeheerder ziet geen kinderen

Eerst stond er dat de platformbeheerder alles van alle scholen kan zien.
Dat is teruggebracht: hij beheert scholen, accounts, wachtwoorden en de
basisdatabank, en ziet per school alleen getallen (aantal groepen,
aantal leerlingen, opslag). Leerlingen, borden en statistieken niet.

Reden: de school is verwerkingsverantwoordelijke, de leverancier is
verwerker. Toegang van de leverancier hoort niet verder te gaan dan de
dienst nodig heeft, en om een school aan te maken of een wachtwoord
terug te zetten hoef je geen kind te zien. Een beheerdersknop die alles
opent is bovendien het eerste waar een schoolbestuur naar vraagt als het
de Model Verwerkersovereenkomst naast het product legt.

Het is ook eigenbelang: wat je niet kunt zien, kan niet uitlekken en
hoeft niet verdedigd te worden.

Meekijken blijft mogelijk, maar de schoolbeheerder zet het zelf aan, het
loopt na vier uur vanzelf af, het is zichtbaar zolang het aanstaat en
het komt in het auditlog dat de school zelf kan nakijken. In de
rechtenregels betekent dit dat de rol `platformbeheerder` alleen de
beheertabellen verruimt; op de inhoudstabellen telt uitsluitend of een
school de deur heeft opengezet.

Niet gekozen: helemaal geen toegang voor de leverancier. Dan kun je een
school die belt met een kapot bord niet helpen, en belooft de tijdelijke
variant precies genoeg.

Namen en e-mailadressen van leerkrachten blijven wel zichtbaar — zonder
dat kun je geen account aanmaken. Volwassenen met een arbeidsrelatie,
geen kleuters.

## 2026-10-21 · Cloudflare Workers voor de frontend, niet Pages

Het plan was wildcard-DNS naar Cloudflare Pages. Dat kan niet: in de
documentatie van Cloudflare staat dat Pages geen wildcard custom domains
ondersteunt. Elk subdomein met de hand toevoegen is bij vijftig scholen
geen optie.

Workers met statische bestanden kan het wel, via de routes
`domein.nl/*` en `*.domein.nl/*`, en verzoeken om een bestaand bestand
zijn daar gratis en onbeperkt. Het is bovendien de weg waar Cloudflare
Pages zelf naartoe migreert.

Niet gekozen: Netlify (wildcard alleen op een betaald plan) en Vercel
(het gratis plan mag niet commercieel). GitHub Pages valt af omdat er
geen subdomein per school op kan.

## 2026-10-21 · Eén gedeelde Supabase-organisatie, Pro zodra er betaald wordt

Supabase rekent per organisatie af, niet per project: $25 per maand,
of er nu één school op zit of vijftig. Dat maakt de gedeelde installatie
met `school_id` ook financieel de juiste keuze — een project per school
zou vanaf de tweede school geld gaan kosten.

Zolang alleen Toms eigen school erop staat blijft het gratis plan
genoeg. Op de dag dat de eerste school tekent gaat het naar Pro, want
het gratis plan pauzeert na zeven dagen stilte en heeft geen back-ups.
Dat is de enige vaste kostenpost die vóór de eerste euro omzet moet
worden gemaakt.

Doorgerekend komt het uit op ±$26 per maand bij één school, ±$36 bij
tien en ±$85 bij vijftig. Bij vijftig scholen is dat $1,70 per school.

## 2026-10-21 · Het ophaalritme is de kostenknop, niet het aantal scholen

Uitgerekend bij het hostingvoorstel: het uitgaand verkeer wordt bepaald
door hoe vaak een bord zijn groep ophaalt. Elke 10 seconden is bij
vijftig scholen 175 GB per maand — net binnen de 250 GB van Pro. Elke 5
seconden is 350 GB en kost $9 per maand extra.

Gevolg voor mijlpaal 2: alleen ophalen wat veranderd is in plaats van de
hele groep, en langzamer ophalen als er niemand aan het bord staat. Niet
nu bouwen, wel nu weten.

## 2026-10-21 · Toch inloggen met een e-mailadres

Je wilde inloggen met gebruikersnaam en wachtwoord, zonder e-mail. Je
vroeg mijn advies en dat gaat de andere kant op: doe het met een
e-mailadres. Twee redenen, en de eerste is de zwaarste.

**Zonder e-mail bestaat wachtwoordherstel niet meer.** Elk vergeten
wachtwoord wordt dan door een mens teruggezet, meestal telefonisch of in
de gang. Dat is precies het gat waar social engineering doorheen loopt:
"hoi, ik ben de nieuwe juf van 1B, ik ben mijn wachtwoord kwijt." Bij één
school is dat te overzien. Bij vijftig scholen is het de makkelijkste
manier om binnen te komen, en het is een gat dat jij niet kunt zien
dichtzitten. Met een adres gaat herstel via een link naar een postvak dat
de school zelf beheert.

**Zonder e-mail kan er later geen tweede stap bij.** Inloggen in twee
stappen voor beheerders is waar het Normenkader IBP naartoe gaat. Met een
adres is dat straks een schakelaar; zonder is het een verbouwing.

De AVG pleit niet tegen. Een werkadres van een leerkracht heeft de school
toch al; het gaat over een volwassene met een arbeidsrelatie, niet over
een kind. En een gebruikersnaam is net zo goed een persoonsgegeven —
"geen e-mail" haalt je niet buiten de AVG, het haalt alleen het
herstelmechanisme weg.

Wat je oorspronkelijke wens oploste, lossen we anders op: niemand hoeft
elke ochtend een lang adres in te typen, want het bord blijft ingelogd en
de pincode houdt kinderhanden uit het beheer. Dat werkt nu al zo.

Niet dichtgetimmerd: Supabase controleert niet of een adres bestaat. Een
school waar leerkrachten echt geen werkadres hebben kan verzonnen
adressen krijgen die de schoolbeheerder zelf beheert. Dan vervalt herstel
per mail voor die accounts. Een uitzondering, niet de standaard.

## 2026-10-21 · Geen subdomeinen en geen hostingkeuze, nog niet

Er is nog geen school in beeld. Mijlpaal 2 draait daarom op één adres;
welke school je bent volgt uit de login, zoals het datamodel toch al
voorschrijft. De app leest het subdomein wel alvast, zodat aanzetten
later een DNS-regel is en geen verbouwing.

De keuze tussen Cloudflare, Netlify en Vercel wacht tot er een school
tekent. De doorrekening staat in `docs/HOSTING-PRODUCT.md` en blijft
geldig; er is geen reden om nu iets te kopen.

## 2026-10-21 · Mijlpaal 2 in twee stappen

`DATAMODEL.md` stelt voor om `school_id` als eigen kolom aan elke
inhoudstabel toe te voegen. Dat blijft staan, maar het gaat niet als
eerste.

Reden: de scheiding tussen scholen werkt vandaag al — `mag_bij_groep()`
kijkt naar `k.school_id = mijn_school()`, dus twee scholen kunnen elkaar
niet zien. De kolom is verharding en leesbaarheid, geen gat dat dicht
moet. Wat er wél ontbrak was de platformbeheerder, het aanmaken van een
tweede school, de ondersteuningsdeur en het logboek. Dat is stap 2a en
die is nu klaar.

Stap 2b is de kolommigratie, met een eigen proef. Die raakt ook de
synchronisatie in de app, en dat is werk dat je apart wilt kunnen
nakijken.

