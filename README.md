# Market Dashboard — Watchlist hype tickers + index zero fix

## Watchlist

Følgende er lagt til i eksisterende `Watchlist`:

- SpaceX (`SPCX`)
- Tesla (`TSLA`)
- Nvidia (`NVDA`)
- Microsoft (`MSFT`)
- Alphabet (`GOOGL`)
- Coinbase (`COIN`)

Dette er lagt inn i samme `api/watchlist.js`, altså ingen ny tile og ingen ny API-fil.

## Indeksgrafer: 0-verdier

`api/indices.js` er gjort robust mot 0-observasjoner.

### Problem
Noen indekser, f.eks. OSEBX/VIX, kunne få `0` i historikken når kilden ikke hadde publisert faktisk verdi for en dag. Da falt overlay-grafen til null.

### Fix
- Nye Yahoo-observasjoner med `close <= 0` ignoreres.
- Ved innlegging av historikk: hvis en rad har `0`/mangler verdi, brukes forrige gyldige observasjon.
- Ved lesing fra Supabase: eksisterende gamle `0`-verdier forward-filles i API-responsen, slik at grafen ikke faller til null selv om gamle 0-rader ligger i databasen.

## Etter deploy

Kjør gjerne:

- `/api/watchlist?action=update`
- `/api/indices?action=update`

Sjekk deretter:

- `/api/watchlist`
- `/api/indices`

For indekser skal build være:

`indices-zero-forwardfill-v1-2026-06-15`
