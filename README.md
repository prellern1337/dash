# Marked Dashboard PWA — Akershus debug

Denne pakken legger til et midlertidig debug-endepunkt:

```text
/api/debug-akershus-yields
```

Det skriver ikke til Supabase. Det viser:
- hvilke Akershus-elementer som finnes
- hva som skjer etter klikk på Kontor/Logistikk/Handel/Lager/Retail/Office
- yield-kandidater i teksten
- relevante nettverksresponser

## Test

1. `/api/health` skal vise `package: akershus-debug`
2. Kjør `/api/debug-akershus-yields`
3. Send JSON-responsen tilbake for analyse
