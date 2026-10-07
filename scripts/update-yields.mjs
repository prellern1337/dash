import fs from "node:fs/promises";
import path from "node:path";
import { fetchAkershusYields } from "../lib/akershus-yields.js";
import { fetchNewsecYields } from "../lib/newsec-yields.js";

const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "yields.json");

const SOURCES = {
  union: {
    office: "https://m2.union.no/segmenter/kontor",
    retail: "https://m2.union.no/segmenter/handel",
    logistics: "https://m2.union.no/segmenter/logistikk",
  },
  newsec: "https://www.newsec.no/insights/reports/yieldtabell",
  akershus: "https://akershuseiendom.no/markedsinnsikt/nokkeltall",
};

const SEGMENTS = [
  { id: "office", label: "Kontor", unionUrl: SOURCES.union.office, akershusButton: "Kontor", akershusExtractor: "office" },
  { id: "retail", label: "Handel", unionUrl: SOURCES.union.retail, akershusButton: "Handel", akershusExtractor: "retail" },
  { id: "logistics", label: "Logistikk", unionUrl: SOURCES.union.logistics, akershusButton: "Logistikk", akershusExtractor: "logistics" },
];

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? true];
    })
  );

  return {
    force: Boolean(args.force),
    minDays: args["min-days"] ? Number(args["min-days"]) : 0,
  };
}

async function readExisting() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function daysSince(dateString) {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function periodFromText(value) {
  if (!value) return null;
  const match = String(value).match(/\bQ[1-4][-\s]+20\d{2}\b/i);
  return match ? match[0].toUpperCase().replace("-", " ") : null;
}

function average(values) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function usable(source) {
  return ["auto", "ok", "seed", "stale"].includes(source.status) && Number.isFinite(Number(source.value));
}

function fallbackSource(existing, id, source) {
  const stored = existing?.data?.[id]?.sources?.find((item) => item.source === source);

  if (stored && Number.isFinite(Number(stored.value))) {
    return {
      ...stored,
      status: stored.status === "auto" || stored.status === "ok" || stored.status === "seed" ? "stale" : stored.status,
    };
  }

  const segment = SEGMENTS.find((item) => item.id === id);
  return {
    id,
    label: segment?.label || id,
    source,
    sourceUrl: source === "UNION" ? segment?.unionUrl : source === "Newsec" ? SOURCES.newsec : SOURCES.akershus,
    value: null,
    period: null,
    status: "error",
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`${url} svarte med ${response.status}`);
  return response.text();
}

function extractUnionPrimeYield(html) {
  const text = htmlToText(html);
  const strictMatch = text.match(/Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?\s+Kilde:\s*UNION\s+per\s+([^#]+?)(?=\s+#|\s+Toppleie|\s+Sekundær|\s+Privat|\s+Normal|\s+Våre|\s*$)/i);
  if (strictMatch) {
    const value = parseNumber(strictMatch[1]);
    if (Number.isFinite(value)) return { value, period: strictMatch[2].trim().replace(/\.$/, "") };
  }

  const looseMatch = text.match(/Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?/i);
  if (looseMatch) {
    const value = parseNumber(looseMatch[1]);
    if (Number.isFinite(value)) return { value, period: null };
  }

  throw new Error("Fant ikke Prime yield på UNION M2-side.");
}

async function scrapeUnion(existing, errors) {
  const output = {};

  await Promise.all(
    SEGMENTS.map(async (segment) => {
      try {
        const html = await fetchText(segment.unionUrl);
        const observation = extractUnionPrimeYield(html);
        output[segment.id] = {
          id: segment.id,
          label: segment.label,
          source: "UNION",
          sourceUrl: segment.unionUrl,
          value: observation.value,
          period: observation.period,
          status: "auto",
        };
      } catch (error) {
        errors.push(`UNION ${segment.label}: ${error instanceof Error ? error.message : String(error)}`);
        output[segment.id] = fallbackSource(existing, segment.id, "UNION");
      }
    })
  );

  return output;
}

async function scrapeNewsec(existing, errors) {
  const output = {};

  try {
    const results = await fetchNewsecYields();
    for (const result of results) {
      const segment = SEGMENTS.find(item => item.id === result.segment);
      output[result.segment] = {
        id: result.segment, label: segment.label, source: "Newsec",
        sourceUrl: result.sourceUrl, value: result.value, period: result.period, status: "auto",
      };
    }
  } catch (error) {
    errors.push(`Newsec: ${error instanceof Error ? error.message : String(error)}`);
    for (const segment of SEGMENTS) output[segment.id] = fallbackSource(existing, segment.id, "Newsec");
  }

  return output;
}

async function scrapeAkershus(existing, errors) {
  const output = {};
  try {
    const { results } = await fetchAkershusYields();
    for (const result of results) output[result.segment] = {
      id: result.segment, label: SEGMENTS.find(s => s.id === result.segment).label,
      source: "Akershus", sourceUrl: result.sourceUrl, value: result.value,
      period: result.period, status: "auto",
    };
  } catch (error) {
    errors.push(`Akershus: ${error.message}`);
    for (const segment of SEGMENTS) output[segment.id] = fallbackSource(existing, segment.id, "Akershus");
  }
  return output;
}

function combine(union, newsec, akershus) {
  const data = {};

  for (const segment of SEGMENTS) {
    const sources = [union[segment.id], newsec[segment.id], akershus[segment.id]];
    data[segment.id] = {
      id: segment.id,
      label: segment.label,
      value: average(sources.filter(usable).map((source) => source.value)),
      sources,
    };
  }

  return data;
}

async function main() {
  const args = parseArgs();
  const existing = await readExisting();

  if (!args.force && args.minDays > 0 && existing?.fetchedAt && daysSince(existing.fetchedAt) < args.minDays) {
    console.log(`Yield-data er nyere enn ${args.minDays} dager. Hopper over.`);
    return;
  }

  const errors = [];

  const [union, newsec, akershus] = await Promise.all([
    scrapeUnion(existing, errors),
    scrapeNewsec(existing, errors),
    scrapeAkershus(existing, errors),
  ]);

  const data = combine(union, newsec, akershus);
  const hasAnyValue = Object.values(data).some((segment) => Number.isFinite(Number(segment.value)));

  if (!hasAnyValue) {
    throw new Error(`Ingen yield-verdier ble hentet eller beholdt. ${errors.join(" | ")}`);
  }

  const payload = {
    status: errors.length ? "stale" : "ok",
    sourceName: "Yield data",
    fetchedAt: errors.length && existing?.fetchedAt ? existing.fetchedAt : new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
    data,
    errors,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log("Yield-data oppdatert.");
  if (errors.length) {
    console.log("Feil/fallback:", errors);
  }
}

main();
