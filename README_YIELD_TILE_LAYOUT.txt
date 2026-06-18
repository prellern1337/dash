Prime Yield tile layout patch

Endring:
- Fjerner tom graa strek / tredje kolonne i Prime Yield-tile.
- Flytter yield-tallene til hoyre side av raden.
- Endrer kun src/index.css.

Merk:
- SWAP-tiles beholdes uendret med bp-endringer til hoyre.
- Patchen er bevisst liten for aa unngaa aa overskrive tidligere API-/SWAP-/DNB-endringer.

Etter deploy:
- Refresh appen hardt hvis gammel CSS ligger i PWA/browser-cache.
