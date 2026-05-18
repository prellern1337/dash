# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- Prime yield hentes via `/api/yields`
  - UNION M2: Kontor, Handel, Logistikk
  - Newsec: forsøker å parse siste yieldtabell-PDF
  - Dersom Newsec PDF-parsing feiler, returneres sist verifiserte Newsec-verdier for Q2 2026:
    - Office Oslo CBD Low: 4,50 %
    - Retail Prime Low: 5,25 %
    - Logistics Prime Low: 5,25 %
- Yield-tilen viser snitt av kilder som er live eller sist verifisert.
- Akershus Eiendom vises som "ikke koblet" i yield-overlayen og kobles på senere.
- `vercel.json` legger inn en cron-jobb for `/api/yields` hver onsdag kl. 13:30 UTC.

## Kjør lokalt

```bash
npm install
npm run dev
```

API-funksjonene kjører som Vercel Functions i Vercel. Lokalt kan du teste med `vercel dev`.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.
