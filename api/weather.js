export const config = { maxDuration: 10 };

const MET_LOCATIONFORECAST_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const DEFAULT_LOCATION = {
  name: "Oslo",
  lat: 59.9139,
  lon: 10.7522,
  altitude: 23,
};

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function osloDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function osloHour(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayLabel(dateKey, todayKey) {
  return dateKey === todayKey ? "I dag" : "I morgen";
}

function weatherIcon(symbolCode = "") {
  const code = String(symbolCode || "").toLowerCase();
  if (code.includes("clearsky")) return "☀️";
  if (code.includes("fair")) return "🌤️";
  if (code.includes("partlycloudy")) return "⛅";
  if (code.includes("cloudy")) return "☁️";
  if (code.includes("fog")) return "🌫️";
  if (code.includes("thunder")) return "⛈️";
  if (code.includes("sleet")) return "🌨️";
  if (code.includes("snow")) return "❄️";
  if (code.includes("rain")) return "🌧️";
  return "🌤️";
}

function weatherText(symbolCode = "") {
  const code = String(symbolCode || "").toLowerCase();
  if (code.includes("clearsky")) return "Klart";
  if (code.includes("fair")) return "Lettskyet";
  if (code.includes("partlycloudy")) return "Delvis skyet";
  if (code.includes("cloudy")) return "Skyet";
  if (code.includes("fog")) return "Tåke";
  if (code.includes("thunder")) return "Torden";
  if (code.includes("sleet")) return "Sludd";
  if (code.includes("snow")) return "Snø";
  if (code.includes("rain")) return "Regn";
  return "Vær";
}

function normalizePoint(point) {
  const details = point.data?.instant?.details || {};
  const summary = point.data?.next_1_hours?.summary || point.data?.next_6_hours?.summary || {};
  const symbolCode = summary.symbol_code || null;

  return {
    time: point.time,
    hour: osloHour(point.time),
    dateKey: osloDateKey(point.time),
    symbolCode,
    icon: weatherIcon(symbolCode),
    condition: weatherText(symbolCode),
    temperature: numberOrNull(details.air_temperature),
    windSpeed: numberOrNull(details.wind_speed),
    precipitation: numberOrNull(point.data?.next_1_hours?.details?.precipitation_amount),
  };
}

function nearestHour(points, targetHour) {
  if (!points.length) return null;
  return [...points].sort((a, b) => Math.abs(a.hour - targetHour) - Math.abs(b.hour - targetHour))[0] || null;
}

function summarizeDay(points, dateKey, label) {
  const hours = points
    .filter((point) => point.dateKey === dateKey && point.hour !== null)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const temperatures = hours.map((point) => point.temperature).filter((value) => Number.isFinite(value));
  const winds = hours.map((point) => point.windSpeed).filter((value) => Number.isFinite(value));

  return {
    date: dateKey,
    label,
    periods: {
      morning: nearestHour(hours, 9),
      afternoon: nearestHour(hours, 15),
      evening: nearestHour(hours, 21),
    },
    high: temperatures.length ? Math.round(Math.max(...temperatures)) : null,
    low: temperatures.length ? Math.round(Math.min(...temperatures)) : null,
    wind: winds.length ? Math.round(Math.max(...winds)) : null,
    hourly: hours,
  };
}

async function fetchWeather(location) {
  const url = new URL(MET_LOCATIONFORECAST_URL);
  url.searchParams.set("lat", location.lat.toFixed(4));
  url.searchParams.set("lon", location.lon.toFixed(4));
  url.searchParams.set("altitude", String(Math.round(location.altitude)));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MarketDashboard/1.0 github.com/prellern1337/dash",
    },
  });

  if (!response.ok) throw new Error(`MET svarte med ${response.status}.`);
  return response.json();
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();
  const location = DEFAULT_LOCATION;

  try {
    const payload = await fetchWeather(location);
    const points = (payload.properties?.timeseries || []).map(normalizePoint);
    const todayKey = osloDateKey(new Date());
    const tomorrowKey = osloDateKey(addDays(new Date(), 1));
    const days = [
      summarizeDay(points, todayKey, dayLabel(todayKey, todayKey)),
      summarizeDay(points, tomorrowKey, "I morgen"),
    ];

    response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
    response.status(200).json({
      status: "ok",
      sourceName: "MET Norway",
      sourceUrl: "https://api.met.no/weatherapi/locationforecast/2.0/documentation",
      fetchedAt,
      updatedAt: payload.properties?.meta?.updated_at || fetchedAt,
      location,
      days,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(500).json({
      status: "error",
      sourceName: "MET Norway",
      fetchedAt,
      location,
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av værdata.",
      days: [],
    });
  }
}
