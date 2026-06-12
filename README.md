# Market Dashboard — Watchlist overlay + section heading

Denne pakken bygger videre på watchlist-title-fix.

## Endringer

### Hovedoverskrift
Øverste seksjonsoverskrift er endret:

- `Quick update` → `Renter, valuta & yield`

### Watchlist
Watchlist-tilen er nå klikkbar.

Når du trykker på den, åpnes en større overlay med:
- ticker/navn
- lenke til respektive Yahoo Finance-side
- siste kurs
- 1D
- 1M
- 1Å

Alle ticker-/aksjenavn i overlayen åpner Yahoo Finance i ny fane.

## Test etter deploy

1. Refresh dashboardet med `?v=watchlist-overlay-heading`.
2. Sjekk at øverste overskrift er `Renter, valuta & yield`.
3. Trykk på Watchlist-tilen.
4. Trykk på hvert navn/ticker og sjekk at Yahoo Finance åpnes.
