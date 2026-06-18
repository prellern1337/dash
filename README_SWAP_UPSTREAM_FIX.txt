SWAP upstream fix - 2026-06-18

Problem:
SEBs direkte JSON-endepunkt svarer teknisk OK, men returnerer 1.00 for 3Y, 5Y og 10Y for både NOK og SEK. Tidligere ble dette tolket som gyldige SWAP-renter.

Fix:
lib/update-swaps.js avviser nå direkte SEB API hvis alle ønskede tenorer for en valuta er nøyaktig 1.00 %. Da tvinges fallback til rendret SEB-side. Hvis også fallback gir 1.00 %, lagres error-rader og appen beholder siste gyldige observasjon.

Etter deploy:
1) Kjør /api/swaps?action=debug-swaps
2) Sjekk build: seb-swaps-upstream-placeholder-fallback-v3-2026-06-18
3) Hvis preferredFetch inneholder riktige verdier: kjør /api/swaps?action=update
4) Sjekk /api/swaps
