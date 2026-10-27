# Als jij zelf niet meer binnenkomt

Sinds het inloggen met gebruikersnamen gaat, is er geen "wachtwoord
vergeten"-mail meer. Dat is met open ogen gekozen: een testleerkracht
moet met een kaartje in haar hand binnen een minuut binnen zijn, en er
hoeft dan van niemand een echt e-mailadres in dit systeem te staan.

De prijs daarvan is dat iedereen voor een nieuw wachtwoord bij iemand
anders moet zijn:

| Wie is het kwijt | Wie helpt |
|---|---|
| Een leerkracht | haar schoolbeheerder |
| Een schoolbeheerder | de leverancier (jij) |
| **Jij** | **niemand — deze bladzijde** |

Jij bent het eind van die ketting. Daarom staat hier precies wat je doet
als je jezelf buitensluit. Lees het een keer door vóórdat het nodig is;
op het moment zelf kun je niet inloggen om het op te zoeken.

---

## Wat je nodig hebt

Toegang tot het Supabase-dashboard van dit project. Dat is een ander
account dan je keuzebord-account: je logt daar in bij Supabase zelf, met
je echte e-mailadres. Zolang je dáár binnenkomt, kun je altijd terug.

> **Zet dit nu goed.** Als je ook je Supabase-wachtwoord kwijtraakt, is
> er geen weg meer terug en moet alles opnieuw worden opgezet. Supabase
> heeft wél een wachtwoord-vergeten-mail; zorg dus dat het e-mailadres
> van je Supabase-account er een is waar je bij kunt.

---

## Je eigen wachtwoord terugzetten

Ga naar het Supabase-dashboard → **SQL Editor** → **New query**, en
plak dit. Vervang `jouw.gebruikersnaam` en het wachtwoord.

```sql
update auth.users
   set encrypted_password = extensions.crypt(
         'kies-hier-drie-woorden-7', extensions.gen_salt('bf'))
 where lower(email) = public.inlogadres('jouw.gebruikersnaam');
```

Daarna controleren of het ook echt zo is opgeslagen — een update die
niets raakte geeft geen foutmelding, en dan denk je dat het klaar is:

```sql
select email,
       encrypted_password = extensions.crypt(
         'kies-hier-drie-woorden-7', encrypted_password) as klopt
  from auth.users
 where lower(email) = public.inlogadres('jouw.gebruikersnaam');
```

Er hoort één regel uit te komen met `klopt = true`. Komt er niets uit,
dan bestaat die gebruikersnaam niet — kijk dan eerst met:

```sql
select gebruikersnaam, rol, email from public.profielen order by rol, gebruikersnaam;
```

---

## Weet je je gebruikersnaam niet meer?

```sql
select p.gebruikersnaam, p.naam, p.rol, s.naam as school
  from public.profielen p
  left join public.scholen s on s.id = p.school_id
 order by p.rol, p.gebruikersnaam;
```

---

## Jezelf weer platformbeheerder maken

Dit heb je nodig als je per ongeluk je eigen rol hebt veranderd, of als
je een vers account hebt gemaakt dat nog nergens bij hoort.

```sql
do $$
begin
  perform set_config('kb.systeem', 'aan', true);
  update public.profielen
     set rol = 'platformbeheerder', school_id = null
   where gebruikersnaam = 'jouw.gebruikersnaam';
end $$;
```

`kb.systeem` is nodig: er zit een slot op de kolommen `rol` en
`school_id` dat voorkomt dat iemand zichzelf promoveert. Die vlag geldt
alleen binnen één transactie.

**Daarom staat het in een `do $$ ... end $$;`-blok.** Zet je de twee
regels los onder elkaar, dan draait de SQL-editor ze mogelijk ieder in
een eigen transactie, is de vlag bij de tweede regel alweer weg, en
loopt de update tegen het slot aan. Een blok is één opdracht en dus één
transactie.

---

## Een heel nieuw platformbeheerdersaccount maken

Als er helemaal niets meer werkt. Maak eerst een gebruiker aan via
**Authentication → Users → Add user**:

- E-mail: `noodluik@keuzebord.invalid`
- Wachtwoord: drie woorden en een cijfer
- *Auto Confirm User* aanvinken

Daarna in de SQL Editor:

```sql
do $$
begin
  perform set_config('kb.systeem', 'aan', true);
  update public.profielen
     set rol = 'platformbeheerder', school_id = null, gebruikersnaam = 'noodluik'
   where lower(email) = 'noodluik@keuzebord.invalid';
end $$;
```

Inloggen doe je dan met gebruikersnaam `noodluik`. Ruim hem daarna op:
een noodluik dat open blijft staan is geen noodluik.

---

## Waarom dit niet in de app zit

Een knop "zet mijn eigen wachtwoord terug" zonder dat je kunt inloggen,
is een knop waarmee iederéén jouw wachtwoord kan terugzetten. Die kan
dus niet bestaan. Het enige echte slot is dat je bij Supabase zelf moet
kunnen — en dat is precies waarom dit hier staat en niet in het beheer.

---

## Nog één ding: de pogingenrem

In de app zit een rem: na vijf misgeslagen pogingen moet je even
wachten, en elke volgende keer langer. **Die rem zit in de browser.**
Inloggen gaat rechtstreeks naar Supabase, dus wie de app overslaat en de
server zelf aanroept merkt er niets van. Hij remt een mens — een kind
dat aan het digibord zit te proberen, een collega die blijft gokken — en
geen programma.

De echte rem staat in Supabase: **Authentication → Rate Limits**. Die
hoort aan te staan, want de wachtwoorden van drie woorden zijn daarop
gerekend: ruim zestien miljoen mogelijkheden is genoeg zolang niemand
ongestoord mag proberen, en te weinig zodra dat wél kan.

Controleer dus één keer wat daar staat. Staat er geen zinnige limiet,
of blijkt hij niet te werken, meld het dan — dan maken we de
wachtwoorden een woord langer. Dat is één regel in `src/kb-kaartje.js`.
