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
