export const config = {
  maxDuration: 60,
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summariseText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const niborIndex = clean.toLowerCase().indexOf("nibor");
  const nokkelIndex = clean.toLowerCase().indexOf("nøkkeltall");
  const pdfIndex = clean.toLowerCase().indexOf(".pdf");

  function snippet(index) {
    if (index < 0) return null;
    return clean.slice(Math.max(0, index - 250), Math.min(clean.length, index + 450));
  }

  return {
    length: clean.length,
    containsNibor: /nibor/i.test(clean),
    contains3mNibor: /3\s*m\s*nibor|3m\s*nibor/i.test(clean),
    containsNokkeltall: /nøkkeltall|nokkeltall/i.test(clean),
    containsPdf: /\.pdf/i.test(clean),
    niborSnippet: snippet(niborIndex),
    nokkeltallSnippet: snippet(nokkelIndex),
    pdfSnippet: snippet(pdfIndex),
    first1200: clean.slice(0, 1200),
  };
}

function extractLinksFromHtml(html) {
  const links = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    links.push({
      href: decodeHtml(match[1]),
      text: stripHtml(match[2]).slice(0, 200),
    });
  }

  return links;
}

function summariseLinks(links) {
  const filtered = (links || []).filter((link) => {
    const combined = `${link.href || ""} ${link.text || ""}`.toLowerCase();
    return combined.includes("pdf") || combined.includes("nibor") || combined.includes("nøkkeltall") || combined.includes("nokkeltall");
  });

  return {
    totalLinks: (links || []).length,
    relevantLinks: filtered.slice(0, 25),
  };
}

async function fetchRaw(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      "Cache-Control": "no-cache",
    },
  });

  const html = await response.text();
  const links = extractLinksFromHtml(html);

  return {
    url,
    status: response.status,
    contentType: response.headers.get("content-type"),
    text: summariseText(stripHtml(html)),
    links: summariseLinks(links),
  };
}

async function renderPage(url) {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36");
    await page.setExtraHTTPHeaders({
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const result = await page.evaluate(() => ({
      title: document.title,
      location: window.location.href,
      text: document.body ? document.body.innerText : "",
      html: document.documentElement ? document.documentElement.outerHTML : "",
      links: Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          href: a.href || a.getAttribute("href") || "",
          text: a.innerText || a.textContent || "",
        }))
        .filter((link) => link.href),
    }));

    return {
      url,
      title: result.title,
      location: result.location,
      text: summariseText(result.text),
      links: summariseLinks(result.links),
    };
  } finally {
    await browser.close();
  }
}

export default async function handler(request, response) {
  const urls = [
    "https://union.no/analyse",
    "https://union.no/naering/analyse/nokkeltall",
  ];

  const output = {
    status: "ok",
    generatedAt: new Date().toISOString(),
    raw: {},
    rendered: {},
  };

  for (const url of urls) {
    try {
      output.raw[url] = await fetchRaw(url);
    } catch (error) {
      output.raw[url] = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      output.rendered[url] = await renderPage(url);
    } catch (error) {
      output.rendered[url] = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  response.status(200).json(output);
}
