export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "insider-trades-tile",
    insiderTrades: "NewsWeb category 1102 via /api/insider-trades",
    generatedAt: new Date().toISOString()
  })
}
