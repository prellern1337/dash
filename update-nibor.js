const UNION_SEGMENTS = [
  {
    id: "office",
    label: "Kontor",
    url: "https://m2.union.no/segmenter/kontor",
  },
  {
    id: "retail",
    label: "Handel",
    url: "https://m2.union.no/segmenter/handel",
  },
  {
    id: "logistics",
    label: "Logistikk",
    url: "https://m2.union.no/segmenter/logistikk",
  },
];

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;

  return Number.parseFloat(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrimeYield(html) {
  const text = htmlToText(html);

  const strictPattern =
    /Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?\s+Kilde:\s*UNION\s+per\s+([^#]+?)(?=\s+#|\s+Toppleie|\s+Sekundær|\s+Privat|\s+Normal|\s+Våre|\s*$)/i;

  const strictMatch = text.match(strictPattern);
  if (strictMatch) {
    const value = parseNumber(strictMatch[1]);
    if (Number.isFinite(value)) {
      return {
        value,
        period: strictMatch[2].trim().replace(/\.$/, ""),
      };
    }
  }

  const loosePattern = /Prime\s+yield\s+([-+]?\d+(?:[.,]\d+)?)\s*%?/i;
  const looseMatch = text.match(loosePattern);
  if (looseMatch) {
    const value = parseNumber(looseMatch[1]);
    if (Number.isFinite(value)) {
      return {
        value,
        period: null,
      };
    }
  }

  throw new Error("Fant ikke Prime yield på UNION M2-siden.");
}

async function fetchUnionSegment(segment) {
  const response = await fetch(segment.url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`UNION M2 svarte med ${response.status} for ${segment.label}.`);
  }

  const html = await response.text();
  const observation = extractPrimeYield(html);

  return {
    id: segment.id,
    label: segment.label,
    source: "UNION",
    sourceUrl: segment.url,
    value: observation.value,
    period: observation.period,
    status: "ok",
  };
}

function emptySegment(id, label) {
  return {
    id,
    label,
    value: null,
    period: null,
    source: "UNION",
    sourceUrl: UNION_SEGMENTS.find((segment) => segment.id === id)?.url,
    status: "error",
  };
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const settled = await Promise.allSettled(
      UNION_SEGMENTS.map((segment) => fetchUnionSegment(segment))
    );

    const data = {};
    const errors = [];

    settled.forEach((result, index) => {
      const segment = UNION_SEGMENTS[index];

      if (result.status === "fulfilled") {
        data[segment.id] = result.value;
      } else {
        data[segment.id] = emptySegment(segment.id, segment.label);
        errors.push(
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        );
      }
    });

    const hasAnyValue = Object.values(data).some((segment) =>
      Number.isFinite(Number(segment.value))
    );

    if (!hasAnyValue) {
      throw new Error(errors.join(" | ") || "Kunne ikke hente UNION M2-yielder.");
    }

    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=604800");
    response.status(200).json({
      status: errors.length ? "partial" : "ok",
      sourceName: "UNION M2",
      fetchedAt,
      nextSuggestedUpdate: "Onsdag ettermiddag",
      data,
      errors,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      sourceName: "UNION M2",
      fetchedAt,
      message:
        error instanceof Error
          ? error.message
          : "Ukjent feil ved henting av UNION M2-yielder.",
      data: {
        office: emptySegment("office", "Kontor"),
        retail: emptySegment("retail", "Handel"),
        logistics: emptySegment("logistics", "Logistikk"),
      },
    });
  }
}
