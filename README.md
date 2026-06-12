# Market Dashboard — VIX text + yield source links

Denne pakken bygger videre på VIX visual fix.

## Endringer

### VIX-forklaring
VIX-forklaringen er oppdatert til:

`USA: Forventet 30-dagers volatilitet i S&P 500, lavere er bedre. (<15 lav uro, 20–30 tydelig usikkerhet, >40 krisetilstand).`

### Yield-overlay
I Prime yield-overlayen er kildenavnene nå klikkbare:

- UNION
- Newsec
- Akershus

Lenkene bruker eksisterende `sourceUrl` fra `/api/yields`.

## Test etter deploy

1. Refresh dashboardet med `?v=vix-yield-links`.
2. Trykk på VIX og sjekk ny tekst.
3. Trykk på Prime yield.
4. Trykk på UNION/Newsec/Akershus-navnene og sjekk at kildesidene åpnes i ny fane.
