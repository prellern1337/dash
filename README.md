# Market Dashboard — Watchlist per-metric read fix

Denne pakken fikser den faktiske årsaken til at 1Å fortsatt ikke ble vist.

## Hva vi nå vet

`/api/watchlist?action=update` viste:

- `existingOkSpanDays: 730`
- `catchup: false`
- `range: "1mo"`

Det betyr at eldre OK-rader faktisk finnes i Supabase.

Samtidig viste `/api/watchlist` bare `firstDate` rundt november 2025. Årsaken er at lesespørringen hentet alle tickere samlet med `.in(metric_key, keys)`, sortert nyeste først. Supabase/PostgREST returnerer i praksis en begrenset mengde rader, så vi fikk bare de nyeste radene totalt — ca. 133 dager per ticker.

## Fix

`/api/watchlist` henter nå historikk per ticker:

- én Supabase-query per metric_key
- `status = "ok"`
- siste 760 dager
- opptil 1000 rader per ticker

Dermed får hver ticker full historikk og 1Å kan beregnes.

## Verifisering

`/api/watchlist` returnerer nå:

- `build: "watchlist-per-metric-read-fix-2026-06-13"`
- `readMethod: "per_metric_760d"`

Etter deploy:

1. Åpne `/api/watchlist`
2. Sjekk build og readMethod
3. Sjekk at `firstDate` går ca. 760 dager tilbake for tickere med historikk
4. Sjekk at `change1y` ikke er null
