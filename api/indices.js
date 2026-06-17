import { getSupabaseAdmin } from "../lib/supabase.js";
import { DNB_FUND_HISTORY } from "../lib/dnb-fund-history.js";

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
  {
    id: "dnb_teknologi_a",
    metricKey: "fund_dnb_teknologi_a",
    name: "DNB Tek A",
    longName: "DNB Teknologi A",
    description: "DNB: Aktivt forvaltet aksjefond innen teknologi, media og telekommunikasjon.",
    provider: "dnb_fund",
    isin: "NO0010337678",
    unit: "NOK",
    sourceName: "DNB",
    sourceUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-teknologi-a-NO0010337678",
  },
  {
    id: "dnb_global_indeks_a",
    metricKey: "fund_dnb_global_indeks_a",
    name: "DNB Global Indeks",
    longName: "DNB Global Indeks A",
    description: "DNB: Indeksnært globalt aksjefond som søker å følge MSCI World Index Net.",
    provider: "dnb_fund",
    isin: "NO0010582984",
    unit: "NOK",
    sourceName: "DNB",
    sourceUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-global-indeks-a-NO0010582984",
  },
  {
    id: "dnb_smb_a",
    metricKey: "fund_dnb_smb_a",
    name: "DNB SMB",
    longName: "DNB SMB A",
    description: "DNB: Aktivt forvaltet aksjefond med små og mellomstore selskaper, hovedsakelig på Oslo Børs.",
    provider: "dnb_fund",
    isin: "NO0010337819",
    unit: "NOK",
    sourceName: "DNB",
    sourceUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-smb-a-NO0010337819",
  }
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


function dateToTime(date) {
  const time = new Date(`${date}T12:00:00Z`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestByDate(rows) {
  return [...(rows || [])].sort((a, b) => dateToTime(a.date) - dateToTime(b.date)).pop() || null;
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
function isValidMarketValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function forwardFillMissingSeriesValues(series) {
  const result = [];
  let lastValid = null;

  for (const point of series || []) {
    const value = Number(point.value);

    if (isValidMarketValue(value)) {
      lastValid = value;
      result.push({
        ...point,
        value,
        isForwardFilled: false,
      });
      continue;
    }

    if (lastValid !== null) {
      result.push({
        ...point,
        value: lastValid,
        isForwardFilled: true,
      });
    }
  }

  return result;
}



function stooqSymbolForUrl(symbol) {
  return encodeURIComponent(symbol.toLowerCase());
}

function yahooSymbolForUrl(symbol) {
  return encodeURIComponent(symbol);
}
function yahooQuotePageUrl(symbol) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`;
}

async function fetchYahooLatestQuote(index) {
  const symbol = yahooSymbolForUrl(index.symbol);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Yahoo quote svarte med ${response.status} for ${index.name}.`);

  const json = await response.json();
  const quote = json?.quoteResponse?.result?.[0];

  const price = Number(quote?.regularMarketPrice);
  const marketTime = Number(quote?.regularMarketTime || quote?.postMarketTime || quote?.preMarketTime);
  const previousClose = Number(quote?.regularMarketPreviousClose);

  if (!isValidMarketValue(price) || !Number.isFinite(marketTime)) {
    return null;
  }

  return {
    date: new Date(marketTime * 1000).toISOString().slice(0, 10),
    open: Number.isFinite(Number(quote?.regularMarketOpen)) ? Number(quote.regularMarketOpen) : null,
    high: Number.isFinite(Number(quote?.regularMarketDayHigh)) ? Number(quote.regularMarketDayHigh) : null,
    low: Number.isFinite(Number(quote?.regularMarketDayLow)) ? Number(quote.regularMarketDayLow) : null,
    close: price,
    volume: Number.isFinite(Number(quote?.regularMarketVolume)) ? Number(quote.regularMarketVolume) : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    sourceName: "Yahoo Finance",
    sourceUrl: yahooQuotePageUrl(index.symbol),
    sourceDocument: `${index.name} latest quote`,
    rawSource: "yahoo_quote",
    forceInsert: true,
  };
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

async function fetchYahooHistory(index, range = "1y", includeLatestQuote = false) {
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
    .filter((row) => row.date && isValidMarketValue(row.close))
    .map((row) => ({
      ...row,
      open: Number.isFinite(Number(row.open)) ? Number(row.open) : null,
      high: Number.isFinite(Number(row.high)) ? Number(row.high) : null,
      low: Number.isFinite(Number(row.low)) ? Number(row.low) : null,
      close: Number(row.close),
      volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : null,
    }));

  if (includeLatestQuote) {
    try {
      const latestQuote = await fetchYahooLatestQuote(index);

      if (latestQuote?.date && isValidMarketValue(latestQuote.close)) {
        const existingIndex = rows.findIndex((row) => row.date === latestQuote.date);

        if (existingIndex >= 0) {
          rows[existingIndex] = {
            ...rows[existingIndex],
            ...latestQuote,
            rawSource: "yahoo_chart_plus_quote",
          };
        } else {
          rows.push(latestQuote);
        }

        rows.sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch {
      // Keep chart data if quote endpoint is unavailable.
    }
  }

  if (!rows.length) throw new Error(`Yahoo Finance returnerte ingen data for ${index.name} (${index.symbol}).`);

  return rows;
}

function norwegianMonthToNumber(monthName) {
  const map = {
    jan: "01", januar: "01",
    feb: "02", februar: "02",
    mar: "03", mars: "03",
    apr: "04", april: "04",
    mai: "05",
    jun: "06", juni: "06",
    jul: "07", juli: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    okt: "10", oktober: "10",
    nov: "11", november: "11",
    des: "12", desember: "12",
  };

  return map[String(monthName || "").toLowerCase().replace(".", "")] || null;
}

function normaliseDnbText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#xE5;/g, "å")
    .replace(/&#xE6;/g, "æ")
    .replace(/&#xF8;/g, "ø")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDnbNavNumber(value) {
  if (typeof value !== "string") return Number.NaN;

  return Number.parseFloat(
    value
      .replace(/\s/g, "")
      .replace(/\u00a0/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
}

function parseDnbFundObservedDate(day, monthName, year) {
  const month = norwegianMonthToNumber(monthName);
  if (!month) return null;
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function addDnbNavCandidate(candidates, fund, value, date, rawSource = "dnb_fund_page") {
  const close = parseDnbNavNumber(String(value || ""));
  if (!Number.isFinite(close) || close <= 0 || !date) return;

  candidates.push({
    date,
    close,
    open: null,
    high: null,
    low: null,
    volume: null,
    sourceName: fund.sourceName,
    sourceUrl: fund.sourceUrl,
    sourceDocument: `${fund.name} NAV/Kurs`,
    rawSource,
    forceInsert: true,
  });
}

function extractDnbFundNav(html, fund) {
  const text = normaliseDnbText(html);
  const candidates = [];

  const navPatterns = [
    /NAV\/Kurs\s+([\d\s.,]+)\s*kroner\s+(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\s*\/\s*Kurs[\s\S]{0,160}?([\d\s.,]+)\s*kroner[\s\S]{0,120}?(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\/Price\s+([\d\s.,]+)\s*kroner\s+(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\s*\/\s*Price[\s\S]{0,160}?([\d\s.,]+)\s*kroner[\s\S]{0,120}?(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
  ];

  for (const pattern of navPatterns) {
    for (const match of text.matchAll(pattern)) {
      const observedDate = parseDnbFundObservedDate(match[2], match[3], match[4]);
      addDnbNavCandidate(candidates, fund, match[1], observedDate, "dnb_fund_page");
    }
  }

  // Some DNB/React payloads expose dates as ISO strings. Keep these generic and
  // conservative: only accept them if a NAV-like key is nearby.
  const jsonLike = String(html || "")
    .replace(/\\"/g, '"')
    .replace(/\\u002F/g, "/")
    .replace(/\\u002D/g, "-")
    .replace(/\\u00a0/g, " ");

  const isoPatterns = [
    /"(?:nav|navPrice|navValue|price|lastPrice|unitPrice|kurs)"\s*:\s*"?([\d\s.,]+)"?[\s\S]{0,180}?"(?:date|navDate|priceDate|valuationDate|asOfDate)"\s*:\s*"(\d{4}-\d{2}-\d{2})"/gi,
    /"(?:date|navDate|priceDate|valuationDate|asOfDate)"\s*:\s*"(\d{4}-\d{2}-\d{2})"[\s\S]{0,180}?"(?:nav|navPrice|navValue|price|lastPrice|unitPrice|kurs)"\s*:\s*"?([\d\s.,]+)"?/gi,
  ];

  for (const match of jsonLike.matchAll(isoPatterns[0])) {
    addDnbNavCandidate(candidates, fund, match[1], match[2], "dnb_fund_json");
  }

  for (const match of jsonLike.matchAll(isoPatterns[1])) {
    addDnbNavCandidate(candidates, fund, match[2], match[1], "dnb_fund_json");
  }

  const latest = latestByDate(candidates);
  if (latest) return latest;

  throw new Error(`Fant ikke NAV/Kurs på DNB-siden for ${fund.name}.`);
}

function dnbFundCandidateUrls(fund) {
  const urls = new Set([fund.sourceUrl]);

  if (fund.sourceUrl.includes("/sparing/fond/fond-liste/d/")) {
    urls.add(fund.sourceUrl.replace("/sparing/fond/fond-liste/d/", "/sparing/fond/fond-liste/private-banking/d/"));
    urls.add(fund.sourceUrl.replace("/sparing/fond/fond-liste/d/", "/sparing/fond/fond-liste/corporate-banking/d/"));
    urls.add(fund.sourceUrl.replace("https://www.dnb.no/sparing/fond/fond-liste/d/", "https://www.dnb.no/en/saving/mutual-funds/fund-list/d/"));
  }

  return Array.from(urls);
}

async function fetchDnbFundCurrent(fund) {
  const errors = [];

  for (const baseUrl of dnbFundCandidateUrls(fund)) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}ts=${Date.now()}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json,*/*",
          "Accept-Language": "nb-NO,nb;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        errors.push(`${baseUrl}: HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      const current = extractDnbFundNav(html, fund);

      return {
        ...current,
        sourceUrl: baseUrl,
        fetchUrl: url,
      };
    } catch (error) {
      errors.push(`${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Fant ikke oppdatert NAV/Kurs for ${fund.name}. Forsøkte ${errors.join(" | ")}`);
}

function seededDnbFundHistory(fund) {
  return DNB_FUND_HISTORY
    .filter((row) => row.id === fund.id)
    .map((row) => ({
      date: row.date,
      open: null,
      high: null,
      low: null,
      close: Number(row.close),
      volume: null,
      sourceName: "InFront / DNB",
      sourceUrl: fund.sourceUrl,
      sourceDocument: "DNB fond historikk.xlsx",
      rawSource: "uploaded_excel_seed",
    }))
    .filter((row) => row.date && Number.isFinite(row.close));
}

async function fetchDnbFundHistory(fund, mode = "update") {
  const seeded = seededDnbFundHistory(fund);
  const rowsByDate = new Map();

  // Keep uploaded historical rows available also during normal updates so Supabase self-seeds
  // without a manual database import.
  for (const row of seeded) rowsByDate.set(row.date, row);

  try {
    const current = await fetchDnbFundCurrent(fund);
    rowsByDate.set(current.date, current);
  } catch (error) {
    // During an explicit update, do not hide a broken/stale DNB scrape behind seeded history.
    // If we swallow this, the tile appears "successfully" updated while NAV is actually stuck.
    if (mode === "update") throw error;
    if (!seeded.length) throw error;
  }

  return Array.from(rowsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function yahooFallbackIndex(index) {
  if (!index.yahooSymbol) return null;

  return {
    ...index,
    provider: "yahoo",
    symbol: index.yahooSymbol,
    sourceName: "Yahoo Finance",
    sourceUrl: yahooQuotePageUrl(index.yahooSymbol),
  };
}

async function fetchIndexHistory(index, startDate, endDate, mode = "backfill") {
  if (index.provider === "dnb_fund") return fetchDnbFundHistory(index, mode);

  const yahooRange = mode === "update" ? "1mo" : "1y";

  if (index.provider === "yahoo") return fetchYahooHistory(index, yahooRange, mode === "update");

  // For US/global indices we have seen Stooq lag behind Yahoo after US close.
  // If a Yahoo symbol exists, use Yahoo as primary and keep Stooq as fallback.
  const yahooIndex = yahooFallbackIndex(index);
  if (yahooIndex) {
    try {
      return await fetchYahooHistory(yahooIndex, yahooRange, mode === "update");
    } catch (yahooError) {
      return fetchStooqHistory(index, startDate, endDate);
    }
  }

  return fetchStooqHistory(index, startDate, endDate);
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
  let lastValidClose = null;

  for (const row of historyRows) {
    const rawClose = Number(row.close);

    if (isValidMarketValue(rawClose)) {
      lastValidClose = rawClose;
    } else if (lastValidClose !== null) {
      // If source sends 0/missing for a non-published day, store previous valid close.
      row = { ...row, close: lastValidClose, forwardFilled: true };
    } else {
      // Never insert leading zero/invalid values.
      continue;
    }

    const key = `${index.metricKey}|${row.date}`;
    if (existingSet.has(key) && !row.forceInsert) continue;

    metricRows.push({
      metric_key: index.metricKey,
      value: row.close,
      unit: index.unit || "points",
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
        forwardFilled: Boolean(row.forwardFilled),
        forceInsert: Boolean(row.forceInsert),
        fetchUrl: row.fetchUrl || null,
        previousClose: row.previousClose ?? null,
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
      const usefulRows = index.provider === "dnb_fund" ? historyRows : (action === "update" ? historyRows.slice(-3) : historyRows);
      const existingCutoff = index.provider === "dnb_fund" ? "2025-01-01" : isoDate(startDate);
      const existing = await getExistingDates(index.metricKey, existingCutoff);
      const metricRows = rowsToMetricRows(index, usefulRows, fetchedAt, existing);
      const inserted = await insertIndexRows(metricRows);
      const sourceRows = usefulRows.filter((row) => row.rawSource !== "uploaded_excel_seed");
      const latestSourceRow = sourceRows[sourceRows.length - 1] || null;
      const latestSeedRow = [...usefulRows].filter((row) => row.rawSource === "uploaded_excel_seed").pop() || null;

      saved.push({
        index: index.id,
        metricKey: index.metricKey,
        provider: index.provider,
        fetchedRows: usefulRows.length,
        savedRows: inserted.length,
        firstDate: usefulRows[0]?.date || null,
        lastDate: usefulRows[usefulRows.length - 1]?.date || null,
        lastClose: usefulRows[usefulRows.length - 1]?.close ?? null,
        lastRawSource: usefulRows[usefulRows.length - 1]?.rawSource || null,
        sourceLatestDate: latestSourceRow?.date || null,
        sourceLatestClose: latestSourceRow?.close ?? null,
        sourceLatestRawSource: latestSourceRow?.rawSource || null,
        seedLatestDate: latestSeedRow?.date || null,
      });
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

async function fetchRowsForMetricKey(metricKey, cutoffIso) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", metricKey)
    .eq("status", "ok")
    .gte("observed_date", cutoffIso)
    .not("observed_date", "is", null)
    .order("observed_date", { ascending: true })
    .limit(800);

  if (error) throw error;
  return data || [];
}

async function fetchRows() {
  const cutoffIso = addDays(new Date(), -370).toISOString().slice(0, 10);
  const results = await Promise.allSettled(
    INDICES.map((index) => fetchRowsForMetricKey(index.metricKey, cutoffIso))
  );

  const rows = [];
  const errors = [];

  results.forEach((result, index) => {
    const item = INDICES[index];

    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      errors.push(`${item.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  });

  if (errors.length && !rows.length) {
    throw new Error(errors.join(" | "));
  }

  return rows;
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

  const series = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Existing historic 0-values in Supabase should not pull graphs to zero.
  // Use previous valid observation instead.
  return forwardFillMissingSeriesValues(series);
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
      unit: index.unit || "points",
      sourceName: latestRow?.source_name || index.sourceName,
      sourceUrl: latestRow?.source_url || index.sourceUrl,
      fetchedAt: latestRow?.fetched_at || null,
      history: series,
      sparkline: series.slice(-60),
      ...changes,
    };
  });

  const errors = items.filter((item) => !isValidMarketValue(item.value)).map((item) => `${item.name}: mangler verdi`);

  return {
    build: "indices-dnb-current-nav-hard-fix-v1-2026-06-17",
    status: errors.length === items.length ? "empty" : errors.length ? "partial" : "ok",
    sourceName: "Market indices + DNB funds",
    readMethod: "per_metric_370d",
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

    if (action === "debug-dnb") {
      const funds = INDICES.filter((index) => index.provider === "dnb_fund");
      const results = await Promise.allSettled(funds.map(async (fund) => ({
        id: fund.id,
        metricKey: fund.metricKey,
        name: fund.name,
        current: await fetchDnbFundCurrent(fund),
        seedLatest: latestByDate(seededDnbFundHistory(fund)),
      })));

      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        build: "indices-dnb-current-nav-hard-fix-v1-2026-06-17",
        action,
        status: results.some((result) => result.status === "rejected") ? "partial" : "ok",
        results: results.map((result, index) => result.status === "fulfilled" ? result.value : {
          id: funds[index]?.id,
          name: funds[index]?.name,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        }),
      });
      return;
    }

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
