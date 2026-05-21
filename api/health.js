export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "yields-parser-average-fix",
    yields: "Improved Newsec/Akershus parsers and fixed average null handling.",
    generatedAt: new Date().toISOString()
  })
}
