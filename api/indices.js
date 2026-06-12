import { getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const INDICES = [
  {
    id: "osebx",
    metricKey: "index_osebx",
    name: "OSEBX",
    longName: "Oslo Børs hovedindeks",
    description: "Oslo Børs: Vektet utvikling i de største og mest handlede aksjene.",
    provider: "yahoo",
    symbol: "OSEBX.OL",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/OSEBX.OL/",
  },
  {
    id: "sp500",
    metricKey: "index_sp500",
    name: "S&P 500",
    longName: "S&P 500",
    description: "USA: Bred indeks med 500 store børsnoterte selskaper.",
    provider: "stooq",
    symbol: "^spx",
    yahooSymbol: "^GSPC",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Espx",
  },
  {
    id: "nasdaq100",
    metricKey: "index_nasdaq100",
    name: "Nasdaq 100",
    longName: "Nasdaq 100",
    description: "USA: Teknologitung indeks med 100 store Nasdaq-selskaper.",
    provider: "stooq",
    symbol: "^ndx",
    yahooSymbol: "^NDX",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Endx",
  },
  {
    id: "dowjones",
    metricKey: "index_dowjones",
    name: "Dow Jones",
    longName: "Dow Jones Industrial Average",
    description: "USA: 30 store industriselskaper og etablerte blue chips.",
    provider: "stooq",
    symbol: "^dji",
    yahooSymbol: "^DJI",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Edji",
  },
  {
    id: "dax",
    metricKey: "index_dax",
    name: "DAX",
    longName: "DAX",
    description: "Tyskland: Ledende tyske børsnoterte selskaper.",
    provider: "stooq",
    symbol: "^dax",
    yahooSymbol: "^GDAXI",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Edax",
  },
  {
    id: "eurostoxx50",
    metricKey: "index_eurostoxx50",
    name: "Euro Stoxx 50",
    longName: "Euro Stoxx 50",
    description: "Eurosonen: 50 store og likvide selskaper fra eurolandene.",
    provider: "stooq",
    symbol: "^sx5e",
    yahooSymbol: "^STOXX50E",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Esx5e",
  },
  {
    id: "omxs30",
    metricKey: "index_omxs30",
    name: "OMXS30",
    longName: "OMX Stockholm 30",
    description: "Sverige: 30 mest omsatte aksjer på Stockholm-børsen.",
    provider: "yahoo",
    symbol: "^OMX",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/%5EOMX/",
  },
  {
    id: "vix",
    metricKey: "index_vix",
    name: "VIX",
    longName: "CBOE Volatility Index",
    description: "USA: Forventet 30-dagers volatilitet i S&P 500, lavere er bedre. (<15 lav uro, 20–30 tydelig usikkerhet, >40 krisetilstand).",
    provider: "stooq",
    symbol: "^vix",
    yahooSymbol: "^VIX",
    sourceName: "Stooq",
    sourceUrl: "https://stooq.com/q/d/?s=%5Evix",
  },
];

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return Number.NaN;
  return Number.parseFloat(
    String(value)
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
}

function stooqSymbolForUrl(symbol) {
  return encodeURIComponent(symbol.toLowerCase());
}

function yahooSymbolForUrl(symbol) {
  return encodeURIComponent(symbol);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`${url} svarte med ${response.status}.`);
  return await response.text();
}

function parseCsv(csv) {
  const lines = String(csv || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const dateIndex = header.indexOf("date");
  const closeIndex = header.indexOf("close");
  const openIndex = header.indexOf("open");
  const highIndex = header.indexOf("high");
  const lowIndex = header.indexOf("low");
  const volumeIndex = header.indexOf("volume");

  if (dateIndex < 0 || closeIndex < 0) return [];

  return lines.slice(1)
    .map((line) => line.split(","))
    .map((cells) => ({
      date: cells[dateIndex],
      open: openIndex >= 0 ? parseNumber(cells[openIndex]) : null,
      high: highIndex >= 0 ? parseNumber(cells[highIndex]) : null,
      low: lowIndex >= 0 ? parseNumber(cells[lowIndex]) : null,
      close: parseNumber(cells[closeIndex]),
      volume: volumeIndex >= 0 ? parseNumber(cells[volumeIndex]) : null,
    }))
    .filter((row) => row.date && Number.isFinite(row.close));
}

async function fetchStooqHistory(index, startDate, endDate) {
  const url =
    `https://stooq.com/q/d/l/?s=${stooqSymbolForUrl(index.symbol)}&i=d&d1=${yyyymmdd(startDate)}&d2=${yyyymmdd(endDate)}`;

  const csv = await fetchText(url);
  const rows = parseCsv(csv);

  if (!rows.length) {
    throw new Error(`Stooq returnerte ingen data for ${index.name} (${index.symbol}).`);
  }

  return rows.map((row) => ({
    ...row,
    sourceName: index.sourceName,
    sourceUrl: index.sourceUrl,
    sourceDocument: `${index.name} daily close`,
    rawSource: "stooq_csv",
  }));
}

async function fetchYahooHistory(index, range = "1y") {
  const symbol = yahooSymbolForUrl(index.symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance svarte med ${response.status} for ${index.name}.`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const rows = timestamps
    .map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close: quote.close?.[i] ?? null,
      volume: quote.volume?.[i] ?? null,
      sourceName: index.sourceName,
      sourceUrl: index.sourceUrl,
      sourceDocument: `${index.name} daily close`,
      rawSource: "yahoo_chart",
    }))
    .filter((row) => row.date && Number.isFinite(Number(row.close)))
    .map((row) => ({
      ...row,
      open: Number.isFinite(Number(row.open)) ? Number(row.open) : null,
      high: Number.isFinite(Number(row.high)) ? Number(row.high) : null,
      low: Number.isFinite(Number(row.low)) ? Number(row.low) : null,
      close: Number(row.close),
      volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : null,
    }));

  if (!rows.length) throw new Error(`Yahoo Finance returnerte ingen data for ${index.name} (${index.symbol}).`);

  return rows;
}

async function fetchIndexHistory(index, startDate, endDate, mode = "backfill") {
  if (index.provider === "yahoo") return fetchYahooHistory(index, mode === "update" ? "1mo" : "1y");

  try {
    return await fetchStooqHistory(index, startDate, endDate);
  } catch (stooqError) {
    if (!index.yahooSymbol) throw stooqError;

    const yahooIndex = {
      ...index,
      provider: "yahoo",
      symbol: index.yahooSymbol,
      sourceName: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(index.yahooSymbol)}/`,
    };

    return fetchYahooHistory(yahooIndex, mode === "update" ? "1mo" : "1y");
  }
}

async function insertIndexRows(rows) {
  if (!rows.length) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("market_metrics")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data || [];
}

async function getExistingDates(metricKey, cutoffIso) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("metric_key,observed_date")
    .eq("metric_key", metricKey)
    .gte("observed_date", cutoffIso)
    .not("observed_date", "is", null);

  if (error) throw error;

  return new Set((data || []).map((row) => `${row.metric_key}|${row.observed_date}`));
}

function rowsToMetricRows(index, historyRows, fetchedAt, existingSet = new Set()) {
  const metricRows = [];

  for (const row of historyRows) {
    const key = `${index.metricKey}|${row.date}`;
    if (existingSet.has(key)) continue;

    metricRows.push({
      metric_key: index.metricKey,
      value: row.close,
      unit: "points",
      source_name: row.sourceName,
      source_url: row.sourceUrl,
      source_document: row.sourceDocument,
      observed_date: row.date,
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: {
        indexId: index.id,
        name: index.name,
        longName: index.longName,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        provider: row.rawSource,
        symbol: index.symbol,
      },
    });
  }

  return metricRows;
}

async function updateIndices(action) {
  const fetchedAt = new Date().toISOString();
  const endDate = new Date();
  const startDate = action === "backfill" ? addDays(endDate, -370) : addDays(endDate, -35);
  const saved = [];
  const errors = [];

  for (const index of INDICES) {
    try {
      const historyRows = await fetchIndexHistory(index, startDate, endDate, action);
      const usefulRows = action === "update" ? historyRows.slice(-3) : historyRows;
      const existing = await getExistingDates(index.metricKey, isoDate(startDate));
      const metricRows = rowsToMetricRows(index, usefulRows, fetchedAt, existing);
      const inserted = await insertIndexRows(metricRows);
      saved.push({ index: index.id, metricKey: index.metricKey, fetchedRows: usefulRows.length, savedRows: inserted.length });
    } catch (error) {
      errors.push(`${index.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    status: errors.length ? (saved.length ? "partial" : "error") : "ok",
    fetchedAt,
    saved,
    errors,
  };
}

async function fetchRows() {
  const supabase = getSupabaseAdmin();
  const keys = INDICES.map((index) => index.metricKey);

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .in("metric_key", keys)
    .eq("status", "ok")
    .order("observed_date", { ascending: false })
    .limit(4000);

  if (error) throw error;
  return data || [];
}

function rowDate(row) {
  return String(row.observed_date || row.fetched_at || "").slice(0, 10);
}

function buildSeries(rows, metricKey, days = 370) {
  const cutoff = addDays(new Date(), -days).toISOString().slice(0, 10);

  const relevant = (rows || [])
    .filter((row) => row.metric_key === metricKey && Number.isFinite(Number(row.value)))
    .map((row) => ({
      date: rowDate(row),
      value: Number(row.value),
      fetchedAt: row.fetched_at,
    }))
    .filter((row) => row.date && row.date >= cutoff)
    .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());

  const byDate = new Map();
  for (const row of relevant) byDate.set(row.date, row.value);

  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pctChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current / previous) - 1) * 100;
}

function valueAtOrBefore(series, targetDate) {
  const target = targetDate.toISOString().slice(0, 10);
  let candidate = null;

  for (const point of series) {
    if (point.date <= target) candidate = point;
    else break;
  }

  return candidate;
}

function computeChanges(series) {
  if (!series.length) return { change1d: null, change1m: null, ytd: null, change1y: null };
  const latest = series[series.length - 1];
  const previous = series.length >= 2 ? series[series.length - 2] : null;
  const now = new Date(`${latest.date}T12:00:00Z`);

  const oneMonthAgo = addDays(now, -30);
  const oneYearAgo = addDays(now, -365);
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const oneMonthPoint = valueAtOrBefore(series, oneMonthAgo);
  const oneYearPoint = valueAtOrBefore(series, oneYearAgo);
  const ytdPoint = valueAtOrBefore(series, startOfYear);

  return {
    change1d: previous ? pctChange(latest.value, previous.value) : null,
    change1m: oneMonthPoint ? pctChange(latest.value, oneMonthPoint.value) : null,
    ytd: ytdPoint ? pctChange(latest.value, ytdPoint.value) : null,
    change1y: oneYearPoint ? pctChange(latest.value, oneYearPoint.value) : null,
  };
}

function buildReadPayload(rows) {
  const items = INDICES.map((index) => {
    const series = buildSeries(rows, index.metricKey, 370);
    const latest = series[series.length - 1] || null;
    const changes = computeChanges(series);

    const latestRow = rows
      .filter((row) => row.metric_key === index.metricKey)
      .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())[0];

    return {
      id: index.id,
      metricKey: index.metricKey,
      name: index.name,
      longName: index.longName,
      description: index.description,
      value: latest?.value ?? null,
      date: latest?.date ?? null,
      unit: "points",
      sourceName: latestRow?.source_name || index.sourceName,
      sourceUrl: latestRow?.source_url || index.sourceUrl,
      fetchedAt: latestRow?.fetched_at || null,
      history: series,
      sparkline: series.slice(-60),
      ...changes,
    };
  });

  const errors = items.filter((item) => !Number.isFinite(Number(item.value))).map((item) => `${item.name}: mangler verdi`);

  return {
    status: errors.length === items.length ? "empty" : errors.length ? "partial" : "ok",
    sourceName: "Market indices",
    fetchedAt: new Date().toISOString(),
    items,
    errors,
  };
}

export default async function handler(request, response) {
  try {
    const action =
      request.query?.action ||
      new URL(request.url || "https://local/api/indices", "https://local").searchParams.get("action");

    if (action === "update" || action === "backfill") {
      const result = await updateIndices(action);
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        metricGroup: "indices",
        action,
        ...result,
      });
      return;
    }

    const rows = await fetchRows();
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json(buildReadPayload(rows));
  } catch (error) {
    response.status(500).json({
      status: "error",
      metricGroup: "indices",
      message: error instanceof Error ? error.message : "Ukjent feil i indeks-endepunktet.",
    });
  }
}
