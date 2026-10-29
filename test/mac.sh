# Wordt ingelezen door opzetten.sh, proefschool.sh en alles.sh (met ". ").
# Op Linux doet dit niets. Op een Mac zet het drie dingen goed die op
# Linux vanzelf kloppen:
#
#   1. Node 22 en PostgreSQL 16 van Homebrew in het pad. Homebrew zet
#      versies met een @ erin ("keg-only") er niet zelf in.
#   2. PG wijst naar de Postgres van Homebrew in plaats van
#      /usr/lib/postgresql/16.
#   3. LC_ALL staat op een geldige taal; anders start Postgres niet.
#   4. CHROME wijst naar de Chromium die `npx playwright install chromium`
#      heeft neergezet, in plaats van /opt/pw-browsers.
#
# Opzetten op een Mac: zie test/LEESMIJ.md, "Op een Mac".
if [ "$(uname)" = Darwin ]; then
  KB_MAC=ja
  # Zonder een geldige taalinstelling start Postgres op een Mac niet
  # ("postmaster became multithreaded during startup").
  LC_ALL=${LC_ALL:-en_US.UTF-8}; LANG=${LANG:-en_US.UTF-8}; export LC_ALL LANG
  BREW=${BREW:-$(command -v brew || echo /opt/homebrew/bin/brew)}
  if [ -x "$BREW" ]; then
    BP=$("$BREW" --prefix)
    PATH="$BP/opt/node@22/bin:$BP/opt/postgresql@16/bin:$BP/bin:$PATH"
    export PATH
    PG=${PG:-$BP/opt/postgresql@16/bin}
  fi
  if [ -z "$CHROME" ] && command -v node >/dev/null 2>&1; then
    R_MAC=$(cd "$(dirname "$0")/.." && pwd)
    CHROME=$(cd "$R_MAC" && node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null)
    export CHROME
  fi
fi
