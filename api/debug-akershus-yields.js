export const config = {
  maxDuration: 60,
};

const AKERSHUS_URL = "https://akershuseiendom.no/markedsinnsikt/nokkeltall";

function normaliseText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

function extractYieldCandidates(textInput) {
  const text = normaliseText(textInput);
  const candidates = [];

  const patterns = [
    /Prime\s+yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/gi,
    /Primeyield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/gi,
    /Yield\s+([-+]?\d+(?:[,.]\d+)?)\s*%/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseNumber(match[1]);
      if (Number.isFinite(value) && value > 0 && value < 20) {
        candidates.push({
          value,
          index: match.index,
          snippet: text.slice(Math.max(0, match.index - 180), Math.min(text.length, match.index + 260)),
        });
      }
    }
  }

  return candidates;
}

function snippetAround(textInput, query) {
  const text = normaliseText(textInput);
  const index = text.toLowerCase().indexOf(String(query).toLowerCase());
  if (index < 0) return null;
  return text.slice(Math.max(0, index - 250), Math.min(text.length, index + 500));
}

async function renderPage() {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1440, height: 1600 },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)");
    await page.setExtraHTTPHeaders({
      "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
    });

    const network = [];
    page.on("response", async (response) => {
      try {
        const url = response.url();
        const type = response.headers()["content-type"] || "";
        if (
          url.includes("akershus") ||
          url.includes("api") ||
          url.includes("json") ||
          type.includes("json")
        ) {
          network.push({
            url,
            status: response.status(),
            contentType: type,
          });
        }
      } catch {}
    });

    await page.goto(AKERSHUS_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    return { browser, page, network };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function getPageState(page, label = "initial") {
  return await page.evaluate((stateLabel) => {
    const text = document.body ? document.body.innerText : "";

    const elements = Array.from(document.querySelectorAll("button, a, [role='button'], [tabindex], div, span"))
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
        const aria = el.getAttribute("aria-label") || "";
        const role = el.getAttribute("role") || "";
        const cls = el.getAttribute("class") || "";
        const id = el.getAttribute("id") || "";
        return {
          index,
          tag: el.tagName,
          text: txt.slice(0, 120),
          aria,
          role,
          id,
          className: cls.slice(0, 160),
          visible: rect.width > 0 && rect.height > 0,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      })
      .filter((item) => {
        const combined = `${item.text} ${item.aria} ${item.role} ${item.id} ${item.className}`.toLowerCase();
        return (
          item.visible &&
          (combined.includes("kontor") ||
            combined.includes("handel") ||
            combined.includes("logistikk") ||
            combined.includes("lager") ||
            combined.includes("retail") ||
            combined.includes("office") ||
            combined.includes("segment") ||
            combined.includes("yield"))
        );
      })
      .slice(0, 120);

    const scripts = Array.from(document.querySelectorAll("script"))
      .map((script) => script.textContent || "")
      .filter((txt) => /prime|yield|kontor|handel|logistikk|lager|retail|office/i.test(txt))
      .map((txt) => txt.slice(0, 2000))
      .slice(0, 10);

    return {
      label: stateLabel,
      url: window.location.href,
      title: document.title,
      textLength: text.length,
      bodyTextPreview: text.replace(/\s+/g, " ").trim().slice(0, 2500),
      relevantElements: elements,
      relevantScripts: scripts,
    };
  }, label);
}

async function clickCandidate(page, wanted) {
  return await page.evaluate((wantedText) => {
    const wanted = wantedText.toLowerCase();

    function score(el) {
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const role = (el.getAttribute("role") || "").toLowerCase();
      const combined = `${text} ${aria} ${role}`;

      if (text === wanted || aria === wanted) return 100;
      if (text.split(" ").includes(wanted)) return 80;
      if (combined.includes(wanted)) return 50;
      return 0;
    }

    const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], [tabindex], div, span"))
      .map((el, index) => ({ el, index, score: score(el) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const target = candidates[0];

    if (!target) {
      return { clicked: false, wanted: wantedText, reason: "No candidate found" };
    }

    const before = (target.el.innerText || target.el.textContent || target.el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 160);

    target.el.scrollIntoView({ block: "center", inline: "center" });
    target.el.click();

    return {
      clicked: true,
      wanted: wantedText,
      index: target.index,
      score: target.score,
      text: before,
      tag: target.el.tagName,
      className: (target.el.getAttribute("class") || "").slice(0, 160),
    };
  }, wanted);
}

export default async function handler(request, response) {
  let browser;

  try {
    const rendered = await renderPage();
    browser = rendered.browser;
    const { page, network } = rendered;

    const initialState = await getPageState(page, "initial");
    const initialText = initialState.bodyTextPreview;

    const steps = [];

    for (const label of ["Kontor", "Logistikk", "Handel", "Lager", "Retail", "Office"]) {
      const click = await clickCandidate(page, label);
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const state = await getPageState(page, `after ${label}`);
      const text = await page.evaluate(() => document.body ? document.body.innerText : "");

      steps.push({
        label,
        click,
        yieldCandidates: extractYieldCandidates(text),
        snippets: {
          prime: snippetAround(text, "Prime"),
          yield: snippetAround(text, "yield"),
          kontor: snippetAround(text, "Kontor"),
          handel: snippetAround(text, "Handel"),
          logistikk: snippetAround(text, "Logistikk"),
          lager: snippetAround(text, "Lager"),
        },
        relevantElements: state.relevantElements,
        bodyTextPreview: state.bodyTextPreview,
      });
    }

    response.status(200).json({
      status: "ok",
      generatedAt: new Date().toISOString(),
      url: AKERSHUS_URL,
      initial: {
        title: initialState.title,
        url: initialState.url,
        textLength: initialState.textLength,
        yieldCandidates: extractYieldCandidates(initialText),
        snippets: {
          prime: snippetAround(initialText, "Prime"),
          yield: snippetAround(initialText, "yield"),
          kontor: snippetAround(initialText, "Kontor"),
          handel: snippetAround(initialText, "Handel"),
          logistikk: snippetAround(initialText, "Logistikk"),
          lager: snippetAround(initialText, "Lager"),
        },
        relevantElements: initialState.relevantElements,
        relevantScripts: initialState.relevantScripts,
        bodyTextPreview: initialState.bodyTextPreview,
      },
      steps,
      network: network.slice(0, 100),
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) await browser.close();
  }
}
