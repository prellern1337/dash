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


## NIBOR PDF parser note

This version imports `pdf-parse/lib/pdf-parse.js` directly via `createRequire`.
This avoids the package main entry's debug/test path in Vercel/serverless builds.
