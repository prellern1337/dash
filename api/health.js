export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "yields-newsec-akershus",
    yields: "UNION + Newsec + Akershus via /api/update-yields and Supabase",
    generatedAt: new Date().toISOString()
  })
}
