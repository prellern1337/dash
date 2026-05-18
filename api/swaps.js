const SEB_SWAP_URL = "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates";
const SEB_API_BASE = "https://sebgroup.com/ssc/trading/fx-rates-bff/api/rates/swap";

const CURRENCIES = {
  NOK: {
    label: "Norge",
  },
  SEK: {
    label: "Sverige",
  },
};

const TARGET_TENORS = {
  "3Y": "3 Yr",
  "5Y": "5 Yr",
  "10Y": "10 Yr",
};

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "string") return null;

  const parsed = Number.parseFloat(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseMaturity(value) {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractRows(payload) {
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload)) return payload;

  throw new Error("SEB-responsen mangler rows-array.");
}

function getCellValue(row, index) {
  if (Array.isArray(row?.data)) return row.data[index]?.value;
  if (Array.isArray(row)) return row[index]?.value ?? row[index];
  return undefined;
}

function extractRateForTenor(rows, targetMaturity) {
  const target = normaliseMaturity(targetMaturity);

  const row = rows.find((candidate) => normaliseMaturity(getCellValue(candidate, 0)) === target);

  if (!row) {
    throw new Error(`Fant ikke ${targetMaturity} i SEB-responsen.`);
  }

  const price = parseNumber(getCellValue(row, 1));
  const change = parseNumber(getCellValue(row, 2));
  const time = getCellValue(row, 3) || null;
  const date = getCellValue(row, 4) || null;

  if (!Number.isFinite(price)) {
    throw new Error(`Klarte ikke å tolke pris for ${targetMaturity}.`);
  }

  return {
    value: price,
    change,
    time,
    date,
  };
}

async function fetchSebCurrency(currency) {
  const apiUrl = `${SEB_API_BASE}?currency=${encodeURIComponent(currency)}`;

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MarketDashboardPWA/1.0",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`SEB API svarte med ${response.status} for ${currency}.`);
  }

  const payload = await response.json();
  const rows = extractRows(payload);

  const rates = {};
  const meta = {};

  for (const [key, maturity] of Object.entries(TARGET_TENORS)) {
    const observation = extractRateForTenor(rows, maturity);
    rates[key] = observation.value;
    meta[key] = {
      change: observation.change,
      time: observation.time,
      date: observation.date,
    };
  }

  const firstMeta = meta["3Y"] || {};

  return {
    label: CURRENCIES[currency].label,
    currency,
    source: "SEB",
    sourceUrl: SEB_SWAP_URL,
    apiUrl,
    status: "ok",
    date: firstMeta.date || null,
    time: firstMeta.time || null,
    rates,
    meta,
  };
}

export default async function handler(request, response) {
  try {
    const settled = await Promise.allSettled(
      Object.keys(CURRENCIES).map((currency) => fetchSebCurrency(currency))
    );

    const data = {};
    const errors = [];

    settled.forEach((result, index) => {
      const currency = Object.keys(CURRENCIES)[index];

      if (result.status === "fulfilled") {
        data[currency] = result.value;
      } else {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        data[currency] = {
          label: CURRENCIES[currency].label,
          currency,
          source: "SEB",
          sourceUrl: SEB_SWAP_URL,
          apiUrl: `${SEB_API_BASE}?currency=${currency}`,
          status: "error",
          date: null,
          time: null,
          rates: { "3Y": null, "5Y": null, "10Y": null },
          meta: {},
        };
      }
    });

    const hasAnyValue = Object.values(data).some((entry) =>
      Object.values(entry.rates || {}).some((value) => Number.isFinite(Number(value)))
    );

    if (!hasAnyValue) {
      response.status(500).json({
        status: "error",
        sourceName: "SEB",
        sourceUrl: SEB_SWAP_URL,
        fetchedAt: new Date().toISOString(),
        data,
        errors: errors.length ? errors : ["Ingen SEB swap-rates ble hentet."],
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    response.status(200).json({
      status: errors.length ? "partial" : "ok",
      sourceName: "SEB",
      sourceUrl: SEB_SWAP_URL,
      fetchedAt: new Date().toISOString(),
      data,
      errors,
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
