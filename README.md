# Market Dashboard — aksjer section/order fix

Denne pakken bygger videre på real-estate-watchlist.

## Endringer

### Ny seksjonsoverskrift
Over Watchlist-tilene er det lagt inn seksjonsoverskrift:

`Aksjer`

### Tile-navn
Eiendomswatchlisten heter nå:

`Eiendomsaksjer`

i stedet for `Watchlist eiendom`.

### Rekkefølge
Etter seksjonen `Aksjer` ligger tiles i denne rekkefølgen:

1. Watchlist
2. Eiendomsaksjer
3. Innsidehandler

## Test etter deploy

1. Refresh dashboardet med `?v=aksjer-section-order`.
2. Sjekk at overskriften `Aksjer` ligger over Watchlist.
3. Sjekk at rekkefølgen er:
   - Watchlist
   - Eiendomsaksjer
   - Innsidehandler
