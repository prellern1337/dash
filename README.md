# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- UNION M2 prime yield hentes live via `/api/yields`
- 3M NIBOR er flyttet til Supabase-lagring:
  - `/api/update-nibor` kjøres ukentlig via Vercel Cron
  - Oppdateringsjobben prøver først siste UNION Nøkkeltall-PDF fra `https://union.no/analyse`
  - Hvis PDF-parsing feiler, prøver den UNIONs nøkkeltallside som HTML-fallback
  - Hvis begge feiler, lagres feilen, men siste vellykkede verdi beholdes
  - `/api/nibor` leser siste vellykkede verdi fra Supabase
- Newsec og Akershus Eiendom vises som "ikke koblet" og kobles på senere.

## Environment variables

Vercel må ha:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Første initialisering

Etter deploy må `/api/update-nibor` kjøres én gang manuelt for å fylle Supabase første gang.
Deretter kjører Vercel Cron ukentlig.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.


## PWA API-route fix

Service worker is configured with `navigateFallbackDenylist: [/^\/api\//]` so browser navigation to `/api/*` is not served the React app shell.


## Cron temporarily disabled

`vercel.json` is removed in this package to avoid deployment failure while we test the Supabase-backed API routes manually.
We can re-add scheduled cron jobs after `/api/update-nibor` and `/api/nibor` work in production.


## NIBOR rendered scraper

`/api/update-nibor` now uses a rendered-browser scraper with `puppeteer-core` and `@sparticuz/chromium`.
It tries:
1. Render `union.no/analyse` and find latest Nøkkeltall PDF.
2. Parse NIBOR 3m from that PDF.
3. If that fails, render `union.no/naering/analyse/nokkeltall` and parse 3m NIBOR from visible text.


## Puppeteer timeout fix

Replaced `page.waitForTimeout(1500)` with a standard Promise-based delay for compatibility with newer `puppeteer-core` versions.
