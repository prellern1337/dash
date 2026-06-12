# Market Dashboard — NIBOR/STIBOR history state fix

Denne pakken fikser en frontend-bug i NIBOR/STIBOR-historikkoverlayene.

## Hva var feil?

`/api/nibor` og `/api/stibor` returnerte `history`, men frontend lagret ikke `payload.history` i `niborState` og `stiborState`.

Derfor viste overlayen:
- Siste verdi: riktig
- Historikk: 0 dagspunkter

## Endring

Frontend lagrer nå:
- `history: payload.history || []`

for både NIBOR og STIBOR.

## Test etter deploy

1. `/api/nibor` → sjekk at `history` har rader.
2. `/api/stibor` → sjekk at `history` har rader.
3. Refresh dashboardet med `?v=rate-history-state-fix`.
4. Trykk på 3M NIBOR og 3M STIBOR.
