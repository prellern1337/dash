export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "no-store-metrics-fix",
    note: "NIBOR/STIBOR read endpoints and frontend fetches bypass cache.",
    generatedAt: new Date().toISOString()
  })
}
