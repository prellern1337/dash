# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- Yield-data hentes **ikke** hver gang appen åpnes.
- `/api/yields` leser bare lagret data fra:
  - `public/data/yields.json`
- Yield-data oppdateres automatisk av GitHub Actions:
  - `scripts/update-yields.mjs`
  - `.github/workflows/update-yields.yml`
- Workflowen kjører onsdager kl. 13:30 UTC, men scriptet skipper hvis siste vellykkede oppdatering er nyere enn 10 dager. Det gir omtrent annenhver uke.
- Workflow kan også kjøres manuelt fra GitHub Actions.
- Første datafil er seedet med siste kjente tall:
  - UNION: 4,75 / 5,00 / 5,25
  - Newsec: 4,50 / 5,25 / 5,25
  - Akershus: 4,50 / 4,50 / 5,25
- Når GitHub Action kjører, overskrives seed-data med automatisk hentede verdier.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.


## UI note

Yield-overlayen viser nå samlet "Sist oppdatert yield-data" i stedet for bare "UNION/Newsec", fordi Akershus også inngår i samme automatisk oppdaterte yield-fil.


## SEB swaps

SEB swap-rates hentes ved app-lasting via `/api/swaps`.

- Kilde: `https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates`
- Henter Swap [NOK] og Swap [SEK]
- Viser 3Y, 5Y og 10Y
- Endepunktet bruker kort Vercel-cache (`s-maxage=300`) for å unngå unødvendig tung scraping ved mange raske åpninger.


## SEB fix

`api/swaps.js` uses `headless: true` explicitly. This avoids the Vercel/Playwright error:
`browserType.launch: headless: expected boolean, got string`.


## SEB swaps direct API

SEB swap-rates are now fetched directly from SEB's JSON endpoints, without Chromium/Playwright in Vercel:

- NOK: `https://sebgroup.com/ssc/trading/fx-rates-bff/api/rates/swap?currency=NOK`
- SEK: `https://sebgroup.com/ssc/trading/fx-rates-bff/api/rates/swap?currency=SEK`

`/api/swaps` extracts 3 Yr, 5 Yr and 10 Yr and returns them to the dashboard. This avoids the previous serverless Chromium errors.
