# Marked Dashboard PWA — clean full package

Dette er en komplett, ryddet prosjektpakke. Den skal brukes for å overskrive filer som kan ha blitt blandet i GitHub.

## Viktig

Denne pakken har bevisst ikke `vercel.json`. Cron legges tilbake etter at API-ene fungerer stabilt.

## Etter deploy

Test først:

```text
/api/health
```

Deretter:

```text
/api/debug-union-nibor
```

Og så:

```text
/api/update-nibor
/api/nibor
```

## Environment variables i Vercel

Kreves for Supabase/API-lagring:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Filer som må ligge i repo root

```text
api/
public/
src/
index.html
package.json
postcss.config.js
tailwind.config.js
vite.config.js
README.md
```
