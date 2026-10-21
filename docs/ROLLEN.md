# Wie mag wat

Drie rollen. Nog geen code — eerst moet dit kloppen.

## De drie rollen

| | Platformbeheerder (Tom) | Schoolbeheerder | Leerkracht |
|---|---|---|---|
| Scholen aanmaken en verwijderen | ja | nee | nee |
| Alle scholen zien | ja | nee | nee |
| Accounts van de eigen school | ja | ja | nee |
| Groepen toewijzen aan leerkrachten | ja | ja | nee |
| Wachtwoord terugzetten | van iedereen | van de eigen school | nee |
| Eigen bord bedienen en vormgeven | ja | ja | ja |
| Bord van een ander bedienen | ja, met meekijken | ja, binnen de school | nee |
| Hoeken naar de basisdatabank | ja | nee | nee |
| Hoeken naar de schooldatabank | ja | ja | ja |
| Statistieken | alle scholen | eigen school | eigen groepen |

Een schoolbeheerder is in de praktijk de ICT'er of een coördinator. Die
is vaak óók leerkracht met een eigen groep — dat is geen aparte rol, dat
is een schoolbeheerder die aan een groep is toegewezen.

## Hoe het wordt afgedwongen

`profielen.rol` krijgt er een waarde bij: `platformbeheerder`, naast de
bestaande `leerkracht` en `schoolbeheerder`.

Een platformbeheerder heeft geen school. De rechtenregel uit
`DATAMODEL.md` wordt daarom:

    school_id = mijn_school() or ben_platformbeheerder()

**Meekijken gaat door dezelfde deur, niet eromheen.** Dat is de
belangrijkste regel van dit document. Het is verleidelijk om meekijken te
bouwen met de beheersleutel van de database, want dan werkt alles
meteen — maar dan loopt het buiten alle rechtenregels om en is één fout
in de app genoeg om alles van alle scholen te openen. De
platformbeheerder krijgt dus ruimere rechten binnen hetzelfde stelsel,
en gebruikt verder precies dezelfde weg als iedereen.

## Meekijken

Een platformbeheerder kiest een school en een groep en ziet dan hetzelfde
scherm als de leerkracht. Twee dingen zijn verplicht:

1. **Zichtbaar.** Een balk over de volle breedte: "Je kijkt mee bij Groep
   1A van De Regenboog". Niet weg te klikken. Zonder dat denk je op een
   avond dat je in je eigen bord zit.
2. **Vastgelegd.** Elke handeling komt in het auditlog, ook alleen maar
   kijken.

## Het auditlog

Een nieuwe tabel `handelingen`: wie, wanneer, welke school, wat, en op
wie of wat. Bijvoorbeeld: *beheerder X heeft om 14:12 bij school Y kind Z
uit de bouwhoek gehaald.*

**Alleen bijschrijven.** De tabel krijgt wel een regel om te mogen lezen
en toevoegen, maar geen enkele om te wijzigen of te verwijderen — ook
niet voor de platformbeheerder. Een auditlog dat de beheerder kan
aanpassen is geen auditlog. Wie het toch moet opschonen, doet dat met een
bewaartermijn die het stelsel zelf uitvoert, niet met de hand.

Het log is ook wat een school van je mag verwachten als ze vragen wie er
in hun gegevens heeft gekeken.

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
