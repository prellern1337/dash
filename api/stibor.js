import { getLatestMetric } from "../lib/supabase.js";

const METRIC_KEY = "stibor_3m";

export default async function handler(request, response) {
  try {
    const { latestGood, latestRun } = await getLatestMetric(METRIC_KEY);

    if (!latestGood) {
      response.status(200).json({
        status: "empty",
        metricKey: METRIC_KEY,
        message: "Ingen lagret 3M STIBOR-verdi ennå. Kjør /api/update-stibor først.",
        value: null,
        unit: "%",
        fetchedAt: null,
      });
      return;
    }

    const latestRunIsNewerError =
      latestRun &&
      latestRun.status !== "ok" &&
      new Date(latestRun.fetched_at).getTime() > new Date(latestGood.fetched_at).getTime();

    response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    response.status(200).json({
      status: latestRunIsNewerError ? "stale" : "ok",
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
      message: latestRunIsNewerError
        ? latestRun.message || "Siste STIBOR-oppdatering feilet. Viser sist vellykkede verdi."
        : null,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      metricKey: METRIC_KEY,
      message: error instanceof Error ? error.message : "Ukjent feil ved lesing av 3M STIBOR.",
    });
  }
}
