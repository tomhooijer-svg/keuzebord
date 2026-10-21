# Wie mag wat

Drie rollen. Nog geen code — eerst moet dit kloppen.

Dit is geen juridisch advies. Het is de bouwkant: we zorgen dat de
afspraken die een school met je maakt, in de software ook echt waar zijn.

## De drie rollen

| | Platformbeheerder (Tom) | Schoolbeheerder | Leerkracht |
|---|---|---|---|
| Scholen aanmaken en verwijderen | ja | nee | nee |
| De eerste schoolbeheerder van een school aanmaken | ja | nee | nee |
| Accounts van de eigen school | nee | ja | nee |
| Groepen toewijzen aan leerkrachten | nee | ja | nee |
| Wachtwoord terugzetten | van schoolbeheerders | van de eigen school | nee |
| Hoeken naar de basisdatabank | ja | nee | nee |
| Hoeken naar de schooldatabank | nee | ja | ja |
| Aantallen en opslag per school | ja, alleen getallen | eigen school | nee |
| Leerlingen en foto's zien | nee | eigen school | eigen groepen |
| Borden zien, bedienen en vormgeven | nee | eigen school | eigen groepen |
| Statistieken | nee | eigen school | eigen groepen |
| Meekijken bij een school | alleen als die school het aanzet | n.v.t. | n.v.t. |

Een schoolbeheerder is in de praktijk de ICT'er of een coördinator. Die
is vaak óók leerkracht met een eigen groep — dat is geen aparte rol, dat
is een schoolbeheerder die aan een groep is toegewezen.

## Waarom de platformbeheerder de inhoud niet ziet

De school is verwerkingsverantwoordelijke, jij bent verwerker. De school
bepaalt wat er met de gegevens van haar kinderen gebeurt; jij voert uit
wat zij opdraagt. Dat is de rolverdeling waar het hele
Privacyconvenant Onderwijs en de bijbehorende Model
Verwerkersovereenkomst (4.0) op staan, en het is de rolverdeling die een
schoolbestuur van je zal verwachten zodra het de overeenkomst naast je
product legt.

Daar hoort bij dat jouw toegang tot kindgegevens niet verder gaat dan
nodig is om de dienst te leveren. En dat is: niet. Om een school aan te
maken, een wachtwoord terug te zetten of een factuur te kloppen hoef je
geen enkel kind te zien. Een beheerdersknop die alles van alle scholen
opent, is daarom niet alleen onnodig maar ook lastig uit te leggen —
precies de vraag die bij een aanbesteding of een DPIA bovenkomt.

Het is bovendien in je eigen voordeel. Wat je niet kunt zien, kan niet
per ongeluk uitlekken, hoeft niet in een datalekmelding, en hoeft niet
verdedigd te worden. Leveranciersbeheer en logging zijn precies de twee
punten waarop het funderend onderwijs volgens de nulmeting van het
Normenkader IBP het zwakst scoort; een product dat die twee van zichzelf
goed heeft staan, verkoopt makkelijker.

**Personeel is wat anders dan kinderen.** Namen en e-mailadressen van
leerkrachten zie je wel, want zonder dat kun je geen account aanmaken of
een wachtwoord terugzetten. Dat zijn volwassenen met een arbeidsrelatie,
geen kleuters. De grens ligt daar: accounts ja, kinderen nee.

## Welke tabellen aan welke kant staan

| Kant | Tabellen |
|---|---|
| Beheer — platformbeheerder mag erbij | `scholen`, `profielen`, `uitnodigingen`, `groepen`, `groep_leden`, `groep_verzoeken` |
| Inhoud — platformbeheerder mag er niet bij | `leerlingen`, `media`, `hoeken`, `themas`, `thema_hoeken`, `borden`, `bord_hoeken`, `plaatsingen`, `wachtrij`, `gebeurtenissen`, `observaties`, en alles van het planbord |

`groepen` staat aan de beheerkant omdat je anders geen leerkracht aan een
groep kunt koppelen. Een groepsnaam is "Groep 1A", geen kindgegeven.

`hoeken` is het enige grensgeval. De basisdatabank zijn hoeken zonder
school (`school_id` leeg) en die mag je maken en wijzigen. Hoeken die een
school zelf heeft gemaakt, met eigen foto's uit het eigen lokaal, zijn
van de school.

## Hoe het wordt afgedwongen

`profielen.rol` krijgt er een waarde bij: `platformbeheerder`, naast de
bestaande `leerkracht` en `schoolbeheerder`. Een platformbeheerder heeft
geen school.

De rechtenregel uit `DATAMODEL.md` krijgt daarmee twee vormen in plaats
van één.

Op de beheertabellen:

    school_id = mijn_school() or ben_platformbeheerder()

Op de inhoudstabellen:

    school_id = mijn_school() or ondersteuning_actief(school_id)

Let op wat hier níét staat: `ben_platformbeheerder()` komt op de
inhoudstabellen niet voor. Je rol alleen is nooit genoeg om een kind te
zien. Daar is altijd een school voor nodig die de deur heeft opengezet.

**Meekijken gaat door dezelfde deur, niet eromheen.** Het is verleidelijk
om meekijken te bouwen met de beheersleutel van de database, want dan
werkt alles meteen — maar dan loopt het buiten alle rechtenregels om en
is één fout in de app genoeg om alles van alle scholen te openen. De
ondersteuningstoegang loopt dus via precies dezelfde weg als iedereen.

## Ondersteuning: de school zet de deur open

Als een school belt met "er klopt iets niet", moet je kunnen kijken. Dat
regelen we zo:

1. De **schoolbeheerder** zet ondersteuning aan, in haar eigen scherm.
   Niet jij. Een knop met één zin erbij: wat je dan kunt zien en hoe lang.
2. Het **loopt vanzelf af**, standaard na vier uur. Geen handeling nodig
   om het weer dicht te doen, want die handeling vergeet iedereen.
3. Het is **zichtbaar zolang het aanstaat**, voor de school én voor jou:
   een balk over de volle breedte, "Je kijkt mee bij Groep 1A van De
   Regenboog", niet weg te klikken.
4. Alles wordt **vastgelegd**, ook alleen maar kijken.

Daarvoor komt er een tabel `ondersteuning`: school, door wie
opengezet, wanneer, tot wanneer, en waarom (een zinnetje van de school).
`ondersteuning_actief(school)` kijkt daarin of er nu een geldige rij
staat voor deze aanvrager.

## Aantallen zonder inhoud

Je moet wel weten hoeveel groepen een school gebruikt en hoeveel opslag
ze innemen — anders kun je niet factureren en niet zien of iets vastloopt.
Dat kan zonder één rij inhoud te lezen: één functie die alleen getallen
teruggeeft, per school. Aantal leerkrachten, aantal groepen, aantal
leerlingen, megabytes, laatste keer gebruikt.

Die functie is de enige plek die langs de rechtenregels mag kijken, en
daarom staat het hier zo nadrukkelijk: ze geeft nooit rijen terug, alleen
getallen, en ze staat op één plek zodat je er één keer goed naar kunt
kijken in plaats van overal een beetje.

## Het auditlog

Een nieuwe tabel `handelingen`: wie, wanneer, welke school, wat, en op
wie of wat. Bijvoorbeeld: *beheerder X heeft om 14:12 bij school Y kind Z
uit de bouwhoek gehaald.*

**Alleen bijschrijven.** De tabel krijgt wel een regel om te mogen lezen
en toevoegen, maar geen enkele om te wijzigen of te verwijderen — ook
niet voor de platformbeheerder. Een auditlog dat de beheerder kan
aanpassen is geen auditlog. Wie het toch moet opschonen, doet dat met een
bewaartermijn die het stelsel zelf uitvoert, niet met de hand.

Een school ziet haar eigen regels. Dat is wat ze van je mogen verwachten
als ze vragen wie er in hun gegevens heeft gekeken — en het is meteen het
antwoord op de vraag of jij stiekem meekijkt: ze kunnen het nakijken.

## Wat dit niet oplost

Eerlijk blijven: jij bent houder van het hostingaccount. Wie bij de
database zelf kan, kan alles lezen, hoe mooi de rollen in de app ook
staan. Dat is bij elke leverancier zo en het is geen reden om dit niet te
doen.

Wat dit model wél doet, is dat normaal werk die toegang niet meer nodig
heeft, en dat alles wat er wél gebeurt een spoor achterlaat dat de school
kan nakijken. Dat is precies wat je in een verwerkersovereenkomst moet
kunnen opschrijven: wie heeft toegang, waarvoor, hoe lang, en hoe weet
je dat.

## Nog te beslissen: inloggen zonder e-mailadres

Je wilt gebruikersnaam en wachtwoord, zonder e-mail. Supabase Auth werkt
met e-mailadressen. De gebruikelijke oplossing is een verzonnen adres per
gebruikersnaam, bijvoorbeeld `jandeboer@regenboog.intern`, dat de
gebruiker nooit ziet of hoeft te weten.

Dat werkt, maar er zit één gevolg aan dat je vooraf moet willen:

**Wachtwoord vergeten kan niet meer per mail.** Er is geen adres om naar
te sturen. Een vergeten wachtwoord wordt dus altijd door een mens
teruggezet: de schoolbeheerder doet het voor een leerkracht, jij voor een
schoolbeheerder. Voor een school met tien leerkrachten is dat prima. Maar
jouw eigen account is dan het laatste slot zonder reservesleutel — als
jij jezelf buitensluit, is er niemand boven je.

Voorstel: jij houdt één echt e-mailadres aan je eigen account, puur als
noodingang. Alle anderen loggen in met een gebruikersnaam.

Dit staat nog open tot jij er iets van vindt.
