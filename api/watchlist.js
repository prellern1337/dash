import { getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const WATCHLIST_BUILD = "watchlist-per-metric-read-fix-2026-06-13";

const ASSETS = [
  {
    id: "gentian",
    metricKey: "watch_gentian",
    name: "Gentian",
    longName: "Gentian Diagnostics ASA",
    symbol: "GENT.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/GENT.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/gentian-diagnostics-gent-xosl",
  },
  {
    id: "dnb",
    metricKey: "watch_dnb",
    name: "DNB",
    longName: "DNB Bank ASA",
    symbol: "DNB.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/DNB.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/dnb-bank-dnb-xosl",
  },
  {
    id: "equinor",
    metricKey: "watch_equinor",
    name: "Equinor",
    longName: "Equinor ASA",
    symbol: "EQNR.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/EQNR.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/equinor-eqnr-xosl",
  },
  {
    id: "protector",
    metricKey: "watch_protector",
    name: "Protector",
    longName: "Protector Forsikring ASA",
    symbol: "PROT.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/PROT.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/protector-forsikring-prot-xosl",
  },
  {
    id: "nykode",
    metricKey: "watch_nykode",
    name: "Nykode",
    longName: "Nykode Therapeutics AS",
    symbol: "NYKD.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/NYKD.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/nykode-therapeutics-nykd-xosl",
  },
  {
    id: "arribatec",
    metricKey: "watch_arribatec",
    name: "Arribatec",
    longName: "Arribatec Group ASA",
    symbol: "ARR.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/ARR.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/arribatec-group-arr-xosl",
  },
  {
    id: "spacex",
    metricKey: "watch_spacex",
    name: "SpaceX",
    longName: "Space Exploration Technologies Corp.",
    symbol: "SPCX",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/SPCX/",
  },
  {
    id: "tesla",
    metricKey: "watch_tesla",
    name: "Tesla",
    longName: "Tesla, Inc.",
    symbol: "TSLA",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/TSLA/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/tesla-tsla-xnas",
  },
  {
    id: "nvidia",
    metricKey: "watch_nvidia",
    name: "Nvidia",
    longName: "NVIDIA Corporation",
    symbol: "NVDA",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/NVDA/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/nvidia-nvda-xnas",
  },
  {
    id: "microsoft",
    metricKey: "watch_microsoft",
    name: "Microsoft",
    longName: "Microsoft Corporation",
    symbol: "MSFT",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/MSFT/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/microsoft-msft-xnas",
  },
  {
    id: "alphabet",
    metricKey: "watch_alphabet",
    name: "Alphabet",
    longName: "Alphabet Inc. Class A",
    symbol: "GOOGL",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/GOOGL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/alphabet-a-googl-xnas",
  },
  {
    id: "coinbase",
    metricKey: "watch_coinbase",
    name: "Coinbase",
    longName: "Coinbase Global, Inc.",
    symbol: "COIN",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/COIN/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/coinbase-global-coin-xnas",
  },
  {
    id: "bitcoin",
    metricKey: "watch_bitcoin",
    name: "Bitcoin",
    longName: "Bitcoin USD",
    symbol: "BTC-USD",
    currency: "USD",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/BTC-USD/",
  },
];



const REAL_ESTATE_ASSETS = [
  // Norway / Oslo
  {
    id: "entra",
    metricKey: "watch_re_entra",
    name: "Entra",
    longName: "Entra ASA",
    symbol: "ENTRA.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/ENTRA.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/entra-entra-xosl",
  },
  {
    id: "selvaag",
    metricKey: "watch_re_selvaag",
    name: "Selvaag Bolig",
    longName: "Selvaag Bolig ASA",
    symbol: "SBO.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/SBO.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/selvaag-bolig-sbo-xosl",
  },
  {
    id: "kmc",
    metricKey: "watch_re_kmc",
    name: "KMC Properties",
    longName: "KMC Properties ASA",
    symbol: "KMCP.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/KMCP.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/kmc-properties-kmcp-xosl",
  },
  {
    id: "public_property",
    metricKey: "watch_re_public_property",
    name: "PPI",
    longName: "PPI Public Property Invest",
    symbol: "PUBLI.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/PUBLI.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/public-property-invest-publi-xosl",
  },
  {
    id: "baltic_sea",
    metricKey: "watch_re_baltic_sea",
    name: "Baltic Sea Properties",
    longName: "Baltic Sea Properties AS",
    symbol: "BALT.OL",
    currency: "NOK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/BALT.OL/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/baltic-sea-properties-balt-merk",
  },

  // Sweden / Nasdaq Stockholm, large listed property companies
  {
    id: "balder",
    metricKey: "watch_re_balder",
    name: "Balder B",
    longName: "Fastighets AB Balder",
    symbol: "BALD-B.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/BALD-B.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/balder-b-bald-b-xsto",
  },
  {
    id: "sagax",
    metricKey: "watch_re_sagax",
    name: "Sagax B",
    longName: "AB Sagax",
    symbol: "SAGA-B.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/SAGA-B.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/ab-sagax-saga-b-xsto",
  },
  {
    id: "castellum",
    metricKey: "watch_re_castellum",
    name: "Castellum",
    longName: "Castellum AB",
    symbol: "CAST.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/CAST.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/castellum-cast-xsto",
  },
  {
    id: "wihlborgs",
    metricKey: "watch_re_wihlborgs",
    name: "Wihlborgs",
    longName: "Wihlborgs Fastigheter AB",
    symbol: "WIHL.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/WIHL.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/wihlborgs-fastigheter-wihl-xsto",
  },
  {
    id: "fabege",
    metricKey: "watch_re_fabege",
    name: "Fabege",
    longName: "Fabege AB",
    symbol: "FABG.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/FABG.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/fabege-fabg-xsto",
  },
  {
    id: "catena",
    metricKey: "watch_re_catena",
    name: "Catena",
    longName: "Catena AB",
    symbol: "CATE.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/CATE.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/catena-cate-xsto",
  },
  {
    id: "hufvudstaden",
    metricKey: "watch_re_hufvudstaden",
    name: "Hufvudstaden A",
    longName: "Hufvudstaden AB",
    symbol: "HUFV-A.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/HUFV-A.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/hufvudstaden-a-hufv-a-xsto",
  },
  {
    id: "wallenstam",
    metricKey: "watch_re_wallenstam",
    name: "Wallenstam B",
    longName: "Wallenstam AB",
    symbol: "WALL-B.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/WALL-B.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/wallenstam-b-wall-b-xsto",
  },
  {
    id: "pandox",
    metricKey: "watch_re_pandox",
    name: "Pandox B",
    longName: "Pandox AB",
    symbol: "PNDX-B.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/PNDX-B.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/pandox-b-pndx-b-xsto",
  },
  {
    id: "atrium_ljungberg",
    metricKey: "watch_re_atrium_ljungberg",
    name: "Atrium Ljungberg B",
    longName: "Atrium Ljungberg AB",
    symbol: "ATRLJ-B.ST",
    currency: "SEK",
    sourceName: "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/ATRLJ-B.ST/",
    nordnetUrl: "https://www.nordnet.no/aksjer/kurser/atrium-ljungberg-b-atrlj-b-xsto",
  },
];


function displayUrlForAsset(asset) {
  return asset.nordnetUrl || asset.sourceUrl;
}

function displaySourceForAsset(asset) {
  return asset.nordnetUrl ? "Nordnet" : asset.sourceName;
}

function normalizeGroup(group) {
  if (group === "real_estate" || group === "eiendom") return "real_estate";
  if (group === "all") return "all";
  return "main";
}

function assetsForGroup(group) {
  const normalized = normalizeGroup(group);
  if (normalized === "real_estate") return REAL_ESTATE_ASSETS;
  if (normalized === "all") return [...ASSETS, ...REAL_ESTATE_ASSETS];
  return ASSETS;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function buildYahooChartUrl(asset, range = "1y") {
  const symbol = encodeURIComponent(asset.symbol);

  if (range && typeof range === "object") {
    const startDate = range.startDate instanceof Date ? range.startDate : new Date(range.startDate);
    const endDate = range.endDate instanceof Date ? range.endDate : new Date(range.endDate || Date.now());

    return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${toUnixSeconds(startDate)}&period2=${toUnixSeconds(endDate)}&interval=1d`;
  }

  return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;
}

function filterHistoryRowsSince(rows, cutoffIso) {
  return (rows || []).filter((row) => row.date && row.date >= cutoffIso);
}

async function fetchYahooHistory(asset, range = "1y") {
  const url = buildYahooChartUrl(asset, range);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance svarte med ${response.status} for ${asset.name}.`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const error = json?.chart?.error;

  if (error) throw new Error(error.description || `Yahoo Finance-feil for ${asset.name}.`);

  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const meta = result?.meta || {};

  const rows = timestamps
    .map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close: quote.close?.[i] ?? null,
      volume: quote.volume?.[i] ?? null,
      currency: meta.currency || asset.currency,
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

  if (!rows.length) throw new Error(`Yahoo Finance returnerte ingen data for ${asset.name} (${asset.symbol}).`);

  return rows;
}

async function fetchYahooLiveQuote(asset) {
  const symbol = encodeURIComponent(asset.symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance live svarte med ${response.status} for ${asset.name}.`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const error = json?.chart?.error;

  if (error) throw new Error(error.description || `Yahoo Finance live-feil for ${asset.name}.`);

  const meta = result?.meta || {};
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const closes = quote.close || [];

  const validCloses = closes
    .map((close, index) => ({ close: Number(close), timestamp: timestamps[index] }))
    .filter((item) => Number.isFinite(item.close) && Number.isFinite(Number(item.timestamp)));

  const lastClose = validCloses[validCloses.length - 1] || null;
  const liveValue = Number.isFinite(Number(meta.regularMarketPrice))
    ? Number(meta.regularMarketPrice)
    : lastClose?.close ?? null;

  if (!Number.isFinite(Number(liveValue))) {
    throw new Error(`Fant ikke live/siste kurs for ${asset.name}.`);
  }

  const marketTime = Number.isFinite(Number(meta.regularMarketTime))
    ? Number(meta.regularMarketTime)
    : lastClose?.timestamp;

  const liveDate = marketTime
    ? new Date(Number(marketTime) * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const previousClose = Number.isFinite(Number(meta.previousClose))
    ? Number(meta.previousClose)
    : validCloses.length >= 2
      ? validCloses[validCloses.length - 2].close
      : null;

  return {
    value: Number(liveValue),
    date: liveDate,
    currency: meta.currency || asset.currency,
    previousClose,
    liveAt: marketTime ? new Date(Number(marketTime) * 1000).toISOString() : new Date().toISOString(),
    sourceName: "Yahoo Finance",
    sourceUrl: asset.sourceUrl,
    linkUrl: displayUrlForAsset(asset),
    linkSourceName: displaySourceForAsset(asset),
    raw: {
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      exchangeName: meta.exchangeName,
      instrumentType: meta.instrumentType,
      timezone: meta.timezone,
      regularMarketTime: meta.regularMarketTime,
    },
  };
}

function mergeLivePoint(series, liveQuote) {
  if (!liveQuote || !Number.isFinite(Number(liveQuote.value))) return series;

  const merged = [...series];
  const livePoint = { date: liveQuote.date, value: Number(liveQuote.value) };

  const existingIndex = merged.findIndex((point) => point.date === livePoint.date);
  if (existingIndex >= 0) {
    merged[existingIndex] = livePoint;
  } else {
    merged.push(livePoint);
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}


async function getExistingDates(metricKey, cutoffIso) {
  const supabase = getSupabaseAdmin();

  // Important: only count rows that /api/watchlist will actually use.
  // The read endpoint filters status = "ok", so catch-up must do the same.
  const { data, error } = await supabase
    .from("market_metrics")
    .select("metric_key,observed_date")
    .eq("metric_key", metricKey)
    .eq("status", "ok")
    .gte("observed_date", cutoffIso)
    .not("observed_date", "is", null);

  if (error) throw error;

  return new Set((data || []).map((row) => `${row.metric_key}|${row.observed_date}`));
}

function dateSpanDaysFromSet(existingSet, metricKey) {
  const prefix = `${metricKey}|`;
  const dates = Array.from(existingSet || [])
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter(Boolean)
    .sort();

  if (dates.length < 2) return 0;

  const first = new Date(`${dates[0]}T12:00:00Z`).getTime();
  const last = new Date(`${dates[dates.length - 1]}T12:00:00Z`).getTime();

  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return (last - first) / (1000 * 60 * 60 * 24);
}

function hasEnoughStoredHistory(existingSet, metricKey) {
  return dateSpanDaysFromSet(existingSet, metricKey) >= 365;
}



async function insertRows(rows) {
  if (!rows.length) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("market_metrics")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data || [];
}

function rowsToMetricRows(asset, historyRows, fetchedAt, existingSet = new Set()) {
  const metricRows = [];

  for (const row of historyRows) {
    const key = `${asset.metricKey}|${row.date}`;
    if (existingSet.has(key)) continue;

    metricRows.push({
      metric_key: asset.metricKey,
      value: row.close,
      unit: row.currency || asset.currency,
      source_name: asset.sourceName,
      source_url: asset.sourceUrl,
      source_document: `${asset.name} daily close`,
      observed_date: row.date,
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: {
        assetId: asset.id,
        name: asset.name,
        longName: asset.longName,
        symbol: asset.symbol,
        currency: row.currency || asset.currency,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        provider: "yahoo_chart",
      },
    });
  }

  return metricRows;
}

async function updateWatchlist(action, group = "all") {
  const fetchedAt = new Date().toISOString();
  const saved = [];
  const errors = [];
  const assets = assetsForGroup(group);

  for (const asset of assets) {
    try {
      const now = new Date();
      const historyStart = addDays(now, -760);
      const longCutoff = isoDate(historyStart);
      const recentCutoff = isoDate(addDays(now, -35));
      const longExisting = await getExistingDates(asset.metricKey, longCutoff);

      // If Supabase has less than about a full year for this ticker, force a dated 760-day catch-up.
      // Using period1/period2 is more reliable than Yahoo's range=2y shortcut for .OL/.ST symbols.
      const existingSpanDays = Math.round(dateSpanDaysFromSet(longExisting, asset.metricKey));
      const needsHistoryCatchup = action === "backfill" || existingSpanDays < 365;

      const fetchRange = needsHistoryCatchup
        ? { startDate: historyStart, endDate: addDays(now, 1) }
        : "1mo";

      const rows = await fetchYahooHistory(asset, fetchRange);
      const cutoff = needsHistoryCatchup ? longCutoff : recentCutoff;
      const filteredRows = filterHistoryRowsSince(rows, cutoff);
      const usefulRows = action === "update" && !needsHistoryCatchup ? filteredRows.slice(-5) : filteredRows;
      const existing = needsHistoryCatchup ? longExisting : await getExistingDates(asset.metricKey, cutoff);
      const metricRows = rowsToMetricRows(asset, usefulRows, fetchedAt, existing);
      const inserted = await insertRows(metricRows);

      saved.push({
        asset: asset.id,
        metricKey: asset.metricKey,
        symbol: asset.symbol,
        range: needsHistoryCatchup ? "period_760d" : "1mo",
        catchup: needsHistoryCatchup,
        existingOkSpanDays: existingSpanDays,
        existingSpanDays,
        fetchedRows: rows.length,
        filteredRows: usefulRows.length,
        savedRows: inserted.length,
        firstFetchedDate: filteredRows[0]?.date || null,
        lastFetchedDate: filteredRows[filteredRows.length - 1]?.date || null,
      });
    } catch (error) {
      errors.push(`${asset.name}: ${error instanceof Error ? error.message : String(error)}`);
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
    .limit(1000);

  if (error) throw error;
  return data || [];
}

async function fetchRows(group = "main") {
  const assets = assetsForGroup(group);
  const cutoffIso = addDays(new Date(), -760).toISOString().slice(0, 10);
  const results = await Promise.allSettled(
    assets.map((asset) => fetchRowsForMetricKey(asset.metricKey, cutoffIso))
  );

  const rows = [];
  const errors = [];

  results.forEach((result, index) => {
    const asset = assets[index];

    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      errors.push(`${asset.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
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

function buildSeries(rows, metricKey, days = 760) {
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

function valueNearOrBefore(series, targetDate, toleranceDays = 14) {
  const target = targetDate.toISOString().slice(0, 10);
  let before = null;
  let after = null;

  for (const point of series) {
    if (point.date <= target) {
      before = point;
    } else {
      after = point;
      break;
    }
  }

  if (before) return before;

  if (after) {
    const diffDays = Math.abs((new Date(`${after.date}T12:00:00Z`).getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= toleranceDays) return after;
  }

  return null;
}

function computeChanges(series) {
  if (!series.length) return { change1d: null, change1m: null, change1y: null };
  const latest = series[series.length - 1];
  const previous = series.length >= 2 ? series[series.length - 2] : null;
  const now = new Date(`${latest.date}T12:00:00Z`);

  const oneMonthPoint = valueNearOrBefore(series, addDays(now, -30));
  let oneYearPoint = valueNearOrBefore(series, addDays(now, -365));

  // If exact 1Y point is missing, use earliest point only when it is reasonably close to a full year.
  if (!oneYearPoint && series.length >= 2) {
    const earliest = series[0];
    const ageDays = (now.getTime() - new Date(`${earliest.date}T12:00:00Z`).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 330) oneYearPoint = earliest;
  }

  return {
    change1d: previous ? pctChange(latest.value, previous.value) : null,
    change1m: oneMonthPoint ? pctChange(latest.value, oneMonthPoint.value) : null,
    change1y: oneYearPoint ? pctChange(latest.value, oneYearPoint.value) : null,
  };
}

async function buildReadPayload(rows, group = "main") {
  const assets = assetsForGroup(group);
  const liveResults = await Promise.allSettled(assets.map((asset) => fetchYahooLiveQuote(asset)));
  const liveById = new Map();
  const liveErrors = [];

  liveResults.forEach((result, index) => {
    const asset = assets[index];

    if (result.status === "fulfilled") {
      liveById.set(asset.id, result.value);
    } else {
      liveErrors.push(`${asset.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  });

  const items = assets.map((asset) => {
    const storedSeries = buildSeries(rows, asset.metricKey, 760);
    const liveQuote = liveById.get(asset.id) || null;
    const series = mergeLivePoint(storedSeries, liveQuote);
    const latest = series[series.length - 1] || null;
    const changes = computeChanges(series);
    const liveChange1d =
      liveQuote && Number.isFinite(Number(liveQuote.previousClose))
        ? pctChange(Number(liveQuote.value), Number(liveQuote.previousClose))
        : changes.change1d;

    const latestRow = rows
      .filter((row) => row.metric_key === asset.metricKey)
      .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())[0];

    return {
      id: asset.id,
      metricKey: asset.metricKey,
      name: asset.name,
      longName: asset.longName,
      symbol: asset.symbol,
      value: liveQuote?.value ?? latest?.value ?? null,
      date: liveQuote?.date ?? latest?.date ?? null,
      currency: liveQuote?.currency || latestRow?.unit || asset.currency,
      sourceName: liveQuote?.sourceName || latestRow?.source_name || asset.sourceName,
      sourceUrl: liveQuote?.sourceUrl || latestRow?.source_url || asset.sourceUrl,
      linkUrl: liveQuote?.linkUrl || displayUrlForAsset(asset),
      linkSourceName: liveQuote?.linkSourceName || displaySourceForAsset(asset),
      fetchedAt: liveQuote?.liveAt || latestRow?.fetched_at || null,
      liveAt: liveQuote?.liveAt || null,
      isLive: Boolean(liveQuote),
      history: series,
      historyCount: series.length,
      firstDate: series[0]?.date || null,
      lastDate: series[series.length - 1]?.date || null,
      change1d: liveChange1d,
      change1m: changes.change1m,
      change1y: changes.change1y,
    };
  });

  const missingErrors = items
    .filter((item) => !Number.isFinite(Number(item.value)))
    .map((item) => `${item.name}: mangler verdi`);

  const errors = [...missingErrors, ...liveErrors];

  return {
    build: WATCHLIST_BUILD,
    status: missingErrors.length === items.length ? "empty" : errors.length ? "partial" : "ok",
    sourceName: group === "real_estate" ? "Watchlist eiendom" : "Watchlist",
    group: normalizeGroup(group),
    readMethod: "per_metric_760d",
    fetchedAt: new Date().toISOString(),
    live: true,
    note: "Watchlist leser siste tilgjengelige Yahoo-quote ved dashboard-load. 1M/1Å beregnes fra Supabase-historikk som fylles automatisk av update/backfill.",
    items,
    errors,
  };
}

export default async function handler(request, response) {
  try {
    const url = new URL(request.url || "https://local/api/watchlist", "https://local");
    const action = request.query?.action || url.searchParams.get("action");
    const requestedGroup = request.query?.group || url.searchParams.get("group");
    const readGroup = normalizeGroup(requestedGroup || "main");
    const updateGroup = normalizeGroup(requestedGroup || "all");

    if (action === "update" || action === "backfill") {
      const result = await updateWatchlist(action, updateGroup);
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        build: WATCHLIST_BUILD,
        metricGroup: "watchlist",
        group: updateGroup,
        action,
        ...result,
      });
      return;
    }

    const rows = await fetchRows(readGroup);
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json(await buildReadPayload(rows, readGroup));
  } catch (error) {
    response.status(500).json({
      status: "error",
      metricGroup: "watchlist",
      message: error instanceof Error ? error.message : "Ukjent feil i watchlist-endepunktet.",
    });
  }
}
