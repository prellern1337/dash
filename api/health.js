export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "clean-full-zip",
    generatedAt: new Date().toISOString()
  })
}
