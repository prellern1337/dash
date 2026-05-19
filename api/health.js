export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "sb1-markets-nibor-cron",
    cron: "/api/update-nibor daily at 08:30 UTC",
    generatedAt: new Date().toISOString()
  })
}
