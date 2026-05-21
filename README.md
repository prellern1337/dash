# Marked Dashboard PWA — Akershus yield fix

Denne pakken fikser Akershus-yieldene ved å lese kun teksten i `#segment-dive`
etter segmentklikk, i stedet for hele siden.

## Akershus mapping

- Kontor: første `Prime yield` i Kontor-segmentet
- Logistikk: første `Prime yield` i Logistikk-segmentet
- Handel: `Prime yield high street`

Debug-outputen viste at:
- Logistikk-segmentet har `Prime yield 5,25%`
- Handel-segmentet har `Prime yield high street 4,50%`, `Prime yield kjøpesenter 5,75%` og `Prime yield big box 5,75%`

## Test etter deploy

1. `/api/health` skal vise `package: akershus-yield-fix`
2. Kjør `/api/update-yields`
3. Sjekk `/api/yields`
