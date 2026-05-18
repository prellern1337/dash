# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- EUR/NOK, USD/NOK og SEK/NOK normaliseres til NOK per 1 valutaenhet
- 30-dagers endring vises fra NOK-perspektiv
- 3-års valutahistorikk vises i overlay-graf
- Øvrige tall er fortsatt mock-data

## Kjør lokalt

```bash
npm install
npm run dev
```

Merk: `/api/fx` kjører som Vercel Function i Vercel. Lokalt kan du enten teste live-deployen eller bruke `vercel dev`.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.

## Neste steg

1. Koble på STIBOR.
2. Koble på UNION yielder.
3. Koble på SEB swap-rates.
4. Koble på Newsec PDF-yielder.
5. Koble på Akershus Eiendom.
