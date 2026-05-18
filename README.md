# Marked Dashboard PWA

Mobiltilpasset PWA-dashboard for renter, valuta og eiendomsyield.

## Status i denne versjonen

- Valutakurser hentes live fra Norges Bank via `/api/fx`
- 3M STIBOR hentes fra SFBF via `/api/stibor`
- Prime yield hentes via `/api/yields`
  - UNION M2: Kontor, Handel, Logistikk
  - Newsec: forsøker å parse siste yieldtabell-PDF
  - Akershus Eiendom: forsøker livehenting via headless browser fra `https://akershuseiendom.no/markedsinnsikt/nokkeltall`
- Dersom Akershus livehenting feiler, returneres sist verifiserte verdier fra skjermbilder per mai 2026:
  - Kontor: 4,50 %
  - Handel: 4,50 %
  - Logistikk: 5,25 %
- Yield-tilen viser snitt av kilder som er live eller sist verifisert.
- `vercel.json` legger inn en cron-jobb for `/api/yields` hver onsdag kl. 13:30 UTC.

## Deploy

Når filer committes til GitHub, deployer Vercel automatisk.
