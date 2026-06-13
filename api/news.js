import { getSupabaseAdmin } from "../lib/supabase.js";

export const config = { maxDuration: 60 };

const BUILD = "newsfeed-v1-2026-06-13";
const METRIC_KEY = "newsfeed_article";

const SOURCES = [
  {
    key: "dn",
    name: "DN",
    feeds: [
      "https://services.dn.no/api/feed/rss/",
    ],
  },
  {
    key: "e24",
    name: "E24",
    feeds: [
      "https://e24.no/rss/",
      "https://e24.no/rss/?seksjon=boers-og-finans",
      "https://e24.no/rss/?seksjon=makro-og-politikk",
      "https://e24.no/rss/?seksjon=naeringsliv",
      "https://e24.no/rss/?seksjon=eksklusiv24_eiendom",
    ],
  },
  {
    key: "finansavisen",
    name: "Finansavisen",
    feeds: [
      "https://www.finansavisen.no/",
      "https://www.finansavisen.no/finans",
      "https://www.finansavisen.no/eiendom",
      "https://www.finansavisen.no/aksjeanalyse",
    ],
    mode: "html",
  },
  {
    key: "estate",
    name: "Estate",
    feeds: [
      "https://www.estatenyheter.no/feed/",
      "https://www.estatenyheter.no/rss/",
      "https://www.estatenyheter.no/",
    ],
    mode: "mixed",
  },
];

const POSITIVE_KEYWORDS = [
  ["rente", 10], ["rentemøte", 11], ["norges bank", 12], ["sentralbank", 8],
  ["inflasjon", 10], ["kpi", 8], ["makro", 8], ["styringsrente", 12],
  ["krone", 7], ["valuta", 7], ["swap", 9], ["nibor", 10], ["stibor", 10],
  ["yield", 12], ["prime yield", 15], ["eiendom", 12], ["næringseiendom", 15],
  ["kontor", 8], ["logistikk", 10], ["handel", 5], ["high street", 8],
  ["transaksjon", 10], ["kjøper", 5], ["selger", 5], ["milliard", 6],
  ["finansiering", 12], ["bank", 7], ["lån", 6], ["obligasjon", 8],
  ["oslo børs", 10], ["børs", 8], ["aksje", 7], ["aksjer", 7],
  ["dnb", 8], ["equinor", 6], ["entra", 10], ["balder", 8], ["castellum", 8],
  ["olje", 5], ["energi", 5], ["marked", 6], ["markets", 6],
  ["resultat", 4], ["ebitda", 4], ["investor", 6], ["investorer", 6],
];

const NEGATIVE_KEYWORDS = [
  ["sport", -25], ["fotball", -25], ["kjendis", -20], ["vin", -8],
  ["restaurant", -8], ["biltest", -8], ["reise", -8], ["kultur", -10],
  ["shopping", -10],
];

function normaliseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function getTagValue(xml, tag) {
  const patterns = [
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
    new RegExp(`<[^:>]+:${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]+:${tag}>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return normaliseWhitespace(stripTags(match[1]));
  }

  return null;
}

function getLinkFromItem(item) {
  const explicit = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (explicit) return normaliseWhitespace(stripTags(explicit[1]));

  const atom = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) return decodeEntities(atom[1]);

  return null;
}

function canonicalUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((param) =>
      parsed.searchParams.delete(param)
    );
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function observedDateFromPublished(publishedAt) {
  if (!publishedAt) return null;
  return String(publishedAt).slice(0, 10);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, text/html, */*",
      "Accept-Language": "nb-NO,nb;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`${url} svarte med ${response.status}.`);
  return response.text();
}

function parseRssOrAtom(text, source) {
  const articles = [];
  const blocks = [
    ...String(text || "").matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...String(text || "").matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ];

  for (const match of blocks) {
    const item = match[0];
    const title = getTagValue(item, "title");
    const url = canonicalUrl(getLinkFromItem(item) || getTagValue(item, "guid") || getTagValue(item, "id"));
    const description = getTagValue(item, "description") || getTagValue(item, "summary") || getTagValue(item, "content");
    const publishedAt =
      toIsoDate(getTagValue(item, "pubDate")) ||
      toIsoDate(getTagValue(item, "published")) ||
      toIsoDate(getTagValue(item, "updated")) ||
      toIsoDate(getTagValue(item, "date"));

    if (!title || !url) continue;

    articles.push({
      id: `${source.key}:${url}`,
      sourceKey: source.key,
      sourceName: source.name,
      title: normaliseWhitespace(title),
      url,
      publishedAt,
      description: normaliseWhitespace(description || ""),
      rawType: "rss",
    });
  }

  return articles;
}

function absoluteUrl(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseJsonLdArticles(html, source, baseUrl) {
  const articles = [];
  const scripts = String(html || "").match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const script of scripts) {
    const content = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();

    try {
      const parsed = JSON.parse(decodeEntities(content));
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of nodes) {
        const graph = item?.["@graph"];
        const candidates = Array.isArray(graph) ? graph : [item];

        for (const node of candidates) {
          const type = Array.isArray(node?.["@type"]) ? node["@type"].join(" ") : node?.["@type"];
          if (!String(type || "").toLowerCase().includes("article")) continue;

          const title = node.headline || node.name;
          const url = canonicalUrl(node.url || node.mainEntityOfPage?.["@id"] || node.mainEntityOfPage || baseUrl);
          const publishedAt = toIsoDate(node.datePublished || node.dateCreated || node.dateModified);
          const description = node.description || "";

          if (title && url) {
            articles.push({
              id: `${source.key}:${url}`,
              sourceKey: source.key,
              sourceName: source.name,
              title: normaliseWhitespace(title),
              url,
              publishedAt,
              description: normaliseWhitespace(stripTags(description)),
              rawType: "jsonld",
            });
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  return articles;
}

function parseHtmlListing(html, source, baseUrl) {
  const articles = [...parseJsonLdArticles(html, source, baseUrl)];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of String(html || "").matchAll(anchorPattern)) {
    const href = match[1];
    const text = normaliseWhitespace(stripTags(match[2]));
    const url = canonicalUrl(absoluteUrl(href, baseUrl));

    if (!url || !text || text.length < 14 || text.length > 160) continue;

    let sameDomain = false;
    try {
      const targetHost = new URL(url).hostname.replace(/^www\./, "");
      const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
      sameDomain = targetHost === baseHost;
    } catch {
      sameDomain = false;
    }

    if (!sameDomain) continue;

    const lower = text.toLowerCase();
    if (["siste", "børs", "forum", "watchlist", "logg inn", "kjøp", "abonnement", "annonse"].includes(lower)) continue;

    articles.push({
      id: `${source.key}:${url}`,
      sourceKey: source.key,
      sourceName: source.name,
      title: text,
      url,
      publishedAt: null,
      description: "",
      rawType: "html_link",
    });
  }

  return articles;
}

async function fetchSourceArticles(source) {
  const articles = [];
  const errors = [];

  for (const feedUrl of source.feeds) {
    try {
      const text = await fetchText(feedUrl);
      const isXmlLike = /<(rss|feed|item|entry)\b/i.test(text);

      if (source.mode === "html") {
        articles.push(...parseHtmlListing(text, source, feedUrl));
      } else if (source.mode === "mixed" && !isXmlLike) {
        articles.push(...parseHtmlListing(text, source, feedUrl));
      } else {
        const parsed = parseRssOrAtom(text, source);
        articles.push(...(parsed.length ? parsed : parseHtmlListing(text, source, feedUrl)));
      }
    } catch (error) {
      errors.push(`${source.name}: ${feedUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { articles, errors };
}

function keywordScore(text) {
  const haystack = String(text || "").toLowerCase();
  let score = 0;
  const hits = [];

  for (const [keyword, weight] of POSITIVE_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += weight;
      hits.push(keyword);
    }
  }

  for (const [keyword, weight] of NEGATIVE_KEYWORDS) {
    if (haystack.includes(keyword)) score += weight;
  }

  return { score, hits };
}

function hoursOld(article) {
  if (!article.publishedAt) return 24;
  const age = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
  return Number.isFinite(age) ? Math.max(age, 0) : 24;
}

function scoreArticle(article) {
  const text = `${article.title} ${article.description || ""}`;
  const keyword = keywordScore(text);
  const recency = Math.max(0, 18 - Math.min(hoursOld(article), 72) / 4);
  const sourceBoost = article.sourceKey === "estate" ? 7 : article.sourceKey === "finansavisen" ? 4 : 0;
  const paywallPenalty = /\b(pluss|\+|premium)\b/i.test(article.title) ? -1 : 0;

  return {
    score: keyword.score + recency + sourceBoost + paywallPenalty,
    keywords: keyword.hits.slice(0, 8),
  };
}

function dedupeArticles(articles) {
  const byUrl = new Map();
  const byTitle = new Map();

  for (const article of articles) {
    const url = canonicalUrl(article.url);
    const titleKey = String(article.title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

    if (!url || !titleKey) continue;
    if (byUrl.has(url)) continue;
    if (byTitle.has(titleKey)) continue;

    byUrl.set(url, { ...article, url });
    byTitle.set(titleKey, article);
  }

  return Array.from(byUrl.values());
}

function rankArticles(articles) {
  return dedupeArticles(articles)
    .map((article) => {
      const scored = scoreArticle(article);
      return {
        ...article,
        relevanceScore: Number(scored.score.toFixed(2)),
        keywords: scored.keywords,
      };
    })
    .filter((article) => article.relevanceScore >= 3)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    })
    .slice(0, 30);
}

async function getExistingUrls(cutoffIso) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("raw")
    .eq("metric_key", METRIC_KEY)
    .gte("fetched_at", cutoffIso)
    .limit(1000);

  if (error) throw error;

  return new Set((data || []).map((row) => row.raw?.url).filter(Boolean));
}

async function insertArticles(articles, fetchedAt) {
  if (!articles.length) return [];

  const existing = await getExistingUrls(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
  const rows = articles
    .filter((article) => article.url && !existing.has(article.url))
    .map((article) => ({
      metric_key: METRIC_KEY,
      value: article.relevanceScore,
      unit: "score",
      source_name: article.sourceName,
      source_url: article.url,
      source_document: article.title,
      observed_date: observedDateFromPublished(article.publishedAt) || fetchedAt.slice(0, 10),
      fetched_at: fetchedAt,
      status: "ok",
      message: null,
      raw: {
        ...article,
        build: BUILD,
      },
    }));

  if (!rows.length) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("market_metrics").insert(rows).select("*");

  if (error) throw error;
  return data || [];
}

function rowToArticle(row) {
  const raw = row.raw || {};

  return {
    id: raw.id || row.id,
    title: raw.title || row.source_document || "Uten tittel",
    sourceName: raw.sourceName || row.source_name || "Ukjent",
    sourceKey: raw.sourceKey || null,
    url: raw.url || row.source_url,
    publishedAt: raw.publishedAt || row.observed_date || row.fetched_at,
    fetchedAt: row.fetched_at,
    relevanceScore: raw.relevanceScore ?? row.value ?? null,
    keywords: raw.keywords || [],
  };
}

async function readArticles() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("market_metrics")
    .select("*")
    .eq("metric_key", METRIC_KEY)
    .eq("status", "ok")
    .order("fetched_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const deduped = dedupeArticles((data || []).map(rowToArticle));
  return deduped
    .sort((a, b) => {
      const scoreDiff = Number(b.relevanceScore || 0) - Number(a.relevanceScore || 0);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      return new Date(b.publishedAt || b.fetchedAt || 0).getTime() - new Date(a.publishedAt || a.fetchedAt || 0).getTime();
    })
    .slice(0, 15);
}

async function updateNews() {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(SOURCES.map(fetchSourceArticles));

  const allArticles = results.flatMap((result) => result.articles);
  const errors = results.flatMap((result) => result.errors);
  const ranked = rankArticles(allArticles);
  const saved = await insertArticles(ranked.slice(0, 25), fetchedAt);

  return {
    build: BUILD,
    status: errors.length && !ranked.length ? "error" : errors.length ? "partial" : "ok",
    metricGroup: "newsfeed",
    fetchedAt,
    fetchedCount: allArticles.length,
    rankedCount: ranked.length,
    savedCount: saved.length,
    saved: saved.map(rowToArticle).slice(0, 15),
    errors,
  };
}

export default async function handler(request, response) {
  try {
    const url = new URL(request.url || "https://local/api/news", "https://local");
    const action = request.query?.action || url.searchParams.get("action");

    response.setHeader("Cache-Control", "no-store, max-age=0");

    if (action === "update") {
      response.status(200).json(await updateNews());
      return;
    }

    const articles = await readArticles();

    response.status(200).json({
      build: BUILD,
      status: articles.length ? "ok" : "empty",
      metricGroup: "newsfeed",
      sourceName: "DN, Finansavisen, E24 og Estate",
      fetchedAt: articles[0]?.fetchedAt || null,
      items: articles,
      message: articles.length ? null : "Ingen nyheter lagret ennå. Kjør /api/news?action=update.",
    });
  } catch (error) {
    response.status(500).json({
      build: BUILD,
      status: "error",
      metricGroup: "newsfeed",
      message: error instanceof Error ? error.message : "Ukjent feil i nyhetsfeed.",
    });
  }
}
