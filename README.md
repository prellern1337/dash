# Marked Dashboard PWA — SB1 NIBOR source

Denne pakken bruker SpareBank 1 Markets Morgenrapport Renter og Valuta som praktisk åpen kilde for 3M NIBOR.

## NIBOR-flyt

- `/api/update-nibor`
  - henter PDF fra SpareBank 1 Markets
  - parser 3M NIBOR
  - lagrer resultatet i Supabase-tabellen `market_metrics`
  - lagrer feilstatus hvis henting/parsing feiler, men overskriver ikke sist vellykkede verdi

- `/api/nibor`
  - leser siste vellykkede `nibor_3m` fra Supabase
  - viser `stale` dersom siste kjøring feilet etter siste gode verdi

## Test etter deploy

1. `/api/health`
2. `/api/update-nibor`
3. `/api/nibor`

## Environment variables i Vercel

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Cron

Ingen `vercel.json` i denne pakken. Når manuell test fungerer, kan vi legge til ukentlig cron etterpå.


## UI fix

NIBOR tile loading/fallback labels now say SpareBank 1 Markets instead of UNION.
If the browser still shows UNION after deploy, clear PWA/site data or test in incognito.
