import fs from "node:fs/promises";
import path from "node:path";

const YIELDS_DATA_PATH = path.join(process.cwd(), "public", "data", "yields.json");

function emptySource(id, label, source, sourceUrl = null) {
  return {
    id,
    label,
    source,
    sourceUrl,
    value: null,
    period: null,
    status: "error",
  };
}

function emptyPayload(message = "Fant ikke lagret yield-data.") {
  return {
    status: "error",
    sourceName: "Yield data",
    fetchedAt: new Date().toISOString(),
    message,
    data: {
      office: {
        id: "office",
        label: "Kontor",
        value: null,
        sources: [
          emptySource("office", "Kontor", "UNION", "https://m2.union.no/segmenter/kontor"),
          emptySource("office", "Kontor", "Newsec", "https://www.newsec.no/insights/reports/yieldtabell"),
          emptySource("office", "Kontor", "Akershus", "https://akershuseiendom.no/markedsinnsikt/nokkeltall"),
        ],
      },
      retail: {
        id: "retail",
        label: "Handel",
        value: null,
        sources: [
          emptySource("retail", "Handel", "UNION", "https://m2.union.no/segmenter/handel"),
          emptySource("retail", "Handel", "Newsec", "https://www.newsec.no/insights/reports/yieldtabell"),
          emptySource("retail", "Handel", "Akershus", "https://akershuseiendom.no/markedsinnsikt/nokkeltall"),
        ],
      },
      logistics: {
        id: "logistics",
        label: "Logistikk",
        value: null,
        sources: [
          emptySource("logistics", "Logistikk", "UNION", "https://m2.union.no/segmenter/logistikk"),
          emptySource("logistics", "Logistikk", "Newsec", "https://www.newsec.no/insights/reports/yieldtabell"),
          emptySource("logistics", "Logistikk", "Akershus", "https://akershuseiendom.no/markedsinnsikt/nokkeltall"),
        ],
      },
    },
    errors: [message],
  };
}

export default async function handler(request, response) {
  try {
    const raw = await fs.readFile(YIELDS_DATA_PATH, "utf8");
    const payload = JSON.parse(raw);

    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=604800");
    response.status(200).json({
      status: payload.status || "ok",
      sourceName: payload.sourceName || "Yield data",
      fetchedAt: payload.fetchedAt || null,
      lastAttemptAt: payload.lastAttemptAt || null,
      data: payload.data,
      errors: payload.errors || [],
      note: payload.note || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved lesing av yield-data.";
    response.status(500).json(emptyPayload(message));
  }
}
