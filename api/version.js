export default async function handler(request, response) {
  response.status(200).json({
    package: "sb1-markets-nibor-ui-fix",
    niborSource: "SpareBank 1 Markets Morgenrapport",
    generatedAt: new Date().toISOString()
  })
}
