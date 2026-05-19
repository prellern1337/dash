# Marked Dashboard PWA — SEB swaps live

Denne pakken kobler SEB swap-tilene til et nytt API-endepunkt:

```text
/api/swaps
```

Det henter `Swap [NOK]` og `Swap [SEK]` fra SEB-siden og trekker ut:

- 3 Yr
- 5 Yr
- 10 Yr

Dashboardet kaller `/api/swaps` ved pageload.

## Test etter deploy

1. `/api/health` skal vise `package: seb-swaps-live`
2. `/api/swaps` skal returnere JSON med `data.NOK.rates` og `data.SEK.rates`
3. Hvis parsing feiler, test `/api/debug-seb-swaps`

## NIBOR

NIBOR er fortsatt basert på SpareBank 1 Markets + Supabase.
