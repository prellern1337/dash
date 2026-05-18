# Marked Dashboard PWA

Dette er første deploybare versjon av mobil-dashboardet. Den bruker foreløpig mock-data, men er strukturert slik at ekte API-er/scrapere kan kobles på senere.

## Kjør lokalt

```bash
npm install
npm run dev
```

Åpne deretter URL-en som vises i terminalen.

## Bygg produksjonsversjon

```bash
npm run build
npm run preview
```

## Deploy

Enkel rute:
1. Last prosjektet opp til et GitHub-repo.
2. Importer repoet i Vercel.
3. Deploy.

Alternativt med Vercel CLI:

```bash
npm i -g vercel
vercel --prod
```

## PWA

Appen har:
- manifest
- ikonfiler
- portrait orientation
- standalone display
- automatisk service worker via vite-plugin-pwa

På mobil:
- Android/Chrome: åpne nettsiden -> meny -> Legg til på startsiden
- iPhone/Safari: del-knappen -> Legg til på Hjem-skjerm

## Neste steg

1. Koble på Norges Bank FX.
2. Bytte mock-data til API-respons.
3. Legge til enkel backend/cache.
4. Legge til scheduled jobs for datainnhenting.
