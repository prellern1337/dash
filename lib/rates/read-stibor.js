import { getSupabaseAdmin } from "../supabase.js";

const METRIC_KEY = "stibor_3m";
const SOURCE_NAME = "Trading Economics Sweden Interbank Rate";
const MAX_STIBOR_AGE_DAYS = 7;

function daysSince(value) {
  if (!value) return 0;
  const date = new Date(`${value}T12:00:00Z`);
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function dateKey(row) {
  return String(row.observed_date || row.fetched_at || "").slice(0, 10);
}

function buildDailySeries(rows, days = 180) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const relevant = (rows || [])
    .filter((row) => row.status === "ok" && Number.isFinite(Number(row.value)))
    .map((row) => ({
      date: dateKey(row),
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

async function getRows() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", METRIC_KEY)
    .eq("source_name", SOURCE_NAME)
    .order("fetched_at", { ascending: false })
    .limit(600);

  if (error) throw error;
  return data || [];
}

function latestByStatus(rows, status = null) {
  return rows.find((row) => !status || row.status === status) || null;
}

export default async function handler(request, response) {
  try {
    const rows = await getRows();
    const latestGood = latestByStatus(rows, "ok");
    const latestRun = latestByStatus(rows);
    const history = buildDailySeries(rows, 180);

    if (!latestGood) {
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        status: "empty",
        metricKey: METRIC_KEY,
        message: "Ingen Trading Economics-basert 3M STIBOR-verdi er lagret ennå.",
        value: null,
        unit: "%",
        fetchedAt: null,
        history,
        lastRun: latestRun
          ? {
              status: latestRun.status,
              fetchedAt: latestRun.fetched_at,
              message: latestRun.message,
            }
          : null,
      });
      return;
    }

    const latestRunIsNewerError =
      latestRun &&
      latestRun.status !== "ok" &&
      new Date(latestRun.fetched_at).getTime() > new Date(latestGood.fetched_at).getTime();

    if (latestRunIsNewerError) {
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        status: "error",
        metricKey: METRIC_KEY,
        message: latestRun.message || "Siste STIBOR-oppdatering feilet. Viser ikke gammel verdi.",
        value: null,
        unit: "%",
        history,
        latestGood: {
          value: Number(latestGood.value),
          observedDate: latestGood.observed_date,
          fetchedAt: latestGood.fetched_at,
          sourceName: latestGood.source_name,
        },
        lastRun: {
          status: latestRun.status,
          fetchedAt: latestRun.fetched_at,
          message: latestRun.message,
        },
      });
      return;
    }

    const age = daysSince(latestGood.observed_date);
    if (latestGood.observed_date && age > MAX_STIBOR_AGE_DAYS) {
      response.setHeader("Cache-Control", "no-store, max-age=0");
      response.status(200).json({
        status: "error",
        metricKey: METRIC_KEY,
        message: `Siste gyldige STIBOR-verdi er utdatert: ${latestGood.observed_date}. Viser ikke gammel verdi.`,
        value: null,
        unit: "%",
        history,
        latestGood: {
          value: Number(latestGood.value),
          observedDate: latestGood.observed_date,
          fetchedAt: latestGood.fetched_at,
          sourceName: latestGood.source_name,
        },
      });
      return;
    }

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json({
      status: "ok",
      metricKey: METRIC_KEY,
      tenor: "3M",
      currency: "SEK",
      value: Number(latestGood.value),
      unit: latestGood.unit || "%",
      sourceName: latestGood.source_name,
      sourceUrl: latestGood.source_url,
      sourceDocument: latestGood.source_document,
      observedDate: latestGood.observed_date,
      fetchedAt: latestGood.fetched_at,
      history,
      lastRun: latestRun
        ? {
            status: latestRun.status,
            fetchedAt: latestRun.fetched_at,
            message: latestRun.message,
          }
        : null,
      message: null,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      metricKey: METRIC_KEY,
      message: error instanceof Error ? error.message : "Ukjent feil ved lesing av 3M STIBOR.",
    });
  }
}
