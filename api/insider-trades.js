import { insertMetric, getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const METRIC_KEY = "insider_trade";
const NEWSWEB_BASE = "https://newsweb.oslobors.no";
const CATEGORY = "1102";

function clampNumber(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function getQueryValue(request, key) {
  if (request?.query && request.query[key] !== undefined) return request.query[key];
  try {
    return new URL(request.url || "https://local/api/insider-trades", "https://local").searchParams.get(key);
  } catch {
    return null;
  }
}

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

function normaliseWhitespace(text) {
  return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseDecimalNumber(value) {
  if (value === null || value === undefined) return null;

  let text = String(value).trim().replace(/\u00a0/g, " ").replace(/\s/g, "");
  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    // Last separator is assumed decimal separator.
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = text.split(",");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      text = parts.join(""); // 1,200 => 1200
    } else {
      text = text.replace(",", ".");
    }
  }

  text = text.replace(/[^\d.-]/g, "");
  if (!text) return null;

  const number = Number.parseFloat(text);
  return Number.isFinite(number) ? number : null;
}

function parseShareNumber(value) {
  if (value === null || value === undefined) return null;
  let text = String(value).trim().replace(/\u00a0/g, " ");

  // Shares normally use comma/space/dot as thousands separators. Treat 1,200 / 9.000 / 202 739 as integers.
  text = text.replace(/\s/g, "");
  if (/^\d{1,3}([,.]\d{3})+$/.test(text)) {
    text = text.replace(/[,.]/g, "");
  } else if (text.includes(",")) {
    // If not a clean thousands separator, take integer part before decimal comma.
    text = text.split(",")[0];
  } else if (text.includes(".")) {
    const parts = text.split(".");
    if (parts.length === 2 && parts[1].length === 3) text = parts.join("");
    else text = parts[0];
  }

  text = text.replace(/[^\d-]/g, "");
  if (!text) return null;

  const number = Number.parseInt(text, 10);
  return Number.isFinite(number) ? number : null;
}

function normaliseDate(value) {
  const text = String(value || "");
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const eu = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (eu) return `${eu[3]}-${String(eu[2]).padStart(2, "0")}-${String(eu[1]).padStart(2, "0")}`;

  const nordic = text.match(/\b(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+(20\d{2})\b/i);
  if (nordic) {
    const months = {
      januar: "01", februar: "02", mars: "03", april: "04", mai: "05", juni: "06",
      juli: "07", august: "08", september: "09", oktober: "10", november: "11", desember: "12",
    };
    return `${nordic[3]}-${months[nordic[2].toLowerCase()]}-${String(nordic[1]).padStart(2, "0")}`;
  }

  return null;
}

function classifyTradeType(textInput) {
  const text = normaliseWhitespace(textInput).toLowerCase();

  const sellPatterns = [
    /\bsold\b/,
    /\bsale\b/,
    /\bsell\b/,
    /\bdispos(?:al|ed|es|ing)\b/,
    /\bavhend(?:et|er)?\b/,
    /\bsolgt\b/,
    /\bsalg\b/,
    /\bselge\b/,
  ];

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

  if (sellPatterns.some((pattern) => pattern.test(text))) return "Salg";
  if (buyPatterns.some((pattern) => pattern.test(text))) return "Kjøp";
  return "—";
}

function extractShares(textInput) {
  const text = normaliseWhitespace(textInput);

  const patterns = [
    /(?:has\s+)?(?:purchased|acquired|bought|sold|kjøpt|ervervet|solgt|avhendet)[^.\n]{0,160}?([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
    /([\d\s.,]+)\s+(?:shares|aksjer)\s+(?:in|i|of|av|at|til)\b/i,
    /(?:number of shares|antall aksjer)[^\d]{0,50}([\d\s.,]+)/i,
    /(?:utøvd|exercised)[^.\n]{0,120}?([\d\s.,]+)\s+(?:opsjoner|options|shares|aksjer)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = parseShareNumber(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 1000000000) return value;
  }

  return null;
}

function extractPrice(textInput) {
  const text = normaliseWhitespace(textInput);

  const patterns = [
    /(?:price|subscription price|purchase price|average price|exercise price)[^.\n]{0,100}?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:kurs|pris|utøvelseskurs(?:en)?)[^.\n]{0,100}?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:at|til)\s+(?:a\s+)?(?:price|kurs|pris)\s+(?:of\s+)?(?:NOK|SEK|USD|EUR)?\s*([-+]?\d+(?:[.,]\d+)?)/i,
    /(?:NOK|SEK|USD|EUR)\s*([-+]?\d+(?:[.,]\d+)?)(?:\s+per\s+share|\s+per\s+aksje)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = parseDecimalNumber(match[1]);
    if (Number.isFinite(value) && value >= 0 && value < 100000) return value;
  }

  return null;
}

function extractRole(textInput) {
  const text = normaliseWhitespace(textInput);

  const rolePatterns = [
    /\b(CEO|CFO|COO|CTO|Chair(?:man)?|Board member|Member of the Board|Director|Primary Insider|Primary insider|Chief [A-Za-zæøåÆØÅ ]{2,50}|Managing Director|Executive Director)\b/i,
    /\b(Konsernsjef|Finansdirektør|Styreleder|Styremedlem|Primærinnsider|Daglig leder|Administrerende direktør|Investeringsdirektør|Direktør|ansattrepresentant|vara styremedlem)\b/i,
  ];

  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  const commaRole = text.match(/,\s*([^,.]{2,80}?(?:CEO|CFO|board member|styremedlem|styreleder|konsernsjef|finansdirektør|primærinnsider|director)[^,.]{0,40})[,.\s]/i);
  if (commaRole) return commaRole[1].trim();

  return "—";
}

function hasComplexTransactionContext(textInput, titleInput = "") {
  const text = normaliseWhitespace(`${titleInput} ${textInput}`).toLowerCase();

  // These messages often include share lending, ownership disclosures, private placements,
  // option programmes, allocations, or several simultaneous PDMR/PCA transactions.
  // For these we avoid pretending that one number is "the" buy/sell volume.
  const complexPatterns = [
    /large shareholding/,
    /share lending/,
    /private placement/,
    /loaned shares/,
    /lånte aksjer/,
    /aksjelån/,
    /share option/,
    /options? programme/,
    /opsjonsprogram/,
    /exercise of options/,
    /utøvelse av opsjoner/,
    /grant of share options/,
    /tildeling av opsjoner/,
    /long term incentive|ltip/,
    /employee share saving/,
    /aksjespareprogram/,
    /allocation of shares/,
    /tildeling av aksjer/,
    /following transactions/,
    /følgende transaksjoner/,
  ];

  const hasComplexPhrase = complexPatterns.some((pattern) => pattern.test(text));
  const buy = /\b(purchased|acquired|bought|subscribed|kjøpt|ervervet|tegnet)\b/i.test(text);
  const sell = /\b(sold|sale|disposed|disposal|solgt|salg|avhendet)\b/i.test(text);

  return hasComplexPhrase || (buy && sell);
}

function splitTransactionSentences(textInput) {
  const body = normaliseWhitespace(textInput)
    .replace(/\s+\|\s+/g, ". ")
    .replace(/•/g, ". ")
    .replace(/·/g, ". ");

  return body
    .split(/(?<=[.!?])\s+|\s{2,}|;\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20 && sentence.length < 600);
}

function isHoldingOnlySentence(sentenceInput) {
  const sentence = normaliseWhitespace(sentenceInput).toLowerCase();

  return (
    /after (?:the )?transaction/.test(sentence) ||
    /following (?:the )?transaction/.test(sentence) ||
    /\bholds?\b/.test(sentence) ||
    /\bown(?:s|ed)?\b/.test(sentence) ||
    /\beier\b/.test(sentence) ||
    /\bbeholdning\b/.test(sentence) ||
    /\bholding\b/.test(sentence) ||
    /\bshareholding\b/.test(sentence) ||
    /\breduced (?:his|her|its|their)?\s*shareholding\b/.test(sentence) ||
    /\breduksjon i aksjebeholdning\b/.test(sentence)
  );
}

function explicitTransactionType(sentenceInput) {
  const sentence = normaliseWhitespace(sentenceInput).toLowerCase();

  const sellPatterns = [
    /\bsold\b/,
    /\bsale\b/,
    /\bdisposed\b/,
    /\bdisposal\b/,
    /\bsolgt\b/,
    /\bsalg\b/,
    /\bavhendet\b/,
  ];

  const buyPatterns = [
    /\bpurchased\b/,
    /\bacquired\b/,
    /\bbought\b/,
    /\bsubscribed\b/,
    /\bkjøpt\b/,
    /\bervervet\b/,
    /\btegnet\b/,
  ];

  const isSell = sellPatterns.some((pattern) => pattern.test(sentence));
  const isBuy = buyPatterns.some((pattern) => pattern.test(sentence));

  if (isSell && !isBuy) return "Salg";
  if (isBuy && !isSell) return "Kjøp";
  return "—";
}

function extractExplicitSharesFromSentence(sentenceInput, type) {
  const sentence = normaliseWhitespace(sentenceInput);

  const patterns =
    type === "Salg"
      ? [
          /(?:has\s+)?(?:sold|disposed|solgt|avhendet)[^.\n]{0,140}?([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
          /(?:sale|salg)\s+of\s+([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
        ]
      : type === "Kjøp"
        ? [
            /(?:has\s+)?(?:purchased|acquired|bought|subscribed|kjøpt|ervervet|tegnet)[^.\n]{0,140}?([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
            /(?:purchase|kjøp|erverv)\s+of\s+([\d\s.,]+)\s+(?:shares|aksjer)\b/i,
          ]
        : [];

  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (!match) continue;

    const value = parseShareNumber(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 1000000000) return value;
  }

  return null;
}

function extractTransactionDetails(messageText, title) {
  const text = normaliseWhitespace(messageText);
  const core = text.includes("Share message") ? text.slice(text.indexOf("Share message")) : text;

  if (hasComplexTransactionContext(core, title)) {
    return {
      type: "—",
      shares: null,
      pricePerShare: null,
      confidence: "low",
      note: "Kompleks melding med flere transaksjoner/opsjoner/aksjelån. Verdier vises ikke automatisk for å unngå feil.",
    };
  }

  const candidates = [];

  for (const sentence of splitTransactionSentences(core)) {
    if (!/(shares|aksjer)/i.test(sentence)) continue;
    if (isHoldingOnlySentence(sentence)) continue;

    const type = explicitTransactionType(sentence);
    if (type === "—") continue;

    const shares = extractExplicitSharesFromSentence(sentence, type);
    const pricePerShare = extractPrice(sentence);

    if (shares || pricePerShare) {
      candidates.push({
        type,
        shares,
        pricePerShare,
        sentence,
        score: (shares ? 2 : 0) + (pricePerShare ? 1 : 0),
      });
    }
  }

  if (!candidates.length) {
    return {
      type: "—",
      shares: null,
      pricePerShare: null,
      confidence: "none",
      note: "Fant ikke én tydelig kjøps-/salgstransaksjon i teksten.",
    };
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestScore = candidates[0].score;
  const best = candidates.filter((candidate) => candidate.score === bestScore);

  if (best.length !== 1) {
    return {
      type: "Flere",
      shares: null,
      pricePerShare: null,
      confidence: "low",
      note: "Flere mulige transaksjoner i samme melding. Åpne meldingen for detaljer.",
    };
  }

  return {
    type: best[0].type,
    shares: best[0].shares || null,
    pricePerShare: best[0].shares ? best[0].pricePerShare || null : null,
    confidence: best[0].shares ? "high" : "medium",
    note: null,
  };
}

function extractIssuerFromMessage(messageText) {
  const text = normaliseWhitespace(messageText);

  // Message pages have a header like: "IssuerID PEXIP Instrument PEXIP Market ..."
  const headerPatterns = [
    /IssuerID\s+([A-ZÆØÅ0-9._-]{2,20})\s+(?:Instrument|Market|Category|Mandatory|Attachment|Share|Date\/time|MessageID)/i,
    /IssuerID\s+([A-ZÆØÅ0-9._-]{2,20})\b/i,
    /Oslo\s+Børs\s+Ticker:\s*([A-Z0-9._-]{2,20})/i,
    /Ticker:\s*([A-Z0-9._-]{2,20})/i,
  ];

  for (const pattern of headerPatterns) {
    const match = text.match(pattern);
    if (match && match[1].toUpperCase() !== "MESSAGE") return match[1].toUpperCase();
  }

  return null;
}

function extractIssuerName(messageText) {
  const text = normaliseWhitespace(messageText);
  const match = text.match(/Show advanced search\s+(.+?)\s+Date\/time/i);
  if (match) return match[1].trim();
  return null;
}

function messageIdFromUrl(url) {
  const match = String(url || "").match(/\/message\/(\d+)/);
  return match ? match[1] : null;
}

async function renderSearchPage(url, maxLinks = 24) {
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
    await new Promise((resolve) => setTimeout(resolve, 1200));

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
        .slice(0, Math.max(16, Math.min(60, maxLinks + 8)));
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
  const messageId = messageIdFromUrl(link.href);
  const issuerId = extractIssuerFromMessage(messageText) || "—";
  const issuerName = extractIssuerName(messageText) || issuerId;
  const transaction = extractTransactionDetails(messageText, title);

  return {
    messageId,
    messageUrl: link.href,
    messageDate: normaliseDate(messageText) || normaliseDate(link.rowText),
    issuerId,
    issuerName,
    title,
    type: transaction.type,
    personRole: extractRole(messageText),
    shares: transaction.shares,
    pricePerShare: transaction.pricePerShare,
    parseConfidence: transaction.confidence,
    parserNote: transaction.note,
    rawSnippet: messageText.slice(0, 1200),
    rowText: link.rowText,
  };
}

function sortTrades(a, b) {
  const dateA = a.messageDate || a.date || "";
  const dateB = b.messageDate || b.date || "";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return String(b.messageId || b.id || "").localeCompare(String(a.messageId || a.id || ""));
}

async function scrapeNewswebInsiders(daysBack = 14, limit = 16) {
  const url = searchUrl(daysBack);
  const maxMessages = Math.max(1, Math.min(24, limit));
  const rendered = await renderSearchPage(url, maxMessages);
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
      throw new Error("Fant ingen NewsWeb-meldingslenker i søkeresultatet.");
    }

    const trades = [];
    for (const link of uniqueLinks.slice(0, maxMessages)) {
      try {
        trades.push(await scrapeMessage(page, link));
      } catch (error) {
        trades.push({
          messageId: messageIdFromUrl(link.href),
          messageUrl: link.href,
          messageDate: normaliseDate(link.rowText),
          issuerId: "—",
          issuerName: "—",
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
  const daysBack = clampNumber(getQueryValue(request, "days"), 14, 7, 30);
  const limit = clampNumber(getQueryValue(request, "limit"), 16, 1, 24);

  try {
    const { searchUrl: url, trades } = await scrapeNewswebInsiders(daysBack, limit);
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
        raw: { ...trade, searchUrl: url, category: CATEGORY },
      });
      saved.push(row);
    }

    response.status(200).json({ status: "ok", metricKey: METRIC_KEY, fetchedAt, searchUrl: url, daysBack, limit, savedCount: saved.length, saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved henting av innsidehandler.";

    await insertMetric({
      metric_key: METRIC_KEY,
      value: null,
      unit: null,
      source_name: "Oslo Børs NewsWeb",
      source_url: searchUrl(daysBack),
      source_document: "NewsWeb search category 1102",
      observed_date: null,
      fetched_at: fetchedAt,
      status: "error",
      message,
      raw: { stage: "update-insider-trades" },
    });

    response.status(200).json({ status: "error", metricKey: METRIC_KEY, message });
  }
}

function isBadIssuer(value) {
  const text = String(value || "").trim();
  return !text || text === "—" || text.toUpperCase() === "MESSAGE";
}

function inferCompanyFromTitle(title) {
  const text = normaliseWhitespace(title || "");
  if (!text) return null;

  const split = text.split(/\s+[-–—:]\s+|:\s+/)[0]?.trim();
  if (split && split.length >= 2 && split.length <= 60 && !/mandatory notification|trade by primary|meldepliktig/i.test(split)) {
    return split;
  }

  return null;
}

function cleanIssuer(raw, row) {
  const issuerId = raw.issuerId;
  const issuerName = raw.issuerName;
  const title = raw.title || row.source_document || "";

  if (!isBadIssuer(issuerId)) return { issuerId, issuerName: !isBadIssuer(issuerName) ? issuerName : issuerId };

  if (!isBadIssuer(issuerName)) return { issuerId: "—", issuerName };

  const inferred = inferCompanyFromTitle(title);
  if (inferred) return { issuerId: "—", issuerName: inferred };

  return { issuerId: "—", issuerName: "—" };
}

function uniqueTrades(rows) {
  const seen = new Set();
  const trades = [];

  for (const row of rows || []) {
    const raw = row.raw || {};
    const id = raw.messageId || row.source_url || row.id;
    if (seen.has(id)) continue;
    seen.add(id);

    const cleanedIssuer = cleanIssuer(raw, row);
    const companyDisplay = cleanedIssuer.issuerId !== "—" ? cleanedIssuer.issuerId : cleanedIssuer.issuerName;

    if (isBadIssuer(companyDisplay)) continue;

    trades.push({
      id,
      messageId: raw.messageId || null,
      messageUrl: raw.messageUrl || row.source_url,
      date: raw.messageDate || row.observed_date,
      issuerId: cleanedIssuer.issuerId,
      issuerName: cleanedIssuer.issuerName,
      companyDisplay,
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
  const weekDays = clampNumber(getQueryValue(request, "weekDays"), 7, 1, 30);
  const latestLimit = clampNumber(getQueryValue(request, "latestLimit"), 10, 5, 30);
  const weekCutoff = new Date();
  weekCutoff.setDate(weekCutoff.getDate() - weekDays);
  const weekCutoffIso = weekCutoff.toISOString().slice(0, 10);
  const week = trades.filter((trade) => trade.date && trade.date >= weekCutoffIso);

  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: trades.length ? "ok" : "empty",
    sourceName: "Oslo Børs NewsWeb",
    sourceUrl: searchUrl(7),
    fetchedAt: new Date().toISOString(),
    latest: trades.slice(0, latestLimit),
    week,
    meta: {
      weekDays,
      latestLimit,
      note: "Listen viser lagrede meldinger hentet av appen. NewsWeb kan ha flere meldinger enn dette hvis update-limit er lavere enn antall meldinger.",
    },
  });
}

export default async function handler(request, response) {
  try {
    const action =
      request.query?.action ||
      new URL(request.url || "https://local/api/insider-trades", "https://local").searchParams.get("action");

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
