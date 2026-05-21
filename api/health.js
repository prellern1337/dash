export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "update-rates-direct-ui-fix",
    stiborSource: "Trading Economics Sweden Interbank Rate",
    stiborDisplay: "2 decimals",
    updateRates: "direct handler invocation, no internal HTTP",
    generatedAt: new Date().toISOString()
  })
}
