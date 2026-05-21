export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({
    status: "ok",
    app: "market-dashboard",
    package: "seb-swaps-supabase-github-actions",
    swaps: "SEB -> /api/update-swaps -> Supabase; /api/swaps reads Supabase",
    generatedAt: new Date().toISOString()
  })
}
