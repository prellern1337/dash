# Marked Dashboard PWA — STIBOR Riksbank primary

Denne pakken endrer STIBOR-oppdateringen:

- Primærkilde: Riksbankens åpne API-serie `SEDP3MSTIBORDELAYC`
- Sekundærkilde: SFBF public STIBOR-side, hvis den ikke rate-limiter
- `/api/update-stibor` lagrer ny `stibor_3m` i Supabase
- `/api/stibor` leser siste vellykkede verdi fra Supabase
- `/api/update-rates` kjører både NIBOR og STIBOR
- `/api/debug-riksbank-stibor` kan brukes hvis API-parseren må debugges

## Test etter deploy

1. `/api/health`
2. `/api/debug-riksbank-stibor`
3. `/api/update-stibor`
4. `/api/stibor`
5. `/api/update-rates`
