# Market Dashboard — US close index workflow fix

Denne pakken justerer `update-indices.yml`.

## Hvorfor

S&P 500, Nasdaq 100, Dow Jones og VIX var ikke oppdatert etter 12. juni fordi indeks-workflowen kun kjørte ca. 18:15 norsk sommertid.

På det tidspunktet er USA-markedet fortsatt åpent, så kilden kan fortsatt bare ha siste fullførte close fra forrige handelsdag.

## Endring

`update-indices.yml` kjører nå to ganger per ukedag:

- `15 16 * * 1-5`
  - ca. 18:15 norsk sommertid
  - bra for DNB-fond, Oslo/Norden/Europa

- `30 22 * * 1-5`
  - ca. 00:30 norsk sommertid
  - etter US close
  - bra for S&P 500, Nasdaq 100, Dow Jones og VIX

## Etter deploy

Kjør gjerne `Update market indices` manuelt én gang, men S&P/Nasdaq får normalt ny full close først etter USA-stenging.

Sjekk:

`/api/indices`
