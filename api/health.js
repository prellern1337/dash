export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "warning-only-errors-fix",
    note: "Top warning is hidden when all sources are OK; it only appears for actual issues.",
    generatedAt: new Date().toISOString()
  })
}
