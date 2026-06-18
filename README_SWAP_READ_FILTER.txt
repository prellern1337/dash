# SWAP 1,00%-guard – 18.06.2026

Denne patchen oppdaterer kun `/api/swaps.js`.

Problem:
SEB/SWAP hadde fått lagret 1,00% som OK-verdi for alle tre tenorer. Dette ga feil tile og et stort fall i grafen.

Fix:
- `/api/swaps` ignorerer nå en observasjon der alle tre tenorer for NOK eller SEK er nøyaktig 1,00%.
- Historikk/graf filtrerer bort samme feilrader.
- Det er lagt inn cleanup-endepunkt:
  `/api/swaps?action=cleanup-1pct`

Etter deploy:
1. Kjør `/api/swaps?action=cleanup-1pct`
2. Kjør `/api/swaps`
3. Refresh appen hardt hvis gammel respons henger igjen.

Dette påvirker ikke DNB-fond-fixen.
