import { insertMetric, getSupabaseAdmin } from "../lib/supabase.js";

export const config = {
  maxDuration: 60,
};

const METRIC_KEY = "insider_trade";
const NEWSWEB_BASE = "https://newsweb.oslobors.no";
const CATEGORY = "1102";

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function searchUrl(daysBack = 14) {
  const today = new Date();
  const fromDate = toIsoDate(addDays(today, -daysBack));
  const toDate = toIsoDate(today);

  return `${NEWSWEB_BASE}/search?category=${CATEGORY}&issuer=&fromDate=${fromDate}&toDate=${toDate}&market=&messageTitle=`;
}

function parseNumberLoose(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;
  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseIntegerLoose(value) {
  const number = parseNumberLoose(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number);
}

function normaliseWhitespace(text) {
  return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normaliseDate(value) {
  const text = String(value || "");

  // ISO first
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Norwegian/European date: 21.05.2026 or 21/05/2026
  const eu = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (eu) return `${eu[3]}-${String(eu[2]).padStart(2, "0")}-${String(eu[1]).padStart(2, "0")}`;

  return null;
}

function classifyTradeType(textInput) {
  const text = normaliseWhitespace(textInput).toLowerCase();

  const buyPatterns = [
    /\bpurchase[ds]?\b/,
    /\bacquir(?:e|ed|es|ing)\b/,
    /\bbought\b/,
    /\bbuy\b/,
    /\bkjøp(?:t|er)?\b/,
    /\berverv(?:et|er)?\b/,
    /\btegnet\b/,
    /\bsubscribed\b/,
  ];

  const sellPatterns = [
    /\bsold\b/,
    /\bsale\b/,
    /\bsell\b/,
    /\bdispos(?:al|ed|es|ing)\b/,
    /\bavhend(?:et|er)?\b/,
    /\bsolgt\b/,
    /\bsalg\b/,
  ];

  if (sellPatterns.some((pattern) => pattern.test(text))) return "Salg";
  if (buyPatterns.some((pattern) => pattern.test(text))) return "Kjøp";
  return "—";
}

function extractShares(textInput) {
  const text = normaliseWhitespace(textInput);

  const patterns = [
    /(?:purchased|acquired|bought|sold|kjøpt|ervervet|solgt|avhendet)[^.\n]{0,160}?([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
    /([\d\s.,]+)\s+(?:shares|aksjer)\s+(?:at|til|for|in|i)\b/i,
    /(?:number of shares|antall aksjer)[^\d]{0,40}([\d\s.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = parseIntegerLoose(match[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return null;
}

function extractPrice(textInput) {
  const text = normaliseWhitespace(textInput);

  const patterns = [
    /(?:price|subscription price|purchase price|average price)[^.\n]{0,80}?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:kurs|pris)[^.\n]{0,80}?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:at|til)\s+(?:a\s+)?(?:price|kurs|pris)\s+(?:of\s+)?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:NOK|SEK|USD|EUR)\s*([-+]?\d+(?:[.,]\d+)?)(?:\s+per\s+share|\s+per\s+aksje)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = parseNumberLoose(match[1]);
    if (Number.isFinite(value) && value >= 0 && value < 100000) return value;
  }

  return null;
}

function extractRole(textInput) {
  const text = normaliseWhitespace(textInput);

  const rolePatterns = [
    /\b(CEO|CFO|COO|CTO|Chair(?:man)?|Board member|Member of the Board|Director|Primary insider|Chief [A-Za-zæøåÆØÅ ]{2,50}|Managing Director)\b/i,
    /\b(Konsernsjef|Finansdirektør|Styreleder|Styremedlem|Primærinnsider|Daglig leder|Administrerende direktør|Investeringsdirektør|Direktør)\b/i,
  ];

  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  // Common sentence: "X, CEO of Issuer, has..."
  const commaRole = text.match(/,\s*([^,.]{2,70}?(?:CEO|CFO|board member|styremedlem|styreleder|konsernsjef|finansdirektør|primærinnsider)[^,.]{0,40})[,.\s]/i);
  if (commaRole) return commaRole[1].trim();

  return "—";
}

function extractIssuer(rowText, messageText, title) {
  const combined = normaliseWhitespace(`${rowText} ${title} ${messageText}`);

  const issuerPatterns = [
    /IssuerID[:\s]+([A-Z0-9._-]{2,20})/i,
    /Ticker[:\s]+([A-Z0-9._-]{2,20})/i,
    /\bOSE[:\s]+([A-Z0-9._-]{2,20})\b/i,
  ];

  for (const pattern of issuerPatterns) {
    const match = combined.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  // NewsWeb list rows often start with date/time, market, issuer/ticker.
  const tokens = normaliseWhitespace(rowText).split(" ");
  const likelyTicker = tokens.find((token) => /^[A-ZÆØÅ0-9]{2,8}$/.test(token) && !/^\d+$/.test(token));
  if (likelyTicker) return likelyTicker;

  return "—";
}

function messageIdFromUrl(url) {
  const match = String(url || "").match(/\/message\/(\d+)/);
  return match ? match[1] : null;
}

async function renderSearchPage(url) {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1440, height: 1800 },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8,nb;q=0.7" });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 450));

    const links = await page.evaluate(() => {
      function closestUsefulText(el) {
        const containers = [];
        let node = el;
        for (let i = 0; i < 6 && node; i += 1) {
          containers.push((node.innerText || node.textContent || "").replace(/\s+/g, " ").trim());
          node = node.parentElement;
        }
        return containers.sort((a, b) => b.length - a.length)[0] || "";
      }

      return Array.from(document.querySelectorAll("a[href*='/message/']"))
        .map((a) => ({
          href: a.href,
          title: (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim(),
          rowText: closestUsefulText(a),
        }))
        .filter((item) => item.href)
        .slice(0, 16);
    });

    return { browser, page, links };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function scrapeMessage(page, link) {
  await page.goto(link.href, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 450));

  const payload = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body ? document.body.innerText : "",
    url: window.location.href,
  }));

  const messageText = normaliseWhitespace(payload.bodyText);
  const title = normaliseWhitespace(link.title || payload.title);
  const combined = `${title} ${link.rowText || ""} ${messageText}`;
  const messageId = messageIdFromUrl(link.href);

  return {
    messageId,
    messageUrl: link.href,
    messageDate: normaliseDate(link.rowText) || normaliseDate(messageText),
    issuerId: extractIssuer(link.rowText, messageText, title),
    issuerName: extractIssuer(link.rowText, messageText, title),
    title,
    type: classifyTradeType(combined),
    personRole: extractRole(combined),
    shares: extractShares(combined),
    pricePerShare: extractPrice(combined),
    rawSnippet: messageText.slice(0, 1200),
    rowText: link.rowText,
  };
}

function sortTrades(a, b) {
  const dateA = a.messageDate || "";
  const dateB = b.messageDate || "";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return String(b.messageId || "").localeCompare(String(a.messageId || ""));
}

async function scrapeNewswebInsiders(daysBack = 14) {
  const url = searchUrl(daysBack);
  const rendered = await renderSearchPage(url);
  const { browser, page, links } = rendered;

  try {
    const seen = new Set();
    const uniqueLinks = links.filter((link) => {
      const id = messageIdFromUrl(link.href);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (!uniqueLinks.length) {
      throw new Error("Fant ingen NewsWeb-meldingslenker i søkeresultatet. NewsWeb kan ha endret struktur eller blokkert rendering.");
    }

    const trades = [];
    for (const link of uniqueLinks.slice(0, 10)) {
      try {
        const trade = await scrapeMessage(page, link);
        trades.push(trade);
      } catch (error) {
        trades.push({
          messageId: messageIdFromUrl(link.href),
          messageUrl: link.href,
          messageDate: normaliseDate(link.rowText),
          issuerId: extractIssuer(link.rowText, "", link.title),
          issuerName: extractIssuer(link.rowText, "", link.title),
          title: link.title,
          type: "—",
          personRole: "—",
          shares: null,
          pricePerShare: null,
          parseError: error instanceof Error ? error.message : String(error),
          rowText: link.rowText,
        });
      }
    }

    trades.sort(sortTrades);
    return { searchUrl: url, trades };
  } finally {
    await browser.close();
  }
}

async function updateInsiderTrades(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const { searchUrl: url, trades } = await scrapeNewswebInsiders(14);
    const saved = [];

    for (const trade of trades) {
      const row = await insertMetric({
        metric_key: METRIC_KEY,
        value: null,
        unit: null,
        source_name: "Oslo Børs NewsWeb",
        source_url: trade.messageUrl,
        source_document: trade.title,
        observed_date: trade.messageDate,
        fetched_at: fetchedAt,
        status: trade.parseError ? "partial" : "ok",
        message: trade.parseError || null,
        raw: {
          ...trade,
          searchUrl: url,
          category: CATEGORY,
        },
      });
      saved.push(row);
    }

    response.status(200).json({
      status: "ok",
      metricKey: METRIC_KEY,
      fetchedAt,
      searchUrl: url,
      savedCount: saved.length,
      saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved henting av innsidehandler.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: null,
      source_name: "Oslo Børs NewsWeb",
      source_url: searchUrl(14),
      source_document: "NewsWeb search category 1102",
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: { stage: "update-insider-trades" },
    });

    response.status(200).json({
      status: "error",
      metricKey: METRIC_KEY,
      message,
    });
  }
}

function uniqueTrades(rows) {
  const seen = new Set();
  const trades = [];

  for (const row of rows || []) {
    const raw = row.raw || {};
    const id = raw.messageId || row.source_url || row.id;
    if (seen.has(id)) continue;
    seen.add(id);

    trades.push({
      id,
      messageId: raw.messageId || null,
      messageUrl: raw.messageUrl || row.source_url,
      date: raw.messageDate || row.observed_date,
      issuerId: raw.issuerId || "—",
      issuerName: raw.issuerName || raw.issuerId || "—",
      title: raw.title || row.source_document || "",
      type: raw.type || "—",
      personRole: raw.personRole || "—",
      shares: raw.shares ?? null,
      pricePerShare: raw.pricePerShare ?? null,
      status: row.status,
      message: row.message,
      fetchedAt: row.fetched_at,
    });
  }

  trades.sort(sortTrades);
  return trades;
}

async function readInsiderTrades(request, response) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", METRIC_KEY)
    .in("status", ["ok", "partial"])
    .order("fetched_at", { ascending: false })
    .limit(250);

  if (error) throw error;

  const trades = uniqueTrades(data);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  const week = trades.filter((trade) => trade.date && trade.date >= sevenDaysAgoIso);

  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: trades.length ? "ok" : "empty",
    sourceName: "Oslo Børs NewsWeb",
    sourceUrl: searchUrl(7),
    fetchedAt: new Date().toISOString(),
    latest: trades.slice(0, 10),
    week,
  });
}

export default async function handler(request, response) {
  try {
    const action = request.query?.action || new URL(request.url || "https://local/api/insider-trades", "https://local").searchParams.get("action");

    if (action === "update") {
      await updateInsiderTrades(request, response);
      return;
    }

    await readInsiderTrades(request, response);
  } catch (error) {
    response.status(500).json({
      status: "error",
      metricKey: METRIC_KEY,
      message: error instanceof Error ? error.message : "Ukjent feil i innsidehandel-endepunktet.",
    });
  }
}
