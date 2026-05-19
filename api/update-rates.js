export default async function handler(request, response) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const origin = `${protocol}://${host}`;

  const endpoints = [
    { key: "nibor_3m", path: "/api/update-nibor" },
    { key: "stibor_3m", path: "/api/update-stibor" },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${origin}${endpoint.path}`, {
        headers: { "User-Agent": "MarketDashboardCron/1.0" },
      });

      const payload = await res.json().catch(() => ({
        status: "error",
        message: "Kunne ikke parse JSON-respons.",
      }));

      results.push({
        key: endpoint.key,
        path: endpoint.path,
        httpStatus: res.status,
        ...payload,
      });
    } catch (error) {
      results.push({
        key: endpoint.key,
        path: endpoint.path,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const hasError = results.some((result) => result.status === "error");

  response.status(hasError ? 207 : 200).json({
    status: hasError ? "partial" : "ok",
    generatedAt: new Date().toISOString(),
    results,
  });
}
