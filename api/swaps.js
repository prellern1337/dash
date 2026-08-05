import { getSupabaseAdmin } from "../lib/supabase.js";
import updateSwapsHandler, { debugSwaps } from "../lib/update-swaps.js";

const BUILD = "seb-swaps-read-filter-cleanup-v2-2026-06-18";

const WANTED = [
  { currency: "NOK", tenor: "3 Yr", key: "swap_nok_3y" },
  { currency: "NOK", tenor: "5 Yr", key: "swap_nok_5y" },
  { currency: "NOK", tenor: "10 Yr", key: "swap_nok_10y" },
  { currency: "SEK", tenor: "3 Yr", key: "swap_sek_3y" },
  { currency: "SEK", tenor: "5 Yr", key: "swap_sek_5y" },
  { currency: "SEK", tenor: "10 Yr", key: "swap_sek_10y" },
];

const CURRENCIES = ["NOK", "SEK"];
const TENOR_KEYS = ["3y", "5y", "10y"];

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
  const results = await Promise.all(
    WANTED.map(async (item) => {
      const { data, error } = await supabase
        .from("market_metrics")
        .select("*")
        .eq("metric_key", item.key)
        .order("fetched_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      return data || [];
    })
  );

  return results.flat();
}

function rowIdentity(row) {
  return [
    row?.id ?? "no-id",
    row?.metric_key ?? "",
    row?.fetched_at ?? "",
    row?.observed_date ?? "",
    row?.value ?? "",
  ].join("|");
}

function isExactlyOnePercent(value) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number - 1) < 0.000001;
}

function keyFor(currency, tenorKey) {
  return `swap_${String(currency).toLowerCase()}_${tenorKey}`;
}

function currencyFromMetricKey(metricKey) {
  const match = String(metricKey || "").match(/^swap_(nok|sek)_(3|5|10)y$/i);
  return match ? match[1].toUpperCase() : null;
}

function dateKey(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function latestByKey(rows, key, status = null, ignored = new Set()) {
  return rows.find(
    (row) =>
      row.metric_key === key &&
      (!status || row.status === status) &&
      !ignored.has(rowIdentity(row))
  ) || null;
}

function newestRowByKey(rows, key) {
  return rows.find((row) => row.metric_key === key) || null;
}

function sameRunKey(row) {
  // Fetched-at is normally identical for all six rows from one update. Use observed_date
  // as a fallback so manually inserted rows on the same market date are still grouped.
  return `${row?.fetched_at || ""}|${dateKey(row?.observed_date || row?.fetched_at) || ""}`;
}

function findSuspiciousOnePercentRows(rows) {
  const suspicious = [];

  for (const currency of CURRENCIES) {
    const keys = TENOR_KEYS.map((tenorKey) => keyFor(currency, tenorKey));
    const goodRows = (rows || []).filter(
      (row) => row.status === "ok" && keys.includes(row.metric_key) && Number.isFinite(Number(row.value))
    );

    // Case 1: the latest OK row for all three tenors in one currency is exactly 1.00%.
    // This is what produced the visible cliff in the chart. Treat the full set as bad.
    const latestPerKey = keys.map((key) => goodRows.find((row) => row.metric_key === key)).filter(Boolean);
    if (
      latestPerKey.length === keys.length &&
      latestPerKey.every((row) => isExactlyOnePercent(row.value))
    ) {
      suspicious.push(...latestPerKey);
    }

    // Case 2: any single update run saved 1.00% for all three tenors for a currency.
    const byRun = new Map();
    for (const row of goodRows) {
      const runKey = sameRunKey(row);
      if (!byRun.has(runKey)) byRun.set(runKey, []);
      byRun.get(runKey).push(row);
    }

    for (const runRows of byRun.values()) {
      const latestInRunByKey = keys
        .map((key) => runRows.find((row) => row.metric_key === key))
        .filter(Boolean);

      if (
        latestInRunByKey.length === keys.length &&
        latestInRunByKey.every((row) => isExactlyOnePercent(row.value))
      ) {
        suspicious.push(...latestInRunByKey);
      }
    }
  }

  const unique = new Map();
  for (const row of suspicious) unique.set(rowIdentity(row), row);
  return Array.from(unique.values());
}

function buildDailySeries(rows, key, days = null, ignored = new Set()) {
  const cutoff = days ? new Date() : null;
  if (cutoff) cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff?.toISOString().slice(0, 10) || null;

  const relevant = (rows || [])
    .filter(
      (row) =>
        row.metric_key === key &&
        row.status === "ok" &&
        Number.isFinite(Number(row.value)) &&
        !ignored.has(rowIdentity(row))
    )
    .map((row) => ({
      date: dateKey(row.observed_date || row.fetched_at),
      fetchedAt: row.fetched_at,
      value: Number(row.value),
    }))
    .filter((row) => row.date && (!cutoffIso || row.date >= cutoffIso))
    .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());

  // Last accepted successful run per day.
  const byDate = new Map();
  for (const row of relevant) byDate.set(row.date, row.value);

  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function latestDateForRow(row) {
  return dateKey(row?.observed_date || row?.fetched_at);
}

function previousCloseChange(rows, item, latestRow, ignored = new Set()) {
  if (!latestRow || !Number.isFinite(Number(latestRow.value))) return null;

  const latestDate = latestDateForRow(latestRow);
  const latestValue = Number(latestRow.value);
  const series = buildDailySeries(rows, item.key, 90, ignored);

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

function buildHistory(rows, ignored = new Set()) {
  return {
    NOK: {
      "3 Yr": buildDailySeries(rows, "swap_nok_3y", null, ignored),
      "5 Yr": buildDailySeries(rows, "swap_nok_5y", null, ignored),
      "10 Yr": buildDailySeries(rows, "swap_nok_10y", null, ignored),
    },
    SEK: {
      "3 Yr": buildDailySeries(rows, "swap_sek_3y", null, ignored),
      "5 Yr": buildDailySeries(rows, "swap_sek_5y", null, ignored),
      "10 Yr": buildDailySeries(rows, "swap_sek_10y", null, ignored),
    },
  };
}

async function markSuspiciousRowsAsError(rows) {
  if (!rows.length) return [];

  const supabase = getSupabaseAdmin();
  const updated = [];

  for (const row of rows) {
    const patch = {
      status: "error",
      message:
        "Avvist: 1,00% på alle SWAP-tenorer for samme valuta tolkes som SEB/API-placeholder, ikke faktisk markedsrente.",
      raw: {
        ...(row.raw || {}),
        rejectedBy: BUILD,
        rejectedAt: new Date().toISOString(),
        rejectionReason: "all_three_tenors_exactly_1pct",
        originalStatus: row.status,
        originalValue: row.value,
      },
    };

    let query = supabase.from("market_metrics").update(patch);

    if (row.id !== undefined && row.id !== null) {
      query = query.eq("id", row.id);
    } else {
      query = query
        .eq("metric_key", row.metric_key)
        .eq("fetched_at", row.fetched_at)
        .eq("observed_date", row.observed_date)
        .eq("value", row.value);
    }

    const { data, error } = await query.select("*");
    if (error) throw error;
    updated.push(...(data || []));
  }

  return updated;
}

async function cleanupOnePercentRowsHandler(response) {
  const rows = await fetchRows();
  const suspiciousRows = findSuspiciousOnePercentRows(rows);
  const updated = await markSuspiciousRowsAsError(suspiciousRows);

  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    build: BUILD,
    status: "ok",
    action: "cleanup-1pct",
    checkedRows: rows.length,
    suspiciousRows: suspiciousRows.length,
    updatedRows: updated.length,
    updatedMetricKeys: updated.map((row) => row.metric_key),
  });
}

async function readSwapsHandler(request, response) {
  try {
    const rows = await fetchRows();
    const suspiciousRows = findSuspiciousOnePercentRows(rows);
    const ignored = new Set(suspiciousRows.map(rowIdentity));
    const data = emptyData();
    const latest = {};
    const history = buildHistory(rows, ignored);
    const missing = [];
    const staleOrError = [];
    const diagnostics = {};

    for (const item of WANTED) {
      const rawGood = latestByKey(rows, item.key, "ok", new Set());
      const good = latestByKey(rows, item.key, "ok", ignored);
      const latestRun = newestRowByKey(rows, item.key);
      const ignoredRowsForKey = suspiciousRows.filter((row) => row.metric_key === item.key);

      latest[item.key] = latestRun;
      diagnostics[item.key] = {
        latestRunFetchedAt: latestRun?.fetched_at || null,
        latestRunStatus: latestRun?.status || null,
        latestRunMessage: latestRun?.message || null,
        latestRawGoodFetchedAt: rawGood?.fetched_at || null,
        latestRawGoodObservedDate: rawGood?.observed_date || null,
        latestRawGoodValue: rawGood?.value ?? null,
        latestGoodFetchedAt: good?.fetched_at || null,
        latestGoodObservedDate: good?.observed_date || null,
        latestGoodValue: good?.value ?? null,
        latestGoodRawMethod: good?.raw?.method || null,
        latestGoodBuild: good?.raw?.build || null,
        ignoredSuspiciousRows: ignoredRowsForKey.length,
        ignoredLatestOnePct: Boolean(rawGood && ignored.has(rowIdentity(rawGood))),
      };

      if (!good) {
        missing.push(item.key);
        continue;
      }

      if (
        latestRun &&
        (latestRun.status !== "ok" || ignored.has(rowIdentity(latestRun))) &&
        new Date(latestRun.fetched_at).getTime() > new Date(good.fetched_at).getTime()
      ) {
        staleOrError.push({
          key: item.key,
          message: ignored.has(rowIdentity(latestRun))
            ? "Siste OK-rad er ignorert fordi alle tre tenorer for valutaen var 1,00 %."
            : latestRun.message,
          latestGoodFetchedAt: good.fetched_at,
          latestRunFetchedAt: latestRun.fetched_at,
        });
      }

      data[item.currency].rates[item.tenor] = Number(good.value);
      data[item.currency].changes[item.tenor] = previousCloseChange(rows, item, good, ignored);
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
      ignoredSuspiciousOnePctRows: suspiciousRows.map((row) => ({
        metric_key: row.metric_key,
        value: row.value,
        observed_date: row.observed_date,
        fetched_at: row.fetched_at,
        rawBuild: row.raw?.build || null,
        currency: currencyFromMetricKey(row.metric_key),
      })),
      diagnostics,
    });
  } catch (error) {
    response.status(500).json({
      build: BUILD,
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

  if (action === "cleanup-1pct" || action === "cleanup") {
    return cleanupOnePercentRowsHandler(response);
  }

  return readSwapsHandler(request, response);
}
