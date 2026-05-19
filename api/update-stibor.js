import { insertMetric, getLatestMetric } from "./_lib/supabase.js";

const METRIC_KEY = "stibor_3m";
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

function extractStibor3mFromText(textInput) {
  const text = htmlToText(textInput);

  const patterns = [
    // Normal SFBF table:
    // 15 May 2026 3 Months 2.003
    /(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})\s+3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)/i,

    // Date after value variant:
    // 3 Months 2.003 15 May 2026
    /3\s*Months?\s+([-+]?\d+(?:[.,]\d+)?)[\s\S]{0,80}?(\d{1,2}\s+[A-Za-zÅÄÖåäö]+\s+\d{4})/i,

    // Loose fallback:
    /3\s*Months?[^0-9+-]{0,80}([-+]?\d+(?:[.,]\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const hasDateFirst = /\d{1,2}/.test(match[1] || "") && /[A-Za-zÅÄÖåäö]/.test(match[1] || "");
    const value = parseNumber(hasDateFirst ? match[2] : match[1]);
    const date = hasDateFirst ? normaliseDate(match[1]) : normaliseDate(match[2]);

    if (Number.isFinite(value) && value > -10 && value < 30) {
      return {
        value,
        date,
      };
    }
  }

  throw new Error("Fant ikke 3 Months STIBOR i SFBF-tekst.");
}

async function fetchRawSfbf() {
  const response = await fetch(SFBF_STIBOR_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`SFBF svarte med ${response.status}.`);
  }

  const html = await response.text();
  const observation = extractStibor3mFromText(html);

  return {
    value: observation.value,
    observed_date: observation.date,
    method: "sfbf_raw_html",
  };
}

async function fetchRenderedSfbf() {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 1200 },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)");
    await page.goto(SFBF_STIBOR_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const renderedText = await page.evaluate(() => document.body ? document.body.innerText : "");
    const observation = extractStibor3mFromText(renderedText);

    return {
      value: observation.value,
      observed_date: observation.date,
      method: "sfbf_rendered_html",
    };
  } finally {
    await browser.close();
  }
}

async function fetchStiborWithFallbacks() {
  const errors = [];

  try {
    return await fetchRawSfbf();
  } catch (error) {
    errors.push(`raw: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return await fetchRenderedSfbf();
  } catch (error) {
    errors.push(`rendered: ${error instanceof Error ? error.message : String(error)}`);
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
      unit: "%",
      source_name: "SFBF STIBOR",
      source_url: SFBF_STIBOR_URL,
      source_document: "STIBOR Rates",
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
    const message = error instanceof Error ? error.message : "Ukjent feil ved oppdatering av 3M STIBOR.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: "%",
      source_name: "SFBF STIBOR",
      source_url: SFBF_STIBOR_URL,
      source_document: "STIBOR Rates",
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: {
        stage: "update-stibor",
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
