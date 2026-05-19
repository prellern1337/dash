# Marked Dashboard PWA — STIBOR Supabase update

Denne pakken flytter STIBOR over på samme robuste modell som NIBOR:

- `/api/update-stibor`
  - henter 3M STIBOR fra SFBF
  - lagrer verdi i Supabase som `stibor_3m`
  - lagrer feilstatus hvis henting/parsing feiler

- `/api/stibor`
  - leser siste vellykkede `stibor_3m` fra Supabase

- `/api/update-rates`
  - kjører både `/api/update-nibor` og `/api/update-stibor`

- `vercel.json`
  - har én cron-jobb: `/api/update-rates` hver dag kl. 08:30 UTC

## Test etter deploy

1. `/api/health`
2. `/api/update-stibor`
3. `/api/stibor`
4. `/api/update-rates`
