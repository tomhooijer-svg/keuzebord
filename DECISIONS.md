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

De werkplaatsrepo heeft een geschiedenis die niet gedeeld kan worden.
Die repo mag dus nooit openbaar worden of naar een meebouwer of koper —
ook niet nu de huidige bestanden schoon zijn, want oude commits blijven
bestaan.

*Bijgewerkt op 2026-10-21: hier stond eerst precies wát er in die
geschiedenis zit. Dat hoort niet in een document dat met een meebouwer
gedeeld wordt — het is een wegwijzer, geen reden.*

Het product begint daarom in een nieuwe repo zonder die geschiedenis:
`tomhooijer-svg/keuzebord-product`. De werkplaats blijft bestaan.

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

## 2026-10-21 · De productrepo heet keuzebord-product

`tomhooijer-svg/keuzebord-product`, één schone commit, geen geschiedenis
van de werkplaats. `test/product-kopie.sh` zet de inhoud klaar en
controleert meteen of er geen wegwijzer naar de oude gegevens in is
geglipt.

Wat er niet in gaat: `oud.html` (de v1 van één school), `design/`
(schetsen uit een eerdere ronde), `docs/PLAN.md` en `docs/HOSTING.md`
(die beschrijven hoe de werkplaats is ontstaan, inclusief wat er in die
geschiedenis zit) en `docs/ADVIES-AGENDA-EN-KOPPELING.md` (gaat over het
planbord). Niets daarvan wordt weggegooid; het blijft in de werkplaats.

Voorlopig blijft de werkplaats de plek waar gebouwd wordt en is de
productrepo de uitkomst. Dat kan later omdraaien, maar niet midden in
een mijlpaal.

## 2026-10-21 · De Supabase-regio is eu-west-1, en dat is goed

Ierland. EU, dus de verhuizing die als eerste risico in het
hostingvoorstel stond hoeft niet. Dat was het enige punt dat met een
tweede school erop veel duurder zou worden.

Blijft gelden voor dít project. Komt er ooit een tweede, dan is Ierland
of Frankfurt de enige goede keuze.

## 2026-10-21 · Een platformscherm dat alleen getallen laat zien

`platform.html`: de scholen met hun aantallen, een knop om een school
aan te maken, een knop voor een voorbeeldschool, en het logboek. Verder
niets, en dat is de hele opzet — op dit scherm staat geen enkele
kindernaam, want er is geen enkele manier om er een op te halen.

Er staat een blokje tekst op dat uitlegt waarom je hier geen kinderen
ziet. Dat is geen decoratie: wie dit scherm voor het eerst opent denkt
anders dat er iets stuk is.

De voorbeeldschool is één functie in de database die een school vult met
drie groepen, vijftien verzonnen kinderen en vijf hoeken per groep. Dat
moest wel langs de rechtenregels heen, want de platformbeheerder mag
geen inhoud schrijven — en dat is precies goed. De functie leest nooit
iets; ze vult alleen een nieuwe school met namen die niet bestaan.

Niet gebouwd: meekijken bij een school. De deur en het logboek staan er,
het scherm nog niet. Dat hoort bij mijlpaal 7 en vraagt eerst een
antwoord op de botsing tussen een bord dat offline doorwerkt en een
beheerder die op afstand iets verschuift.

## 2026-10-21 · De school staat nu in elke rij (stap 2b)

Zestien tabellen hebben `school_id` gekregen, en de tabellen die
onderaan een ketting hingen ook `groep_id`. De rechtenregel is overal
dezelfde korte vergelijking geworden; de kettingen van drie tabellen
diep zijn weg.

Het voorstel in `DATAMODEL.md` was op één punt te kort: daar stond dat
de regel `school_id = mijn_school()` zou worden. Dan ziet een leerkracht
alles van haar school in plaats van alleen haar eigen groepen. De school
is de ene grens, de groep de andere, en allebei moeten ze erin staan.

Aan de app veranderde niets. De synchronisatie bouwt haar rijen uit een
vaste lijst kolommen en vergelijkt alleen haar eigen momentopnamen, dus
de nieuwe kolommen komen er niet in voor. Een trekker vult ze vanuit de
ouderrij — en overschrijft wat de app zou meesturen, zodat de app zich
niet kan vergissen en ook niet kan liegen.

Daarmee is mijlpaal 2 af.

## 2026-10-21 · Een hoek uit de databank wordt gekopieerd, niet gevolgd

Een leerkracht kiest een hoek uit de databank en krijgt een kopie in
haar groep: naam, plekken en foto worden overgenomen en zijn daarna van
haar. Pas jij de databank daarna aan, dan verandert er niets in die
klas.

Dat is de belangrijkste keuze van deze mijlpaal, en hij gaat tegen de
reflex in — een verwijzing is netter en scheelt opslag. Maar dan
verandert het bord in een klas doordat iemand anders iets bijwerkt,
terwijl de kleuters ernaar kijken. Dat mag niet kunnen. Er staat een
proef op die precies dat controleert.

De foto gaat mee als kopie naar de opslagmap van de school, zodat een
groep ook niets merkt als een databankhoek wordt weggehaald. Dat kost
wat opslag; bij 30 kB per foto is dat te overzien.

Wat de kopie wél onthoudt is waar hij vandaan komt (`uit_databank`).
Daarmee zie je in het platformbeheer hoe vaak een hoek gebruikt wordt
zonder dat er ergens apart geteld hoeft te worden.

## 2026-10-21 · De databank is een hoek zonder school

Hetzelfde patroon als de landelijke doelenlijst die er al was: staat er
geen school in de rij, dan is het van de databank. Elke school mag hem
lezen, alleen de platformbeheerder mag hem aanpassen.

De foto's liggen in de map `basis` in plaats van in een schoolmap. Een
school-id is een uuid, dus het woord `basis` kan nooit per ongeluk de
map van een school zijn.

Dit is de enige inhoud die de platformbeheerder wél mag schrijven, en
dat klopt met `ROLLEN.md`: het is zijn eigen materiaal, geen gegeven van
een school of een kind.

## 2026-10-21 · De meekijk-omgeving draait zonder server

Een geïnteresseerde opent `demo.html` en speelt meteen: een groep met
zestien verzonnen kinderen en zes hoeken, zonder account en zonder
inloggen.

Dat kon zonder iets te bouwen aan de serverkant, omdat het bord van
zichzelf al local-first is. De demo haalt de serverlaag juist wég: in
demomodus worden `kb-supabase.js`, `kb-sync.js` en `kb-verbinding.js`
helemaal niet uitgevoerd. Niet uitgeschakeld maar afwezig — zo kan geen
enkele regel per ongeluk alsnog iets naar een echte school sturen.

Overwogen en niet gekozen: een demo-school in de database met een
gedeeld inlogaccount. Dan slingeren er inloggegevens rond, loopt die
school vol met andermans gerommel, en moet iemand hem opruimen. Nu
krijgt elke bezoeker zijn eigen speeltuin in zijn eigen browser.

De demo bewaart onder eigen sleutels (`kb_demo_*`). Zonder dat zou een
bezoek aan de demo de groep overschrijven van een leerkracht die in
dezelfde browser is ingelogd. Daar staat een proef op die van begin tot
eind controleert dat haar gegevens niet veranderen.

## 2026-10-21 · Het planbord gaat uit het product, niet uit de code

Eerder stond hier dat het planbord achter een schakelaar per school zou
gaan. Dat wordt scherper: het product is alleen het keuzebord. Weekplan,
thema's, taken, doelen en observaties zijn onzichtbaar, en de drie
functies die hun gegevens uit het weekplan halen — werkplaats
klaarzetten, twee werkmomenten, signalering — zijn dat ook. Die beloofden
iets wat zonder planbord niet kán: een werkplaats die altijd leeg blijft.

Ook weg: het menu-item "Naar Planbord". Een verwijzing naar een app die
een school niet heeft gekocht is het meest zichtbare planbord dat er is.

Niets is weggegooid. De stand van vóór deze stap staat als tak
`archief/planbord-v1` in allebei de repo's, en de code zelf staat er nog
gewoon; `KB_APP.planbord` bepaalt of hij meedoet. Wil je er later een
tweede product van maken, dan zet je die schakelaar om.

Reden om dit nú te doen: de werkplaats zoals hij is gebouwd volgt de
methodiek van Toms eigen school. Dat is geen basis voor een product dat
aan andere scholen wordt verkocht.

## 2026-10-21 · "Vandaag" gaat over het bord, niet over de week

De keuzebord-app opende bij de leerkracht op Statistieken, want het
bestaande "Vandaag" is een weekplanscherm. Je begon dus elke ochtend met
een terugblik.

Er is nu een tweede Vandaag, voor wie geen planbord heeft: staat het bord
open, wie staat in welke hoek, wie moet nog kiezen, en een knop om de dag
af te sluiten. Hetzelfde menu-item, andere inhoud — welke je krijgt hangt
af van `KB_APP.planbord`.

## 2026-10-21 · Niet steeds dezelfde hoek — als schakelaar, standaard uit

Uit het onderzoek naar Digikeuzebord: daar moet een kind dat een hoek al
vaak heeft gekozen eerst iets anders kiezen. Dat is een stuurregel op het
bord zelf, niet alleen een cijfer achteraf.

Overgenomen, met twee randvoorwaarden. **Standaard uit**, want of een
kleuter zeven keer in de bouwhoek mag is een pedagogische keuze en niet
iets wat de software hoort te vinden. En **geen foutmelding**: het kind
ziet zijn eigen plaatje, hoort hoe vaak het er al was, en kiest wat
anders. Een kleuter heeft niets verkeerd gedaan.

Geteld wordt vanaf maandag, uit het logboek dat er toch al is. Na het
weekend begint iedereen blanco.

## 2026-10-21 · Een thema is een stel kleuren, geen tweede bord

Negen thema's: Standaard, Herfst, Sinterklaas, Kerst, Winter, Lente,
Pasen, Zomer en Carnaval. Elk thema zet drie dingen: de achtergrond, de
accentkleur, en het palet waarmee de randjes boven de hoeken worden
gekleurd. Verder niets.

Geen plaatjes, geen kerstballen, geen pieten. Dat gaat tegen de
verwachting in bij het woord "thema", en het is een bewuste keuze: de
vormgeving die je koos zet kleur alleen waar hij iets betekent, en een
bord vol versiering leidt een kleuter af van de hoek waar hij naar moet
kijken. Als je er later toch iets decoratiefs bij wilt, is dat een eigen
gesprek.

Technisch zijn het dan ook alleen waarden: een paar hex-kleuren die als
css-variabelen op de pagina worden gezet. Er wordt nergens een kopie van
het bord gemaakt, en de opmaak blijft op één plek staan. De proef
controleert dat ook echt: na het wisselen van thema staan er evenveel
hoeken, plekken en kinderen als ervoor.

Heeft de leerkracht bij een hoek zelf een kleur gekozen, dan wint die
altijd -- ook als het thema wisselt. Haar keuze is geen suggestie.

## 2026-10-21 · Twee handleidingen, allebei als webpagina

`demo.html` is de korte: wat het is, vier dingen om meteen te proberen,
acht functies in één regel elk, en wat er gebeurt als de wifi wegvalt.
Bedoeld om iemand enthousiast te maken in twee minuten.

`handleiding.html` is de hele, voor scholen die het afnemen: inloggen,
de kinderen, de hoeken, het bord in de klas, wat je kunt aanzetten,
statistieken, thema's, school en thuis, wat er gebeurt zonder wifi, het
schoolbeheer, wat we van kinderen bewaren, en wat te doen als er iets
vastloopt. Bereikbaar vanuit het menu van de leerkracht.

Allebei webpagina's en geen pdf. Een pdf raakt verouderd op het moment
dat je hem verstuurt, en je kunt er niet naartoe linken vanuit het
scherm waar iemand vastloopt.

## 2026-10-21 · Een picto landt op zijn plek, niet op het midden

Het ging zo: je liet los boven een hoek, het picto vloog naar het midden
van de kaart, en daarna sprong het naar zijn plekje. Die sprong gebeurt
precies op het moment dat een kleuter kijkt of het gelukt is.

Nu vliegt hij meteen naar de plek waar hij echt komt te staan, en laat
die plek even zien dat er iemand is geland: het picto zet zich op zijn
plaats en er gaat één ring open die meteen weer vervaagt. Kort en zacht
-- het moet zeggen "hier zit hij nu", niet de aandacht opeisen.

De maat van die ring wordt gemeten, niet geraden: de cirkel is op elk
bord een andere grootte. Met `offsetWidth`, want een lopende
schaalanimatie telt anders mee in de maat.

