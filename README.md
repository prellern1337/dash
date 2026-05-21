# Market Dashboard — insider trades timeout fix

Denne pakken gjør innsidehandel-endepunktet lettere slik at det ikke timeouter på Vercel.

## Endringer

- `/api/insider-trades?action=update` scraper maks 10 meldinger per kjøring
- kortere ventetider i headless browser
- søker 14 dager bakover
- `/api/health` er fjernet for å holde oss under Vercel Hobby-grensen

## Test

1. Deploy pakken
2. Kjør `/api/insider-trades?action=update`
3. Kjør `/api/insider-trades`
4. Refresh dashboardet

Hvis workflow fortsatt gir 504, må vi splitte jobben i enda mindre steg eller flytte selve NewsWeb-scrapingen til GitHub Actions.
