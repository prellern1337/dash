# Market Dashboard — DNB funds daily close update

Denne pakken bygger videre på DNB-funds-v1, men justerer oppdateringsfrekvensen.

## Endring

DNB-fond oppdateres nå én gang per ukedag, ikke fire ganger daglig.

Workflow:

`.github/workflows/update-indices.yml`

Cron:

`15 16 * * 1-5`

Det betyr omtrent:

- 18:15 norsk sommertid
- 17:15 norsk vintertid

Dette er valgt fordi fonds-NAV/kurs normalt publiseres én gang per dag. Flere daglige kjøringer gir derfor normalt ikke flere datapunkter.

## Etter deploy

Kjør eventuelt workflowen manuelt én gang:

`Update market indices`

eller åpne:

`/api/indices?action=update`

Deretter sjekk:

`/api/indices`
