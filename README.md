# Market Dashboard — news 4d, DNB diagnostics and SWAP alignment

## Endringer

### Newsfeed
- `/api/news` vurderer nå ferske artikler som maks 4 dager gamle.
- Teksten `15 mest relevante` ved siden av nyhetsoverskriften i appen er fjernet.
- `update-news.yml` er med i pakken og må ligge i `.github/workflows/`.

### DNB-fond
- `update-indices.yml` får en ekstra morgenkjøring kl. 06:30 UTC.
- `/api/indices?action=update` returnerer nå ekstra diagnostikk per indeks/fond:
  - `sourceLatestDate`
  - `sourceLatestClose`
  - `sourceLatestRawSource`
  - `seedLatestDate`

Dette gjør det tydelig om DNB-siden faktisk publiserer en nyere NAV enn historikken som allerede ligger seedet/importert.

### SWAP-layout
- SWAP-radene bruker nå faste kolonner.
- Prosentverdier står på samme høyrelinje selv når endringen er `0bp`.
- `0bp` får samme badge-bredde som opp/ned-endringer.

## Etter deploy

1. Sjekk at denne workflowen finnes i GitHub Actions:
   - `Update newsfeed`

2. Kjør manuelt:
   - `/api/news?action=update`
   - `/api/indices?action=update`

3. Sjekk:
   - `/api/news`
   - `/api/indices`

Build-markører:
- `newsfeed-4d-debug-v1-2026-06-17`
- `indices-yahoo-quote-dnb-diagnostics-v1-2026-06-17`
