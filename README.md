# Market Dashboard — PWA standalone fix

Denne pakken bygger videre på `stibor-latest-insider-cleanup` og legger til PWA/standalone-oppsett.

## Endringer

- `public/manifest.webmanifest`
  - `display: standalone`
  - `start_url: /?source=pwa`
  - appnavn: Dashboard / Market Dashboard
- iOS-meta i `index.html`
  - `apple-mobile-web-app-capable=yes`
  - `apple-mobile-web-app-title=Dashboard`
  - `apple-touch-icon`
- `public/service-worker.js`
  - lett service worker for installasjon på Android/Chrome
  - network-first/no-cache for å unngå stale dashboard
- `src/main.jsx`
  - registrerer service worker

## Bruk etter deploy

### iPhone
1. Åpne dashboardet i Safari.
2. Trykk Del-knappen.
3. Velg "Legg til på Hjem-skjerm".
4. Åpne dashboardet fra hjemskjerm-ikonet.

### Android
1. Åpne dashboardet i Chrome.
2. Meny → Installer app / Legg til på startsiden.
3. Åpne dashboardet fra ikonet.

Når appen åpnes fra ikonet, skal den vises uten vanlig adressefelt.
