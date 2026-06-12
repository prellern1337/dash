# Market Dashboard — top UI cleanup + watchlist 1Y fix

Denne pakken bygger videre på watchlist-nordnet-links.

## Endringer

### Toppen av appen
- Fjernet teksten under `Marked`:
  - `Renter, valuta og prime yield samlet i én mobilvisning.`
- Fjernet den lille statusboksen ved seksjonen `Renter, valuta & yield`, blant annet `UNION live`.

### Watchlist 1Å
1Å viste 0/blankt fordi backfill bare hentet ca. 1 år historikk. Da kan det mangle et godt sammenligningspunkt nøyaktig ett år tilbake, særlig når siste punkt er live/delayed.

Dette er fikset ved at:
- `/api/watchlist?action=backfill` henter 2 år historikk
- lesingen bruker inntil 760 dager historikk
- 1Å beregnes mot nærmeste tilgjengelige datapunkt rundt 1 år tilbake

## Viktig etter deploy

Kjør backfill på nytt én gang:

`/api/watchlist?action=backfill`

Da fylles eldre historikk inn i Supabase. Eksisterende rader dupliseres ikke for samme dato.

## Test

1. Deploy.
2. Kjør `/api/watchlist?action=backfill`.
3. Kjør `/api/watchlist`.
4. Refresh dashboard med `?v=top-ui-watchlist-1y`.
5. Sjekk at:
   - teksten under `Marked` er borte
   - statusboksen ved `Renter, valuta & yield` er borte
   - Watchlist 1Å viser reelle tall der det finnes historikk
