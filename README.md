# Market Dashboard — insider trades parse fix

Denne pakken fikser parseren for innsidehandler:

- Leser IssuerID fra selve meldingssiden, ikke søkeresultat-tabellheader.
- Fikser aksjetall som 1,200 og 9,000 slik at de blir 1200 og 9000.
- Bruker message body, ikke hele søkeresultatlisten, for parsing av type/stilling/aksjer/pris.
- Beholder bred tile og overlay.

## Test

1. Deploy pakken
2. Kjør `/api/insider-trades?action=update`
3. Kjør `/api/insider-trades`
4. Refresh dashboardet. Hvis tile fortsatt ikke vises, test i inkognito/PWA-cache.
