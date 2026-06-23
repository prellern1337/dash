import { getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const BUILD = "dnb-fund-refresh-v1-2026-06-18";

export const FUNDS = [
  {
    id: "dnb_teknologi_a",
    metricKey: "fund_dnb_teknologi_a",
    name: "DNB Tek A",
    longName: "DNB Teknologi A",
    isin: "NO0010337678",
    unit: "NOK",
    minValue: 1000,
    maxValue: 12000,
    dnbUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-teknologi-a-NO0010337678",
    kronUrl: "https://www.kron.no/fond/NO0010337678",
  },
  {
    id: "dnb_global_indeks_a",
    metricKey: "fund_dnb_global_indeks_a",
    name: "DNB Global Indeks",
    longName: "DNB Global Indeks A",
    isin: "NO0010582984",
    unit: "NOK",
    minValue: 300,
    maxValue: 2000,
    dnbUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-global-indeks-a-NO0010582984",
    kronUrl: "https://www.kron.no/fond/NO0010582984",
  },
  {
    id: "dnb_smb_a",
    metricKey: "fund_dnb_smb_a",
    name: "DNB SMB",
    longName: "DNB SMB A",
    isin: "NO0010337819",
    unit: "NOK",
    minValue: 800,
    maxValue: 5000,
    dnbUrl: "https://www.dnb.no/sparing/fond/fond-liste/d/dnb-smb-a-NO0010337819",
    kronUrl: "https://www.kron.no/fond/NO0010337819",
  },
];

function ymd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateToTime(date) {
  const time = new Date(`${date}T12:00:00Z`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normaliseText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#xE5;|&aring;/g, "å")
    .replace(/&#xC5;|&Aring;/g, "Å")
    .replace(/&#xE6;|&aelig;/g, "æ")
    .replace(/&#xC6;|&AElig;/g, "Æ")
    .replace(/&#xF8;|&oslash;/g, "ø")
    .replace(/&#xD8;|&Oslash;/g, "Ø")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return Number.NaN;

  const raw = String(value).trim();
  if (!raw) return Number.NaN;

  // Norwegian format: 6 714,50 / 6\u00a0714,50. US format: 6,714.50.
  const compact = raw.replace(/\s|\u00a0/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");

  let normalized = compact;
  if (comma > dot) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (dot > comma) {
    normalized = compact.replace(/,/g, "");
  } else {
    normalized = compact.replace(",", ".");
  }

  return Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
}

function isPlausibleFundValue(value, fund) {
  const number = Number(value);
  return Number.isFinite(number) && number >= fund.minValue && number <= fund.maxValue;
}

function norwegianMonthToNumber(monthName) {
  const map = {
    jan: "01", januar: "01", january: "01",
    feb: "02", februar: "02", february: "02",
    mar: "03", mars: "03", march: "03",
    apr: "04", april: "04",
    mai: "05", may: "05",
    jun: "06", juni: "06", june: "06",
    jul: "07", juli: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    okt: "10", oktober: "10", oct: "10", october: "10",
    nov: "11", november: "11",
    des: "12", desember: "12", dec: "12", december: "12",
  };

  return map[String(monthName || "").toLowerCase().replace(".", "")] || null;
}

function parseObservedDate(day, monthName, year) {
  const month = norwegianMonthToNumber(monthName);
  if (!month) return null;
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function parseDateString(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : null;
    if (ms) return new Date(ms).toISOString().slice(0, 10);
    return null;
  }

  const text = String(value).trim();
  if (!text) return null;

  const iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dotted = text.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2})/);
  if (dotted) return `${dotted[3]}-${String(dotted[2]).padStart(2, "0")}-${String(dotted[1]).padStart(2, "0")}`;

  const textual = text.match(/(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/);
  if (textual) return parseObservedDate(textual[1], textual[2], textual[3]);

  return null;
}

function addCandidate(candidates, fund, value, date, source) {
  const close = parseNumber(value);
  if (!isPlausibleFundValue(close, fund) || !date) return;

  candidates.push({
    date,
    close,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    sourceDocument: source.sourceDocument || `${fund.longName} NAV/Kurs`,
    rawSource: source.rawSource,
    fetchUrl: source.fetchUrl || source.sourceUrl,
    priority: source.priority ?? 50,
    raw: source.raw || null,
  });
}

export function latestCandidate(candidates) {
  return [...(candidates || [])]
    .sort((a, b) => {
      const dateDiff = dateToTime(a.date) - dateToTime(b.date);
      if (dateDiff !== 0) return dateDiff;
      // For same date, lower priority number wins. Put that last so pop() chooses it.
      return (b.priority ?? 50) - (a.priority ?? 50);
    })
    .pop() || null;
}

function dnbCandidateUrls(fund) {
  const urls = new Set([fund.dnbUrl]);
  urls.add(fund.dnbUrl.replace("/sparing/fond/fond-liste/d/", "/sparing/fond/fond-liste/private-banking/d/"));
  urls.add(fund.dnbUrl.replace("/sparing/fond/fond-liste/d/", "/sparing/fond/fond-liste/corporate-banking/d/"));
  urls.add(fund.dnbUrl.replace("https://www.dnb.no/sparing/fond/fond-liste/d/", "https://www.dnb.no/en/saving/mutual-funds/fund-list/d/"));
  return Array.from(urls);
}

export function parseDnbFundText(html, fund, sourceUrl = fund.dnbUrl) {
  const text = normaliseText(html);
  const candidates = [];

  const patterns = [
    /NAV\/Kurs\s+([\d\s.,]+)\s*kroner\s+(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\s*\/\s*Kurs[\s\S]{0,180}?([\d\s.,]+)\s*kroner[\s\S]{0,140}?(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\/Price\s+([\d\s.,]+)\s*kroner\s+(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\s*\/\s*Price[\s\S]{0,180}?([\d\s.,]+)\s*kroner[\s\S]{0,140}?(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
    /NAV\/Price\s+([\d\s.,]+)\s*NOK\s+(\d{1,2})\.?\s+([A-Za-zÆØÅæøå.]+)\s+(20\d{2})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      addCandidate(candidates, fund, match[1], parseObservedDate(match[2], match[3], match[4]), {
        sourceName: "DNB",
        sourceUrl,
        rawSource: "dnb_fund_page",
        priority: 10,
      });
    }
  }

  // DNB/React payloads sometimes expose NAV and dates as JSON-like strings.
  const jsonLike = String(html || "")
    .replace(/\\"/g, '"')
    .replace(/\\u002F/g, "/")
    .replace(/\\u002D/g, "-")
    .replace(/\\u00a0/g, " ");

  const jsonPatterns = [
    /"(?:nav|navPrice|navValue|price|lastPrice|unitPrice|kurs)"\s*:\s*"?([\d\s.,]+)"?[\s\S]{0,220}?"(?:date|navDate|priceDate|valuationDate|asOfDate)"\s*:\s*"(20\d{2}-\d{2}-\d{2})"/gi,
    /"(?:date|navDate|priceDate|valuationDate|asOfDate)"\s*:\s*"(20\d{2}-\d{2}-\d{2})"[\s\S]{0,220}?"(?:nav|navPrice|navValue|price|lastPrice|unitPrice|kurs)"\s*:\s*"?([\d\s.,]+)"?/gi,
  ];

  for (const match of jsonLike.matchAll(jsonPatterns[0])) {
    addCandidate(candidates, fund, match[1], match[2], {
      sourceName: "DNB",
      sourceUrl,
      rawSource: "dnb_fund_json",
      priority: 10,
    });
  }

  for (const match of jsonLike.matchAll(jsonPatterns[1])) {
    addCandidate(candidates, fund, match[2], match[1], {
      sourceName: "DNB",
      sourceUrl,
      rawSource: "dnb_fund_json",
      priority: 10,
    });
  }

  return candidates;
}

export function parseKronFundText(html, fund) {
  const text = normaliseText(html);
  const candidates = [];
  const patterns = [
    /NAV\/Kurs\s*\((\d{1,2})\.(\d{1,2})\.(20\d{2})\)\s*:\s*([\d\s.,]+)\s*kr/gi,
    /NAV\/Kurs[\s\S]{0,80}?(\d{1,2})\.(\d{1,2})\.(20\d{2})[\s\S]{0,80}?([\d\s.,]+)\s*kr/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      addCandidate(candidates, fund, match[4], `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`, {
        sourceName: "Kron",
        sourceUrl: fund.kronUrl,
        rawSource: "kron_fund_page",
        priority: 30,
      });
    }
  }

  return candidates;
}

function candidateValueKeys(object) {
  return Object.keys(object).filter((key) => /^(nav|navPrice|nav_value|price|lastPrice|last_price|last|close|closingPrice|unitPrice|value)$/i.test(key));
}

function candidateDateKeys(object) {
  return Object.keys(object).filter((key) => /(date|time|asOf|as_of|valuation|updated)/i.test(key));
}

function extractJsonCandidates(json, fund, sourceUrl) {
  const candidates = [];
  const seen = new WeakSet();

  function visit(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 8) return;
    if (seen.has(node)) return;
    seen.add(node);

    if (!Array.isArray(node)) {
      const values = candidateValueKeys(node);
      const dates = candidateDateKeys(node);

      for (const valueKey of values) {
        for (const dateKey of dates) {
          const date = parseDateString(node[dateKey]);
          addCandidate(candidates, fund, node[valueKey], date, {
            sourceName: "Nordnet",
            sourceUrl,
            rawSource: "nordnet_api",
            priority: 20,
            raw: { valueKey, dateKey },
          });
        }
      }
    }

    for (const value of Array.isArray(node) ? node : Object.values(node)) {
      visit(value, depth + 1);
    }
  }

  visit(json);
  return candidates;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: options.accept || "text/html,application/xhtml+xml,application/json,text/plain,*/*",
        "Accept-Language": options.language || "nb-NO,nb;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": options.userAgent || "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0; +https://vercel.app)",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 120)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url, { accept: "application/json,text/plain,*/*", language: "nb,en;q=0.8" });
  return JSON.parse(text);
}

export async function fetchAllCandidatesForFund(fund) {
  const candidates = [];
  const diagnostics = [];

  for (const baseUrl of dnbCandidateUrls(fund)) {
    const url = baseUrl;
    try {
      const html = await fetchText(url, {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      });
      const found = parseDnbFundText(html, fund, baseUrl).map((candidate) => ({ ...candidate, fetchUrl: url }));
      candidates.push(...found);
      diagnostics.push({ source: "dnb", url: baseUrl, ok: true, candidates: found.map(slimCandidate) });
    } catch (error) {
      diagnostics.push({ source: "dnb", url: baseUrl, ok: false, error: stringifyError(error) });
    }
  }

  try {
    const html = await fetchText(`${fund.kronUrl}?_=${Date.now()}`);
    const found = parseKronFundText(html, fund);
    candidates.push(...found);
    diagnostics.push({ source: "kron", url: fund.kronUrl, ok: true, candidates: found.map(slimCandidate) });
  } catch (error) {
    diagnostics.push({ source: "kron", url: fund.kronUrl, ok: false, error: stringifyError(error) });
  }

  const nordnetUrls = [
    `https://public.nordnet.se/api/2/main_search?query=${encodeURIComponent(fund.isin)}&instrument_group=FUND&search_space=INSTRUMENTS&limit=10&use_nnx_instrument_search=true`,
    `https://public.nordnet.se/api/2/main_search?query=${encodeURIComponent(fund.longName)}&instrument_group=FUND&search_space=INSTRUMENTS&limit=10&use_nnx_instrument_search=true`,
  ];

  for (const url of nordnetUrls) {
    try {
      const json = await fetchJson(url);
      const found = extractJsonCandidates(json, fund, url);
      candidates.push(...found);
      diagnostics.push({ source: "nordnet", url, ok: true, candidates: found.map(slimCandidate) });
    } catch (error) {
      diagnostics.push({ source: "nordnet", url, ok: false, error: stringifyError(error) });
    }
  }

  return { candidates: dedupeCandidates(candidates), diagnostics };
}

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.date}|${candidate.close}|${candidate.rawSource}|${candidate.sourceUrl}`;
    if (!byKey.has(key)) byKey.set(key, candidate);
  }
  return Array.from(byKey.values());
}

function slimCandidate(candidate) {
  return candidate ? {
    date: candidate.date,
    close: candidate.close,
    sourceName: candidate.sourceName,
    rawSource: candidate.rawSource,
    priority: candidate.priority,
  } : null;
}

function stringifyError(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function getLatestDbRows(supabase, metricKey) {
  const { data, error } = await supabase
    .from("market_metrics")
    .select("metric_key,value,unit,source_name,source_url,source_document,observed_date,fetched_at,status,raw")
    .eq("metric_key", metricKey)
    .eq("status", "ok")
    .not("observed_date", "is", null)
    .order("observed_date", { ascending: false })
    .order("fetched_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

function sameValue(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.000001;
}

async function saveCandidateForFund(supabase, fund, candidate, allCandidates) {
  const latestRows = await getLatestDbRows(supabase, fund.metricKey);
  const latest = latestRows[0] || null;

  const alreadyStored = latestRows.some((row) =>
    row.observed_date === candidate.date && sameValue(row.value, candidate.close)
  );

  if (latest?.observed_date && candidate.date < latest.observed_date) {
    return { action: "skipped_stale", latestDb: latest, inserted: null };
  }

  if (alreadyStored) {
    return { action: "skipped_duplicate", latestDb: latest, inserted: null };
  }

  const row = {
    metric_key: fund.metricKey,
    value: candidate.close,
    unit: fund.unit,
    source_name: candidate.sourceName,
    source_url: candidate.sourceUrl,
    source_document: candidate.sourceDocument,
    observed_date: candidate.date,
    fetched_at: new Date().toISOString(),
    status: "ok",
    message: null,
    raw: {
      indexId: fund.id,
      name: fund.name,
      longName: fund.longName,
      isin: fund.isin,
      provider: candidate.rawSource,
      fetchUrl: candidate.fetchUrl,
      candidateCount: allCandidates.length,
      candidates: allCandidates.map(slimCandidate),
      build: BUILD,
    },
  };

  const { data, error } = await supabase
    .from("market_metrics")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return { action: "inserted", latestDb: latest, inserted: data };
}

async function refreshFund(fund, shouldWrite) {
  const { candidates, diagnostics } = await fetchAllCandidatesForFund(fund);
  const best = latestCandidate(candidates);

  if (!best) {
    return {
      fund: fund.id,
      metricKey: fund.metricKey,
      status: "error",
      error: "Fant ingen plausibel NAV/Kurs-kandidat fra DNB/Kron/Nordnet.",
      candidates: [],
      diagnostics,
    };
  }

  let save = { action: "debug_only", latestDb: null, inserted: null };
  if (shouldWrite) {
    const supabase = getSupabaseAdmin();
    save = await saveCandidateForFund(supabase, fund, best, candidates);
  }

  return {
    fund: fund.id,
    metricKey: fund.metricKey,
    name: fund.longName,
    status: "ok",
    best: slimCandidate(best),
    save: {
      action: save.action,
      latestDb: save.latestDb ? {
        date: save.latestDb.observed_date,
        value: Number(save.latestDb.value),
        fetchedAt: save.latestDb.fetched_at,
        sourceName: save.latestDb.source_name,
      } : null,
      inserted: save.inserted ? {
        date: save.inserted.observed_date,
        value: Number(save.inserted.value),
        fetchedAt: save.inserted.fetched_at,
        sourceName: save.inserted.source_name,
      } : null,
    },
    candidates: candidates.map(slimCandidate),
    diagnostics,
  };
}

export default async function handler(request, response) {
  const startedAt = new Date().toISOString();

  try {
    const url = new URL(request.url || "https://local/api/dnb-fund-refresh", "https://local");
    const action = request.query?.action || url.searchParams.get("action") || "update";
    const shouldWrite = action !== "debug" && action !== "dry-run";

    const results = [];
    for (const fund of FUNDS) {
      try {
        results.push(await refreshFund(fund, shouldWrite));
      } catch (error) {
        results.push({
          fund: fund.id,
          metricKey: fund.metricKey,
          name: fund.longName,
          status: "error",
          error: stringifyError(error),
        });
      }
    }

    const errors = results.filter((result) => result.status !== "ok");

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(errors.length === results.length ? 500 : 200).json({
      build: BUILD,
      action,
      wroteToSupabase: shouldWrite,
      status: errors.length ? (errors.length === results.length ? "error" : "partial") : "ok",
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(500).json({
      build: BUILD,
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: stringifyError(error),
    });
  }
}
