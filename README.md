# Market Dashboard — Watchlist OK-history catchup fix

Denne pakken fikser årsaken til at Watchlist fortsatt ikke viste 1Å.

## Feilen

`/api/watchlist?action=update` viste:

- `existingSpanDays: 730`
- `catchup: false`
- `range: "1mo"`

Samtidig viste `/api/watchlist` bare `firstDate` rundt november 2025.

Det betyr at catchup-sjekken telte eldre rader i Supabase som appen ikke bruker. Appen leser bare rader med:

`status = "ok"`

men `getExistingDates()` telte tidligere alle statuser.

## Fix

`getExistingDates()` teller nå bare:

`status = "ok"`

Dermed vil `existingOkSpanDays` reflektere samme historikk som appen faktisk bruker.

Hvis OK-historikken er under ca. ett år:

- `catchup: true`
- `range: "period_760d"`
- eldre OK-rader lagres i Supabase
- 1Å kan beregnes

## Verifisering

`/api/watchlist` og `/api/watchlist?action=update` returnerer nå:

`build: "watchlist-ok-history-catchup-2026-06-13"`

## Etter deploy

1. Åpne `/api/watchlist` og sjekk build-markør.
2. Kjør `/api/watchlist?action=update`.
3. Nå bør du se:
   - `existingOkSpanDays` rundt 200, ikke 730
   - `catchup: true`
   - `range: "period_760d"`
   - `savedRows` større enn 0
4. Åpne `/api/watchlist` på nytt og sjekk at `firstDate` er eldre enn november 2025.
