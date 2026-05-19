export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "seb-swaps-live",
    generatedAt: new Date().toISOString()
  })
}
