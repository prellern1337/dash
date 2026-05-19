export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "stibor-supabase-cron",
    cron: "/api/update-rates daily at 08:30 UTC",
    generatedAt: new Date().toISOString()
  })
}
