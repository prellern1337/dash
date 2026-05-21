# Marked Dashboard PWA — update-rates direct + STIBOR UI fix

## Endringer

- `/api/update-rates` kaller update-funksjonene direkte i kode:
  - `/api/update-nibor`
  - `/api/update-stibor`
- Dette unngår 401-feil fra interne HTTP-kall i Vercel.
- STIBOR vises med 2 desimaler, fordi Trading Economics-kilden er avrundet til 2 desimaler.
- STIBOR subtitle viser `TE / SFBF · dato`.

## Test etter deploy

1. `/api/health`
2. `/api/update-stibor`
3. `/api/stibor`
4. `/api/update-rates`
