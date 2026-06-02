# Market Dashboard — SWAP axis date format

Denne pakken bygger videre på SWAP history overlay.

## Endring

X-aksen i SWAP-grafene bruker nå dynamisk datoformat:

- Kort historikk, inntil 90 dager: `dd.mm.åå`
- Mellomlang historikk, inntil 2 år: `mm.åå`
- Lang historikk: `åååå`

Tooltip-datoen vises også som `dd.mm.åå`.

## Test

1. Deploy pakken.
2. Refresh dashboardet.
3. Trykk på Norge- eller Sverige-SWAP-tilen.
4. X-aksen skal vise f.eks. `21.05.26` så lenge historikken er kort.
