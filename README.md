# Marked Dashboard PWA — Newsec/Akershus yields

Denne pakken flytter prime yield til Supabase og legger til Newsec og Akershus.

## Nye endepunkter

- `/api/update-yields`
  - henter UNION M2
  - henter Newsec siste Yieldtabell PDF
  - prøver å hente Akershus Eiendom nøkkeltall med rendret side
  - lagrer alle verdier i Supabase

- `/api/yields`
  - leser siste lagrede verdier
  - beregner snitt per segment
  - returnerer kildetabell til overlay

## Workflow

`.github/workflows/update-yields.yml`

Kjører ukentlig og kan kjøres manuelt.

## Test etter deploy

1. `/api/health`
2. `/api/update-yields`
3. `/api/yields`
4. Refresh dashboard
