# Marked Dashboard PWA — SEB swaps to Supabase

Denne pakken flytter SEB swap-renter fra live pageload-scraping til Supabase-lagring.

## Flyt

- `/api/update-swaps`
  - åpner SEB swap-siden med headless browser
  - henter Swap [NOK] og Swap [SEK]
  - lagrer 3Y, 5Y, 10Y for NOK/SEK i Supabase

- `/api/swaps`
  - leser siste lagrede swap-renter fra Supabase
  - raskt for dashboardet

- `.github/workflows/update-swaps.yml`
  - kjører 4 ganger daglig mandag-fredag
  - trigger `/api/update-swaps`

## Test etter deploy

1. `/api/health`
2. `/api/update-swaps`
3. `/api/swaps`
4. Refresh dashboardet

## Historikk

Alle swap-oppdateringer lagres i `market_metrics`, så vi kan senere lage historiske grafer per tenor/valuta.
