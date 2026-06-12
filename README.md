# Market Dashboard — indices tile order fix

Denne pakken bygger videre på market-dashboard-pwa-indices-tiles og fikser plasseringen i dashboardet.

## Rekkefølge i appen

Indeks-tilene ligger nå:

1. Etter rente-/valuta-/Prime yield-tilene
2. Rett før den brede Innsidehandler-tilen
3. Innsidehandler ligger fortsatt nederst

## Ny API

`/api/indices`

- GET: leser siste verdi + historikk fra Supabase
- GET `?action=update`: henter siste dag(er)
- GET `?action=backfill`: henter ca. siste 12 mnd historikk

## Test etter deploy

1. `/api/indices?action=backfill`
2. `/api/indices`
3. Refresh dashboardet med `?v=indices-order`
4. Sjekk at:
   - indeksene ligger under SEK/NOK og Prime yield
   - Innsidehandler ligger nederst
