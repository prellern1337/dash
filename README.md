# Marked Dashboard PWA — no-store metrics fix

Dette fikser at dashboardet eller `/api/nibor` kan vise gammel NIBOR/STIBOR etter at ny verdi er lagret.

## Endringer

- `/api/nibor` bruker `Cache-Control: no-store, max-age=0`
- `/api/stibor` bruker `Cache-Control: no-store, max-age=0`
- Frontend henter:
  - `/api/nibor?ts=...`
  - `/api/stibor?ts=...`
  med `cache: "no-store"`
- `/api/update-rates` beholder direct-handler fixen
- STIBOR vises med 2 desimaler

## Test etter deploy

1. `/api/health` skal vise `package: no-store-metrics-fix`
2. `/api/nibor?ts=123` skal vise siste lagrede NIBOR, f.eks. 4.56
3. Refresh dashboardet
