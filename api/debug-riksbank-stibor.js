const SERIES_ID = "SEDP3MSTIBORDELAYC";
const URL = `https://api.riksbank.se/swea/v1/Observations/Latest/${SERIES_ID}`;

export default async function handler(request, response) {
  try {
    const res = await fetch(URL, {
      headers: { Accept: "application/json", "User-Agent": "MarketDashboardPWA/1.0" },
    });
    const text = await res.text();
    response.status(200).json({
      status: "ok",
      httpStatus: res.status,
      contentType: res.headers.get("content-type"),
      url: URL,
      bodyPreview: text.slice(0, 3000),
    });
  } catch (error) {
    response.status(500).json({ status: "error", message: error instanceof Error ? error.message : String(error) });
  }
}
