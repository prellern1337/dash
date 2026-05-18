# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes live fra SFBF via `/api/stibor`
- Hvis SFBF blokkerer serverkallet, returnerer API-et sist verifiserte SFBF-verdi:
  - 15 May 2026
  - 3 Months
  - 2.003 %
- Fallback vises som "siste verifiserte", ikke som 0 og ikke som grønn live-status.
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

1. Legge inn database/cache for sist vellykket STIBOR-kall.
2. Koble på UNION yielder.
3. Koble på SEB swap-rates.
4. Koble på Newsec PDF-yielder.
5. Koble på Akershus Eiendom.
6. Koble på NIBOR fra UNION PDF.
