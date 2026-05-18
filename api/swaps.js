const SEB_SWAP_URL = "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates";

const TARGETS = {
  NOK: {
    label: "Norge",
    heading: "Swap [NOK]",
  },
  SEK: {
    label: "Sverige",
    heading: "Swap [SEK]",
  },
};

const TENORS = {
  "3Y": ["3 Yr", "3Y", "3 years", "3 år"],
  "5Y": ["5 Yr", "5Y", "5 years", "5 år"],
  "10Y": ["10 Yr", "10Y", "10 years", "10 år"],
};

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "string") return Number.NaN;
  return Number.parseFloat(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
}

function normaliseText(value) {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function firstFinite(values) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function findSectionText(fullText, heading) {
  const normalised = fullText.replace(/\r/g, "\n");
  const idx = normalised.toLowerCase().indexOf(heading.toLowerCase());

  if (idx === -1) {
    throw new Error(`Fant ikke SEB-seksjonen "${heading}".`);
  }

  const after = normalised.slice(idx);
  const rest = after.slice(heading.length);
  const nextHeadingMatch = rest.match(/\n\s*Swap\s+\[[A-Z]{3}\]/i);

  if (!nextHeadingMatch) return after;

  return after.slice(0, heading.length + nextHeadingMatch.index);
}

function extractTenorRate(sectionText, aliases) {
  const lines = sectionText
    .split("\n")
    .map(normaliseText)
    .filter(Boolean);

  for (const alias of aliases) {
    const escapedAlias = alias
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");

    const rowRegex = new RegExp(`^${escapedAlias}\\b(.+)$`, "i");

    for (const line of lines) {
      const match = line.match(rowRegex);
      if (!match) continue;

      const numberMatches = [...match[1].matchAll(/[-+]?\d+(?:[.,]\d+)?/g)].map((item) => item[0]);
      const parsed = firstFinite(numberMatches);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  // Fallback for cases where the rendered table is compressed into fewer lines.
  const compact = normaliseText(sectionText);

  for (const alias of aliases) {
    const escapedAlias = alias
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s*");

    const regex = new RegExp(`${escapedAlias}\\s+([-+]?\\d+(?:[.,]\\d+)?)`, "i");
    const match = compact.match(regex);

    if (match) {
      const parsed = parseNumber(match[1]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  throw new Error(`Fant ikke tenor ${aliases[0]} i SEB-seksjonen.`);
}

async function acceptCookiesIfPresent(page) {
  const possibleLabels = [
    "Accept all",
    "Accept",
    "Allow all",
    "Godta alle",
    "Godta",
    "I accept",
    "OK",
  ];

  for (const label of possibleLabels) {
    try {
      const button = page.getByRole("button", { name: label, exact: false }).first();
      if (await button.count()) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(700);
        return;
      }
    } catch {
      // Ignore cookie button misses.
    }
  }
}

async function getRenderedSebText() {
  const chromiumModule = await import("@sparticuz/chromium");
  const chromium = chromiumModule.default || chromiumModule;
  const playwrightModule = await import("playwright-core");

  const browser = await playwrightModule.chromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1400 },
      userAgent:
        "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0; +https://vercel.app)",
    });

    await page.goto(SEB_SWAP_URL, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await acceptCookiesIfPresent(page);

    try {
      await page.waitForFunction(
        () => document.body && document.body.innerText && document.body.innerText.includes("Swap [NOK]"),
        { timeout: 30000 }
      );
    } catch {
      await page.waitForTimeout(7000);
    }

    return await page.locator("body").innerText({ timeout: 10000 });
  } finally {
    await browser.close();
  }
}

function parseSebSwapText(text) {
  const data = {};

  for (const [currency, config] of Object.entries(TARGETS)) {
    const sectionText = findSectionText(text, config.heading);

    const rates = {};
    for (const [tenor, aliases] of Object.entries(TENORS)) {
      rates[tenor] = extractTenorRate(sectionText, aliases);
    }

    data[currency] = {
      label: config.label,
      currency,
      source: "SEB",
      sourceUrl: SEB_SWAP_URL,
      status: "ok",
      rates,
    };
  }

  return data;
}

export default async function handler(request, response) {
  try {
    const text = await getRenderedSebText();
    const data = parseSebSwapText(text);

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    response.status(200).json({
      status: "ok",
      sourceName: "SEB",
      sourceUrl: SEB_SWAP_URL,
      fetchedAt: new Date().toISOString(),
      data,
      errors: [],
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "SEB",
      sourceUrl: SEB_SWAP_URL,
      fetchedAt: new Date().toISOString(),
      data: {
        NOK: {
          label: "Norge",
          currency: "NOK",
          source: "SEB",
          sourceUrl: SEB_SWAP_URL,
          status: "error",
          rates: { "3Y": null, "5Y": null, "10Y": null },
        },
        SEK: {
          label: "Sverige",
          currency: "SEK",
          source: "SEB",
          sourceUrl: SEB_SWAP_URL,
          status: "error",
          rates: { "3Y": null, "5Y": null, "10Y": null },
        },
      },
      errors: [error instanceof Error ? error.message : "Ukjent feil ved henting av SEB swap-rates."],
    });
  }
}
