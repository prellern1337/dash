import { insertMetric, getLatestMetric } from "../lib/supabase.js";

const METRIC_KEY = "stibor_3m";
const TE_STIBOR_URL = "https://tradingeconomics.com/sweden/interbank-rate";
const MAX_OBSERVATION_AGE_DAYS = 7;

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function monthNameToNumber(monthName) {
  const map = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  return map[String(monthName || "").toLowerCase()] || null;
}

function normaliseDateFromText(day, monthName, year) {
  const month = monthNameToNumber(monthName);
  if (!month) return null;
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function daysSince(dateString) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const observed = new Date(`${dateString}T12:00:00Z`);
  return (Date.now() - observed.getTime()) / (1000 * 60 * 60 * 24);
}

function extractTradingEconomicsStibor(html) {
  const text = htmlToText(html);

  // Main sentence currently renders like:
  // "Interbank Rate in Sweden decreased to 2 percent on Tuesday May 19 from 2.02 in the previous day."
  const sentencePattern =
    /Interbank Rate in Sweden (?:decreased|increased|remained unchanged|was unchanged|fell|rose)?\s*(?:to|at)?\s*([-+]?\d+(?:[.,]\d+)?)\s*percent\s+on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*([A-Za-z]+)\s+(\d{1,2})/i;

  const sentenceMatch = text.match(sentencePattern);
  if (sentenceMatch) {
    const value = parseNumber(sentenceMatch[1]);
    const monthName = sentenceMatch[2];
    const day = sentenceMatch[3];

    // Find year close to the page title/date context. The page text includes dates range 1992 - 2026.
    const currentYear = new Date().getUTCFullYear();
    const date = normaliseDateFromText(day, monthName, currentYear);

    if (Number.isFinite(value) && value > -10 && value < 30) {
      return {
        value,
        observedDate: date,
        method: "trading_economics_sentence",
        rawSnippet: sentenceMatch[0],
      };
    }
  }

  // Related table variant:
  // "Interbank Rate 2.00 2.02 percent May 2026"
  const tablePattern =
    /Interbank Rate\s+([-+]?\d+(?:[.,]\d+)?)\s+[-+]?\d+(?:[.,]\d+)?\s+percent\s+([A-Za-z]+)\s+(20\d{2})/i;

  const tableMatch = text.match(tablePattern);
  if (tableMatch) {
    const value = parseNumber(tableMatch[1]);
    const month = monthNameToNumber(tableMatch[2]);
    const year = tableMatch[3];
    const date = month ? `${year}-${month}-01` : null;

    if (Number.isFinite(value) && value > -10 && value < 30) {
      return {
        value,
        observedDate: date,
        method: "trading_economics_table",
        rawSnippet: tableMatch[0],
      };
    }
  }

  // Summary table:
  // "Actual Previous Highest Lowest Dates Unit Frequency 2.00 2.02 ..."
  const actualPattern =
    /Actual Previous Highest Lowest Dates Unit Frequency\s+([-+]?\d+(?:[.,]\d+)?)/i;

  const actualMatch = text.match(actualPattern);
  if (actualMatch) {
    const value = parseNumber(actualMatch[1]);
    if (Number.isFinite(value) && value > -10 && value < 30) {
      return {
        value,
        observedDate: null,
        method: "trading_economics_actual_table",
        rawSnippet: actualMatch[0],
      };
    }
  }

  throw new Error("Fant ikke Sweden Interbank Rate Latest på Trading Economics-siden.");
}

async function fetchStiborFromTradingEconomics() {
  const response = await fetch(TE_STIBOR_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8,nb;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Trading Economics svarte med HTTP ${response.status}.`);
  }

  const html = await response.text();
  const observation = extractTradingEconomicsStibor(html);

  if (observation.observedDate) {
    const age = daysSince(observation.observedDate);
    if (age > MAX_OBSERVATION_AGE_DAYS) {
      throw new Error(`Trading Economics STIBOR-verdi er for gammel: ${observation.observedDate}, ${age.toFixed(1)} dager.`);
    }
  }

  return observation;
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const observation = await fetchStiborFromTradingEconomics();

    const saved = await insertMetric({
      metric_key: METRIC_KEY,
      value: observation.value,
      unit: "%",
      source_name: "Trading Economics Sweden Interbank Rate",
      source_url: TE_STIBOR_URL,
      source_document: "Sweden Three Month Interbank Rate",
      observed_date: observation.observedDate,
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: {
        method: observation.method,
        rawSnippet: observation.rawSnippet,
        note: "Trading Economics value appears rounded; original source shown by Trading Economics is SFBF.",
      },
    });

    response.status(200).json({
      status: "ok",
      metricKey: METRIC_KEY,
      saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: "%",
      source_name: "Trading Economics Sweden Interbank Rate",
      source_url: TE_STIBOR_URL,
      source_document: "Sweden Three Month Interbank Rate",
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: {
        method: "trading_economics_fetch",
      },
    });

    const { latestGood } = await getLatestMetric(METRIC_KEY);

    response.status(200).json({
      status: "error",
      metricKey: METRIC_KEY,
      message,
      latestGood,
    });
  }
}
