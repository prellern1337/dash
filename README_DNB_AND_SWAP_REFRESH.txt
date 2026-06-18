# App Marked patch — DNB-fond + SWAP guard refresh

Denne pakken erstatter forrige DNB-only patch. Last opp denne ZIP-en i stedet for den forrige.

## Filer

- api/dnb-fund-refresh.js
  - Henter DNB-fond fra flere kilder/format og skriver nye NAV-rader til `market_metrics`.

- api/swap-refresh.js
  - Henter SEB NOK/SEK swaps direkte fra SEB-endepunktet.
  - Skriver nye rader til `market_metrics` når 3Y/5Y/10Y kan parses.
  - Avviser/rydder bort mistenkelige 1,00 %-rader hvis alle tre tenorer for en valuta står på 1,00 %, slik at tiles faller tilbake til forrige gyldige observasjon.

- vercel.json
  - Beholder `/api/update-rates` cron.
  - Legger til `/api/swap-refresh` etter rates-jobben.
  - Legger til `/api/dnb-fund-refresh` på kvelden.

## Test etter deploy

1. SWAP dry-run uten skriving:
   /api/swap-refresh?action=debug

2. SWAP oppdatering + opprydding:
   /api/swap-refresh

3. Kun opprydding av 1,00 %-rader:
   /api/swap-refresh?action=cleanup

4. DNB dry-run:
   /api/dnb-fund-refresh?action=debug

5. DNB oppdatering:
   /api/dnb-fund-refresh

Build-markører:
- swap-refresh-guard-v1-2026-06-18
- dnb-fund-refresh-v1-2026-06-18
