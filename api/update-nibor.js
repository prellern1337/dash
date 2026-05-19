import { createRequire } from "module";
import { getLatestMetric, insertMetric } from "./_lib/supabase.js";

const require = createRequire(import.meta.url);

const METRIC_KEY = "nibor_3m";

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

function findLatestNokkeltallPdf(html) {
  const candidates = [];
  const hrefRegex = /<a\b[^>]*href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = decodeHtml(match[1]);
    const label = stripHtml(match[2]);
    const combined = `${href} ${label}`.toLowerCase();

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

  const rawPdfRegex = /https?:\\?\/\\?\/[^"'\s<>]+?\.pdf[^"'\s<>]*/gi;
  for (const rawUrl of html.match(rawPdfRegex) || []) {
    const cleaned = decodeHtml(rawUrl.replace(/\\\//g, "/"));
    const combined = cleaned.toLowerCase();
    if (!combined.includes("nøkkeltall") && !combined.includes("nokkeltall")) continue;
    if (candidates.some((candidate) => candidate.url === cleaned)) continue;

    const weekMatch = combined.match(/uke[-_\s]*(\d{1,2})/i);
    const yearMatch = combined.match(/\b(20\d{2})\b/);

    candidates.push({
      url: cleaned,
      label: cleaned.split("/").pop(),
      week: weekMatch ? Number.parseInt(weekMatch[1], 10) : null,
      year: yearMatch ? Number.parseInt(yearMatch[1], 10) : null,
      index: candidates.length,
    });
  }

  if (!candidates.length) {
    throw new Error("Fant ingen UNION Nøkkeltall-PDF på union.no/analyse.");
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

  const sectionMatch = text.match(/RENTER[\s\S]{0,1800}?(?=10-ÅRS SWAP|10 ÅRS SWAP|OBLIGASJONSUTSTED|M2 ANALYSEPORTAL|$)/i);
  const section = sectionMatch ? sectionMatch[0] : text;

  const patterns = [
    /NIBOR[\s\S]{0,350}?(?:^|\s)3\s*m\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s\S]{0,350}?(?:^|\s)3m\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /(?:^|\s)3\s*m\s+([-+]?\d+(?:[,.]\d+)?)\s*%[\s\S]{0,250}?(?:6\s*m|6m|SWAP)/i,
    /(?:^|\s)3m\s+([-+]?\d+(?:[,.]\d+)?)\s*%[\s\S]{0,250}?(?:6m|SWAP)/i,
  ];

  for (const pattern of patterns) {
    const found = section.match(pattern);
    if (!found) continue;
    const value = parseNumber(found[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error("Fant ikke NIBOR 3m i UNION Nøkkeltall-PDF.");
}

async function fetchUnionAnalysisHtml() {
  const pageUrl = "https://union.no/analyse";

  const response = await fetch(pageUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`UNION analyse svarte med ${response.status}.`);
  }

  return {
    pageUrl,
    html: await response.text(),
  };
}

async function fetchFromLatestPdf() {
  const { html } = await fetchUnionAnalysisHtml();
  const latestPdf = findLatestNokkeltallPdf(html);

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

  // Use the internal parser file directly. The package main entry can execute its
  // debug/test path in some serverless builds, which renders bundled sample PDFs.
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
    method: "pdf_parse",
  };
}

function extractNibor3mFromHtml(html) {
  const text = stripHtml(html);
  const patterns = [
    /3\s*m\s+NIBOR\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /3m\s+NIBOR\s+([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s\S]{0,120}?3\s*m[\s\S]{0,80}?([-+]?\d+(?:[,.]\d+)?)\s*%/i,
    /NIBOR[\s\S]{0,120}?3m[\s\S]{0,80}?([-+]?\d+(?:[,.]\d+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (!found) continue;
    const value = parseNumber(found[1]);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }

  throw new Error("Fant ikke 3m NIBOR i UNION nøkkeltall-HTML.");
}

async function fetchFromUnionHtml() {
  const url = "https://union.no/naering/analyse/nokkeltall";

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`UNION nøkkeltallside svarte med ${response.status}.`);
  }

  const html = await response.text();
  const value = extractNibor3mFromHtml(html);

  return {
    value,
    unit: "%",
    source_name: "UNION Nøkkeltall HTML",
    source_url: url,
    source_document: "UNION nøkkeltallside",
    observed_date: null,
    method: "html_parse",
  };
}

async function fetchNiborWithFallbacks() {
  const errors = [];

  // Preferred source: the latest Nøkkeltall PDF, because that is the source used in the dashboard screenshot.
  try {
    return await fetchFromLatestPdf();
  } catch (error) {
    errors.push(`PDF: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Alternative source if PDF parsing breaks.
  try {
    return await fetchFromUnionHtml();
  } catch (error) {
    errors.push(`HTML: ${error instanceof Error ? error.message : String(error)}`);
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
        stage: "update-nibor",
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
