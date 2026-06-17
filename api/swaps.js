import { getSupabaseAdmin } from "../lib/supabase.js";
import updateSwapsHandler, { debugSwaps } from "../lib/update-swaps.js";

const BUILD = "seb-swaps-direct-api-hard-fix-v1-2026-06-17";

const WANTED = [
  { currency: "NOK", tenor: "3 Yr", key: "swap_nok_3y" },
  { currency: "NOK", tenor: "5 Yr", key: "swap_nok_5y" },
  { currency: "NOK", tenor: "10 Yr", key: "swap_nok_10y" },
  { currency: "SEK", tenor: "3 Yr", key: "swap_sek_3y" },
  { currency: "SEK", tenor: "5 Yr", key: "swap_sek_5y" },
  { currency: "SEK", tenor: "10 Yr", key: "swap_sek_10y" },
];

function emptyData() {
  return {
    NOK: {
      currency: "NOK",
      rates: { "3 Yr": null, "5 Yr": null, "10 Yr": null },
      changes: { "3 Yr": null, "5 Yr": null, "10 Yr": null },
    },
    SEK: {
      currency: "SEK",
      rates: { "3 Yr": null, "5 Yr": null, "10 Yr": null },
      changes: { "3 Yr": null, "5 Yr": null, "10 Yr": null },
    },
  };
}

async function fetchRows() {
  const supabase = getSupabaseAdmin();
  const keys = WANTED.map((item) => item.key);

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .in("metric_key", keys)
    .order("fetched_at", { ascending: false })
    .limit(2500);

  if (error) throw error;
  return data || [];
}

function latestByKey(rows, key, status = null) {
  return rows.find((row) => row.metric_key === key && (!status || row.status === status)) || null;
}

function newestRowByKey(rows, key) {
  return rows.find((row) => row.metric_key === key) || null;
}

function dateKey(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function buildDailySeries(rows, key, days = 60) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const relevant = (rows || [])
    .filter((row) => row.metric_key === key && row.status === "ok" && Number.isFinite(Number(row.value)))
    .map((row) => ({
      date: dateKey(row.observed_date || row.fetched_at),
      fetchedAt: row.fetched_at,
      value: Number(row.value),
    }))
    .filter((row) => row.date && row.date >= cutoffIso)
    .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());

  // Last successful run per day.
  const byDate = new Map();
  for (const row of relevant) byDate.set(row.date, row.value);

  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}


function latestDateForRow(row) {
  return dateKey(row?.observed_date || row?.fetched_at);
}

function previousCloseChange(rows, item, latestRow) {
  if (!latestRow || !Number.isFinite(Number(latestRow.value))) return null;

  const latestDate = latestDateForRow(latestRow);
  const latestValue = Number(latestRow.value);
  const series = buildDailySeries(rows, item.key, 90);

  if (!series.length || !latestDate) return null;

  const previous = [...series].reverse().find((point) => point.date < latestDate);

  if (!previous || !Number.isFinite(Number(previous.value))) return null;

  const change = latestValue - Number(previous.value);
  const bps = change * 100;

  return {
    value: Number(change.toFixed(4)),
    bps: Number(bps.toFixed(1)),
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    previousClose: Number(previous.value),
    previousDate: previous.date,
    latestValue,
    latestDate,
  };
}

function buildHistory(rows) {
  return {
    NOK: {
      "3 Yr": buildDailySeries(rows, "swap_nok_3y"),
      "5 Yr": buildDailySeries(rows, "swap_nok_5y"),
      "10 Yr": buildDailySeries(rows, "swap_nok_10y"),
    },
    SEK: {
      "3 Yr": buildDailySeries(rows, "swap_sek_3y"),
      "5 Yr": buildDailySeries(rows, "swap_sek_5y"),
      "10 Yr": buildDailySeries(rows, "swap_sek_10y"),
    },
  };
}

async function readSwapsHandler(request, response) {
  try {
    const rows = await fetchRows();
    const data = emptyData();
    const latest = {};
    const history = buildHistory(rows);
    const missing = [];
    const staleOrError = [];
    const diagnostics = {};

    for (const item of WANTED) {
      const good = latestByKey(rows, item.key, "ok");
      const latestRun = latestByKey(rows, item.key);

      latest[item.key] = latestRun;
      diagnostics[item.key] = {
        latestRunFetchedAt: latestRun?.fetched_at || null,
        latestRunStatus: latestRun?.status || null,
        latestRunMessage: latestRun?.message || null,
        latestGoodFetchedAt: good?.fetched_at || null,
        latestGoodObservedDate: good?.observed_date || null,
        latestGoodValue: good?.value ?? null,
        latestGoodRawMethod: good?.raw?.method || null,
        latestGoodBuild: good?.raw?.build || null,
      };

      if (!good) {
        missing.push(item.key);
        continue;
      }

      if (
        latestRun &&
        latestRun.status !== "ok" &&
        new Date(latestRun.fetched_at).getTime() > new Date(good.fetched_at).getTime()
      ) {
        staleOrError.push({
          key: item.key,
          message: latestRun.message,
          latestGoodFetchedAt: good.fetched_at,
          latestRunFetchedAt: latestRun.fetched_at,
        });
      }

      data[item.currency].rates[item.tenor] = Number(good.value);
      data[item.currency].changes[item.tenor] = previousCloseChange(rows, item, good);
      data[item.currency].fetchedAt = good.fetched_at;
      data[item.currency].sourceName = good.source_name;
      data[item.currency].sourceUrl = good.source_url;
    }

    const status =
      missing.length === WANTED.length
        ? "empty"
        : missing.length || staleOrError.length
          ? "partial"
          : "ok";

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json({
      build: BUILD,
      status,
      sourceName: "SEB Swap Rates",
      sourceUrl: "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates",
      fetchedAt: new Date().toISOString(),
      data,
      history,
      missing,
      staleOrError,
      diagnostics,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "SEB Swap Rates",
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved lesing av SEB swap-renter.",
    });
  }
}


export default async function handler(request, response) {
  const action =
    request.query?.action ||
    new URL(request.url || "https://local/api/swaps", "https://local").searchParams.get("action");

  if (action === "update") {
    return updateSwapsHandler(request, response);
  }

  if (action === "debug-swaps") {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    return response.status(200).json(await debugSwaps());
  }

  return readSwapsHandler(request, response);
}
