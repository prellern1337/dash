# Marked Dashboard PWA — yield warning UI fix

Denne pakken endrer kun frontend-varselet som fortsatt sa at Newsec og Akershus ikke var koblet på.

## Endring

Varselteksten er endret fra:

"Newsec og Akershus Eiendom er ikke koblet på ennå..."

til en nøytral aktiv-status:

"Prime yield hentes nå fra UNION, Newsec og Akershus..."

## Test etter deploy

1. `/api/health` skal vise `package: yield-warning-ui-fix`
2. Refresh dashboardet
