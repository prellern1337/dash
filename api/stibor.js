function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function normaliseDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const dateMatch = text.match(/(\d{1,2})\s+([A-Za-zÅÄÖåäö]+)\s+(\d{4})/);
  if (!dateMatch) return text;

  const [, day, monthName, year] = dateMatch;
  const monthMap = {
    jan: "01", january: "01", januari: "01",
    feb: "02", february: "02", februari: "02",
    mar: "03", march: "03", mars: "03",
    apr: "04", april: "04",
    may: "05", maj: "05",
    jun: "06", june: "06", juni: "06",
    jul: "07", july: "07", juli: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10", okt: "10", oktober: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  const month = monthMap[monthName.toLowerCase()];
  if (!month) return text;

  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStibor3mFromSfbfHtml(html) {
  const text = htmlToText(html);

  // The public SFBF table normally renders as:
  // Calculation Date | Tenor | Fixing Rate
  // 15 May 2026 | 3 Months | 2.003
  const tableRowPattern =
    /(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})\s+3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)/i;

  const tableRowMatch = text.match(tableRowPattern);
  if (tableRowMatch) {
    const value = parseNumber(tableRowMatch[2]);
    if (Number.isFinite(value)) {
      return {
        value,
        date: normaliseDate(tableRowMatch[1]),
      };
    }
  }

  // Fallback for layouts where the row is not rendered in strict order.
  const loosePattern =
    /3\s*Months?[^0-9+-]{0,80}([-+]?\d+(?:[.,]\d+)?)/i;

  const looseMatch = text.match(loosePattern);
  if (looseMatch) {
    const value = parseNumber(looseMatch[1]);
    const nearbyDate = text.match(/(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})/);
    if (Number.isFinite(value)) {
      return {
        value,
        date: nearbyDate ? normaliseDate(nearbyDate[1]) : null,
      };
    }
  }

  throw new Error("Fant ikke raden for 3 Months STIBOR på SFBF-siden.");
}

async function fetchFromSfbf() {
  const sourceUrl = "https://swfbf.se/stibor/rates/";

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`SFBF svarte med ${response.status}.`);
  }

  const html = await response.text();
  const observation = extractStibor3mFromSfbfHtml(html);

  return {
    value: observation.value,
    date: observation.date,
    sourceName: "SFBF",
    sourceUrl,
    method: "scrape",
  };
}

export default async function handler(request, response) {
  try {
    const stibor = await fetchFromSfbf();

    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    response.status(200).json({
      status: "ok",
      tenor: "3M",
      currency: "SEK",
      value: stibor.value,
      date: stibor.date,
      unit: "%",
      sourceName: stibor.sourceName,
      sourceUrl: stibor.sourceUrl,
      method: stibor.method,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      tenor: "3M",
      currency: "SEK",
      unit: "%",
      sourceName: "SFBF",
      sourceUrl: "https://swfbf.se/stibor/rates/",
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av STIBOR.",
    });
  }
}
