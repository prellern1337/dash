# Market Dashboard — SWAP history overlay

Denne pakken bygger videre på PWA/standalone-versjonen og legger til historikkvisning for SEB SWAP-tilene.

## Endringer

- `/api/swaps` returnerer nå også `history`.
- Historikk bygges fra `market_metrics` i Supabase.
- Viser siste lagrede verdi per dag, inntil siste 60 dager.
- Norge/Sverige SWAP-tilene er klikkbare.
- Overlay viser:
  - dagens 3Y / 5Y / 10Y
  - historisk linjegraf for 3Y / 5Y / 10Y
  - lenke til SEB-kilden

## Test

1. Deploy pakken.
2. Sjekk `/api/swaps` og bekreft at `history` finnes.
3. Refresh dashboardet.
4. Trykk på Norge- eller Sverige-SWAP-tilen.

Hvis grafen har få punkter, er det bare fordi historikk må bygges opp over flere `update-swaps`-kjøringer.
