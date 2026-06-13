# Market Dashboard — newsfeed position/count tweak

Denne pakken bygger videre på newsfeed-v1.

## Endringer

### Plassering
Nyhetsseksjonen er flyttet opp.

Ny rekkefølge:

1. Renter, valuta & yield
2. Nyheter / Nyhetsfeed
3. Markedsindekser
4. Aksjer
5. Innsidehandler

### Tile-visning
Nyhetsfeed-tilen viser nå inntil 9 artikler i stedet for 5.

Overlay er uendret og viser fortsatt full liste.

## Test etter deploy

Refresh dashboardet med:

`?v=newsfeed-position-count`

Sjekk at:
- `Nyheter` kommer rett etter `Renter, valuta & yield`
- Nyhetsfeed-tilen viser flere artikler
- Overlay fortsatt fungerer som før
