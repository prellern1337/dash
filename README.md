# Market Dashboard — Watchlist 1Y hard fix

Denne pakken bygger videre på overlay-scroll-insider-links.

## Hva som var feil

`firstDate` lå fortsatt rundt november 2025, så API-et hadde ikke nok historikk til å beregne 1Å.

Tidligere catch-up brukte Yahoo `range=2y`. For noen Oslo/Stockholm-symboler kan dette være mindre stabilt enn eksplisitte datoer.

## Endring

`/api/watchlist?action=update` bruker nå eksplisitt Yahoo `period1`/`period2` når historikk mangler:

- henter ca. 760 dager tilbake med konkrete datoer
- filtrerer og lagrer manglende datoer i Supabase
- bruker ikke 2Y-henting på vanlig dashboard-load
- vanlig `/api/watchlist` leser fortsatt kun Supabase-historikk + live/delayed sistekurs

## Feilsjekk i update-respons

For hver ticker returneres:

- `catchup`
- `existingSpanDays`
- `fetchedRows`
- `filteredRows`
- `savedRows`
- `firstFetchedDate`
- `lastFetchedDate`

## Etter deploy

Kjør GitHub Action `Update watchlist prices` én gang, eller vent på schedule.

Deretter sjekk:

- `/api/watchlist`
- `/api/watchlist?group=real_estate`

`firstDate` skal da være langt nok tilbake til at 1Å kan beregnes for tickere som har nok børs-/Yahoo-historikk.
