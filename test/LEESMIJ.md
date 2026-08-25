# Zelf nakijken

De app praat met Supabase, en daar kan een testomgeving niet zomaar bij.
Daarom staat hier een nabootsing: een klein servertje dat precies de
adressen kent die `src/kb-supabase.js` gebruikt, met daarachter een gewone
Postgres waarin het echte `supabase/schema.sql` draait. De rechtenregels
zijn dus niet nagespeeld maar echt -- dezelfde regels die straks op de
server staan.

```sh
# een keer opzetten
createdb kb
psql -d kb -f supabase/test-01-nepsupabase.sql
psql -d kb -f supabase/schema.sql

# draaien
node test/nep-supabase-server.js &      # luistert op 5455
python3 -m http.server 8899 &           # de app zelf
node test/inloggen.test.js
```

De test loopt vijftien dingen langs: registreren, een school beginnen,
groepen maken, een juf uitnodigen, haar laten registreren en zien dat ze
automatisch bij de goede school en groep zit, dat ze niet bij de groep
hiernaast kan, verkeerd wachtwoord, opnieuw inloggen, een sessie die blijft
staan, een server die plat ligt, en een e-mailadres dat al bestaat.
