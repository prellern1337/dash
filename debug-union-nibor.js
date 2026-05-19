import { createRequire } from "module";
import { getLatestMetric, insertMetric } from "./_lib/supabase.js";

const require = createRequire(import.meta.url);
const METRIC_KEY = "nibor_3m";

export const config = {
  maxDuration: 60,
};

function absoluteUrl(url, baseUrl = "https://union.no") {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

async function renderPage(url) {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return await page.evaluate(() => ({
      text: document.body ? document.body.innerText : "",
      html: document.documentElement ? document.documentElement.outerHTML : "",
      links: Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          href: a.href || a.getAttribute("href") || "",
          text: a.innerText || a.textContent || "",
        }))
        .filter((link) => link.href),
    }));
  } finally {
    await browser.close();
  }
}

function findLatestNokkeltallPdfFromLinks(links) {
  const candidates = [];

  for (const link of links || []) {
    const href = decodeHtml(link.href || "");
    const label = stripHtml(link.text || "");
    const combined = `${href} ${label}`.toLowerCase();

    if (!href.toLowerCase().includes(".pdf")) continue;
    if (!combined.includes("nøkkeltall") && !combined.includes("nokkeltall")) continue;

    const weekMatch = combined.match(/uke[-_\s]*(\d{1,2})/i);
    const yearMatch = combined.match(/\b(20\d{2})\b/);

    candidates.push({
      url: absoluteUrl(href),
      label: label || href.split("/").pop(),
      week: weekMatch ? Number.parseInt(weekMatch[1], 10) : null,
      year: yearMatch ? Number.parseInt(yearMatch[1], 10) : null,
      index: candidates.length,
    });
  }

  if (!candidates.length) {
    throw new Error("Fant ingen UNION Nøkkeltall-PDF i rendret analyse-side.");
  }

  candidates.sort((a, b) => {
    if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
    if ((b.week || 0) !== (a.week || 0)) return (b.week || 0) - (a.week || 0);
    return a.index - b.index;
  });

  return candidates[0];
}

function extractNibor3mFromPdfText(pdfText) {
  const text = String(pdfText || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .replace(/N1BOR/gi, "NIBOR")
    .trim();

  const sectionMatch = text.match(/RENTER[\s\S]{0,2000}?(?=10-ÅRS SWAP|10 ÅRS SWAP|OBLIGASJONSUTSTED|M2 ANALYSEPORTAL|$)/i);
  const section = sectionMatch ? sectionMatch[0] : text;

  const patterns = [
    /NIBOR[\s\S]{0,450}?(?:^|\s)3\s*m\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s\S]{0,450}?(?:^|\s)3m\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /(?:^|\s)3\s*m\s+([-+]?\d+(?:[,.]\d+)?)\s*%[\s\S]{0,350}?(?:6\s*m|6m|SWAP)/i,
    /(?:^|\s)3m\s+([-+]?\d+(?:[,.]\d+)?)\s*%[\s\S]{0,350}?(?:6m|SWAP)/i,
  ];

  for (const pattern of patterns) {
    const found = section.match(pattern);
    if (!found) continue;
    const value = parseNumber(found[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error("Fant ikke NIBOR 3m i UNION Nøkkeltall-PDF.");
}

async function fetchFromRenderedLatestPdf() {
  const rendered = await renderPage("https://union.no/analyse");
  const latestPdf = findLatestNokkeltallPdfFromLinks(rendered.links);

  const pdfResponse = await fetch(latestPdf.url, {
    headers: {
      Accept: "application/pdf,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!pdfResponse.ok) {
    throw new Error(`UNION Nøkkeltall-PDF svarte med ${pdfResponse.status}.`);
  }

  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const parsed = await pdfParse(Buffer.from(await pdfResponse.arrayBuffer()));
  const value = extractNibor3mFromPdfText(parsed.text);

  return {
    value,
    unit: "%",
    source_name: "UNION Nøkkeltall PDF",
    source_url: latestPdf.url,
    source_document: latestPdf.label,
    observed_date: null,
    method: "rendered_pdf_parse",
  };
}

function extractNibor3mFromRenderedText(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();

  const patterns = [
    /3\s*m\s*NIBOR[\s.:–—-]*([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /3m\s*NIBOR[\s.:–—-]*([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s.:–—-]*3\s*m[\s.:–—-]*([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s.:–—-]*3m[\s.:–—-]*([-+]?\d+(?:[,.]\d+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const found = cleaned.match(pattern);
    if (!found) continue;
    const value = parseNumber(found[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error("Fant ikke 3m NIBOR i rendret UNION nøkkeltallside.");
}

async function fetchFromRenderedHtml() {
  const url = "https://union.no/naering/analyse/nokkeltall";
  const rendered = await renderPage(url);
  const value = extractNibor3mFromRenderedText(rendered.text);

  return {
    value,
    unit: "%",
    source_name: "UNION Nøkkeltall HTML",
    source_url: url,
    source_document: "UNION nøkkeltallside",
    observed_date: null,
    method: "rendered_html_parse",
  };
}

async function fetchNiborWithFallbacks() {
  const errors = [];

  // Preferred source: rendered UNION analysis page -> latest Nøkkeltall PDF.
  try {
    return await fetchFromRenderedLatestPdf();
  } catch (error) {
    errors.push(`PDF-render: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Fallback: rendered UNION nøkkeltall page.
  try {
    return await fetchFromRenderedHtml();
  } catch (error) {
    errors.push(`HTML-render: ${error instanceof Error ? error.message : String(error)}`);
  }

  const combinedError = new Error(errors.join(" | "));
  combinedError.details = errors;
  throw combinedError;
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await fetchNiborWithFallbacks();

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
    const message = error instanceof Error ? error.message : "Ukjent feil ved oppdatering av 3M NIBOR.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: "%",
      source_name: "UNION",
      source_url: "https://union.no/analyse",
      source_document: null,
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: {
        stage: "update-nibor-rendered",
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
