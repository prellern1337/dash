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

  function addCandidate(url, label) {
    if (!url) return;
    const cleanedUrl = String(url).replace(/\\\//g, "/").replace(/&amp;/g, "&");
    const cleanedLabel = stripHtml(label || cleanedUrl.split("/").pop());
    const combined = `${cleanedUrl} ${cleanedLabel}`.toLowerCase();

    if (!combined.includes("yieldtabell") && !combined.includes("yield-table") && !combined.includes("yield")) return;
    if (!cleanedUrl.toLowerCase().includes(".pdf")) return;
    if (candidates.some((candidate) => candidate.url === cleanedUrl)) return;

    const yearMatch = combined.match(/\b(20\d{2})\b/);
    const quarterMatch = combined.match(/q\s*([1-4])/i);

    candidates.push({
      url: cleanedUrl.startsWith("http") ? cleanedUrl : `https://www.newsec.no${cleanedUrl}`,
      label: cleanedLabel,
      year: yearMatch ? Number.parseInt(yearMatch[1], 10) : 0,
      quarter: quarterMatch ? Number.parseInt(quarterMatch[1], 10) : 0,
      index: candidates.length,
    });
  }

  const anchorRegex = /<a\b[^>]*href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    addCandidate(match[1], match[2]);
  }

  const rawPdfRegex = /https?:\\?\/\\?\/[^"'\s<>]+?\.pdf[^"'\s<>]*/gi;
  for (const rawUrl of html.match(rawPdfRegex) || []) {
    addCandidate(rawUrl, rawUrl.split("/").pop());
  }

  if (!candidates.length) throw new Error("Fant ingen Newsec yieldtabell-PDF.");

  candidates.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.quarter !== a.quarter) return b.quarter - a.quarter;
    return a.index - b.index;
  });

  return candidates[0];
}

function findLabelIndex(text, labels) {
  const lower = text.toLowerCase();
  for (const label of labels) {
    const index = lower.indexOf(label.toLowerCase());
    if (index >= 0) return { index, label };
  }
  return { index: -1, label: null };
}

function extractNewsecRowValue(text, rowLabels) {
  const labels = Array.isArray(rowLabels) ? rowLabels : [rowLabels];
  const clean = normaliseText(text);
  const { index, label } = findLabelIndex(clean, labels);

  if (index < 0) {
    throw new Error(`Fant ikke Newsec-raden: ${labels.join(" / ")}.`);
  }

  const slice = clean.slice(index + label.length, index + label.length + 360);
  const values = slice
    .match(/[-+]?\d+(?:[,.]\d+)?/g)
    ?.map(parseNumber)
    .filter((value) => Number.isFinite(value) && value > 0 && value < 20);

  if (!values || values.length < 2) {
    throw new Error(`Kunne ikke parse Newsec-raden: ${labels.join(" / ")}.`);
  }

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
      value: extractNewsecRowValue(text, ["Office Oslo CBD", "Oslo CBD", "CBD"]),
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "retail",
      value: extractNewsecRowValue(text, ["Retail Prime", "Retail prime", "Retail"]),
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "logistics",
      value: extractNewsecRowValue(text, ["Logistics Prime", "Logistics prime", "Logistics"]),
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
      return text === wanted.toLowerCase() || text.includes(wanted.toLowerCase());
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
  const results = [];
  const errors = [];

  try {
    for (const [segment, label, alternatives] of [
      ["office", "Kontor", ["Kontor", "Office"]],
      ["logistics", "Logistikk", ["Logistikk", "Lager", "Logistics"]],
      ["retail", "Handel", ["Handel", "Retail"]],
    ]) {
      try {
        let clicked = false;
        for (const option of alternatives) {
          clicked = await clickAkershusSegment(page, option);
          if (clicked) break;
        }

        const text = await page.evaluate(() => document.body ? document.body.innerText : "");
        const value = extractAkershusPrimeYield(text, label);

        results.push({
          source: "akershus",
          segment,
          value,
          sourceName: "Akershus Eiendom",
          sourceUrl: AKERSHUS_URL,
          sourceDocument: `Segmentoversikt ${label}`,
          method: clicked ? "akershus_rendered_page_click" : "akershus_rendered_page_default",
        });
      } catch (error) {
        errors.push({
          source: "akershus",
          segment,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { results, errors };
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

  // Akershus rendered page. Save partial results if only one segment fails.
  try {
    const { results, errors: akershusErrors } = await fetchAkershusYields();
    for (const result of results) saved.push(await saveResult(result, fetchedAt));
    for (const error of akershusErrors) {
      errors.push(`Akershus ${error.segment}: ${error.message}`);
      saved.push(await saveError("akershus", error.segment, error.message, fetchedAt));
    }
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
