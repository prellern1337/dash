# Market Dashboard — overlay scroll + insider source links

Denne pakken bygger videre på watchlist-supabase-history-strategy.

## Endringer

### Watchlist / Eiendomsaksjer
Overlay for både `Watchlist` og `Eiendomsaksjer` har nå intern scroll:

- maks høyde ca. 52vh
- sticky tabellheader
- fungerer også hvis vi legger til mange flere aksjer senere

### Innsidehandler
I overlayen for `Innsidehandler` er selskapet i hver rad nå klikkbart når raden har `messageUrl`.

- Klikk på selskap åpner selve NewsWeb-meldingen som er brukt som kilde.
- I den kompakte tile-visningen er selskap ikke klikkbart, slik at tile-klikket fortsatt fungerer ryddig.

## Test etter deploy

1. Refresh med `?v=overlay-scroll-insider-links`.
2. Trykk `Eiendomsaksjer` og sjekk at overlayen kan scrolles.
3. Trykk `Watchlist` og sjekk at overlayen fortsatt ser riktig ut.
4. Trykk `Innsidehandler`.
5. Klikk på selskap i en rad og sjekk at NewsWeb-meldingen åpnes.
