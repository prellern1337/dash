# Market Dashboard — Watchlist domain/workflow verification fix

Denne pakken bygger videre på watchlist-1y-hard-fix.

## Hva som var feil

Workflowen som ble limt inn kjørte:

`https://dash-martin-mogstad-s-projects.vercel.app/api/watchlist?action=update`

Men appen testes på:

`https://dash-eight-topaz.vercel.app/`

Dermed kan workflowen ha kjørt mot en annen/eldre deployment, og Supabase fikk aldri nødvendigvis kjørt den nye 760-dagers catch-up-koden.

## Endringer

### Workflow
`.github/workflows/update-watchlist.yml` peker nå til:

`https://dash-eight-topaz.vercel.app/api/watchlist?action=update`

### Verifisering
`/api/watchlist` og `/api/watchlist?action=update` returnerer nå:

`build: "watchlist-1y-hard-fix-domain-2026-06-13"`

Da kan man se direkte om riktig kode faktisk er deployet.

## Etter deploy

1. Åpne `/api/watchlist`
2. Sjekk at responsen inneholder:
   `build: "watchlist-1y-hard-fix-domain-2026-06-13"`

3. Kjør GitHub Action:
   `Update watchlist prices`

4. Åpne `/api/watchlist?action=update`
   og sjekk at responsen for tickere viser:
   - `range: "period_760d"`
   - `catchup: true`
   - `firstFetchedDate` langt tilbake
   - `savedRows` større enn 0 første gang

5. Åpne `/api/watchlist`
   og sjekk at `firstDate` går langt nok tilbake til 1Å.
