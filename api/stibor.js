import { getSupabaseAdmin } from "../lib/supabase.js";

const METRIC_KEY = "stibor_3m";
const SOURCE_NAME = "Trading Economics Sweden Interbank Rate";
const MAX_STIBOR_AGE_DAYS = 7;

function daysSince(value) {
  if (!value) return 0; // If TE only provides month in a fallback path, do not block based on null date.
  const date = new Date(`${value}T12:00:00Z`);
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

async function getLatestRows() {
  const supabase = getSupabaseAdmin();

  const { data: latestGood, error: goodError } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", METRIC_KEY)
    .eq("status", "ok")
    .eq("source_name", SOURCE_NAME)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goodError) throw goodError;

  const { data: latestRun, error: runError } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", METRIC_KEY)
    .eq("source_name", SOURCE_NAME)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) throw runError;

  return { latestGood, latestRun };
}

export default async function handler(request, response) {
  try {
    const { latestGood, latestRun } = await getLatestRows();

    if (!latestGood) {
      response.status(200).json({
        status: "empty",
        metricKey: METRIC_KEY,
        message: "Ingen Trading Economics-basert 3M STIBOR-verdi er lagret ennå.",
        value: null,
        unit: "%",
        fetchedAt: null,
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
      response.status(200).json({
        status: "error",
        metricKey: METRIC_KEY,
        message: latestRun.message || "Siste STIBOR-oppdatering feilet. Viser ikke gammel verdi.",
        value: null,
        unit: "%",
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
      response.status(200).json({
        status: "error",
        metricKey: METRIC_KEY,
        message: `Siste gyldige STIBOR-verdi er utdatert: ${latestGood.observed_date}. Viser ikke gammel verdi.`,
        value: null,
        unit: "%",
        latestGood: {
          value: Number(latestGood.value),
          observedDate: latestGood.observed_date,
          fetchedAt: latestGood.fetched_at,
          sourceName: latestGood.source_name,
        },
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
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
