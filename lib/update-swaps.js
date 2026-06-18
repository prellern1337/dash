import { insertMetric, getLatestMetric } from "./supabase.js";

export const config = {
  maxDuration: 60,
};

const BUILD = "seb-swaps-upstream-placeholder-fallback-v3-2026-06-18";

const SEB_SWAP_URL =
  "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates";

const SEB_SWAP_API_BASE =
  "https://sebgroup.com/ssc/trading/fx-rates-bff/api/rates/swap";

const WANTED_TENORS = ["3 Yr", "5 Yr", "10 Yr"];
const CURRENCIES = ["NOK", "SEK"];

function metricKey(currency, tenor) {
  const tenorKey = tenor.toLowerCase().replace(/\s+/g, "").replace("yr", "y");
  return `swap_${currency.toLowerCase()}_${tenorKey}`;
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

function isReasonableSwapRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > -10 && number < 30;
}

function isOnePercentPlaceholderValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number - 1) < 0.0000001;
}

function ratesAreAllOnePercent(rates) {
  return WANTED_TENORS.every((tenor) => isOnePercentPlaceholderValue(rates?.[tenor]));
}

function suspiciousOnePercentCurrencies(data) {
  return CURRENCIES.filter((currency) => ratesAreAllOnePercent(data?.[currency]?.rates));
}

function assertNotSuspiciousOnePercentPayload(data, context) {
  const suspicious = suspiciousOnePercentCurrencies(data);
  if (!suspicious.length) return;

  throw new Error(
    `${context}: ${suspicious.join(", ")} returnerte 1.00% for alle SWAP-tenorer. ` +
      "Dette tolkes som SEB/API-placeholder, ikke faktisk markedsrente. Faller tilbake til annen kilde hvis mulig."
  );
}

function tenorAliases(tenor) {
  const years = tenor.match(/\d+/)?.[0];
  if (!years) return [tenor.toLowerCase()];

  return [
    `${years} yr`,
    `${years}yr`,
    `${years} y`,
    `${years}y`,
    `${years} year`,
    `${years} years`,
    `${years} år`,
    `${years}aar`,
  ];
}

function textMatchesTenor(text, tenor) {
  const clean = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  return tenorAliases(tenor).some((alias) => clean.includes(alias));
}

function numericValuesFromText(text) {
  return (
    String(text || "")
      .match(/[-+]?\d+(?:[.,]\d+)?/g)
      ?.map(parseNumber)
      .filter(isReasonableSwapRate) || []
  );
}

function firstUsefulNumeric(values) {
  return values.find((value) => ![3, 5, 10].includes(value)) ?? values[values.length - 1] ?? null;
}

function collectJsonNodes(value, out = []) {
  if (!value || typeof value !== "object") return out;

  if (Array.isArray(value)) {
    out.push(value);
    for (const item of value) collectJsonNodes(item, out);
    return out;
  }

  out.push(value);
  for (const item of Object.values(value)) collectJsonNodes(item, out);
  return out;
}

function candidateTenorFromObject(object) {
  const keys = ["tenor", "term", "maturity", "period", "label", "name", "title", "description", "displayName"];

  for (const key of keys) {
    const value = object?.[key];
    if (typeof value === "string") {
      for (const tenor of WANTED_TENORS) {
        if (textMatchesTenor(value, tenor)) return tenor;
      }
    }
  }

  return null;
}

function candidateRateFromObject(object) {
  const preferredKeys = [
    "mid",
    "rate",
    "value",
    "last",
    "close",
    "price",
    "swapRate",
    "marketRate",
    "current",
    "bid",
    "ask",
  ];

  for (const key of preferredKeys) {
    const value = parseNumber(object?.[key]);
    if (isReasonableSwapRate(value) && ![3, 5, 10].includes(value)) return value;
  }

  const values = Object.entries(object || {})
    .filter(([key]) => !/tenor|term|maturity|period|year|date|time|id|sort|order/i.test(key))
    .map(([, value]) => parseNumber(value))
    .filter(isReasonableSwapRate);

  return firstUsefulNumeric(values);
}

function extractRatesFromApiJson(json, currency) {
  const rates = {};
  const nodes = collectJsonNodes(json);

  for (const node of nodes) {
    if (Array.isArray(node)) {
      const rowText = node.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(" ");

      for (const tenor of WANTED_TENORS) {
        if (rates[tenor] !== undefined || !textMatchesTenor(rowText, tenor)) continue;

        const values = numericValuesFromText(rowText);
        const value = firstUsefulNumeric(values);
        if (isReasonableSwapRate(value)) rates[tenor] = value;
      }

      continue;
    }

    if (!node || typeof node !== "object") continue;

    const tenor = candidateTenorFromObject(node);
    if (tenor && rates[tenor] === undefined) {
      const value = candidateRateFromObject(node);
      if (isReasonableSwapRate(value)) rates[tenor] = value;
    }

    const objectText = JSON.stringify(node);
    for (const wantedTenor of WANTED_TENORS) {
      if (rates[wantedTenor] !== undefined || !textMatchesTenor(objectText, wantedTenor)) continue;

      const values = numericValuesFromText(objectText);
      const value = firstUsefulNumeric(values);
      if (isReasonableSwapRate(value)) rates[wantedTenor] = value;
    }
  }

  const missing = WANTED_TENORS.filter((tenor) => rates[tenor] === undefined);
  if (missing.length) {
    throw new Error(
      `SEB API mangler ${missing.join(", ")} for ${currency}. JSON keys: ${
        Object.keys(json || {}).slice(0, 20).join(", ") || "ingen"
      }`
    );
  }

  return rates;
}

async function fetchSebSwapApi(currency) {
  const url = `${SEB_SWAP_API_BASE}?currency=${encodeURIComponent(currency)}&_=${Date.now()}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8,nb;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Referer: SEB_SWAP_URL,
    },
  });

  if (!response.ok) throw new Error(`SEB swap API svarte med ${response.status} for ${currency}.`);

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`SEB swap API returnerte ikke JSON for ${currency}. Første tegn: ${text.slice(0, 80)}`);
  }

  return {
    currency,
    rates: extractRatesFromApiJson(json, currency),
    method: "seb_direct_api",
    apiUrl: url,
    rawKeys: Object.keys(json || {}).slice(0, 20),
  };
}

async function fetchSebSwapApiAll() {
  const data = {};
  const errors = [];

  for (const currency of CURRENCIES) {
    try {
      data[currency] = await fetchSebSwapApi(currency);
    } catch (error) {
      errors.push(`${currency} API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (CURRENCIES.every((currency) => data[currency])) {
    assertNotSuspiciousOnePercentPayload(data, "Direkte SEB API");
    return {
      data,
      errors,
      method: "seb_direct_api",
    };
  }

  throw new Error(`Direkte SEB API feilet. ${errors.join(" | ")}`);
}

async function renderSebSwapPage() {
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

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8,nb;q=0.7",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    });

    const url = `${SEB_SWAP_URL}?ts=${Date.now()}`;
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2500));

    return await page.evaluate(() => {
      const tableLikeRows = [];

      for (const table of Array.from(document.querySelectorAll("table"))) {
        for (const row of Array.from(table.querySelectorAll("tr"))) {
          const cells = Array.from(row.querySelectorAll("th,td"))
            .map((cell) => cell.innerText || cell.textContent || "")
            .map((text) => text.replace(/\s+/g, " ").trim())
            .filter(Boolean);

          if (cells.length) tableLikeRows.push(cells);
        }
      }

      return {
        title: document.title,
        location: window.location.href,
        bodyText: document.body ? document.body.innerText : "",
        tableLikeRows,
      };
    });
  } finally {
    await browser.close();
  }
}

function normaliseText(text) {
  return String(text || "").replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
}

function findSection(text, currency) {
  const clean = normaliseText(text);
  const startPattern = new RegExp(`Swap\\s*\\[${currency}\\]`, "i");
  const startMatch = clean.match(startPattern);

  if (!startMatch) throw new Error(`Fant ikke seksjonen Swap [${currency}] på SEB-siden.`);

  const start = startMatch.index || 0;
  const rest = clean.slice(start);
  const nextSection = rest.slice(20).search(/Swap\s*\[[A-Z]{3}\]/i);

  return nextSection >= 0 ? rest.slice(0, nextSection + 20) : rest.slice(0, 3000);
}

function extractTenorFromSection(section, tenor) {
  const escapedTenor = tenor.replace(/\s+/g, "\\s*");
  const patterns = [
    new RegExp(`${escapedTenor}\\s+([-+]?\\d+(?:[.,]\\d+)?)`, "i"),
    new RegExp(`${escapedTenor}[^-+\\d]{0,40}([-+]?\\d+(?:[.,]\\d+)?)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = section.match(pattern);
    if (!match) continue;
    const value = parseNumber(match[1]);
    if (isReasonableSwapRate(value)) return value;
  }

  throw new Error(`Fant ikke ${tenor} i SEB-seksjonen.`);
}

function extractFromBodyText(bodyText, currency) {
  const section = findSection(bodyText, currency);
  const rates = {};
  for (const tenor of WANTED_TENORS) rates[tenor] = extractTenorFromSection(section, tenor);
  return rates;
}

function extractFromRows(rows, currency) {
  const rates = {};
  let inSection = false;

  for (const cells of rows || []) {
    const rowText = cells.join(" ");

    if (new RegExp(`Swap\\s*\\[${currency}\\]`, "i").test(rowText)) {
      inSection = true;
      continue;
    }

    if (inSection && /Swap\s*\[[A-Z]{3}\]/i.test(rowText)) break;
    if (!inSection) continue;

    for (const tenor of WANTED_TENORS) {
      if (rates[tenor] !== undefined) continue;
      if (!new RegExp(tenor.replace(/\s+/g, "\\s*"), "i").test(rowText)) continue;

      const numericValues = numericValuesFromText(rowText);
      const value = firstUsefulNumeric(numericValues);

      if (isReasonableSwapRate(value)) rates[tenor] = value;
    }
  }

  const missing = WANTED_TENORS.filter((tenor) => rates[tenor] === undefined);
  if (missing.length) throw new Error(`Mangler ${missing.join(", ")} i tabellrader for ${currency}.`);

  return rates;
}

function extractSwapData(rendered) {
  const errors = [];
  const data = {};

  for (const currency of CURRENCIES) {
    try {
      data[currency] = {
        currency,
        rates: extractFromRows(rendered.tableLikeRows, currency),
        method: "rendered_table_rows",
      };
      continue;
    } catch (error) {
      errors.push(`${currency} rows: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      data[currency] = {
        currency,
        rates: extractFromBodyText(rendered.bodyText, currency),
        method: "rendered_body_text",
      };
      continue;
    } catch (error) {
      errors.push(`${currency} body: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const missing = CURRENCIES.filter((currency) => !data[currency]);
  if (missing.length) throw new Error(`Kunne ikke hente SEB swap for ${missing.join(", ")}. ${errors.join(" | ")}`);

  assertNotSuspiciousOnePercentPayload(data, "Rendret SEB-side");
  return { data, errors, method: "rendered_page" };
}

async function fetchSebSwapData() {
  const errors = [];

  try {
    return await fetchSebSwapApiAll();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const rendered = await renderSebSwapPage();
    const parsed = extractSwapData(rendered);

    return {
      ...parsed,
      errors: [...errors, ...parsed.errors],
    };
  } catch (error) {
    errors.push(`rendered page: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(errors.join(" | "));
}

async function insertSwapRows(swapData, fetchedAt, method) {
  assertNotSuspiciousOnePercentPayload(swapData, "Før lagring til Supabase");
  const saved = [];

  for (const [currency, payload] of Object.entries(swapData)) {
    for (const [tenor, value] of Object.entries(payload.rates)) {
      const row = await insertMetric({
        metric_key: metricKey(currency, tenor),
        value,
        unit: "%",
        source_name: "SEB Swap Rates",
        source_url: payload.apiUrl || SEB_SWAP_URL,
        source_document: `Swap [${currency}] ${tenor}`,
        observed_date: fetchedAt.slice(0, 10),
        fetched_at: fetchedAt,
        status: "ok",
        message: null,
        raw: {
          build: BUILD,
          currency,
          tenor,
          method: payload.method || method,
          apiUrl: payload.apiUrl || null,
          rawKeys: payload.rawKeys || null,
        },
      });

      saved.push(row);
    }
  }

  return saved;
}

async function insertErrorRows(message, fetchedAt) {
  const errorRows = [];

  for (const currency of CURRENCIES) {
    for (const tenor of WANTED_TENORS) {
      const row = await insertMetric({
        metric_key: metricKey(currency, tenor),
        value: null,
        unit: "%",
        source_name: "SEB Swap Rates",
        source_url: SEB_SWAP_URL,
        source_document: `Swap [${currency}] ${tenor}`,
        observed_date: fetchedAt.slice(0, 10),
        fetched_at: fetchedAt,
        status: "error",
        message,
        raw: {
          build: BUILD,
          stage: "update-swaps",
          currency,
          tenor,
        },
      });
      errorRows.push(row);
    }
  }

  return errorRows;
}

async function latestGoodRows() {
  const latestGood = {};

  for (const currency of CURRENCIES) {
    latestGood[currency] = {};
    for (const tenor of WANTED_TENORS) {
      const { latestGood: row } = await getLatestMetric(metricKey(currency, tenor));
      latestGood[currency][tenor] = row;
    }
  }

  return latestGood;
}

async function debugSwaps() {
  const fetchedAt = new Date().toISOString();
  const directApi = {};
  const directWarnings = [];

  for (const currency of CURRENCIES) {
    try {
      directApi[currency] = await fetchSebSwapApi(currency);
    } catch (error) {
      directApi[currency] = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  try {
    assertNotSuspiciousOnePercentPayload(directApi, "Debug direkte SEB API");
  } catch (error) {
    directWarnings.push(error instanceof Error ? error.message : String(error));
  }

  let preferredFetch;
  try {
    preferredFetch = await fetchSebSwapData();
  } catch (error) {
    preferredFetch = {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    build: BUILD,
    status: preferredFetch?.status === "error" ? "partial" : "ok",
    fetchedAt,
    directApi,
    directWarnings,
    preferredFetch,
  };
}

export { debugSwaps };

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();
  const action =
    request.query?.action ||
    new URL(request.url || "https://local/api/swaps", "https://local").searchParams.get("action");

  try {
    if (action === "debug-swaps") {
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json(await debugSwaps());
      return;
    }

    const { data, errors, method } = await fetchSebSwapData();
    const saved = await insertSwapRows(data, fetchedAt, method);

    response.status(200).json({
      build: BUILD,
      status: errors.length ? "partial" : "ok",
      metricGroup: "seb_swaps",
      fetchedAt,
      method,
      data,
      savedCount: saved.length,
      saved,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved oppdatering av SEB swap-renter.";
    const errorRows = await insertErrorRows(message, fetchedAt);

    response.status(200).json({
      build: BUILD,
      status: "error",
      metricGroup: "seb_swaps",
      fetchedAt,
      message,
      errorRowsCount: errorRows.length,
      latestGood: await latestGoodRows(),
    });
  }
}
