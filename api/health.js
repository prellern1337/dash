export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "yield-warning-ui-fix",
    yields: "Removed outdated Newsec/Akershus not-connected frontend warning.",
    generatedAt: new Date().toISOString()
  })
}
