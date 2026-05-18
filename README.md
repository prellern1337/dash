# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes live via `/api/stibor`
  - Primærkilde: Riksbankens SWEA API-serie `SEDP3MSTIBORDELAYC`
  - Fallback: SFBF sin STIBOR-side
- EUR/NOK, USD/NOK og SEK/NOK normaliseres til NOK per 1 valutaenhet
- 30-dagers endring vises fra NOK-perspektiv
- 3-års valutahistorikk vises i overlay-graf
- Øvrige tall er fortsatt mock-data

## Kjør lokalt

```bash
npm install
npm run dev
```

Merk: API-funksjonene kjører som Vercel Functions i Vercel. Lokalt kan du teste med `vercel dev`.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.

## Neste steg

1. Koble på UNION yielder.
2. Koble på SEB swap-rates.
3. Koble på Newsec PDF-yielder.
4. Koble på Akershus Eiendom.
5. Koble på NIBOR fra UNION PDF.
