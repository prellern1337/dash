# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- Yield-data hentes **ikke** hver gang appen åpnes.
- `/api/yields` leser bare lagret data fra:
  - `public/data/yields.json`
- Yield-data oppdateres automatisk av GitHub Actions:
  - `scripts/update-yields.mjs`
  - `.github/workflows/update-yields.yml`
- Workflowen kjører onsdager kl. 13:30 UTC, men scriptet skipper hvis siste vellykkede oppdatering er nyere enn 10 dager. Det gir omtrent annenhver uke.
- Workflow kan også kjøres manuelt fra GitHub Actions.
- Første datafil er seedet med siste kjente tall:
  - UNION: 4,75 / 5,00 / 5,25
  - Newsec: 4,50 / 5,25 / 5,25
  - Akershus: 4,50 / 4,50 / 5,25
- Når GitHub Action kjører, overskrives seed-data med automatisk hentede verdier.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.
