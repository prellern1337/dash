# Market Dashboard — NIBOR/STIBOR history overlay

Denne pakken bygger videre på API-konsolidering steg 1 og legger til historikkvisning for NIBOR/STIBOR.

## Endringer

- `/api/nibor` returnerer nå `history`.
- `/api/stibor` returnerer nå `history`.
- Historikk bygges fra `market_metrics` i Supabase.
- Viser siste lagrede verdi per dag, inntil siste 180 dager.
- 3M NIBOR- og 3M STIBOR-tilene er klikkbare.
- Overlay viser:
  - siste verdi
  - hentet-tidspunkt
  - antall dagspunkter
  - historisk linjegraf
- Bruker samme dynamiske X-akseformat som SWAP:
  - kort historikk: `dd.mm.åå`
  - mellomlang: `mm.åå`
  - lang: `åååå`

## API-struktur

Fortsatt 9 filer i `/api`:
- `fx.js`
- `insider-trades.js`
- `nibor.js`
- `stibor.js`
- `swaps.js`
- `update-nibor.js`
- `update-rates.js`
- `update-stibor.js`
- `yields.js`

## Test etter deploy

1. `/api/nibor` → skal inneholde `history`.
2. `/api/stibor` → skal inneholde `history`.
3. Refresh dashboardet.
4. Trykk på 3M NIBOR og 3M STIBOR.
