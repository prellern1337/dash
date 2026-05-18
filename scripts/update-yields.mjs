import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

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

const NEWSEC_ROWS = {
  office: { rowLabel: "Office Oslo CBD", nextRowLabel: "Office Oslo centre" },
  retail: { rowLabel: "Retail Prime", nextRowLabel: "Retail Normal" },
  logistics: { rowLabel: "Logistics Prime", nextRowLabel: "Logistics Normal" },
};

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

function extractFirstPdfLink(html) {
  const matches = [...html.matchAll(/href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  if (matches.length === 0) {
    const fallback = html.match(/https:\/\/cdn\.sanity\.io\/[^"'\s<>]+\.pdf/);
    if (fallback) return { url: fallback[0], title: "Newsec yieldtabell" };
    throw new Error("Fant ingen PDF-lenke på Newsec yieldtabell-side.");
  }

  const first = matches[0];
  return {
    url: first[1].startsWith("http") ? first[1] : `https://www.newsec.no${first[1]}`,
    title: htmlToText(first[2]) || "Newsec yieldtabell",
  };
}

function getLatestPeriodFromPdfText(text, fallbackTitle) {
  const periods = [...text.matchAll(/\bQ[1-4]\s+20\d{2}\b/g)].map((match) => match[0]);
  if (periods.length) return periods[periods.length - 1];
  return periodFromText(fallbackTitle);
}

function extractNewsecLowValue(text, rowLabel, nextRowLabel) {
  const normalisedText = text.replace(/\r/g, "\n");
  const lines = normalisedText.split("\n").map((line) => line.trim()).filter(Boolean);
  let rowText = lines.find((line) => line.toLowerCase().startsWith(rowLabel.toLowerCase()));

  if (!rowText) {
    const regex = new RegExp(`${escapeRegExp(rowLabel)}\\s+([\\s\\S]*?)(?=${escapeRegExp(nextRowLabel)}|$)`, "i");
    const match = normalisedText.match(regex);
    if (match) rowText = `${rowLabel} ${match[1]}`;
  }

  if (!rowText) throw new Error(`Fant ikke Newsec-raden "${rowLabel}".`);

  const values = [...rowText.matchAll(/(\d{1,2}[,.]\d{2})\s*%/g)].map((match) => parseNumber(match[1]));
  if (values.length < 2) throw new Error(`Fant ikke nok yieldverdier for Newsec-raden "${rowLabel}".`);

  return values[values.length - 2];
}

async function scrapeNewsec(existing, errors) {
  const output = {};

  try {
    const html = await fetchText(SOURCES.newsec);
    const pdfLink = extractFirstPdfLink(html);

    const response = await fetch(pdfLink.url, {
      headers: {
        Accept: "application/pdf",
        "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) throw new Error(`Newsec-PDF svarte med ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const parsed = await pdfParse(Buffer.from(arrayBuffer));
    const text = parsed.text || "";
    const period = getLatestPeriodFromPdfText(text, pdfLink.title) || periodFromText(pdfLink.title);

    for (const segment of SEGMENTS) {
      const config = NEWSEC_ROWS[segment.id];
      output[segment.id] = {
        id: segment.id,
        label: segment.label,
        source: "Newsec",
        sourceUrl: pdfLink.url,
        value: extractNewsecLowValue(text, config.rowLabel, config.nextRowLabel),
        period,
        status: "auto",
      };
    }
  } catch (error) {
    errors.push(`Newsec: ${error instanceof Error ? error.message : String(error)}`);
    for (const segment of SEGMENTS) output[segment.id] = fallbackSource(existing, segment.id, "Newsec");
  }

  return output;
}

function akershusSegmentText(fullText) {
  const parts = fullText.split(/Segmentoversikt/i);
  return parts.length > 1 ? parts.slice(1).join("Segmentoversikt") : fullText;
}

function extractAkershusPeriod(text) {
  const match = text.match(/Per\s+[A-Za-zÆØÅæøå]+\s+20\d{2}/i);
  return match ? match[0] : null;
}

function extractAkershusValue(text, extractor) {
  const scoped = akershusSegmentText(text);
  const patterns = {
    office: /Prime\s+yield(?:\s+Oslo)?\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
    retail: /Prime\s+yield\s+high\s+street\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
    logistics: /Prime\s+yield\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
  };

  const match = scoped.match(patterns[extractor]);
  if (!match) throw new Error(`Fant ikke Akershus Prime yield for ${extractor}.`);

  const value = parseNumber(match[1]);
  if (!Number.isFinite(value)) throw new Error(`Klarte ikke å tolke Akershus-verdi for ${extractor}.`);

  return value;
}

async function clickAkershusSegment(page, label) {
  const button = page.getByRole("button", { name: label, exact: true });
  if (await button.count()) {
    await button.first().click();
    await page.waitForTimeout(1200);
    return;
  }

  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(1200);
}

async function scrapeAkershus(existing, errors) {
  const output = {};
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    });

    await page.goto(SOURCES.akershus, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);

    let period = null;

    for (const segment of SEGMENTS) {
      await clickAkershusSegment(page, segment.akershusButton);
      const bodyText = await page.locator("body").innerText({ timeout: 15000 });
      period = period || extractAkershusPeriod(bodyText);

      output[segment.id] = {
        id: segment.id,
        label: segment.label,
        source: "Akershus",
        sourceUrl: SOURCES.akershus,
        value: extractAkershusValue(bodyText, segment.akershusExtractor),
        period: period || "Ukjent periode",
        status: "auto",
      };
    }
  } catch (error) {
    errors.push(`Akershus: ${error instanceof Error ? error.message : String(error)}`);
    for (const segment of SEGMENTS) output[segment.id] = fallbackSource(existing, segment.id, "Akershus");
  } finally {
    if (browser) await browser.close();
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
