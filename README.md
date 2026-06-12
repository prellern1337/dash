# Market Dashboard — API consolidation step 1

Denne pakken konsoliderer API-ene for SWAP og YIELD slik at vi frigjør plass under Vercel Hobby-grensen.

## Endringer

### SWAP
Før:
- `/api/swaps`
- `/api/update-swaps`

Nå:
- `/api/swaps`
- `/api/swaps?action=update`

`api/update-swaps.js` er flyttet til `lib/update-swaps.js`, så den teller ikke lenger som en Vercel Serverless Function.

### YIELD
Før:
- `/api/yields`
- `/api/update-yields`

Nå:
- `/api/yields`
- `/api/yields?action=update`

`api/update-yields.js` er flyttet til `lib/update-yields.js`, så den teller ikke lenger som en Vercel Serverless Function.

## API-filer etter rydding

Det skal nå være 9 filer i `/api`:

- `fx.js`
- `insider-trades.js`
- `nibor.js`
- `stibor.js`
- `swaps.js`
- `update-nibor.js`
- `update-rates.js`
- `update-stibor.js`
- `yields.js`

Dette gir plass til en fremtidig `indices.js`.

## Viktig

GitHub Actions er oppdatert:
- `update-swaps.yml` kaller nå `/api/swaps?action=update`
- `update-yields.yml` kaller nå `/api/yields?action=update`

## Test etter deploy

1. `/api/swaps`
2. `/api/swaps?action=update`
3. `/api/yields`
4. `/api/yields?action=update`
5. Kjør GitHub Actions manuelt:
   - Update SEB swaps
   - Update prime yields
