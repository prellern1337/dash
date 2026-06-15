# Market Dashboard — indices syntax fix

Denne pakken fikser at alle indekser forsvant etter DNB-fond-endringen.

## Feil

`api/indices.js` hadde en syntaksfeil i `INDICES`-listen:

`},,`

etter VIX og før DNB-fondene.

Det gjorde at hele `/api/indices` krasjet, og dermed forsvant alle indeks-tiles.

## Fix

Dobbel-kommaen er fjernet.

## Sjekket

`node --check api/indices.js` er kjørt og passerer.

## Etter deploy

1. Sjekk `/api/indices`
2. Sjekk at markedsindekser + DNB-fond vises igjen
3. Kjør eventuelt `/api/indices?action=update`
