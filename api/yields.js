export const config = { maxDuration: 60 };
import { getSupabaseAdmin } from "../lib/supabase.js";
import updateYieldsHandler from "../lib/update-yields.js";
import { buildYieldView } from "../lib/yield-view.js";

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

async function readYieldsHandler(request, response) {
  try {
    const rows = await fetchRows();

    const view = buildYieldView(rows);

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json({
      ...view,
      sourceName: "Prime yield",
      fetchedAt: new Date().toISOString(),
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

