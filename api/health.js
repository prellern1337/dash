export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "akershus-yield-fix",
    yields: "Akershus segment-dive extraction fixed for office/logistics/retail high street.",
    generatedAt: new Date().toISOString()
  })
}
