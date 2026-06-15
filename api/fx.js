const CURRENCIES = ["EUR", "USD", "SEK"];

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ";" && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseNumber(value) {
  if (typeof value !== "string") return Number(value);
  const cleaned = value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  return Number.parseFloat(cleaned);
}

function downsample(series, maxPoints = 140) {
  if (series.length <= maxPoints) return series;
  const step = (series.length - 1) / (maxPoints - 1);
  const sampled = [];

  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(series[Math.round(i * step)]);
  }

  return sampled;
}

function findObservationClosestToOrBefore(series, targetDate) {
  const target = targetDate.getTime();

  for (let i = series.length - 1; i >= 0; i -= 1) {
    const time = new Date(series[i].date).getTime();
    if (time <= target) return series[i];
  }

  return series[0];
}

function normaliseRowsFromCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Norges Bank returnerte ingen observasjoner.");
  }

  const header = parseCsvLine(lines[0]).map((cell) => cell.replace(/^\uFEFF/, "").trim());

  const baseIdx = header.indexOf("BASE_CUR") >= 0 ? header.indexOf("BASE_CUR") : 2;
  const unitMultIdx = header.indexOf("UNIT_MULT") >= 0 ? header.indexOf("UNIT_MULT") : 10;
  const dateIdx = header.indexOf("TIME_PERIOD") >= 0 ? header.indexOf("TIME_PERIOD") : 14;
  const valueIdx = header.indexOf("OBS_VALUE") >= 0 ? header.indexOf("OBS_VALUE") : 15;

  const grouped = new Map();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const baseCurrency = cells[baseIdx];
    const date = cells[dateIdx];
    const rawValue = parseNumber(cells[valueIdx]);
    const unitMultiplier = Number.parseInt(cells[unitMultIdx] || "0", 10);

    if (!baseCurrency || !date || Number.isNaN(rawValue)) continue;

    // Some currencies, including SEK/DKK, are quoted per 100 units by Norges Bank.
    // UNIT_MULT = 2 means "hundreds". We normalise to NOK per 1 currency unit.
    const normalisedValue = rawValue / Math.pow(10, Number.isNaN(unitMultiplier) ? 0 : unitMultiplier);

    if (!grouped.has(baseCurrency)) grouped.set(baseCurrency, []);
    grouped.get(baseCurrency).push({
      date,
      value: normalisedValue,
      rawValue,
      unitMultiplier: Number.isNaN(unitMultiplier) ? 0 : unitMultiplier,
    });
  }

  for (const [currency, rows] of grouped.entries()) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    grouped.set(currency, rows);
  }

  return grouped;
}

async function fetchNorgesBankFx() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3);
  startDate.setDate(startDate.getDate() - 10);

  const startPeriod = toIsoDate(startDate);
  const endPeriod = toIsoDate(endDate);
  const currencyKey = CURRENCIES.join("%2B");

  const sourceUrl = `https://data.norges-bank.no/api/data/EXR/B.${currencyKey}.NOK.SP?bom=include&format=csv&locale=en&startPeriod=${startPeriod}&endPeriod=${endPeriod}`;

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/csv",
      "User-Agent": "MarketDashboardPWA/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Norges Bank API svarte med ${response.status}.`);
  }

  const csvText = await response.text();
  const grouped = normaliseRowsFromCsv(csvText);
  const target30d = new Date();
  target30d.setDate(target30d.getDate() - 30);

  const pairs = CURRENCIES.map((currency) => {
    const series = grouped.get(currency) || [];

    if (series.length === 0) {
      throw new Error(`Mangler valutadata for ${currency}/NOK.`);
    }

    const latest = series[series.length - 1];
    const point30d = findObservationClosestToOrBefore(series, target30d);

    // Positive means NOK has strengthened. Negative means NOK has weakened.
    const change30dNok = ((point30d.value / latest.value) - 1) * 100;

    return {
      name: `${currency}/NOK`,
      value: latest.value,
      date: latest.date,
      change30dNok,
      rawValue: latest.rawValue,
      unitMultiplier: latest.unitMultiplier,
      series3y: downsample(series.map((point) => ({
        date: point.date,
        value: point.value,
      }))),
    };
  });

  return {
    status: "ok",
    sourceName: "Norges Bank",
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    pairs,
  };
}

export default async function handler(request, response) {
  try {
    const payload = await fetchNorgesBankFx();

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json(payload);
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "Norges Bank",
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av valutakurser.",
    });
  }
}
