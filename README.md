# Market Dashboard — rates API consolidation

Denne pakken rydder opp i API-strukturen ved å samle NIBOR/STIBOR i én serverless function.

## Før

API-mappen hadde 11 filer:

- `nibor.js`
- `stibor.js`
- `update-nibor.js`
- `update-stibor.js`
- `update-rates.js`
- pluss øvrige API-er

## Etter

Disse fem rate-filene er erstattet av én:

- `rates.js`

Ny API-struktur:

- `/api/rates?type=nibor`
- `/api/rates?type=stibor`
- `/api/rates?action=update&type=nibor`
- `/api/rates?action=update&type=stibor`
- `/api/rates?action=update&type=all`

## API-antall

API-mappen skal nå ha 7 filer:

- `fx.js`
- `indices.js`
- `insider-trades.js`
- `rates.js`
- `swaps.js`
- `watchlist.js`
- `yields.js`

## Internt

Den gamle rate-logikken er flyttet til `lib/rates/`, slik at koden fortsatt er separert, men ikke teller som Vercel serverless functions.

## Workflow

Ny/oppdatert workflow:

- `.github/workflows/update-rates.yml`

Den kaller:

`/api/rates?action=update&type=all`

## Test etter deploy

1. `/api/rates?type=nibor`
2. `/api/rates?type=stibor`
3. `/api/rates?action=update&type=all`
4. Refresh dashboard med `?v=rates-consolidated`

## Viktig ved GitHub-opplasting

Sørg for at disse gamle API-filene faktisk er slettet fra `api/` i GitHub:

- `nibor.js`
- `stibor.js`
- `update-nibor.js`
- `update-stibor.js`
- `update-rates.js`

Hvis de blir liggende igjen, teller de fortsatt mot Vercel-grensen.
