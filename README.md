# Market Dashboard — index descriptions + SWAP title fix

Denne pakken bygger videre på index-descriptions-overlay.

## Endringer

### Indeks-overlay
Indeks-overlayen viser nå en kort forklaring under indeksnavnet, i stedet for generisk "Detaljvisning".

Eksempler:
- OSEBX: Oslo Børs: Vektet utvikling i de største og mest handlede aksjene.
- S&P 500: USA: Bred indeks med 500 store børsnoterte selskaper.
- VIX: USA: Markedets forventede volatilitet i S&P 500 neste 30 dager.

### SWAP-tiles
De to øverste SWAP-tilene har fått nye overskrifter:

- `Norge` → `SWAP NOK`
- `Sverige` → `SWAP SEK`

## Test etter deploy

1. Refresh dashboardet med `?v=index-descriptions-swap-title`.
2. Sjekk at øverste tiles heter `SWAP NOK` og `SWAP SEK`.
3. Trykk på en indeks-tile og sjekk at forklaringsteksten vises under indeksnavnet.
