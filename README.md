# Market Dashboard — insider tile visible fix

Denne pakken fikser at selve brede Innsidehandler-tilen manglet i dashboard-gridet.

## Endringer

- Selve `<Tile title="Innsidehandler">` er nå lagt inn øverst i `main`-gridet.
- Parser-fixene fra forrige pakke er beholdt:
  - IssuerID leses fra meldingssiden
  - 1,200 / 9,000 tolkes som 1200 / 9000
  - parseren bruker selve meldingsinnholdet

## Test

1. Deploy pakken
2. Kjør `/api/insider-trades?action=update`
3. Kjør `/api/insider-trades`
4. Refresh dashboardet / test i inkognito
