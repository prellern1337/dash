# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- UNION M2 prime yield hentes live via `/api/yields`
  - Kontor: `https://m2.union.no/segmenter/kontor`
  - Handel: `https://m2.union.no/segmenter/handel`
  - Logistikk: `https://m2.union.no/segmenter/logistikk`
- Newsec og Akershus Eiendom vises som "ikke koblet" i yield-overlayen og kobles på senere.
- `vercel.json` legger inn en cron-jobb for `/api/yields` hver onsdag kl. 13:30 UTC.

## Kjør lokalt

```bash
npm install
npm run dev
```

API-funksjonene kjører som Vercel Functions i Vercel. Lokalt kan du teste med `vercel dev`.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.
