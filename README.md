# Market Dashboard — SWAP mobile layout fix

Denne pakken gjør SWAP-tilene mer kompakte på mobil.

## Endringer

- Radetiketter endret fra `3Y swap`, `5Y swap`, `10Y swap` til `3Y`, `5Y`, `10Y`.
- Prosentverdien er satt til `whitespace-nowrap`, slik at `4,72 %` ikke brytes over to linjer.
- bp-endringen er gjort mer kompakt, for eksempel `-7bp`.
- Mindre tekst og litt strammere avstand i RateStack.

## Test etter deploy

Refresh med:

`?v=swap-mobile-layout`

Sjekk SWAP NOK og SWAP SEK på mobil.
