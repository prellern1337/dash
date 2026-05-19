import { insertMetric, getLatestMetric } from "./_lib/supabase.js";

const METRIC_KEY = "stibor_3m";
const RIKSBANK_SERIES_ID = "SEDP3MSTIBORDELAYC";
const RIKSBANK_STIBOR_URL = `https://api.riksbank.se/swea/v1/Observations/Latest/${RIKSBANK_SERIES_ID}`;
const SFBF_STIBOR_URL = "https://swfbf.se/stibor/rates/";

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

function isLikelyDate(value) {
  if (value === null || value === undefined) return false;
  const text = String(value);
  return /\d{4}-\d{2}-\d{2}/.test(text) || /\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4}/.test(text);
}

function findObservationCandidate(payload) {
  const candidates = [];

  function visit(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const entries = Object.entries(node);
    const lower = new Map(entries.map(([key, value]) => [key.toLowerCase(), value]));

    const valueKeys = [
      "value",
      "valueasstring",
      "observationvalue",
      "observation_value",
      "obsvalue",
      "obs_value",
      "result",
      "rate",
    ];

    const dateKeys = [
      "date",
      "datevalue",
      "date_value",
      "observationdate",
      "observation_date",
      "period",
      "timeperiod",
      "time_period",
      "published",
      "publishedat",
      "published_at",
      "validfrom",
      "valid_from",
    ];

    let value = null;
    let valueKey = null;
    let date = null;

    for (const key of valueKeys) {
      if (!lower.has(key)) continue;
      const numeric = parseNumber(String(lower.get(key)));
      if (Number.isFinite(numeric) && numeric > -10 && numeric < 30) {
        value = numeric;
        valueKey = key;
        break;
      }
    }

    for (const key of dateKeys) {
      if (!lower.has(key)) continue;
      if (isLikelyDate(lower.get(key))) {
        date = normaliseDate(lower.get(key));
        break;
      }
    }

    if (value !== null) {
      candidates.push({
        value,
        date,
        valueKey,
        objectKeys: Object.keys(node),
      });
    }

    entries.forEach(([, child]) => visit(child));
  }

  visit(payload);

  const filtered = candidates
    .filter((candidate) => candidate.valueKey !== "groupid")
    .sort((a, b) => {
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return 0;
    });

  const best = filtered[0];

  if (!best) throw new Error("Fant ingen observasjon i Riksbanken-responsen.");

  return {
    value: best.value,
    observed_date: best.date,
    rawCandidate: {
      valueKey: best.valueKey,
      objectKeys: best.objectKeys,
    },
  };
}

async function fetchFromRiksbank() {
  const response = await fetch(RIKSBANK_STIBOR_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MarketDashboardPWA/1.0",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Riksbanken API svarte med ${response.status}.`);

  const payload = await response.json();
  const observation = findObservationCandidate(payload);

  return {
    value: observation.value,
    unit: "%",
    source_name: "Riksbanken STIBOR 3M",
    source_url: RIKSBANK_STIBOR_URL,
    source_document: RIKSBANK_SERIES_ID,
    observed_date: observation.observed_date,
    method: "riksbank_latest_api",
    raw: {
      source: "Riksbanken SWEA API",
      seriesId: RIKSBANK_SERIES_ID,
      candidate: observation.rawCandidate,
    },
  };
}

function htmlToText(html) {
  return String(html || "")
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

function extractStibor3mFromSfbfText(textInput) {
  const text = htmlToText(textInput);
  const patterns = [
    /(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})\s+3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)/i,
    /3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)[\s\S]{0,80}?(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})/i,
    /3\s*Months?[^0-9+-]{0,80}([-+]?\d+(?:[.,]\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const firstLooksLikeDate = isLikelyDate(match[1]);
    const value = parseNumber(firstLooksLikeDate ? match[2] : match[1]);
    const date = firstLooksLikeDate ? normaliseDate(match[1]) : normaliseDate(match[2]);

    if (Number.isFinite(value) && value > -10 && value < 30) {
      return { value, observed_date: date };
    }
  }

  throw new Error("Fant ikke 3 Months STIBOR i SFBF-tekst.");
}

async function fetchFromSfbfRaw() {
  const response = await fetch(SFBF_STIBOR_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`SFBF svarte med ${response.status}.`);

  const observation = extractStibor3mFromSfbfText(await response.text());
  return {
    value: observation.value,
    unit: "%",
    source_name: "SFBF STIBOR",
    source_url: SFBF_STIBOR_URL,
    source_document: "STIBOR Rates",
    observed_date: observation.observed_date,
    method: "sfbf_raw_html",
    raw: { source: "SFBF" },
  };
}

async function fetchStiborWithFallbacks() {
  const errors = [];

  try {
    return await fetchFromRiksbank();
  } catch (error) {
    errors.push(`Riksbank: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return await fetchFromSfbfRaw();
  } catch (error) {
    errors.push(`SFBF: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(errors.join(" | "));
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await fetchStiborWithFallbacks();

    const saved = await insertMetric({
      metric_key: METRIC_KEY,
      value: result.value,
      unit: result.unit,
      source_name: result.source_name,
      source_url: result.source_url,
      source_document: result.source_document,
      observed_date: result.observed_date,
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: { method: result.method, ...result.raw },
    });

    response.status(200).json({ status: "ok", metricKey: METRIC_KEY, saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved oppdatering av 3M STIBOR.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: "%",
      source_name: "Riksbanken / SFBF",
      source_url: RIKSBANK_STIBOR_URL,
      source_document: RIKSBANK_SERIES_ID,
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: { stage: "update-stibor" },
    });

    const { latestGood } = await getLatestMetric(METRIC_KEY);
    response.status(200).json({ status: "error", metricKey: METRIC_KEY, message, latestGood });
  }
}
