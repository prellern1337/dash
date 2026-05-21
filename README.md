# Marked Dashboard PWA — yield parser/average fix

Denne pakken fikser to ting:

1. `/api/yields` beregner snitt bare av faktiske tall.
   Null/manglende kilder telles ikke lenger som 0.

2. `/api/update-yields` er mer robust:
   - Newsec PDF-parser tåler flere radnavn/varianter
   - Akershus prøver segmenter mer fleksibelt og lagrer partial results

## Test etter deploy

1. `/api/health` skal vise `package: yields-parser-average-fix`
2. Kjør `/api/update-yields`
3. Sjekk `/api/yields`
4. Refresh dashboard
