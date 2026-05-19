# Marked Dashboard PWA — serverless limit fix

Denne pakken rydder opp i Vercel Hobby-begrensningen på antall serverless functions.

## Endringer

- Fjernet midlertidige debug-endepunkter:
  - `/api/debug-seb-swaps`
  - `/api/debug-riksbank-stibor`
  - `/api/debug-union-nibor`
  - `/api/version`
- Flyttet Supabase-helper ut av `api/_lib` til `lib/supabase.js`
- Oppdaterte imports i API-filene
- Beholder production-endepunktene:
  - `/api/health`
  - `/api/fx`
  - `/api/swaps`
  - `/api/yields`
  - `/api/nibor`
  - `/api/stibor`
  - `/api/update-nibor`
  - `/api/update-stibor`
  - `/api/update-rates`

## Test etter deploy

1. `/api/health`
2. `/api/update-stibor`
3. `/api/stibor`
4. `/api/update-rates`
