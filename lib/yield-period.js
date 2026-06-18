const NORWEGIAN_MONTHS = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

function inferMonthYear(monthIndex, now) {
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  // A source still showing December in January belongs to the previous year.
  return monthIndex > currentMonth + 1 ? currentYear - 1 : currentYear;
}

export function normaliseYieldPeriod(value, now = new Date()) {
  const clean = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^kilde:\s*union\s+per\s+/i, "")
    .replace(/^per\s+/i, "")
    .trim();

  if (!clean) return null;

  const quarter = clean.match(/\bQ\s*([1-4])\s*[-/]?\s*(20\d{2})\b/i);
  if (quarter) return `Q${quarter[1]} ${quarter[2]}`;

  const monthPattern = new RegExp(`\\b(${NORWEGIAN_MONTHS.join("|")})\\b(?:\\s+(20\\d{2}))?`, "i");
  const month = clean.match(monthPattern);

  if (month) {
    const monthName = month[1].toLowerCase();
    const monthIndex = NORWEGIAN_MONTHS.indexOf(monthName);
    const year = month[2] || inferMonthYear(monthIndex, now);
    return `${monthName} ${year}`;
  }

  return clean;
}

export function periodFromNewsecDocument(documentName, now = new Date()) {
  const match = String(documentName || "").match(/\bQ\s*[1-4]\s*[-/]?\s*20\d{2}\b/i);
  return match ? normaliseYieldPeriod(match[0], now) : null;
}

export function extractUnionPeriod(sourceText, now = new Date()) {
  const match = String(sourceText || "").match(
    /Prime\s+yield[\s\S]{0,120}?Kilde:\s*UNION\s+per\s+(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)(?:\s+(20\d{2}))?\.?/i
  );

  return match ? normaliseYieldPeriod(`${match[1]} ${match[2] || ""}`, now) : null;
}

export function extractAkershusPeriod(pageText, now = new Date()) {
  const match = String(pageText || "").match(
    /\bPer\s+(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)(?:\s+(20\d{2}))?/i
  );

  return match ? normaliseYieldPeriod(`${match[1]} ${match[2] || ""}`, now) : null;
}
