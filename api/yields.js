import pdfParse from "pdf-parse";

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

const NEWSEC_ROWS = [
  {
    id: "office",
    label: "Kontor",
    rowLabel: "Office Oslo CBD",
    nextRowLabel: "Office Oslo centre",
  },
  {
    id: "retail",
    label: "Handel",
    rowLabel: "Retail Prime",
    nextRowLabel: "Retail Normal",
  },
  {
    id: "logistics",
    label: "Logistikk",
    rowLabel: "Logistics Prime",
    nextRowLabel: "Logistics Normal",
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function extractFirstPdfLink(html) {
  const matches = [...html.matchAll(/href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  if (matches.length === 0) {
    const fallback = html.match(/https:\/\/cdn\.sanity\.io\/[^"'\s<>]+\.pdf/);
    if (fallback) return { url: fallback[0], title: "Newsec yieldtabell" };
    throw new Error("Fant ingen PDF-lenke på Newsec yieldtabell-siden.");
  }

  const first = matches[0];
  const rawUrl = first[1].startsWith("http") ? first[1] : `https://www.newsec.no${first[1]}`;
  const title = htmlToText(first[2]) || "Newsec yieldtabell";

  return { url: rawUrl, title };
}

function getLatestPeriodFromPdfText(text, fallbackTitle) {
  const periods = [...text.matchAll(/\bQ[1-4]\s+20\d{2}\b/g)].map((match) => match[0]);
  if (periods.length) return periods[periods.length - 1];

  const titleMatch = fallbackTitle?.match(/\bQ[1-4][-\s]+20\d{2}\b/i);
  if (titleMatch) return titleMatch[0].replace("-", " ");

  return null;
}

function extractNewsecLowValue(text, rowLabel, nextRowLabel) {
  const normalisedText = text.replace(/\r/g, "\n");

  const lines = normalisedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let rowText = lines.find((line) =>
    line.toLowerCase().startsWith(rowLabel.toLowerCase())
  );

  if (!rowText) {
    const regex = new RegExp(
      `${escapeRegExp(rowLabel)}\\s+([\\s\\S]*?)(?=${escapeRegExp(nextRowLabel)}|$)`,
      "i"
    );
    const match = normalisedText.match(regex);
    if (match) rowText = `${rowLabel} ${match[1]}`;
  }

  if (!rowText) {
    throw new Error(`Fant ikke Newsec-raden "${rowLabel}".`);
  }

  const values = [...rowText.matchAll(/(\d{1,2}[,.]\d{2})\s*%/g)].map((match) =>
    parseNumber(match[1])
  );

  if (values.length < 2) {
    throw new Error(`Fant ikke nok yieldverdier for Newsec-raden "${rowLabel}".`);
  }

  // Newsec-table structure is quarter columns with Low/High pairs.
  // Latest quarter low is the penultimate numeric value in the row.
  return values[values.length - 2];
}

async function fetchNewsecYields() {
  const pageUrl = "https://www.newsec.no/insights/reports/yieldtabell";

  const pageResponse = await fetch(pageUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Newsec-siden svarte med ${pageResponse.status}.`);
  }

  const html = await pageResponse.text();
  const pdfLink = extractFirstPdfLink(html);

  const pdfResponse = await fetch(pdfLink.url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!pdfResponse.ok) {
    throw new Error(`Newsec-PDF svarte med ${pdfResponse.status}.`);
  }

  const arrayBuffer = await pdfResponse.arrayBuffer();
  const parsed = await pdfParse(Buffer.from(arrayBuffer));
  const text = parsed.text || "";
  const period = getLatestPeriodFromPdfText(text, pdfLink.title);

  const data = {};

  for (const row of NEWSEC_ROWS) {
    data[row.id] = {
      id: row.id,
      label: row.label,
      source: "Newsec",
      sourceUrl: pdfLink.url,
      value: extractNewsecLowValue(text, row.rowLabel, row.nextRowLabel),
      period,
      status: "ok",
      rowLabel: row.rowLabel,
    };
  }

  return data;
}

function emptySource(segment, source, status = "error", sourceUrl = null) {
  return {
    id: segment.id,
    label: segment.label,
    source,
    sourceUrl,
    value: null,
    period: null,
    status,
  };
}

function average(values) {
  const numeric = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!numeric.length) return null;

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function buildSegmentPayload(unionData, newsecData) {
  const output = {};

  for (const segment of UNION_SEGMENTS) {
    const union = unionData[segment.id] ?? emptySource(segment, "UNION", "error", segment.url);
    const newsec = newsecData[segment.id] ?? emptySource(segment, "Newsec", "error");
    const akershus = emptySource(segment, "Akershus", "not_connected", "https://akershuseiendom.no/markedsinnsikt/nokkeltall");

    const sources = [union, newsec, akershus];

    output[segment.id] = {
      id: segment.id,
      label: segment.label,
      value: average(sources.filter((source) => source.status === "ok").map((source) => source.value)),
      sources,
    };
  }

  return output;
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();
  const errors = [];

  const unionSettled = await Promise.allSettled(
    UNION_SEGMENTS.map((segment) => fetchUnionSegment(segment))
  );

  const unionData = {};
  unionSettled.forEach((result, index) => {
    const segment = UNION_SEGMENTS[index];

    if (result.status === "fulfilled") {
      unionData[segment.id] = result.value;
    } else {
      unionData[segment.id] = emptySource(segment, "UNION", "error", segment.url);
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  });

  let newsecData = {};
  try {
    newsecData = await fetchNewsecYields();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    for (const segment of UNION_SEGMENTS) {
      newsecData[segment.id] = emptySource(segment, "Newsec", "error");
    }
  }

  const data = buildSegmentPayload(unionData, newsecData);

  const hasAnyValue = Object.values(data).some((segment) =>
    Number.isFinite(Number(segment.value))
  );

  if (!hasAnyValue) {
    response.status(500).json({
      status: "error",
      sourceName: "UNION M2 / Newsec",
      fetchedAt,
      message: errors.join(" | ") || "Kunne ikke hente yielder.",
      data,
      errors,
    });
    return;
  }

  response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=604800");
  response.status(200).json({
    status: errors.length ? "partial" : "ok",
    sourceName: "UNION M2 / Newsec",
    fetchedAt,
    nextSuggestedUpdate: "Onsdag ettermiddag",
    data,
    errors,
  });
}
