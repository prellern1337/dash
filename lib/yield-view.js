import { normaliseYieldPeriod, periodFromNewsecDocument } from "./yield-period.js";
import { describeYieldPeriod, summariseYieldSources } from "./yield-summary.js";

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

function rowPeriod(row, sourceKey) {
  if (!row) return null;
  return normaliseYieldPeriod(row.raw?.period, new Date(row.fetched_at))
    || (sourceKey === "newsec" ? periodFromNewsecDocument(row.source_document) : null);
}

export function buildYieldView(rows, now = new Date()) {
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
          value: latestGood && !hasNewerError ? (hasNumericValue(latestGood.value) ? Number(latestGood.value) : null) : null,
          fetchedAt: latestGood && !hasNewerError ? latestGood.fetched_at : null,
          sourceName: latestGood?.source_name || source.label,
          sourceUrl: latestGood?.source_url || null,
          sourceDocument: latestGood?.source_document || null,
          period: rowPeriod(latestGood, source.key),
          periodInfo: describeYieldPeriod(rowPeriod(latestGood, source.key), now),
          status: latestGood ? (hasNewerError ? "error" : "ok") : "empty",
          message: hasNewerError ? latestRun.message : null,
        };
      }

      segments[segment.key] = {
        label: segment.label,
        average: average(Object.values(sources).map((item) => item.value)),
        averageInfo: summariseYieldSources(sources, now),
        sources,
      };
    }

    for (const source of SOURCES) {
      const sourceCells = [
        segments.office.sources[source.key],
        segments.retail.sources[source.key],
        segments.logistics.sources[source.key],
      ];

      sourceRows.push({
        source: source.label,
        period: sourceCells.every((cell) => cell.period && cell.period === sourceCells[0].period) ? sourceCells[0].period : null,
        office: sourceCells[0],
        retail: sourceCells[1],
        logistics: sourceCells[2],
      });
    }

    const values = Object.values(segments).flatMap((segment) =>
      Object.values(segment.sources).map((source) => source.value)
    );

    const hasAnyValue = values.some(hasNumericValue);

    return { status: !hasAnyValue ? "empty" : errors.length ? "partial" : "ok", data: segments, rows: sourceRows, errors };
}
