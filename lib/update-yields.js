import { createRequire } from "module";
import { insertMetric, getLatestMetric } from "./supabase.js";
import { extractAkershusPeriod, extractUnionPeriod, periodFromNewsecDocument } from "./yield-period.js";

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
    period: extractUnionPeriod(text),
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

function lineIncludesAnyLabel(line, labels) {
  const lower = line.toLowerCase();
  return labels.find((label) => lower.includes(label.toLowerCase())) || null;
}

function extractNewsecRowValue(text, rowLabels) {
  const labels = Array.isArray(rowLabels) ? rowLabels : [rowLabels];
  const rawLines = String(text || "")
    .replace(/\u0000/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // First try exact line matching. The Newsec PDF parser keeps one row per line,
  // and this avoids accidentally reading numbers from following rows.
  for (const line of rawLines) {
    const matchedLabel = lineIncludesAnyLabel(line, labels);
    if (!matchedLabel) continue;

    const values = line
      .slice(line.toLowerCase().indexOf(matchedLabel.toLowerCase()) + matchedLabel.length)
      .match(/[-+]?\d+(?:[,.]\d+)?/g)
      ?.map(parseNumber)
      .filter((value) => Number.isFinite(value) && value > 0 && value < 20);

    if (values && values.length >= 2) {
      // Latest quarter low/high are the final two values in the row; we want Low.
      return values[values.length - 2];
    }
  }

  // Fallback: compact text, but cut at the next known row label to avoid row bleed.
  const clean = normaliseText(text);
  const lower = clean.toLowerCase();

  for (const label of labels) {
    const index = lower.indexOf(label.toLowerCase());
    if (index < 0) continue;

    const nextLabelRegex = /(Office Oslo centre|Office Oslo Skøyen|Office Oslo Lysaker|Office Oslo East|Office Oslo South|Office Stavanger|Office Bergen|Office Trondheim|Office Other Cities|Retail Prime|Retail Normal|Retail Secondary|Retail Big Box|Logistics Prime|Logistics Normal|Hotel Prime|Residential)/ig;
    let endIndex = clean.length;
    let match;
    nextLabelRegex.lastIndex = index + label.length;

    while ((match = nextLabelRegex.exec(clean)) !== null) {
      if (match.index > index + label.length + 5) {
        endIndex = match.index;
        break;
      }
    }

    const slice = clean.slice(index + label.length, Math.min(endIndex, index + label.length + 260));
    const values = slice
      .match(/[-+]?\d+(?:[,.]\d+)?/g)
      ?.map(parseNumber)
      .filter((value) => Number.isFinite(value) && value > 0 && value < 20);

    if (values && values.length >= 2) return values[values.length - 2];
  }

  throw new Error(`Fant ikke/kunne ikke parse Newsec-raden: ${labels.join(" / ")}.`);
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
  const period = periodFromNewsecDocument(latestPdf.label);

  return [
    {
      source: "newsec",
      segment: "office",
      value: extractNewsecRowValue(text, ["Office Oslo CBD", "Oslo CBD", "CBD"]),
      period,
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "retail",
      value: extractNewsecRowValue(text, ["Retail Prime", "Retail prime", "Retail"]),
      period,
      sourceName: "Newsec Yieldtabell",
      sourceUrl: latestPdf.url,
      sourceDocument: latestPdf.label,
      method: "newsec_pdf_parse",
    },
    {
      source: "newsec",
      segment: "logistics",
      value: extractNewsecRowValue(text, ["Logistics Prime", "Logistics prime", "Logistics"]),
      period,
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

function extractAkershusPrimeYield(segmentText, segment) {
  const clean = normaliseText(segmentText);

  const patternsBySegment = {
    office: [
      /Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    ],
    logistics: [
      /Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    ],
    retail: [
      /Prime\s+yield\s+high\s+street\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
      /Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    ],
  };

  const patterns = patternsBySegment[segment] || [/Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;

    const value = parseNumber(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error(`Fant ikke Akershus prime yield for ${segment}.`);
}

async function getAkershusSegmentText(page) {
  return await page.evaluate(() => {
    const section = document.querySelector("#segment-dive");
    return section ? section.innerText : (document.body ? document.body.innerText : "");
  });
}

async function clickAkershusSegment(page, label) {
  const clicked = await page.evaluate((wanted) => {
    const scope = document.querySelector("#segment-dive") || document;
    const wantedText = String(wanted || "").trim().toLowerCase();

    const candidates = Array.from(scope.querySelectorAll("button, [role='button'], a"))
      .map((el, index) => {
        const text = (el.innerText || el.textContent || el.getAttribute("aria-label") || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        return { el, index, text };
      })
      .filter((item) => item.text);

    const target =
      candidates.find((item) => item.text === wantedText) ||
      candidates.find((item) => item.text.includes(wantedText));

    if (!target) return { clicked: false, label: wanted };

    target.el.scrollIntoView({ block: "center", inline: "center" });
    target.el.click();

    return {
      clicked: true,
      label: wanted,
      index: target.index,
      text: target.text,
    };
  }, label);

  await new Promise((resolve) => setTimeout(resolve, clicked.clicked ? 1400 : 600));
  return clicked.clicked;
}

async function fetchAkershusYields() {
  const { browser, page } = await renderAkershusPage();
  const results = [];
  const errors = [];

  try {
    const pageText = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    const period = extractAkershusPeriod(pageText);

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

        const segmentText = await getAkershusSegmentText(page);
        const value = extractAkershusPrimeYield(segmentText, segment);

        results.push({
          source: "akershus",
          segment,
          value,
          period,
          sourceName: "Akershus Eiendom",
          sourceUrl: AKERSHUS_URL,
          sourceDocument: segment === "retail" ? "Segmentoversikt Handel - high street" : `Segmentoversikt ${label}`,
          method: clicked ? "akershus_segment_dive_click" : "akershus_segment_dive_default",
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
