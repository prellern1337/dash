# Market Dashboard — indices Yahoo primary fix

Denne pakken fikser at S&P 500 / Nasdaq 100 / Dow Jones / VIX ikke oppdaterte seg selv om Yahoo hadde nyere close.

## Problem

For flere amerikanske indekser brukte `api/indices.js` Stooq som primærkilde og Yahoo kun som fallback hvis Stooq feilet. Hvis Stooq svarte OK, men hang etter på dato, ble Yahoo aldri brukt.

## Fix

For indekser som har `yahooSymbol`, brukes nå Yahoo som primærkilde og Stooq som fallback.

Dette gjelder blant annet:

- S&P 500
- Nasdaq 100
- Dow Jones
- DAX / Euro Stoxx 50 / VIX der Yahoo-symbol finnes

## Etter deploy

Kjør:

`/api/indices?action=update`

Sjekk deretter:

`/api/indices`

Build-markør:

`indices-yahoo-primary-v1-2026-06-16`
