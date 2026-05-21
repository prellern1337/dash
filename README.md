# Market Dashboard — insider overlay open button fix

Endring:
- I Innsidehandler-overlayen er link-ikonet byttet til en tydelig `Åpne`-knapp.
- Knappen bruker `window.open(...)` på klikk, som er mer robust i overlay/PWA.
- Beholder konservativ parser og tidligere STIBOR/innsidehandel-fixer.

Test:
1. Deploy pakken.
2. Åpne dashboardet med `?v=insider-open-button`.
3. Trykk Innsidehandler-tilen.
4. Klikk `Åpne` på en rad i overlayen.
