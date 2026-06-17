# Market Dashboard — SEB swaps direct API hard fix

Denne pakken fikser at SWAP-rentene ble stående på 15. juni selv om SEB-kilden viste ferske satser.

## Sannsynlig årsak

Den gamle oppdateringen rendret SEB-siden med Chromium/Puppeteer og prøvde å parse tabellen fra HTML/body text. Det er tregt og sårbart. Hvis SEB-siden rendret annerledes, eller Vercel/GitHub Action fikk en gammel/ufullstendig side, ble det lagret error-rader og appen viste siste OK-verdi fra 15. juni.

## Fix

`lib/update-swaps.js` bruker nå SEBs interne JSON-endepunkt som primærkilde:

`/ssc/trading/fx-rates-bff/api/rates/swap?currency=NOK`
`/ssc/trading/fx-rates-bff/api/rates/swap?currency=SEK`

med cache-busting og no-cache/no-store headers.

Hvis direkte API feiler, faller den tilbake til gammel rendered-page-metode.

## Endringer

- Direkte SEB API er primærmetode.
- Rendered page er fallback.
- `observed_date` settes til dagens dato.
- Alle lagrede OK-rader får `raw.build` og `raw.method`.
- `/api/swaps` returnerer nå `diagnostics`.
- Ny debug:
  `/api/swaps?action=debug-swaps`

## Etter deploy

1. Kjør:
   `/api/swaps?action=debug-swaps`

2. Sjekk at NOK og SEK returnerer rates for:
   - 3 Yr
   - 5 Yr
   - 10 Yr

3. Kjør:
   `/api/swaps?action=update`

4. Sjekk:
   `/api/swaps`

Se særlig på:
- `diagnostics.swap_nok_5y.latestGoodFetchedAt`
- `diagnostics.swap_nok_5y.latestGoodRawMethod`
- `diagnostics.swap_nok_5y.latestGoodBuild`

Build-markør:

`seb-swaps-direct-api-hard-fix-v1-2026-06-17`
