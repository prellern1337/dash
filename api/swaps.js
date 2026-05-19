export const config = {
  maxDuration: 60,
};

const SEB_SWAP_URL =
  "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates";

const WANTED_TENORS = ["3 Yr", "5 Yr", "10 Yr"];

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

async function renderSebSwapPage() {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1366,
      height: 1400,
    },
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
    });

    await page.goto(SEB_SWAP_URL, {
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
  return String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findSection(text, currency) {
  const clean = normaliseText(text);
  const startPattern = new RegExp(`Swap\\s*\\[${currency}\\]`, "i");
  const startMatch = clean.match(startPattern);

  if (!startMatch) {
    throw new Error(`Fant ikke seksjonen Swap [${currency}] på SEB-siden.`);
  }

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
    if (Number.isFinite(value) && value > -10 && value < 30) {
      return value;
    }
  }

  throw new Error(`Fant ikke ${tenor} i SEB-seksjonen.`);
}

function extractFromBodyText(bodyText, currency) {
  const section = findSection(bodyText, currency);
  const rates = {};

  for (const tenor of WANTED_TENORS) {
    rates[tenor] = extractTenorFromSection(section, tenor);
  }

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

    if (inSection && /Swap\s*\[[A-Z]{3}\]/i.test(rowText)) {
      break;
    }

    if (!inSection) continue;

    for (const tenor of WANTED_TENORS) {
      if (rates[tenor] !== undefined) continue;
      if (!new RegExp(tenor.replace(/\s+/g, "\\s*"), "i").test(rowText)) continue;

      const numericValues = rowText
        .match(/[-+]?\d+(?:[.,]\d+)?/g)
        ?.map(parseNumber)
        .filter((value) => Number.isFinite(value) && value > -10 && value < 30);

      if (numericValues?.length) {
        // Avoid capturing tenor number itself if row text starts "3 Yr 4.10".
        const withoutTenorNumber = numericValues.filter((value) => ![3, 5, 10].includes(value));
        rates[tenor] = withoutTenorNumber[0] ?? numericValues[numericValues.length - 1];
      }
    }
  }

  const missing = WANTED_TENORS.filter((tenor) => rates[tenor] === undefined);
  if (missing.length) {
    throw new Error(`Mangler ${missing.join(", ")} i tabellrader for ${currency}.`);
  }

  return rates;
}

function buildPayload(rendered) {
  const errors = [];
  const currencies = ["NOK", "SEK"];
  const data = {};

  for (const currency of currencies) {
    try {
      data[currency] = {
        currency,
        rates: extractFromRows(rendered.tableLikeRows, currency),
        method: "table_rows",
      };
      continue;
    } catch (error) {
      errors.push(`${currency} rows: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      data[currency] = {
        currency,
        rates: extractFromBodyText(rendered.bodyText, currency),
        method: "body_text",
      };
      continue;
    } catch (error) {
      errors.push(`${currency} body: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const missingCurrencies = currencies.filter((currency) => !data[currency]);

  if (missingCurrencies.length) {
    throw new Error(`Kunne ikke hente SEB swap for ${missingCurrencies.join(", ")}. ${errors.join(" | ")}`);
  }

  return {
    status: errors.length ? "partial" : "ok",
    sourceName: "SEB",
    sourceUrl: SEB_SWAP_URL,
    fetchedAt: new Date().toISOString(),
    data,
    errors,
  };
}

export default async function handler(request, response) {
  try {
    const rendered = await renderSebSwapPage();
    const payload = buildPayload(rendered);

    response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    response.status(200).json(payload);
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "SEB",
      sourceUrl: SEB_SWAP_URL,
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av SEB swap-renter.",
    });
  }
}
