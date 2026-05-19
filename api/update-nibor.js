import { createRequire } from "module";
import { getLatestMetric, insertMetric } from "../lib/supabase.js";

const require = createRequire(import.meta.url);
const METRIC_KEY = "nibor_3m";

const SB1_MORNING_REPORT_URL =
  "https://www.sparebank1.no/content/dam/SB1/bank/sor-norge/markedsrapporter/markets/daglig_oppdatering/morgenmelding_valuta.pdf";

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;

  return Number.parseFloat(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
}

function normalisePdfText(text) {
  return String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .replace(/N1BOR/gi, "NIBOR")
    .trim();
}

function extractObservedDate(text) {
  const clean = normalisePdfText(text);

  const patterns = [
    /Dato[:\s]+(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/i,
    /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;

    const [, day, month, year] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function extractNibor3mFromSb1PdfText(pdfText) {
  const text = normalisePdfText(pdfText);

  const patterns = [
    // Typical comment text:
    // "3 mnd NIBOR var uendret på 4.55 %"
    /3\s*mnd\.?\s+NIBOR[\s\S]{0,120}?(?:på|til|=)?\s*([-+]?\d+(?:[,.]\d+)?)\s*%/i,

    // Variant:
    // "3m NIBOR ... 4,55 %"
    /3m\s+NIBOR[\s\S]{0,120}?(?:på|til|=)?\s*([-+]?\d+(?:[,.]\d+)?)\s*%/i,

    // Table variant from some SB1 PDFs:
    // "NIBOR (NO) 4,66 4,73 4,70 -" where the second number is 3 mnd.
    /NIBOR\s*\(NO\)[\s\S]{0,120}?([-+]?\d+(?:[,.]\d+)?)\s+([-+]?\d+(?:[,.]\d+)?)\s+([-+]?\d+(?:[,.]\d+)?)/i,

    // Generic fallback near NIBOR and 3 mnd.
    /NIBOR[\s\S]{0,180}?3\s*mnd\.?[\s\S]{0,120}?([-+]?\d+(?:[,.]\d+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    // For the table variant, group 2 is 3 mnd.
    const candidate = pattern.source.includes("NIBOR\\s*\\(NO\\)")
      ? match[2]
      : match[1];

    const value = parseNumber(candidate);
    if (Number.isFinite(value) && value > 0 && value < 20) {
      return value;
    }
  }

  throw new Error("Fant ikke 3M NIBOR i SpareBank 1 Markets Morgenrapport PDF.");
}

async function fetchNiborFromSb1MorningReport() {
  const response = await fetch(SB1_MORNING_REPORT_URL, {
    headers: {
      Accept: "application/pdf,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`SpareBank 1 Markets PDF svarte med ${response.status}.`);
  }

  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = await pdfParse(buffer);

  const value = extractNibor3mFromSb1PdfText(parsed.text);
  const observedDate = extractObservedDate(parsed.text);

  return {
    value,
    unit: "%",
    source_name: "SpareBank 1 Markets Morgenrapport",
    source_url: SB1_MORNING_REPORT_URL,
    source_document: "Morgenrapport Renter og Valuta",
    observed_date: observedDate,
    method: "sb1_markets_pdf_parse",
  };
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await fetchNiborFromSb1MorningReport();

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
      raw: {
        method: result.method,
      },
    });

    response.status(200).json({
      status: "ok",
      metricKey: METRIC_KEY,
      saved,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Ukjent feil ved oppdatering av 3M NIBOR.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: "%",
      source_name: "SpareBank 1 Markets Morgenrapport",
      source_url: SB1_MORNING_REPORT_URL,
      source_document: "Morgenrapport Renter og Valuta",
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: {
        stage: "update-nibor-sb1-markets",
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
