import { getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const BUILD = "swap-refresh-guard-v1-2026-06-18";
const SOURCE_BASE = "https://seb.no/ssc/trading/fx-rates-bff/api/rates/swap";

const CURRENCIES = [
  { code: "NOK", sourceName: "SEB", sourceUrl: `${SOURCE_BASE}?currency=NOK` },
  { code: "SEK", sourceName: "SEB", sourceUrl: `${SOURCE_BASE}?currency=SEK` },
];

const TENORS = [
  { years: 3, labels: ["3y", "3yr", "3 yr", "3 year", "3 år", "3 ar", "3"] },
  { years: 5, labels: ["5y", "5yr", "5 yr", "5 year", "5 år", "5 ar", "5"] },
  { years: 10, labels: ["10y", "10yr", "10 yr", "10 year", "10 år", "10 ar", "10"] },
];

function metricKey(currency, years) {
  return `swap_${currency.toLowerCase()}_${years}y`;
}

function ymd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return Number.NaN;

  const raw = String(value).trim();
  if (!raw) return Number.NaN;

  const compact = raw.replace(/\s|\u00a0/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");

  let normalized = compact;
  if (comma > dot) normalized = compact.replace(/\./g, "").replace(",", ".");
  else if (dot > comma) normalized = compact.replace(/,/g, "");
  else normalized = compact.replace(",", ".");

  return Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
}

function isPlausibleSwapRate(value) {
  const number = Number(value);
  // Normal SEK/NOK swap levels should be well within this range. Keep the range broad,
  // but reject placeholders/zero/absurd values.
  return Number.isFinite(number) && number > 0.25 && number < 12;
}

function normalizeTenorLabel(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function labelMatchesTenor(label, tenor) {
  const normalized = normalizeTenorLabel(label);
  if (!normalized) return false;

  return tenor.labels.some((candidate) => {
    const compactCandidate = normalizeTenorLabel(candidate);
    return normalized === compactCandidate || normalized.includes(compactCandidate);
  });
}

function looksLikeTenorKey(key, tenor) {
  return labelMatchesTenor(key, tenor) || [
    `${tenor.years}y`,
    `${tenor.years}Y`,
    `y${tenor.years}`,
    `Y${tenor.years}`,
    `${tenor.years}Yr`,
    `${tenor.years}YR`,
    `${tenor.years}Year`,
  ].includes(String(key));
}

function keyLooksLikeRate(key) {
  const normalized = String(key || "").toLowerCase();
  return /(rate|value|price|swap|mid|last|close|interest|quote|ask|bid|fixing)/.test(normalized);
}

function keyLooksLikeChange(key) {
  const normalized = String(key || "").toLowerCase();
  return /(change|chg|diff|delta|bp|basis)/.test(normalized);
}

function collectCandidatesFromObject(object, tenor, path = "") {
  const candidates = [];
  if (!object || typeof object !== "object") return candidates;

  if (Array.isArray(object)) {
    object.forEach((item, index) => {
      candidates.push(...collectCandidatesFromObject(item, tenor, `${path}[${index}]`));
    });
    return candidates;
  }

  const entries = Object.entries(object);
  const joinedKeysAndStrings = entries
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .map(([key, value]) => `${key}:${value}`)
    .join(" | ");

  const objectMentionsTenor = labelMatchesTenor(joinedKeysAndStrings, tenor);

  for (const [key, value] of entries) {
    const currentPath = path ? `${path}.${key}` : key;

    if (value && typeof value === "object") {
      candidates.push(...collectCandidatesFromObject(value, tenor, currentPath));
      continue;
    }

    const number = parseNumber(value);
    if (!isPlausibleSwapRate(number)) continue;

    const keyMatchesTenor = looksLikeTenorKey(key, tenor);
    const usefulRateKey = keyLooksLikeRate(key);
    const isChange = keyLooksLikeChange(key);

    if (isChange) continue;

    if (keyMatchesTenor || (objectMentionsTenor && usefulRateKey)) {
      candidates.push({
        tenorYears: tenor.years,
        value: normalizeSwapValue(number),
        rawValue: value,
        path: currentPath,
        reason: keyMatchesTenor ? "key_matches_tenor" : "object_mentions_tenor_rate_key",
      });
    }
  }

  return candidates;
}

function normalizeSwapValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  // Some APIs send 0.0412 for 4.12%. Your existing app stores percentage points.
  if (number > 0.0025 && number < 0.12) return number * 100;
  return number;
}

function chooseCandidate(candidates, tenor) {
  const valid = (candidates || [])
    .map((candidate) => ({ ...candidate, value: normalizeSwapValue(candidate.value) }))
    .filter((candidate) => isPlausibleSwapRate(candidate.value));

  if (!valid.length) return null;

  valid.sort((a, b) => {
    const score = (candidate) => {
      let total = 0;
      if (candidate.reason === "key_matches_tenor") total += 20;
      if (candidate.reason === "object_mentions_tenor_rate_key") total += 10;
      if (/mid|rate|value/i.test(candidate.path || "")) total += 5;
      if (/ask|bid|change|bp/i.test(candidate.path || "")) total -= 10;
      return total;
    };
    return score(a) - score(b);
  });

  return valid.pop();
}

function extractSwapRatesFromJson(json) {
  const result = {};
  for (const tenor of TENORS) {
    const candidate = chooseCandidate(collectCandidatesFromObject(json, tenor), tenor);
    if (candidate) result[tenor.years] = candidate;
  }
  return result;
}

function extractJsonFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    // Continue below.
  }

  // Some server responses wrap JSON in HTML/script. Try the largest JSON-looking payload.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)); } catch {}
  }

  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    try { return JSON.parse(raw.slice(firstBracket, lastBracket + 1)); } catch {}
  }

  return null;
}

function extractSwapRatesFromText(text) {
  const normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");

  const result = {};

  for (const tenor of TENORS) {
    const patterns = [
      new RegExp(`\\b${tenor.years}\\s*(?:y|yr|year|å?r)\\b[^0-9+-]{0,80}([+-]?\\d+(?:\\.\\d+)?)`, "i"),
      new RegExp(`\\b${tenor.years}\\b[^0-9+-]{0,40}(?:swap|rate|rente)[^0-9+-]{0,40}([+-]?\\d+(?:\\.\\d+)?)`, "i"),
      new RegExp(`(?:swap|rate|rente)[^0-9+-]{0,40}\\b${tenor.years}\\b[^0-9+-]{0,40}([+-]?\\d+(?:\\.\\d+)?)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (!match) continue;
      const value = normalizeSwapValue(parseNumber(match[1]));
      if (!isPlausibleSwapRate(value)) continue;
      result[tenor.years] = { tenorYears: tenor.years, value, rawValue: match[1], path: "text", reason: "text_pattern" };
      break;
    }
  }

  return result;
}

function hasAllPlaceholderOnes(rates) {
  const values = TENORS.map((tenor) => Number(rates?.[tenor.years]?.value)).filter(Number.isFinite);
  return values.length === TENORS.length && values.every((value) => Math.abs(value - 1) < 0.000001);
}

function countUsefulRates(rates) {
  return TENORS.filter((tenor) => isPlausibleSwapRate(rates?.[tenor.years]?.value)).length;
}

async function fetchSebCurrency(currency) {
  const url = `${SOURCE_BASE}?currency=${encodeURIComponent(currency.code)}&ts=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SEB ${currency.code} svarte med HTTP ${response.status}. Body: ${text.slice(0, 180)}`);
  }

  const json = extractJsonFromText(text);
  const jsonRates = json ? extractSwapRatesFromJson(json) : {};
  const textRates = extractSwapRatesFromText(text);
  const rates = { ...textRates, ...jsonRates };

  if (hasAllPlaceholderOnes(rates)) {
    return {
      ok: false,
      currency: currency.code,
      sourceUrl: currency.sourceUrl,
      fetchUrl: url,
      method: json ? "seb_json" : "seb_text",
      rates,
      error: "SEB-kilden returnerte 1.00 for alle tenorer. Behandles som placeholder/feilkilde og lagres ikke.",
      responsePreview: text.slice(0, 500),
    };
  }

  if (countUsefulRates(rates) < 2) {
    return {
      ok: false,
      currency: currency.code,
      sourceUrl: currency.sourceUrl,
      fetchUrl: url,
      method: json ? "seb_json" : "seb_text",
      rates,
      error: "Fant ikke minst to plausible swaprenter fra SEB-responsen.",
      responsePreview: text.slice(0, 500),
    };
  }

  return {
    ok: true,
    currency: currency.code,
    sourceUrl: currency.sourceUrl,
    fetchUrl: url,
    method: json ? "seb_json" : "seb_text",
    rates,
    responsePreview: text.slice(0, 500),
  };
}

async function insertSwapRows(currencyResult, fetchedAt) {
  if (!currencyResult.ok) return [];

  const supabase = getSupabaseAdmin();
  const rows = [];
  const today = ymd(new Date(fetchedAt));

  for (const tenor of TENORS) {
    const candidate = currencyResult.rates[tenor.years];
    if (!candidate || !isPlausibleSwapRate(candidate.value)) continue;

    rows.push({
      metric_key: metricKey(currencyResult.currency, tenor.years),
      value: Number(candidate.value),
      unit: "%",
      source_name: "SEB",
      source_url: currencyResult.sourceUrl,
      source_document: `${currencyResult.currency} swap ${tenor.years}Y`,
      observed_date: today,
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: {
        build: BUILD,
        method: currencyResult.method,
        currency: currencyResult.currency,
        tenorYears: tenor.years,
        rawValue: candidate.rawValue ?? null,
        parserPath: candidate.path ?? null,
        parserReason: candidate.reason ?? null,
        fetchUrl: currencyResult.fetchUrl,
      },
    });
  }

  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("market_metrics")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data || [];
}

function isSuspiciousOnePercent(row) {
  const value = Number(row?.value);
  if (!Number.isFinite(value)) return false;
  if (Math.abs(value - 1) > 0.000001) return false;
  return /^swap_(nok|sek)_(3|5|10)y$/.test(String(row?.metric_key || ""));
}

async function fetchLatestRowsForCurrency(currencyCode) {
  const supabase = getSupabaseAdmin();
  const keys = TENORS.map((tenor) => metricKey(currencyCode, tenor.years));
  const rows = [];

  for (const key of keys) {
    const { data, error } = await supabase
      .from("market_metrics")
      .select("*")
      .eq("metric_key", key)
      .eq("status", "ok")
      .order("fetched_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) rows.push(data[0]);
  }

  return rows;
}

async function markRowsAsRejected(rows, reason) {
  if (!rows.length) return [];

  const supabase = getSupabaseAdmin();
  const updated = [];

  for (const row of rows) {
    const patch = {
      status: "error",
      message: reason,
      raw: {
        ...(row.raw || {}),
        rejectedBy: BUILD,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      },
    };

    let query = supabase.from("market_metrics").update(patch);

    if (row.id !== undefined && row.id !== null) {
      query = query.eq("id", row.id);
    } else {
      query = query
        .eq("metric_key", row.metric_key)
        .eq("fetched_at", row.fetched_at)
        .eq("observed_date", row.observed_date);
    }

    const { data, error } = await query.select("*");
    if (error) throw error;
    updated.push(...(data || []));
  }

  return updated;
}

async function cleanupSuspiciousOnes(currencyCode, onlyIfAllThree = true) {
  const latestRows = await fetchLatestRowsForCurrency(currencyCode);
  const suspiciousRows = latestRows.filter(isSuspiciousOnePercent);

  if (onlyIfAllThree && suspiciousRows.length !== TENORS.length) {
    return { currency: currencyCode, checkedRows: latestRows.length, rejectedRows: 0, reason: "not_all_latest_rows_are_1pct" };
  }

  const updated = await markRowsAsRejected(
    suspiciousRows,
    "Avvist av swap-refresh: 1.00% på alle SWAP-tenorer tolkes som SEB/API-placeholder, ikke faktisk markedsrente."
  );

  return {
    currency: currencyCode,
    checkedRows: latestRows.length,
    rejectedRows: updated.length,
    rejectedMetricKeys: updated.map((row) => row.metric_key),
  };
}

async function runRefresh({ write = true, cleanup = true } = {}) {
  const fetchedAt = new Date().toISOString();
  const results = [];
  const errors = [];
  const cleanupResults = [];

  for (const currency of CURRENCIES) {
    try {
      const source = await fetchSebCurrency(currency);
      let saved = [];

      if (write && source.ok) {
        saved = await insertSwapRows(source, fetchedAt);
      }

      if (write && cleanup) {
        // If source was invalid/placeholder, remove newly created/old 1.00% rows so tiles fall back
        // to the previous good observation instead of showing a bogus market level.
        cleanupResults.push(await cleanupSuspiciousOnes(currency.code, true));
      }

      results.push({
        currency: currency.code,
        ok: source.ok,
        method: source.method,
        savedRows: saved.length,
        values: Object.fromEntries(TENORS.map((tenor) => [tenor.years, source.rates?.[tenor.years]?.value ?? null])),
        parserPaths: Object.fromEntries(TENORS.map((tenor) => [tenor.years, source.rates?.[tenor.years]?.path ?? null])),
        error: source.error || null,
        fetchUrl: source.fetchUrl,
        responsePreview: source.responsePreview,
      });
    } catch (error) {
      errors.push(`${currency.code}: ${error instanceof Error ? error.message : String(error)}`);

      if (write && cleanup) {
        try {
          cleanupResults.push(await cleanupSuspiciousOnes(currency.code, true));
        } catch (cleanupError) {
          errors.push(`${currency.code} cleanup: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
      }
    }
  }

  return {
    build: BUILD,
    status: errors.length ? (results.some((result) => result.ok) ? "partial" : "error") : "ok",
    write,
    cleanup,
    fetchedAt,
    results,
    cleanupResults,
    errors,
  };
}

export default async function handler(request, response) {
  try {
    const action = request.query?.action || new URL(request.url || "https://local/api/swap-refresh", "https://local").searchParams.get("action");

    const isDebug = action === "debug" || action === "debug-swaps";
    const isCleanupOnly = action === "cleanup" || action === "cleanup-1pct";

    let result;
    if (isCleanupOnly) {
      result = {
        build: BUILD,
        action,
        cleanupResults: [],
        errors: [],
      };

      for (const currency of CURRENCIES) {
        try {
          result.cleanupResults.push(await cleanupSuspiciousOnes(currency.code, true));
        } catch (error) {
          result.errors.push(`${currency.code}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.status = result.errors.length ? "partial" : "ok";
    } else {
      result = await runRefresh({ write: !isDebug, cleanup: !isDebug });
      result.action = action || "update";
    }

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(200).json(result);
  } catch (error) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(500).json({
      build: BUILD,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
