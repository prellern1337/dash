export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "akershus-debug",
    debugEndpoint: "/api/debug-akershus-yields",
    generatedAt: new Date().toISOString()
  })
}
