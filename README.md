# Market Dashboard — insider tile bottom + zero fix

Denne pakken fikser innsidehandel-tilen:

- Bred Innsidehandler-tile ligger nederst i dashboard-gridet.
- Aksjer = 0/null/ugyldig vises som `—`, ikke som `0`.
- Parser-fixene er beholdt:
  - IssuerID leses fra meldingssiden
  - 1,200 / 9,000 tolkes som 1200 / 9000
  - parseren bruker selve meldingsinnholdet

## Test

1. Deploy pakken
2. Kjør `/api/insider-trades?action=update`
3. Kjør `/api/insider-trades`
4. Refresh dashboardet, gjerne med `?v=insider-bottom`
