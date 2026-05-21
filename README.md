# Marked Dashboard PWA — STIBOR via Trading Economics

Denne pakken bruker Trading Economics som praktisk kilde for svensk 3M interbank/STIBOR.

## STIBOR

- `/api/update-stibor`
  - henter `https://tradingeconomics.com/sweden/interbank-rate`
  - parser Latest/Actual Sweden Interbank Rate
  - lagrer verdien i Supabase som `stibor_3m`
  - merk: tallet ser avrundet ut til to desimaler hos Trading Economics
  - Trading Economics oppgir SFBF som kilde

- `/api/stibor`
  - leser siste Trading Economics-baserte STIBOR-verdi fra Supabase
  - hvis siste update feilet, viser den error i stedet for gammel verdi

- `/api/update-rates`
  - oppdaterer både NIBOR og STIBOR

## Test etter deploy

1. `/api/health`
2. `/api/update-stibor`
3. `/api/stibor`
4. `/api/update-rates`
