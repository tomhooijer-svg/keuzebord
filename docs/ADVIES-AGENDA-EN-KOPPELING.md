# Advies: een agenda, .ics, en de losse observatie-app

Bij punt 9, 10 en 12 van de wensenlijst. Dit zijn de drie punten waar je om
advies vroeg en niet om bouwwerk. Hieronder wat ik ervan vind, en waarom.

---

## 9. Is een overkoepelende agenda zinvol?

**Kort: nog niet als apart scherm — wel als vooruitblik in het weekplan.**

Het Planbord kent al drie tijdlagen van dezelfde gegevens:

| Laag | Waar | Wat je ziet |
|---|---|---|
| Weken | Thema (van/tot) | waar een periode om draait |
| Een week | Weekplan | welke taken, welke doelen, wie wanneer |
| Een dag | de dagweergave in het weekplan | wie er in welke ronde in de werkplaats zit |

Een agenda erbij zou een vierde weergave van diezelfde gegevens worden. Dat
maakt het niet overzichtelijker, alleen groter. Wat er wél ontbreekt is
vooruitkijken: je ziet één week tegelijk, en om te weten of er over drie
weken al iets klaarstaat moet je drie keer op "volgende" drukken.

**Wat ik voorstel:** een strook van zes weken boven het weekplan. Per week:
de kleur van het thema, hoeveel taken erin staan, en of er al kinderen bij
staan. Eén tik brengt je naar die week. Dat is klein werk, gebruikt alleen
wat er al is, en beantwoordt de vraag waar een agenda voor bedoeld was.

**Wanneer wél een echte agenda:** zodra je de *dag* wilt plannen en niet
alleen de werkplaats — gym, bibliotheek, een ouder die komt voorlezen, de
schoolfotograaf. Dat zijn afspraken met een datum en een tijd, en die passen
niet in "taak in een week". Dat is een eigen soort gegeven:

```
gebeurtenis: id, groep_id, datum, begintijd, eindtijd, naam, soort, notitie
```

Zeg het als je die kant op wilt, dan bouwen we dát — en niet een agenda die
alleen taken herhaalt die je al ziet.

---

## 10. Een .ics-bestand importeren: kan dat?

**Kort: ja, technisch goed te doen — maar het heeft de agenda uit punt 9
nodig, anders is er geen plek waar de afspraken landen.**

Wat het is: `.ics` (RFC 5545) is platte tekst met blokken `BEGIN:VEVENT`.
Een lezer voor de velden die ertoe doen (`DTSTART`, `DTEND`, `SUMMARY`,
`LOCATION`, `RRULE`) is zo'n 150 à 250 regels JavaScript, zonder bibliotheek
en zonder bouwstap — dat past precies bij hoe deze app in elkaar zit.

Waar het lastig wordt, in volgorde van hinder:

1. **Herhalingen.** `RRULE:FREQ=WEEKLY;BYDAY=TU` is de gymles van elke
   dinsdag. Een subset (wekelijks en dagelijks, met `BYDAY`, `UNTIL` en
   `COUNT`) dekt vrijwel alles op een school; de volledige regel — met
   uitzonderingen, schrikkelweken en `BYSETPOS` — is een middag werk extra
   en levert weinig op.
2. **Tijdzones.** Afspraken staan er vaak in als `DTSTART;TZID=Europe/Amsterdam`.
   Voor hele dagen (`VALUE=DATE`) is dat geen probleem; voor tijden moet je
   de `VTIMEZONE` uitlezen of je beperken tot de Nederlandse tijd. Dat
   laatste is voor een basisschool eerlijk genoeg.
3. **Grootte.** Een export van een schoolagenda kan megabytes zijn. Bij het
   inlezen meteen filteren op een periode (dit schooljaar) houdt dat klein.
4. **Het is een momentopname.** Een bestand importeren is niet hetzelfde als
   een agenda volgen. Live meelezen zou een abonnements-URL vragen die van
   buiten bereikbaar is én CORS toestaat, en dat doen schoolagenda's vrijwel
   nooit. Reken dus op: bestand kiezen, inlezen, klaar — en opnieuw inlezen
   als er iets verandert.

**Volgorde:** eerst de agenda-gegevens uit punt 9, dan de import. Andersom
kan niet.

---

## 12. De observatie-app uit Lovable laten praten met het Planbord

**Kort: laat hem met dezelfde Supabase praten, niet met het Planbord.**

Het Planbord heeft geen eigen server. Het is een browser-app bovenop
Supabase: Postgres met PostgREST ervoor, Auth voor het inloggen, en RLS die
regelt dat je alleen bij je eigen school kunt. De "API" waar je naar zoekt
bestaat dus al — en het Planbord is er zelf ook maar een gebruiker van.

Wat dat concreet betekent voor de app die je aanlevert:

- **Zelfde project.** Hij logt in op dezelfde Supabase (dezelfde project-URL
  en dezelfde anon-key) met `supabase.auth.signInWithPassword`. Dan is het
  dezelfde gebruiker, met dezelfde rechten, en hoeft er niets gekoppeld te
  worden.
- **Zelfde tabellen.** Hij leest `leerlingen`, `doelen`, `taken` en schrijft
  `observaties`. De RLS-regels laten dat vanzelf alleen toe voor de groepen
  waar die leerkracht bij hoort; daar hoeft in de app niets voor te gebeuren.
- **Eén stand per kind per doel.** Op `observaties` staat een unieke index op
  (`leerling_id`, `doel_id`). Een nieuwe beoordeling moet dus een *upsert*
  zijn (`on_conflict=leerling_id,doel_id`), geen insert — anders krijgt hij
  een botsing. Dat is precies het soort fout dat het weekplan deze week
  kostte, dus dit is het waard om vooraf goed te zetten.
- **Standen zijn drie woorden.** `stand` is `'nog' | 'bezig' | 'behaald'` —
  in de app: ontdekken, met hulp, zelfstandig. Gebruikt jouw app andere
  gradaties, dan vertalen we die op één plek, bij de rand.
- **Schema-wijzigingen op één plek.** `supabase/schema.sql` in deze repo is de
  waarheid. Heeft de observatie-app een kolom nodig, dan komt die daar bij
  (met `add column if not exists`), zodat beide apps dezelfde database blijven
  zien.

**Wat je níét moet doen:** de observatie-app een eigen database geven en die
twee laten synchroniseren. Dat is precies de klasse fouten waar we deze week
een dag aan kwijt waren — twee kanten die allebei denken dat ze gelijk hebben.

**Als hij écht niet in hetzelfde project kan:** dan is de op één na beste weg
een klein koppelstuk op een server, dat met een service-role-sleutel schrijft.
Die sleutel mag nooit in een browser terechtkomen, dus dat betekent hosting,
onderhoud en een extra plek waar iets stuk kan. Alleen doen als het niet
anders kan.

**Wat ik van je nodig heb als je de code aanlevert:** welke velden hij per
observatie vastlegt, of hij per doel of per taak beoordeelt, en of hij eigen
begrippen gebruikt die we moeten vertalen.
