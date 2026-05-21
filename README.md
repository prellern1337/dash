# Marked Dashboard PWA — insider trades tile

Denne pakken legger til en bred tile for innsidehandler.

## Ny API

`/api/insider-trades`

- GET: leser siste lagrede handler fra Supabase
- GET `?action=update`: henter fra NewsWeb og lagrer i Supabase

## UI

Bred tile:
- Dato
- Selskap
- Type
- Stilling
- Aksjer
- Pris

Overlay:
- siste uke
- scrollbar

## Workflow

`.github/workflows/update-insider-trades.yml`

Kjører 4 ganger daglig på hverdager og kan kjøres manuelt.
