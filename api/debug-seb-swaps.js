export const config = {
  maxDuration: 60,
};

const SEB_SWAP_URL =
  "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates";

async function renderSebSwapPage() {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1366,
      height: 1400,
    },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.goto(SEB_SWAP_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    return await page.evaluate(() => ({
      title: document.title,
      location: window.location.href,
      text: document.body ? document.body.innerText.slice(0, 6000) : "",
      rows: Array.from(document.querySelectorAll("table tr"))
        .map((row) =>
          Array.from(row.querySelectorAll("th,td"))
            .map((cell) => (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
        )
        .filter((cells) => cells.length)
        .slice(0, 120),
    }));
  } finally {
    await browser.close();
  }
}

export default async function handler(request, response) {
  try {
    const rendered = await renderSebSwapPage();
    response.status(200).json({
      status: "ok",
      generatedAt: new Date().toISOString(),
      rendered,
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
