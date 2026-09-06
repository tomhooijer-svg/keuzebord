/* ══════════════════════════════════════════════════════════════
   WELKE APP IS DIT
   Er zijn twee uitgaven van dezelfde motor:

     Keuzebord  het bord zelf, de kinderen, de klassen, de picto's,
                de hoeken met hun foto's, wat het bord kan, en de
                statistieken over wat er in de hoeken gebeurde.

     Planbord   het weekplan, de thema's, de taken, de doelen en de
                observaties -- het werk dat je vóór en ná het spelen
                doet, meestal niet aan het digibord.

   Ze delen alles daaronder: dezelfde gegevens, dezelfde database,
   dezelfde manier van inloggen. De splitsing zit in de schermen,
   niet in de gegevens. Taken plan je in Planbord maar ze worden
   gedaan in de werkplaats op het bord; hoeken beheer je in
   Keuzebord maar je hangt ze aan een thema in Planbord. Allebei de
   apps mogen dus alles lezen -- ze laten alleen wat anders zien.

   Dit bestand is het enige dat per uitgave verschilt. Het
   uitgeefscript schrijft het; wat er hier staat is de werkplaats,
   waar alles nog bij elkaar zit.
   ══════════════════════════════════════════════════════════════ */
window.KB_APP = {
  id: 'werkplaats',
  naam: 'Keuzebord',

  /* Welke panelen deze app heeft. null betekent: allemaal -- dat is de
     werkplaats, waar de proeven overheen lopen. */
  panelen: null,

  /* Heeft deze uitgave het bord zelf? Planbord niet: daar staat wel een
     knop "Bord openen", maar het bord ligt in de andere app. Zonder dit
     wees die knop naar een bestand dat er niet is, en dan krijg je de
     404 van GitHub in plaats van je bord. */
  heeftBord: true,

  /* Waar beide uitgaven staan. Volledige adressen, niet alleen een pad
     naast dit: een relatief pad gaat er stilzwijgend van uit dat de twee
     als buren onder hetzelfde domein staan. Zet je er één op een eigen
     domeinnaam, of hernoem je een repo, dan wijst zo'n pad naar het niets
     -- zonder dat er iets waarschuwt. Hier staat het één keer, en elke
     knop leest het hier.

     De mapnaam staat er los bij, want op een testserver of een ander
     domein klopt het volledige adres niet en vallen we terug op de buur
     naast ons. Zo werkt het in de klas én in de proeven. */
  apps: {
    keuzebord: { naam:'Keuzebord', map:'keuzebord-app',
                 url:'https://tomhooijer-svg.github.io/keuzebord-app/' },
    planbord:  { naam:'Planbord',  map:'planbord',
                 url:'https://tomhooijer-svg.github.io/planbord/' }
  },

  /* Welke van die twee de andere is. null betekent: er is er maar één --
     dat is de werkplaats, waar alles nog bij elkaar zit. */
  ander: null
};
