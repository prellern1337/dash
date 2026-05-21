# Market Dashboard — insider overlay links

Endring:
- Overlay-tabellen for innsidehandler har nå en egen link-kolonne.
- Hver rad kan åpnes direkte i NewsWeb via ikon/link.
- Tile-visningen er uendret og holder seg kompakt.
- Beholder konservativ parser for innsidehandler.

Test:
1. Deploy pakken.
2. Kjør `/api/insider-trades?action=update&limit=16&days=14`.
3. Åpne dashboardet og trykk på Innsidehandler-tilen.
4. Klikk link-ikonet på en rad i overlayen.
