import { fetchAkershusYields } from "./akershus-yields.js";
export { fetchAkershusYields } from "./akershus-yields.js";
import { insertMetric, getLatestMetric } from "./supabase.js";
import { extractUnionPeriod } from "./yield-period.js";
import { fetchNewsecYields, quarterPeriod } from "./newsec-yields.js";


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

async function fetchText(url, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
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

export async function fetchUnionSegment(segmentId) {
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

async function saveResult(result, fetchedAt) {
  if (result.source === "newsec") {
    const { latestGood } = await getLatestMetric(metricKey(result.source, result.segment));
    const previous = quarterPeriod(latestGood?.raw?.period || latestGood?.source_document);
    if (previous && previous.rank > quarterPeriod(result.period).rank) throw new Error("Refusing Newsec period regression");
  }
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
      discoveryPage: result.discoveryPage || null,
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

  const unionResults = Promise.allSettled(Object.keys(SEGMENTS).map(fetchUnionSegment));
  const newsecResults = fetchNewsecYields().then(results => ({ results }), error => ({ error }));
  const akershusResults = fetchAkershusYields().then(results => ({ results }), error => ({ error }));

  // Independent source requests overlap to stay within the function budget.
  for (const [index, segment] of Object.keys(SEGMENTS).entries()) {
    try {
      const outcome = (await unionResults)[index];
      if (outcome.status === "rejected") throw outcome.reason;
      const result = outcome.value;
      saved.push(await saveResult(result, fetchedAt));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`UNION ${segment}: ${message}`);
      saved.push(await saveError("union", segment, message, fetchedAt));
    }
  }

  // Newsec latest PDF.
  try {
    const outcome = await newsecResults;
    if (outcome.error) throw outcome.error;
    const results = outcome.results;
    for (const result of results) saved.push(await saveResult(result, fetchedAt));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Newsec: ${message}`);
    for (const segment of Object.keys(SEGMENTS)) saved.push(await saveError("newsec", segment, message, fetchedAt));
  }

  // Akershus publishes all segments as structured data in the HTML.
  try {
    const outcome = await akershusResults;
    if (outcome.error) throw outcome.error;
    const { results, errors: akershusErrors } = outcome.results;
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
