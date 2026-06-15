# Market Dashboard — SEB swaps intraday schedule + previous-close change

Denne pakken justerer SWAP-oppsettet.

## Workflow

`update-swaps.yml` er oppdatert til å kjøre fire ganger per ukedag:

`07:00, 10:00, 13:00 og 15:00 UTC`

Dette tilsvarer omtrent:

- 09:00, 12:00, 15:00 og 17:00 norsk sommertid
- 08:00, 11:00, 14:00 og 16:00 norsk vintertid

Workflowen peker nå til stabil app-URL:

`https://dash-eight-topaz.vercel.app/api/swaps?action=update`

## SWAP tile-endring

SWAP-tilene viser nå rød/grønn pil og bps-endring for hver tenor:

- Rød pil opp = renten er høyere enn closing forrige arbeidsdag
- Grønn pil ned = renten er lavere enn closing forrige arbeidsdag

Sammenligningen gjøres slik:

`siste observasjon - siste daglige closing før dagens observasjonsdato`

## API

`/api/swaps` returnerer nå også:

`data.NOK.changes`
`data.SEK.changes`

med blant annet:

- `bps`
- `previousClose`
- `previousDate`
- `latestValue`
- `latestDate`

## Test etter deploy

1. Kjør:
   `/api/swaps?action=update`

2. Sjekk:
   `/api/swaps`

3. Refresh dashboard:
   `?v=swaps-intraday-change`

4. Sjekk at SWAP NOK/SEK viser rød/grønn pil/bp i radene.
