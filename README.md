# Market Dashboard — update cadence and FX cache fix

Denne pakken samler oppdateringsoppsettet litt bedre.

## Endringer

### NIBOR / STIBOR
`update-rates.yml` kjører nå fire ganger per ukedag:

`07:00, 10:00, 13:00 og 15:00 UTC`

Omtrent:

- 09:00, 12:00, 15:00 og 17:00 norsk sommertid
- 08:00, 11:00, 14:00 og 16:00 norsk vintertid

### Newsfeed
`update-news.yml` kjører nå fire ganger per ukedag:

`07:05, 10:05, 13:05 og 15:05 UTC`

### Valuta
`/api/fx` henter fortsatt direkte fra Norges Bank, men responsen er nå satt til:

`Cache-Control: no-store`

og appen kaller:

`/api/fx?ts=...`

Dette reduserer risikoen for at appen viser en cachet valutakurs.

### Domener
Workflows er samkjørt mot stabil app-URL:

`https://dash-eight-topaz.vercel.app`

## Viktig

Valuta/Norges Bank kan fortsatt vise forrige arbeidsdag tidlig på dagen dersom Norges Bank ikke har publisert dagens observasjon ennå.

## Etter deploy

Kjør gjerne disse manuelt én gang fra Actions:

- Update rates
- Update newsfeed
- Update SEB swaps

Sjekk deretter:

- `/api/rates?type=nibor`
- `/api/rates?type=stibor`
- `/api/news`
- `/api/fx`
