import { getSupabaseAdmin } from "../lib/supabase.js";
import updateYieldsHandler from "../lib/update-yields.js";

const SOURCES = [
  { key: "union", label: "UNION" },
  { key: "newsec", label: "Newsec" },
  { key: "akershus", label: "Akershus" },
];

const SEGMENTS = [
  { key: "office", label: "Kontor" },
  { key: "retail", label: "Handel" },
  { key: "logistics", label: "Logistikk" },
];

function metricKey(source, segment) {
  return `yield_${source}_${segment}`;
}

async function fetchRows() {
  const supabase = getSupabaseAdmin();
  const keys = SOURCES.flatMap((source) => SEGMENTS.map((segment) => metricKey(source.key, segment.key)));

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .in("metric_key", keys)
    .order("fetched_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data || [];
}

function latestByKey(rows, key, status = null) {
  return rows.find((row) => row.metric_key === key && (!status || row.status === status)) || null;
}

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function average(values) {
  const numeric = values.filter(hasNumericValue).map(Number);
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

async function readYieldsHandler(request, response) {
  try {
    const rows = await fetchRows();

    const segments = {};
    const sourceRows = [];
    const errors = [];

    for (const segment of SEGMENTS) {
      const sources = {};

      for (const source of SOURCES) {
        const key = metricKey(source.key, segment.key);
        const latestGood = latestByKey(rows, key, "ok");
        const latestRun = latestByKey(rows, key);

        const hasNewerError =
          latestGood &&
          latestRun &&
          latestRun.status !== "ok" &&
          new Date(latestRun.fetched_at).getTime() > new Date(latestGood.fetched_at).getTime();

        if (!latestGood && latestRun?.status === "error") {
          errors.push(`${source.label} ${segment.label}: ${latestRun.message}`);
        }

        if (hasNewerError) {
          errors.push(`${source.label} ${segment.label}: ${latestRun.message}`);
        }

        sources[source.key] = {
          source: source.label,
          value: latestGood && !hasNewerError ? Number(latestGood.value) : null,
          fetchedAt: latestGood && !hasNewerError ? latestGood.fetched_at : null,
          sourceName: latestGood?.source_name || source.label,
          sourceUrl: latestGood?.source_url || null,
          sourceDocument: latestGood?.source_document || null,
          status: latestGood ? (hasNewerError ? "error" : "ok") : "empty",
          message: hasNewerError ? latestRun.message : null,
        };
      }

      segments[segment.key] = {
        label: segment.label,
        average: average(Object.values(sources).map((item) => item.value)),
        sources,
      };
    }

    for (const source of SOURCES) {
      sourceRows.push({
        source: source.label,
        office: segments.office.sources[source.key],
        retail: segments.retail.sources[source.key],
        logistics: segments.logistics.sources[source.key],
      });
    }

    const values = Object.values(segments).flatMap((segment) =>
      Object.values(segment.sources).map((source) => source.value)
    );

    const hasAnyValue = values.some((value) => Number.isFinite(Number(value)));

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json({
      status: !hasAnyValue ? "empty" : errors.length ? "partial" : "ok",
      sourceName: "Prime yield",
      fetchedAt: new Date().toISOString(),
      data: {
        office: segments.office,
        retail: segments.retail,
        logistics: segments.logistics,
      },
      rows: sourceRows,
      errors,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "Prime yield",
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Ukjent feil ved lesing av prime yield.",
    });
  }
}


export default async function handler(request, response) {
  const action =
    request.query?.action ||
    new URL(request.url || "https://local/api/yields", "https://local").searchParams.get("action");

  if (action === "update") {
    return updateYieldsHandler(request, response);
  }

  return readYieldsHandler(request, response);
}
