# Market Dashboard — Newsfeed tile

Denne pakken legger til en dynamisk nyhetsfeed.

## Ny API-fil

`api/news.js`

API-antall går fra 7 til 8 filer.

## Endepunkter

- `/api/news`
  - leser de 15 mest relevante lagrede artiklene fra Supabase
- `/api/news?action=update`
  - henter nye saker, scorer relevans og lagrer i Supabase

## Kilder

- DN: RSS
- E24: RSS
- Finansavisen: HTML/listing fallback, fordi Finansavisen ikke publiserer RSS
- Estate: RSS-forsøk + HTML fallback

## Scoring

Artikler scores automatisk basert på:
- renter / Norges Bank / inflasjon
- yield / eiendom / transaksjoner
- finansiering / bank / obligasjoner
- børs / aksjer / marked
- ferskhet
- kildeboost for Estate og Finansavisen

Ingen betalt AI/API brukes i første versjon.

## UI

Ny bred tile:

`Nyhetsfeed`

Radformat:

`Overskrift | Avis | Publisert`

Overskriften er klikkbar og åpner originalkilden.

## Workflow

Ny workflow:

`.github/workflows/update-news.yml`

Kjører tre ganger per ukedag:

`06:15, 10:15 og 14:15 UTC`

## Etter deploy

1. Kjør:
   `/api/news?action=update`

2. Sjekk:
   `/api/news`

3. Refresh dashboard:
   `?v=newsfeed-v1`

## Viktig

Noen artikler kan være bak betalingsmur. Appen viser kun overskrift, kilde, dato og lenke.
