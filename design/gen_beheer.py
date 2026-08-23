# -*- coding: utf-8 -*-
ICONS = {
 'Groep':'<circle cx="9" cy="9" r="3.2"></circle><path d="M3.5 19 c0-3 2.5-4.6 5.5-4.6 s5.5 1.6 5.5 4.6"></path><path d="M16 7.2 a3 3 0 0 1 0 5.6"></path><path d="M17.5 14.8 c2 .6 3.2 2.1 3.2 4.2"></path>',
 'Leerlingen':'<circle cx="12" cy="8" r="3.4"></circle><path d="M5 19.5 c0-3.6 3.1-5.6 7-5.6 s7 2 7 5.6"></path>',
 'Hoeken':'<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"></rect>',
 'Bibliotheek':'<path d="M4 5.5 h4.5 v14 H4 Z"></path><path d="M9.8 5.5 h4.5 v14 H9.8 Z"></path><path d="M15.6 6.4 l3.9 1 -3.1 13.6 -3.9-1"></path>',
 'Weekplanner':'<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"></rect><path d="M3.5 10 h17"></path><path d="M8 3.5 v3"></path><path d="M16 3.5 v3"></path>',
 'Werkplaats':'<rect x="5" y="4" width="14" height="17" rx="2.2"></rect><path d="M9 3 h6 v3 H9 Z"></path><path d="M9 13 l2 2 4-4.5"></path>',
 'Doelen':'<circle cx="12" cy="12" r="8.2"></circle><circle cx="12" cy="12" r="4.4"></circle><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"></circle>',
 'Observaties':'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3"></rect><path d="M8 12.4 l2.6 2.6 5.4-6"></path>',
 'Statistieken':'<path d="M4 20 V11"></path><path d="M9.3 20 V5.5"></path><path d="M14.7 20 v-6"></path><path d="M20 20 V8.5"></path>',
 'Functies':'<path d="M4 7.5 h9"></path><path d="M17 7.5 h3"></path><circle cx="15" cy="7.5" r="2.2"></circle><path d="M4 16.5 h3"></path><path d="M11 16.5 h9"></path><circle cx="9" cy="16.5" r="2.2"></circle>',
}
ORDER = ['Groep','Leerlingen','Hoeken','Bibliotheek','Weekplanner','Werkplaats','Doelen','Observaties','Statistieken','Functies']

def sidebar(active):
    rows = []
    for naam in ORDER:
        aan = naam == active
        bg = 'background: #3b6ff0;' if aan else ''
        kleur = '#fff' if aan else '#5b6678'
        gewicht = '600' if aan else '500'
        rows.append(
          '<div style="display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 10px; %s">'
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="color: %s; flex: none;">%s</svg>'
          '<div style="font-size: 14.5px; font-weight: %s; color: %s;">%s</div></div>'
          % (bg, kleur, kleur, ICONS[naam], gewicht, kleur, naam))
    return (
      '<div style="width: 226px; background: #fff; border-right: 1px solid #e6e9ef; box-sizing: border-box; padding: 22px 14px; display: flex; flex-direction: column; gap: 22px; flex: none;">'
      '<div style="padding: 0 10px; display: flex; flex-direction: column; gap: 2px;">'
      '<div style="font-size: 17px; font-weight: 600; color: #1a2233; letter-spacing: -.015em;">Groep 2C</div>'
      '<div style="font-size: 13px; color: #98a1b2;">Het Kompas</div></div>'
      '<div style="display: flex; flex-direction: column; gap: 2px;">' + ''.join(rows) + '</div>'
      '<div style="margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: #f5f7fa;">'
      '<div style="width: 30px; height: 30px; border-radius: 50%; background: #3b6ff0; color: #fff; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center;">TH</div>'
      '<div style="display: flex; flex-direction: column;"><div style="font-size: 13.5px; font-weight: 600; color: #1a2233;">Tom</div>'
      '<div style="font-size: 12px; color: #98a1b2;">Leerkracht</div></div></div>'
      '</div>')

def schil(actief, titel, sub, actie, inhoud):
    knop = ''
    if actie:
        knop = ('<div style="background: #3b6ff0; color: #fff; font-size: 14px; font-weight: 600; '
                'padding: 10px 20px; border-radius: 999px;">%s</div>' % actie)
    return """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif; }
    a { color: #3b6ff0; } a:hover { color: #2b55c0; }
    .paneel { background: #fff; border-radius: 16px; box-shadow: 0 1px 2px rgba(20,28,44,.04), 0 4px 16px rgba(20,28,44,.05); }
    .kop { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #98a1b2; }
    .kid { border-radius: 50%%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; flex: none; }
  </style>
</helmet>

<div style="width: 1280px; height: 860px; background: #f2f4f7; display: flex; box-sizing: border-box;">
%s
  <div style="flex-grow: 1; box-sizing: border-box; padding: 26px 30px; display: flex; flex-direction: column; gap: 20px; min-width: 0;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 25px; font-weight: 600; color: #1a2233; letter-spacing: -.02em;">%s</div>
        <div style="font-size: 14.5px; color: #8a94a6;">%s</div>
      </div>
      %s
    </div>
%s
  </div>
</div>
</x-dc>
</body>
</html>
""" % (sidebar(actief), titel, sub, knop, inhoud)


def toggle(aan, kleur='#3b6ff0'):
    if aan:
        return ('<div style="width: 50px; height: 30px; border-radius: 999px; background: %s; padding: 3px; '
                'box-sizing: border-box; display: flex; justify-content: flex-end; flex: none;">'
                '<div style="width: 24px; height: 24px; border-radius: 50%%; background: #fff; '
                'box-shadow: 0 1px 3px rgba(20,28,44,.25);"></div></div>' % kleur)
    return ('<div style="width: 50px; height: 30px; border-radius: 999px; background: rgba(20,28,44,.14); padding: 3px; '
            'box-sizing: border-box; display: flex; justify-content: flex-start; flex: none;">'
            '<div style="width: 24px; height: 24px; border-radius: 50%; background: #fff; '
            'box-shadow: 0 1px 3px rgba(20,28,44,.18);"></div></div>')

def kid(letter, kleur, maat=30, tekst=13):
    return ('<div class="kid" style="width: %dpx; height: %dpx; background: %s; font-size: %dpx;">%s</div>'
            % (maat, maat, kleur, tekst, letter))

K = {'blauw':'#3b6ff0','rood':'#d94f4f','groen':'#2e9e6b','oker':'#c8820a',
     'paars':'#7c5cbf','roze':'#b8436d','oranje':'#c06428','turkoois':'#1a9aad'}

# ── 1. DASHBOARD ────────────────────────────────────────────────
def hoekrij(kleur, naam, kids, bezet, plekken):
    av = ''.join(kid(l, k, 28, 12) for l, k in kids)
    if not kids:
        av = '<div style="font-size: 13.5px; color: #b0b8c6;">nog niemand</div>'
    return ('<div style="display: flex; align-items: center; gap: 14px; padding: 13px 4px; border-bottom: 1px solid #f0f2f6;">'
            '<div style="width: 9px; height: 9px; border-radius: 50%%; background: %s; flex: none;"></div>'
            '<div style="font-size: 15px; font-weight: 600; color: #1a2233; width: 132px; flex: none;">%s</div>'
            '<div style="display: flex; gap: 6px; flex-grow: 1;">%s</div>'
            '<div style="font-size: 13.5px; color: #8a94a6; font-variant-numeric: tabular-nums;">%d / %d</div></div>'
            % (kleur, naam, av, bezet, plekken))

def dagrij(dag, tekst, doel, laatste=False):
    rand = '' if laatste else 'border-bottom: 1px solid #f0f2f6;'
    if not tekst:
        return ('<div style="display: flex; gap: 12px; padding: 11px 2px; %s">'
                '<div style="font-size: 13.5px; font-weight: 600; color: #98a1b2; width: 34px; flex: none;">%s</div>'
                '<div style="font-size: 13.5px; color: #c2c8d2;">Niets gepland</div></div>' % (rand, dag))
    chip = ''
    if doel:
        chip = ('<div style="font-size: 11.5px; font-weight: 600; color: #3b6ff0; background: #eaf0fe; '
                'padding: 2px 8px; border-radius: 999px; align-self: flex-start; margin-top: 3px;">%s</div>' % doel)
    return ('<div style="display: flex; gap: 12px; padding: 11px 2px; %s">'
            '<div style="font-size: 13.5px; font-weight: 600; color: #98a1b2; width: 34px; flex: none;">%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">'
            '<div style="font-size: 14px; color: #1a2233;">%s</div>%s</div></div>' % (rand, dag, tekst, chip))

dash = """
    <div style="display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 20px; flex-grow: 1; min-height: 0;">

      <div class="paneel" style="padding: 20px 22px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
          <div class="kop">Wie zit waar</div>
          <div style="font-size: 13.5px; color: #8a94a6;">24 van de 28 hebben gekozen</div>
        </div>
        %s
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px; min-height: 0;">

        <div class="paneel" style="padding: 20px 22px; border-left: 3px solid #c8820a; display: flex; flex-direction: column; gap: 11px;">
          <div style="display: flex; align-items: center; gap: 9px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c8820a" stroke-width="1.8" stroke-linecap="round">
              <path d="M12 4 L21 19.5 H3 Z"></path><path d="M12 10 v4"></path>
              <circle cx="12" cy="17" r=".9" fill="#c8820a" stroke="none"></circle>
            </svg>
            <div class="kop" style="color: #c8820a;">Let op</div>
          </div>
          <div style="font-size: 14.5px; color: #1a2233; line-height: 1.5;">
            <strong style="font-weight: 600;">Telt tot 10 met begrip</strong> &mdash; 6 kinderen kozen deze week nog geen taak die hieraan werkt.</div>
          <div style="font-size: 13.5px; font-weight: 600; color: #3b6ff0;">Bekijk wie</div>
        </div>

        <div class="paneel" style="padding: 20px 22px; display: flex; flex-direction: column; gap: 4px; flex-grow: 1;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
            <div class="kop">Deze week</div>
            <div style="font-size: 12.5px; font-weight: 600; color: #c06428; background: #fbf0e6; padding: 2px 9px; border-radius: 999px;">Thema Herfst</div>
          </div>
          %s
        </div>

      </div>
    </div>
""" % (
  hoekrij(K['blauw'], 'Bouwhoek', [('M',K['blauw']),('S',K['oker']),('A',K['paars']),('L',K['turkoois'])], 4, 4)
+ hoekrij(K['roze'], 'Huishoek', [('N',K['roze']),('E',K['groen'])], 2, 3)
+ hoekrij(K['oker'], 'Zandtafel', [('J',K['oranje'])], 1, 4)
+ hoekrij(K['paars'], 'Knutselhoek', [('V',K['paars']),('T',K['rood']),('R',K['groen'])], 3, 4)
+ hoekrij(K['turkoois'], 'Werktafel', [('D',K['turkoois']),('F',K['oker'])], 2, 5)
+ hoekrij(K['groen'], 'Leeshoek', [], 0, 3),
  dagrij('Ma', 'Herfstwandeling &amp; bladeren zoeken', 'Woordenschat')
+ dagrij('Di', 'Bladeren stempelen', 'Fijne motoriek')
+ dagrij('Wo', '', None)
+ dagrij('Do', 'Telspel met kastanjes', 'Telt tot 10')
+ dagrij('Vr', 'Voorlezen: Kikker in de herfst', None, True))

open('BeheerDashboard.dc.html', 'w', encoding='utf-8').write(
    schil('Groep', 'Vandaag', 'Vrijdag 21 augustus &middot; ochtend', 'Bord openen', dash))
print('BeheerDashboard.dc.html')

# ── 2. DOELEN & OBSERVATIES ─────────────────────────────────────
def doelrij(tekst, actief=False):
    bg = 'background: #eaf0fe;' if actief else ''
    kl = '#1a2233' if actief else '#4a5568'
    gw = '600' if actief else '400'
    return ('<div style="padding: 9px 11px; border-radius: 9px; font-size: 13.5px; color: %s; '
            'font-weight: %s; line-height: 1.4; %s">%s</div>' % (kl, gw, bg, tekst))

def domein(naam, aantal, doelen, leeg=False):
    if leeg:
        body = ('<div style="border: 1.5px dashed #d8dee8; border-radius: 11px; padding: 15px; display: flex; '
                'flex-direction: column; gap: 7px; align-items: flex-start;">'
                '<div style="font-size: 13px; color: #98a1b2; line-height: 1.45;">Nog geen doelen. Voeg de doelen toe die je dit jaar echt wilt volgen.</div>'
                '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #3b6ff0;">'
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b6ff0" stroke-width="2.4" stroke-linecap="round">'
                '<path d="M12 5 v14"></path><path d="M5 12 h14"></path></svg>Eerste doel toevoegen</div></div>')
    else:
        body = ''.join(doelen)
    telling = ('<div style="font-size: 12px; font-weight: 600; color: #98a1b2; background: #f0f2f6; '
               'padding: 1px 8px; border-radius: 999px;">%s</div>' % aantal)
    return ('<div style="display: flex; flex-direction: column; gap: 7px;">'
            '<div style="display: flex; align-items: center; gap: 8px; padding: 0 2px;">'
            '<div class="kop">%s</div>%s</div>%s</div>' % (naam, telling, body))

def vinkje(letter, kleur, naam, stand):
    if stand == 'behaald':
        merk = ('<div style="width: 20px; height: 20px; border-radius: 50%; background: #2e9e6b; display: flex; '
                'align-items: center; justify-content: center;">'
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" '
                'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 l4.5 4.5 L19 6.5"></path></svg></div>')
        rand = 'border: 1px solid #cfe8dc; background: #f4fbf7;'
    elif stand == 'bezig':
        merk = ('<div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #c8820a; '
                'box-sizing: border-box; background: linear-gradient(90deg, #c8820a 50%, transparent 50%);"></div>')
        rand = 'border: 1px solid #f0e0c2; background: #fdfaf4;'
    else:
        merk = '<div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d8dee8; box-sizing: border-box;"></div>'
        rand = 'border: 1px solid #e6e9ef; background: #fff;'
    return ('<div style="display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 11px; %s">'
            '%s<div style="font-size: 13.5px; color: #1a2233; flex-grow: 1; min-width: 0; overflow: hidden; '
            'text-overflow: ellipsis; white-space: nowrap;">%s</div>%s</div>'
            % (rand, kid(letter, kleur, 26, 11), naam, merk))

KINDEREN = [('M',K['blauw'],'Mees','behaald'),('S',K['oker'],'Sanne','behaald'),('A',K['paars'],'Aiden','bezig'),
            ('L',K['turkoois'],'Lotte','behaald'),('N',K['roze'],'Nienke','nog'),('E',K['groen'],'Evan','bezig'),
            ('J',K['oranje'],'Joep','nog'),('V',K['paars'],'Vera','behaald'),('T',K['rood'],'Tomer','nog'),
            ('R',K['groen'],'Rida','bezig'),('D',K['turkoois'],'Daan','behaald'),('F',K['oker'],'Floor','nog'),
            ('B',K['blauw'],'Bram','nog'),('I',K['rood'],'Isa','behaald'),('K',K['groen'],'Kees','bezig'),
            ('Y',K['paars'],'Yara','nog')]

doelen_inhoud = """
    <div style="display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; flex-grow: 1; min-height: 0;">

      <div class="paneel" style="padding: 20px 18px; display: flex; flex-direction: column; gap: 20px;">
        %s
      </div>

      <div class="paneel" style="padding: 22px 24px; display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;">
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #3b6ff0;">Rekenen</div>
            <div style="font-size: 19px; font-weight: 600; color: #1a2233; letter-spacing: -.015em;">Telt tot 10 met begrip</div>
            <div style="font-size: 13.5px; color: #8a94a6;">Gekoppeld aan 3 taken &middot; Telspel met kastanjes, Winkeltje, Kralen rijgen</div>
          </div>
          <div style="display: flex; gap: 16px; flex: none;">
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="font-size: 20px; font-weight: 600; color: #2e9e6b; font-variant-numeric: tabular-nums;">6</div>
              <div style="font-size: 11.5px; color: #98a1b2;">behaald</div></div>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="font-size: 20px; font-weight: 600; color: #c8820a; font-variant-numeric: tabular-nums;">4</div>
              <div style="font-size: 11.5px; color: #98a1b2;">bezig</div></div>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <div style="font-size: 20px; font-weight: 600; color: #98a1b2; font-variant-numeric: tabular-nums;">6</div>
              <div style="font-size: 11.5px; color: #98a1b2;">nog niet</div></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px;">
          %s
        </div>

        <div style="margin-top: auto; display: flex; align-items: center; gap: 18px; padding-top: 16px; border-top: 1px solid #f0f2f6;">
          <div style="display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #8a94a6;">
            <div style="width: 15px; height: 15px; border-radius: 50%%; border: 2px solid #d8dee8; box-sizing: border-box;"></div>Nog niet</div>
          <div style="display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #8a94a6;">
            <div style="width: 15px; height: 15px; border-radius: 50%%; border: 2px solid #c8820a; box-sizing: border-box; background: linear-gradient(90deg, #c8820a 50%%, transparent 50%%);"></div>Bezig</div>
          <div style="display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #8a94a6;">
            <div style="width: 15px; height: 15px; border-radius: 50%%; background: #2e9e6b;"></div>Behaald</div>
          <div style="margin-left: auto; font-size: 12.5px; color: #b0b8c6;">Tik op een kind om de stand te wijzigen</div>
        </div>
      </div>
    </div>
""" % (
  domein('Taal', 3, [doelrij('Herkent de eigen naam'), doelrij('Rijmt op eenvoudige woorden'), doelrij('Vertelt over een gebeurtenis')])
+ domein('Rekenen', 2, [doelrij('Telt tot 10 met begrip', True), doelrij('Vergelijkt hoeveelheden')])
+ domein('Motoriek', 1, [doelrij('Knipt langs een rechte lijn')])
+ domein('Sociaal-emotioneel', 0, [], leeg=True),
  ''.join(vinkje(l, kl, n, s) for l, kl, n, s in KINDEREN))

open('BeheerDoelen.dc.html', 'w', encoding='utf-8').write(
    schil('Doelen', 'Doelen &amp; observaties', 'Je bouwt de lijst zelf op &middot; 6 doelen actief', 'Doel toevoegen', doelen_inhoud))
print('BeheerDoelen.dc.html')

# ── 3. BIBLIOTHEEK ──────────────────────────────────────────────
def chip(tekst):
    return ('<div style="font-size: 12px; color: #5b6678; background: #f2f4f7; padding: 3px 9px; '
            'border-radius: 7px; white-space: nowrap;">%s</div>' % tekst)

def themaset(naam, kleur, tint, hoeken, taken, chips, deler, eigen=False):
    if eigen:
        knop = ('<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #2e9e6b;">'
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e9e6b" stroke-width="2.6" '
                'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 l4.5 4.5 L19 6.5"></path></svg>In jouw groep</div>')
    else:
        knop = ('<div style="font-size: 13px; font-weight: 600; color: #3b6ff0; background: #eaf0fe; '
                'padding: 7px 15px; border-radius: 999px; align-self: flex-start;">Overnemen</div>')
    return ('<div class="paneel" style="padding: 17px 18px; display: flex; flex-direction: column; gap: 12px;">'
            '<div style="display: flex; align-items: center; gap: 11px;">'
            '<div style="width: 38px; height: 38px; border-radius: 12px; background: %s; flex: none;"></div>'
            '<div style="display: flex; flex-direction: column; gap: 1px; min-width: 0;">'
            '<div style="font-size: 16px; font-weight: 600; color: #1a2233; letter-spacing: -.01em;">%s</div>'
            '<div style="font-size: 12.5px; color: #98a1b2;">%d hoeken &middot; %d taken</div></div></div>'
            '<div style="display: flex; flex-wrap: wrap; gap: 5px;">%s</div>'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto;">'
            '%s<div style="font-size: 11.5px; color: #b0b8c6; text-align: right;">%s</div></div></div>'
            % (tint, naam, hoeken, taken, ''.join(chip(c) for c in chips), knop, deler))

bieb = """
    <div style="display: flex; gap: 7px;">
      <div style="font-size: 13.5px; font-weight: 600; color: #fff; background: #3b6ff0; padding: 7px 16px; border-radius: 999px;">Thema-sets</div>
      <div style="font-size: 13.5px; font-weight: 500; color: #5b6678; background: #fff; padding: 7px 16px; border-radius: 999px;">Hoeken &middot; 34</div>
      <div style="font-size: 13.5px; font-weight: 500; color: #5b6678; background: #fff; padding: 7px 16px; border-radius: 999px;">Activiteiten &middot; 61</div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 16px; flex-grow: 1; min-height: 0;">
      %s
    </div>

    <div style="display: flex; align-items: center; gap: 11px; padding: 14px 18px; background: #fff; border-radius: 14px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e9e6b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3.5 L20 6.5 v6 c0 4.4 -3.4 7.2 -8 8.5 c-4.6 -1.3 -8 -4.1 -8 -8.5 v-6 Z"></path>
        <path d="M8.8 12.2 l2.4 2.4 4.2 -4.6"></path>
      </svg>
      <div style="font-size: 13.5px; color: #5b6678;">In de bibliotheek staan alleen hoeken en activiteiten. <strong style="color: #1a2233; font-weight: 600;">Foto&rsquo;s van kinderen komen hier nooit in</strong> &mdash; die blijven in je eigen groep.</div>
    </div>
""" % ''.join([
  themaset('Herfst', K['oranje'], '#fbf0e6', 4, 6, ['Blaadjeshoek','Kastanjetafel','Paddenstoelen','Weerhoek'], 'Gedeeld door groep 1D', eigen=True),
  themaset('Sinterklaas', K['rood'], '#fdeeee', 5, 8, ['Inpakhoek','Pakjeshoek','Schoen zetten','Pietengym','Stoomboot'], 'Gedeeld door groep 2A'),
  themaset('Kerst', K['groen'], '#e9f6f0', 4, 5, ['Kerstbakkerij','Versierhoek','Kaartenmakerij','Stal'], 'Gedeeld door groep 1B'),
  themaset('Winter', K['turkoois'], '#e8f6f8', 4, 6, ['Sneeuwhoek','IJsbaan','Vogelvoer','Warme chocolade'], 'Gedeeld door groep 2B'),
  themaset('Lente', K['groen'], '#eef7ea', 5, 7, ['Zaaitafel','Kuikenhoek','Bloemenwinkel','Regenhoek','Rupsen'], 'Gedeeld door groep 1C'),
  themaset('Ziekenhuis', K['roze'], '#fceef2', 3, 5, ['Dokterspost','Wachtkamer','Apotheek'], 'Gedeeld door groep 2A'),
])

open('BeheerBibliotheek.dc.html', 'w', encoding='utf-8').write(
    schil('Bibliotheek', 'Bibliotheek', 'Gedeeld met alle zes de kleutergroepen', 'Set delen', bieb))
print('BeheerBibliotheek.dc.html')


# ── 4. FUNCTIES ─────────────────────────────────────────────────
def funcrij(naam, uitleg, aan, extra=None, laatste=False):
    rand = '' if laatste else 'border-bottom: 1px solid #f0f2f6;'
    sub = ''
    if extra and aan:
        sub = ('<div style="display: flex; align-items: center; gap: 7px; margin-top: 7px;">'
               '<div style="font-size: 12.5px; font-weight: 600; color: #3b6ff0; background: #eaf0fe; '
               'padding: 3px 10px; border-radius: 7px;">%s</div></div>' % extra)
    return ('<div style="display: flex; align-items: flex-start; gap: 16px; padding: 14px 2px; %s">'
            '<div style="display: flex; flex-direction: column; flex-grow: 1; min-width: 0;">'
            '<div style="font-size: 14.5px; font-weight: 600; color: #1a2233;">%s</div>'
            '<div style="font-size: 13px; color: #8a94a6; line-height: 1.45; margin-top: 2px;">%s</div>%s</div>'
            '%s</div>' % (rand, naam, uitleg, sub, toggle(aan)))

func = """
    <div class="paneel" style="padding: 18px 22px; display: flex; align-items: center; gap: 18px;">
      <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1;">
        <div style="font-size: 14.5px; font-weight: 600; color: #1a2233;">Snel instellen</div>
        <div style="font-size: 13px; color: #8a94a6;">Elke groep werkt anders. Begin klein en zet aan wat je nodig hebt.</div>
      </div>
      <div style="display: flex; gap: 8px; flex: none;">
        <div style="font-size: 13.5px; font-weight: 600; color: #5b6678; background: #f2f4f7; padding: 9px 18px; border-radius: 999px;">Eenvoudig</div>
        <div style="font-size: 13.5px; font-weight: 600; color: #fff; background: #3b6ff0; padding: 9px 18px; border-radius: 999px;">Uitgebreid</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; flex-grow: 1; min-height: 0; align-items: start;">

      <div class="paneel" style="padding: 18px 22px 6px; display: flex; flex-direction: column;">
        <div class="kop" style="margin-bottom: 4px;">Op het bord</div>
        %s
      </div>

      <div class="paneel" style="padding: 18px 22px 6px; display: flex; flex-direction: column;">
        <div class="kop" style="margin-bottom: 4px;">In het beheer</div>
        %s
      </div>

    </div>
""" % (
  funcrij('Tijdvergrendeling', 'Een kind blijft even in de gekozen hoek. De ring op het picto loopt vol.', True, '20 minuten &middot; per hoek instelbaar')
+ funcrij('Wachtrij bij volle hoek', 'Kinderen melden zich aan en schuiven door zodra er plek is.', True)
+ funcrij('Telling op het picto', 'Laat zien hoe vaak een kind deze week in die hoek was.', False)
+ funcrij('Namen voorlezen', 'Tik op een picto en de naam van de hoek wordt uitgesproken.', False, laatste=True),
  funcrij('Weekplanner', 'Activiteiten per dag inroosteren voor de hele week.', True)
+ funcrij('Werkplaats', 'Werkjes met eigen capaciteit en voortgang per kind.', True)
+ funcrij('Doelen', 'Leerdoelen die je aan taken kunt koppelen.', True)
+ funcrij('Observaties', 'Per kind per doel afvinken. Vraagt dat Doelen aanstaat.', True)
+ funcrij('Statistieken', 'Samenspel, speelduur en favoriete hoeken.', False)
+ funcrij('Signalering', 'Seintje als een gepland doel aan het eind van de week niet gekozen is.', True, laatste=True))

open('BeheerFuncties.dc.html', 'w', encoding='utf-8').write(
    schil('Functies', 'Functies', 'Wat aanstaat in groep 2C &middot; geldt alleen voor deze groep', None, func))
print('BeheerFuncties.dc.html')
