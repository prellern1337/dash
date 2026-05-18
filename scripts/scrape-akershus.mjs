import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://akershuseiendom.no/markedsinnsikt/nokkeltall";
const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "akershus-yields.json");

const SEGMENTS = [
  { id: "office", label: "Kontor", buttonText: "Kontor", extractor: "office" },
  { id: "retail", label: "Handel", buttonText: "Handel", extractor: "retail" },
  { id: "logistics", label: "Logistikk", buttonText: "Logistikk", extractor: "logistics" },
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

function extractPeriod(text) {
  const match = text.match(/Per\s+[A-Za-zÆØÅæøå]+\s+20\d{2}/i);
  return match ? match[0] : null;
}

function segmentText(fullText) {
  const parts = fullText.split(/Segmentoversikt/i);
  return parts.length > 1 ? parts.slice(1).join("Segmentoversikt") : fullText;
}

function extractValue(text, extractor) {
  const scoped = segmentText(text);

  const patterns = {
    office: /Prime\s+yield(?:\s+Oslo)?\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
    retail: /Prime\s+yield\s+high\s+street\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
    logistics: /Prime\s+yield\s+([0-9]+(?:[,.][0-9]+)?)\s*%/i,
  };

  const match = scoped.match(patterns[extractor]);

  if (!match) {
    throw new Error(`Fant ikke Akershus Prime yield for ${extractor}.`);
  }

  const value = parseNumber(match[1]);

  if (!Number.isFinite(value)) {
    throw new Error(`Klarte ikke å tolke Akershus-verdi for ${extractor}: ${match[1]}`);
  }

  return value;
}

async function clickSegment(page, label) {
  const roleLocator = page.getByRole("button", { name: label, exact: true });

  if (await roleLocator.count()) {
    await roleLocator.first().click();
    await page.waitForTimeout(1200);
    return;
  }

  const textLocator = page.getByText(label, { exact: true }).first();
  await textLocator.click();
  await page.waitForTimeout(1200);
}

async function scrapeAkershus() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    });

    await page.goto(SOURCE_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);

    const output = {};
    let period = null;

    for (const segment of SEGMENTS) {
      await clickSegment(page, segment.buttonText);
      const bodyText = await page.locator("body").innerText({ timeout: 15000 });
      period = period || extractPeriod(bodyText);

      output[segment.id] = {
        id: segment.id,
        label: segment.label,
        source: "Akershus",
        sourceUrl: SOURCE_URL,
        value: extractValue(bodyText, segment.extractor),
        period: period || "Ukjent periode",
        status: "auto",
      };
    }

    return {
      status: "ok",
      sourceName: "Akershus Eiendom",
      sourceUrl: SOURCE_URL,
      fetchedAt: new Date().toISOString(),
      period: period || "Ukjent periode",
      data: output,
      errors: [],
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs();
  const existing = await readExisting();

  if (!args.force && args.minDays > 0 && existing?.status === "ok" && daysSince(existing.fetchedAt) < args.minDays) {
    console.log(`Akershus-data er nyere enn ${args.minDays} dager. Hopper over.`);
    return;
  }

  try {
    const data = await scrapeAkershus();
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("Akershus-yielder oppdatert:", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Akershus-scrape feilet:", message);

    if (existing?.data) {
      const stale = {
        ...existing,
        status: "stale",
        lastAttemptAt: new Date().toISOString(),
        errors: [message],
      };

      for (const segment of Object.values(stale.data)) {
        segment.status = segment.status === "auto" || segment.status === "ok" ? "stale" : segment.status;
      }

      await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(stale, null, 2)}\n`, "utf8");
      console.log("Beholder forrige Akershus-data og markerer som stale.");
      return;
    }

    throw error;
  }
}

main();
