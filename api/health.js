export default async function handler(request, response) {
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "serverless-limit-fix",
    note: "Debug endpoints removed; Supabase helper moved outside api folder.",
    generatedAt: new Date().toISOString()
  })
}
