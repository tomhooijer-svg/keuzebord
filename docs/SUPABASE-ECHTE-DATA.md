# Supabase klaar voor echte kindernamen

Een checklist voor jou, in volgorde. Per punt staat waar je klikt en waarom.
Bovenaan elk punt staat wanneer:

- **NU DOEN** – kan vandaag, kost niets, breekt niets.
- **BIJ EERSTE ECHTE SCHOOL** – op de dag dat een school echte namen invoert
  (of vlak ervoor).

Project: `zlmunykkhooscnxbfvvg` (regio eu-west-1). Dashboard:
<https://supabase.com/dashboard/project/zlmunykkhooscnxbfvvg>

Geef bij geen enkel punt een sleutel aan Claude, ook niet de `service_role`-
sleutel. Dat is nergens voor nodig.

> De namen van menu's in het dashboard veranderen soms een beetje. Kun je
> een knop niet vinden, zoek dan in het dashboard (Ctrl/Cmd+K) op het
> vetgedrukte woord.

---

## 1. Je eigen Supabase-account: tweestapsverificatie — NU DOEN

**Waar:** rechtsboven op je avatar → **Account preferences** (of
**Account settings**) → **Security** → **Multi-factor authentication** →
**Add new app**. Scan de QR-code met een authenticator-app (bijv. die van
je wachtwoordmanager, Google Authenticator of Microsoft Authenticator).
Typ de code in.

**Waarom:** met jouw Supabase-account kan iemand álles zien, ook alle
kinderen van alle scholen. De regels in de app (RLS) gelden niet voor het
dashboard. Jouw wachtwoord is daarmee de belangrijkste sleutel van het
hele product.

Bewaar de herstelcodes in je wachtwoordmanager. Zie ook `docs/HERSTEL.md`.

## 2. Redirect URLs voor het nieuwe adres — NU DOEN

**Waar:** **Authentication** → **URL Configuration**.

- Bij **Redirect URLs** → **Add URL**: `https://app.pixelplein.nl/**`
- Laat de bestaande regel voor `https://tomhooijer-svg.github.io/...` staan.
- **Site URL** laat je nu nog staan. Die zet je pas op
  `https://app.pixelplein.nl/` bij de overstap naar Cloud86 (stap 8 van
  `docs/HOSTING-CLOUD86.md`).

**Waarom:** gewoon inloggen werkt op elk adres. Deze lijst geldt alleen
voor links in mails van Supabase. Staat het adres er niet in, dan weigert
Supabase die link.

## 3. Inloginstellingen nalopen — NU DOEN

**Waar:** **Authentication** → **Sign In / Providers** (soms **Providers**
→ **Email**), en **Authentication** → **Rate Limits**.

Zet het zo, of laat het zo als het al zo staat:

| Instelling | Zo | Waarom |
|---|---|---|
| **Allow new users to sign up** | **AAN laten** | De app maakt accounts voor collega's aan via dezelfde aanmeldroute. Zet je dit uit, dan kan een schoolbeheerder (en jij in het platformbeheer) geen accounts meer maken. Een los account zonder school ziet niets. |
| **Confirm email** | **UIT** | Accounts staan op `<naam>@keuzebord.invalid`. Dat adres bestaat niet, dus er kan nooit een bevestigingsmail aankomen. Aan = niemand komt meer binnen. |
| **Minimum password length** | **10** | Dezelfde ondergrens als de database (`wachtwoord_zetten`). De kaartjes maken drie woorden en een cijfer, en dat is altijd langer. |
| **Rate limit voor in-/aanmelden** | **30 per 5 minuten** per IP | Zo besloten op 27-10-2026; de wachtwoordsterkte is daarop gerekend. Niet hoger zetten. |
| **Leaked password protection** (alleen op Pro) | aan, als het er is | Weigert wachtwoorden die in bekende datalekken staan. De kaartjeswachtwoorden komen daar niet in voor, dus het hindert niet. |

Andere inlogmanieren (Google, Microsoft, telefoon, magic link per sms)
horen **uit**. Wij loggen in met een gebruikersnaam, nooit met een echt
e-mailadres.

## 4. De bucket kb-media is niet openbaar — NU DOEN

**Waar:** **Storage** → bucket **kb-media** → drie puntjes → **Edit
bucket**.

- **Public bucket** hoort **UIT** te staan.

**Waarom:** in deze bucket staan foto's van hoeken en (als de school ze
aanzet) van kinderen. Het schema maakt hem niet-openbaar aan, maar past
een bestaande bucket niet meer aan. Staat hij hier op Public, dan kan
iedereen met de link een foto openen, ook zonder in te loggen. Zet hem dan
uit en meld het aan Claude.

## 5. Security Advisor draaien — NU DOEN

**Waar:** **Advisors** → **Security Advisor** (soms onder **Database** →
**Advisors**). Klik op **Rerun linter** / **Refresh**.

Kopieer alles wat er onder **Errors** en **Warnings** staat, of maak een
schermafdruk, en stuur dat naar Claude Code. Er staan geen kindgegevens in
die lijst, alleen namen van tabellen en functies.

**Waarom:** Supabase kijkt zelf of er tabellen zonder RLS zijn, of
functies die te veel mogen. Dat is een tweede paar ogen naast de controle
in de repo.

## 6. Verwerkersovereenkomst (DPA) met Supabase — NU DOEN

Supabase heeft een **Data Processing Addendum** (versie 1 augustus 2026):
<https://supabase.com/legal/dpa>

- Die hoort bij de algemene voorwaarden van Supabase. Je gaat er dus al mee
  akkoord door Supabase te gebruiken. Ook de EU-modelclausules (SCC's)
  "gelden als getekend" door het accepteren van de voorwaarden (artikel 12.2).
- **Wat jij doet:** sla de pagina op als PDF (afdrukken → opslaan als PDF)
  en bewaar hem bij je administratie, met de datum erop. Kijk ook in het
  dashboard bij je **organisatie** → **Legal Documents**. Staat daar een
  DPA om te downloaden of te tekenen, doe dat dan ook.
- **Waarom:** in jouw verwerkersovereenkomst met elke school staat Supabase
  als subverwerker. De school (of haar privacyfunctionaris) mag vragen
  welke afspraken jij met Supabase hebt. Dit is dat antwoord.

Let op: dit is jóuw overeenkomst met Supabase. De verwerkersovereenkomst
tussen jou en de school is een apart stuk (STATUS.md, punt 3).

## 7. Overstappen naar het Pro-plan — BIJ EERSTE ECHTE SCHOOL

**Waar:** je **organisatie** → **Billing** → **Change plan** → **Pro**.
Kosten: ongeveer $25 per maand (kijk zelf naar de actuele prijs op
supabase.com/pricing).

**Waarom:**
- Het gratis plan **pauzeert het project na een week zonder gebruik**. In
  een vakantie staat het bord dan op maandagochtend stil.
- Het gratis plan **maakt geen back-ups**. Gaat er iets mis, dan zijn de
  gegevens van een school weg.

Doe het op de dag dat de eerste school echte namen invoert, niet later.

## 8. Uitgavenlimiet aan — BIJ EERSTE ECHTE SCHOOL (direct na stap 7)

**Waar:** **Billing** → **Cost Control** → **Spend cap**.

- **Spend cap** hoort **AAN** te staan (bij Pro is dat de standaard).

**Waarom:** met de limiet aan betaal je nooit meer dan het vaste bedrag.
Komt het project aan een grens (opslag, verkeer), dan wordt het trager of
weigert het iets, maar komt er geen onverwachte rekening.

## 9. Dagelijkse back-ups controleren — BIJ EERSTE ECHTE SCHOOL (de dag na stap 7)

**Waar:** **Database** → **Backups** (soms **Project Settings** →
**Backups**) → **Scheduled backups**.

- Een dag na de overstap hoort hier een back-up van vandaag of gisteren te
  staan. Daarna elke dag één.
- Schrijf op hoeveel dagen ze bewaard blijven (bij Pro meestal 7). Dat
  getal hoort in je verwerkersovereenkomst met de school ("hoe lang staan
  gegevens nog in back-ups na verwijderen").

**Let op:** de foto's in **Storage** zitten **niet** in deze database-
back-ups. Een weggegooide foto komt met een back-up niet terug.

## 10. Eén keer oefenen met terugzetten — BIJ EERSTE ECHTE SCHOOL (binnen een week na stap 9)

Doe dit **niet** door een back-up over het echte project terug te zetten:
dat zet álle scholen terug naar die dag, en het project ligt er even uit.

Zo oefen je veilig:
1. Kijk bij **Database** → **Backups** of er een knop **Restore to a new
   project** is. Zo ja: zet de back-up van gisteren terug in een nieuw,
   tijdelijk project.
2. Open in dat nieuwe project de **Table Editor** en kijk alleen of de
   tabellen er zijn en of het aantal rijen in `scholen` en `groepen` klopt.
   Open geen rijen van `leerlingen`, `media`, `plaatsingen` of
   `observaties`: dit is een kopie van echte kindgegevens.
3. Verwijder het tijdelijke project meteen daarna (**Project Settings** →
   **General** → **Delete project**). Zo staan de gegevens niet langer op
   twee plekken.
4. Is er geen "Restore to a new project": lees dan bij **Backups** wat er
   bij **Restore** staat (hoe lang het duurt, wat er verloren gaat) en
   schrijf het op in `docs/HERSTEL.md`. Dan weet je het op de dag dat het
   echt nodig is.

**Waarom:** een back-up waarvan je niet weet hoe je hem terugzet, is geen
back-up.

## 11. De nieuwe rechtenregels op het live project zetten — NU DOEN (na elke wijziging aan schema.sql)

Sinds 29-10-2026 kan de leverancier (jij, als platformbeheerder) bij een
school met kinderen geen accounts meer maken, geen wachtwoorden zetten en
niemand verplaatsen of een rol geven, tenzij de school "meekijken" heeft
aangezet. Die regel zit in `supabase/schema.sql` en moet ook in het live
project komen. Je hebt daarvoor **geen sleutel** nodig: je bent in het
dashboard al ingelogd als eigenaar.

**Wanneer:** 's avonds of in het weekend, niet tijdens schooltijd. Het
script haalt alle rechtenregels even weg en zet ze direct opnieuw neer;
in die paar seconden kan een bord een foutmelding krijgen.

**Zo doe je het:**
1. Op het Pro-plan (punt 7): kijk eerst bij **Database** → **Backups** of
   er een back-up van vandaag of gisteren staat. Op het gratis plan is er
   geen back-up, en daarom kan dit dan beter vóór er echte namen in staan.
2. Open in de repo het bestand `supabase/schema.sql` en kopieer de hele
   inhoud (Cmd+A, Cmd+C).
3. In het dashboard: **SQL Editor** → **New query** → plak alles → **Run**.
4. Onderaan hoort *Success* te staan. Meldingen die met `NOTICE` beginnen
   zijn geen fouten. Staat er `ERROR`? Stop dan, kopieer de foutregel en
   stuur hem naar Claude. Het script is herhaalbaar: na een reparatie draai
   je gewoon het hele bestand nog een keer.

**Controleren dat het werkt** (alleen-lezen, raakt geen kindgegevens).
Plak dit in een **nieuwe** query en klik **Run**:

```sql
select
  (select count(*) from pg_proc
    where proname in ('platform_mag_bij_school','platform_moet_mogen','school_heeft_kinderen'))
    as nieuwe_functies,
  (select count(*) from pg_trigger where tgname = 'uitnodiging_op_slot')
    as nieuwe_trigger,
  (select count(*) from pg_policies
    where tablename = 'uitnodigingen' and policyname = 'beheerder nodigt uit'
      and with_check like '%platform_mag_bij_school%')
    as nieuwe_regel;
```

Je hoort te zien: `nieuwe_functies = 3`, `nieuwe_trigger = 1`,
`nieuwe_regel = 1`.

**En in de app** (alleen met nepdata):
1. Log in als platformbeheerder → **Accounts** → **Account toevoegen** →
   kies een proefschool waar nepkinderen in staan → **Aanmaken**. Je hoort
   te zien: *"Deze school heeft kinderen. Vraag de schoolbeheerder om
   meekijken aan te zetten."*, en er komt geen kaartje.
2. Log in als schoolbeheerder van die proefschool → **Schoolbeheer** →
   **Hulp van de leverancier** → zet de deur open.
3. Probeer stap 1 opnieuw: nu lukt het.
4. Als schoolbeheerder: in het **Logboek** staat nu
   *"Pixelplein (leverancier): account aangemaakt — …"*.
5. Haal het proefaccount daarna weer weg en zet de deur dicht.

## 12. Vóór de eerste echte naam: nog drie dingen buiten het dashboard

Geen dashboard-werk, maar ze horen op dezelfde dag af te zijn:

- `privacy.html` ingevuld met je bedrijfsgegevens (STATUS.md, punt 3).
- Verwerkersovereenkomst met de school getekend.
- De rechtenregels van punt 11 staan op het live project (bevindingen 1–3
  uit de rechtencontrole zijn daarmee opgelost).

---

## Wat Claude níét kan of mag

- Claude ziet het dashboard niet en verandert niets in de live
  Supabase-omgeving.
- De Supabase-koppeling van Claude is alleen-lezen en kijkt alleen naar het
  schema, nooit naar rijen met kindgegevens (CLAUDE.md).
- Vraag Claude nooit een sleutel te bewaren of te gebruiken.
