export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "stibor-tradingeconomics",
    stiborSource: "Trading Economics Sweden Interbank Rate",
    generatedAt: new Date().toISOString()
  })
}
