const RIKSBANK_SERIES_ID = "sedp3mstibordelayc";

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function normaliseDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const isoMatch = value.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    const swedishOrEnglishDate = value.match(/(\d{1,2})\s+([A-Za-zÅÄÖåäö]+)\s+(\d{4})/);
    if (swedishOrEnglishDate) {
      const [, day, monthName, year] = swedishOrEnglishDate;
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
      if (month) return `${year}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  return String(value);
}

function findObservationInJson(payload) {
  const candidates = [];

  function visit(value) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const entries = Object.entries(value);
    const lowerKeyMap = new Map(entries.map(([key, val]) => [key.toLowerCase(), val]));

    const possibleValueKeys = [
      "value",
      "obsvalue",
      "obs_value",
      "observationvalue",
      "observation_value",
      "result",
    ];

    const possibleDateKeys = [
      "date",
      "datevalue",
      "date_value",
      "observationdate",
      "observation_date",
      "period",
      "timeperiod",
      "time_period",
      "validfrom",
      "valid_from",
    ];

    let observationValue = null;
    let observationDate = null;

    for (const key of possibleValueKeys) {
      if (lowerKeyMap.has(key)) {
        const numericValue = parseNumber(lowerKeyMap.get(key));
        if (Number.isFinite(numericValue)) {
          observationValue = numericValue;
          break;
        }
      }
    }

    for (const key of possibleDateKeys) {
      if (lowerKeyMap.has(key)) {
        observationDate = normaliseDate(lowerKeyMap.get(key));
        break;
      }
    }

    if (Number.isFinite(observationValue)) {
      candidates.push({
        value: observationValue,
        date: observationDate,
      });
    }

    for (const [, nestedValue] of entries) {
      visit(nestedValue);
    }
  }

  visit(payload);

  if (candidates.length === 0) {
    throw new Error("Fant ingen STIBOR-observasjon i Riksbanken-responsen.");
  }

  // Latest endpoint normally returns one observation. If several are present, use the last dated candidate.
  candidates.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  return candidates[candidates.length - 1];
}

async function fetchFromRiksbank() {
  const sourceUrl = `https://api.riksbank.se/swea/v1/Observations/Latest/${RIKSBANK_SERIES_ID}`;

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MarketDashboardPWA/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Riksbanken API svarte med ${response.status}.`);
  }

  const payload = await response.json();
  const observation = findObservationInJson(payload);

  return {
    value: observation.value,
    date: observation.date,
    sourceName: "Riksbanken",
    sourceUrl,
    method: "api",
  };
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStibor3mFromSfbfHtml(html) {
  const text = htmlToText(html);

  const patterns = [
    /(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})\s+3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)/i,
    /3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)[^\d]{0,40}(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})/i,
    /3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const firstNumber = parseNumber(match[2] || match[1]);
    const possibleDate = normaliseDate(match[1]) || normaliseDate(match[2]);

    if (Number.isFinite(firstNumber)) {
      return {
        value: firstNumber,
        date: possibleDate,
      };
    }
  }

  throw new Error("Fant ikke 3M STIBOR i SFBF HTML.");
}

async function fetchFromSfbf() {
  const sourceUrl = "https://swfbf.se/stibor/rates/";

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 MarketDashboardPWA/1.0",
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

async function fetchStibor() {
  const errors = [];

  try {
    return await fetchFromRiksbank();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    return await fetchFromSfbf();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  throw new Error(`Kunne ikke hente 3M STIBOR. ${errors.join(" | ")}`);
}

export default async function handler(request, response) {
  try {
    const stibor = await fetchStibor();

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
      sourceName: "Riksbanken / SFBF",
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av STIBOR.",
    });
  }
}
