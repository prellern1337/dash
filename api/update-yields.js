import { createRequire } from "module";
import { insertMetric, getLatestMetric } from "../lib/supabase.js";

const require = createRequire(import.meta.url);

export const config = {
  maxDuration: 60,
};

const SEGMENTS = {
  office: { label: "Kontor", unionUrl: "https://m2.union.no/segmenter/kontor" },
  retail: { label: "Handel", unionUrl: "https://m2.union.no/segmenter/handel" },
  logistics: { label: "Logistikk", unionUrl: "https://m2.union.no/segmenter/logistikk" },
};

const NEWSEC_PAGE_URL = "https://www.newsec.no/insights/reports/yieldtabell";
const AKERSHUS_URL = "https://akershuseiendom.no/markedsinnsikt/nokkeltall";

function metricKey(source, segment) {
  return `yield_${source}_${segment}`;
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseText(text) {
  return String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} svarte med ${response.status}.`);
  }

  return await response.text();
}

async function fetchUnionSegment(segmentId) {
  const segment = SEGMENTS[segmentId];
  const html = await fetchText(segment.unionUrl);
  const text = stripHtml(html);

  const match = text.match(/Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?[\s\S]{0,120}?Kilde:\s*UNION\s+per\s+([^#.]+?)(?=\s+#|\s+Toppleie|\s+Sekundær|\s+Privat|\s+Normal|\s+Våre|\s*$)/i)
    || text.match(/Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?/i);

  if (!match) throw new Error(`Fant ikke UNION prime yield for ${segment.label}.`);

  const value = parseNumber(match[1]);
  if (!Number.isFinite(value)) throw new Error(`Kunne ikke parse UNION prime yield for ${segment.label}.`);

  return {
    source: "union",
    segment: segmentId,
    value,
    period: match[2]?.trim() || null,
    sourceName: "UNION M2",
    sourceUrl: segment.unionUrl,
    sourceDocument: `${segment.label} segment`,
    method: "union_m2_html",
  };
}

function findLatestNewsecPdf(html) {
  const candidates = [];
  const regex = /<a\b[^>]*href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].replace(/&amp;/g, "&");
    const label = stripHtml(match[2]) || href.split("/").pop();
    const combined = `${href} ${label}`.toLowerCase();

    if (!combined.includes("yieldtabell")) continue;

    const quarterMatch = combined.match(/q([1-4])[-_\s]*(20\d{2})|q([1-4])[-_\s]*\/?[-_\s]*(20\d{2})|q([1-4])/i);
    const yearMatch = combined.match(/\b(20\d{2})\b/);

    candidates.push({
      url: href.startsWith("http") ? href : `https://www.newsec.no${href}`,
      label,
      year: yearMatch ? Number.parseInt(yearMatch[1], 10) : 0,
      quarter: quarterMatch ? Number.parseInt(quarterMatch[1] || quarterMatch[3] || quarterMatch[5], 10) : 0,
      index: candidates.length,
    });
  }

  if (!candidates.length) throw new Error("Fant ingen Newsec yieldtabell-PDF.");

  candidates.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.quarter !== a.quarter) return b.quarter - a.quarter;
    return a.index - b.index;
  });

  return candidates[0];
}

function extractNewsecRowValue(text, rowLabel) {
  const clean = normaliseText(text);
  const regex = new RegExp(`${rowLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+((?:[-+]?\\d+(?:[,.]\\d+)?\\s*%?\\s+){6,12})`, "i");
  const match = clean.match(regex);

  if (!match) throw new Error(`Fant ikke Newsec-raden: ${rowLabel}.`);

  const values = match[1]
    .match(/[-+]?\d+(?:[,.]\d+)?/g)
    ?.map(parseNumber)
    .filter((value) => Number.isFinite(value));

  if (!values || values.length < 2) throw new Error(`Kunne ikke parse Newsec-raden: ${rowLabel}.`);

  // Latest quarter has Low / High as the final two numbers. We want Low.
  return values[values.length - 2];
}

async function fetchNewsecYields() {
  const html = await fetchText(NEWSEC_PAGE_URL);
  const latestPdf = findLatestNewsecPdf(html);

  const response = await fetch(latestPdf.url, {
    headers: {
      Accept: "application/pdf,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Newsec PDF svarte med ${response.status}.`);

  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const parsed = await pdfParse(Buffer.from(await response.arrayBuffer()));
  const text = parsed.text;

  return [
    {
      source: "newsec",
      segment: "office",
      value: extractNewsecRowValue(text, "Office Oslo CBD"),
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "retail",
      value: extractNewsecRowValue(text, "Retail Prime"),
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "logistics",
      value: extractNewsecRowValue(text, "Logistics Prime"),
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
  ];
}

async function renderAkershusPage() {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1366, height: 1400 },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)");
    await page.goto(AKERSHUS_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function extractAkershusPrimeYield(text, label) {
  const clean = normaliseText(text);

  const patterns = [
    /Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /Primeyield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;

    const value = parseNumber(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error(`Fant ikke Akershus prime yield for ${label}.`);
}

async function clickAkershusSegment(page, label) {
  const clicked = await page.evaluate((wanted) => {
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], div, span"));
    const target = candidates.find((el) => {
      const text = (el.innerText || el.textContent || "").trim().toLowerCase();
      return text === wanted.toLowerCase();
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, label);

  await new Promise((resolve) => setTimeout(resolve, clicked ? 1200 : 600));
  return clicked;
}

async function fetchAkershusYields() {
  const { browser, page } = await renderAkershusPage();

  try {
    const results = [];

    for (const [segment, label] of [
      ["office", "Kontor"],
      ["logistics", "Logistikk"],
      ["retail", "Handel"],
    ]) {
      await clickAkershusSegment(page, label);

      const text = await page.evaluate(() => document.body ? document.body.innerText : "");
      const value = extractAkershusPrimeYield(text, label);

      results.push({
        source: "akershus",
        segment,
        value,
        sourceName: "Akershus Eiendom",
        sourceUrl: AKERSHUS_URL,
        sourceDocument: `Segmentoversikt ${label}`,
        method: "akershus_rendered_page",
      });
    }

    return results;
  } finally {
    await browser.close();
  }
}

async function saveResult(result, fetchedAt) {
  return await insertMetric({
    metric_key: metricKey(result.source, result.segment),
    value: result.value,
    unit: "%",
    source_name: result.sourceName,
    source_url: result.sourceUrl,
    source_document: result.sourceDocument,
    observed_date: null,
    fetched_at: fetchedAt,
    status: "ok",
    message: null,
    raw: {
      source: result.source,
      segment: result.segment,
      period: result.period || null,
      method: result.method,
    },
  });
}

async function saveError(source, segment, message, fetchedAt) {
  return await insertMetric({
    metric_key: metricKey(source, segment),
    value: null,
    unit: "%",
    source_name: source === "newsec" ? "Newsec Yieldtabell" : source === "akershus" ? "Akershus Eiendom" : "UNION M2",
    source_url: source === "newsec" ? NEWSEC_PAGE_URL : source === "akershus" ? AKERSHUS_URL : SEGMENTS[segment]?.unionUrl,
    source_document: null,
    observed_date: null,
    fetched_at: fetchedAt,
    status: "error",
    message,
    raw: { source, segment, stage: "update-yields" },
  });
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();
  const saved = [];
  const errors = [];

  // UNION is stable and cheap.
  for (const segment of Object.keys(SEGMENTS)) {
    try {
      const result = await fetchUnionSegment(segment);
      saved.push(await saveResult(result, fetchedAt));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`UNION ${segment}: ${message}`);
      saved.push(await saveError("union", segment, message, fetchedAt));
    }
  }

  // Newsec latest PDF.
  try {
    const results = await fetchNewsecYields();
    for (const result of results) saved.push(await saveResult(result, fetchedAt));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Newsec: ${message}`);
    for (const segment of Object.keys(SEGMENTS)) saved.push(await saveError("newsec", segment, message, fetchedAt));
  }

  // Akershus rendered page.
  try {
    const results = await fetchAkershusYields();
    for (const result of results) saved.push(await saveResult(result, fetchedAt));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Akershus: ${message}`);
    for (const segment of Object.keys(SEGMENTS)) saved.push(await saveError("akershus", segment, message, fetchedAt));
  }

  response.status(200).json({
    status: errors.length ? "partial" : "ok",
    metricGroup: "prime_yields",
    fetchedAt,
    savedCount: saved.length,
    saved,
    errors,
  });
}
