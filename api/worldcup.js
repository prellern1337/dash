export const config = { maxDuration: 30 };

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";
const STANDINGS_URL = "https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026";

function statValue(stats = [], name, fallback = 0) {
  const stat = stats.find((item) => item.name === name || item.type === name);
  return stat?.displayValue ?? stat?.value ?? fallback;
}

function teamFromCompetitor(competitor) {
  const team = competitor?.team || {};
  return {
    id: team.id || competitor?.id,
    name: team.displayName || team.shortDisplayName || team.name || "Ukjent",
    shortName: team.shortDisplayName || team.name || team.displayName || "Ukjent",
    abbreviation: team.abbreviation || "—",
    logo: team.logo || team.logos?.[0]?.href || null,
    score: competitor?.score ?? null,
    winner: Boolean(competitor?.winner),
  };
}

function phaseLabel(event) {
  const note = event?.competitions?.[0]?.altGameNote || "";
  const group = note.match(/Group\s+([A-L])/i);
  if (group) return `Gruppe ${group[1].toUpperCase()}`;

  const seasonName = event?.leagues?.[0]?.season?.type?.name || event?.season?.slug || "";
  const clean = String(seasonName).toLowerCase();
  if (clean.includes("round of 32")) return "16.delsfinale";
  if (clean.includes("round of 16")) return "Åttedelsfinale";
  if (clean.includes("quarter")) return "Kvartfinale";
  if (clean.includes("semi")) return "Semifinale";
  if (clean.includes("third")) return "Bronsefinale";
  if (clean.includes("final")) return "Finale";
  return note.replace(/^FIFA World Cup,\s*/i, "") || "VM-kamp";
}

function channelForMatch(event, teams) {
  const names = teams.map((team) => team.name.toLowerCase());
  const phase = phaseLabel(event).toLowerCase();

  if (phase.includes("semi")) return { name: "TV 2", confidence: "known" };
  if (phase === "finale") return { name: "NRK", confidence: "known" };
  if (names.includes("norway") && names.includes("france")) return { name: "NRK", confidence: "known" };
  if (names.includes("norway") && names.includes("senegal")) return { name: "NRK", confidence: "known" };

  return { name: "NRK/TV 2", confidence: "pending" };
}

function normalizeEvent(event) {
  const competition = event?.competitions?.[0] || {};
  const status = competition.status?.type || {};
  const teams = (competition.competitors || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(teamFromCompetitor);

  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName,
    date: event.date || competition.date,
    phase: phaseLabel(event),
    status: status.state || "pre",
    completed: Boolean(status.completed),
    detail: status.shortDetail || status.detail || status.description || "",
    venue: competition.venue?.fullName || null,
    teams,
    channel: channelForMatch(event, teams),
    result: teams.every((team) => team.score !== null) ? `${teams[0]?.score ?? "—"}–${teams[1]?.score ?? "—"}` : null,
  };
}

function normalizeStandings(group) {
  return {
    id: group.id,
    name: String(group.name || group.abbreviation || "Group").replace("Group", "Gruppe"),
    teams: (group.standings?.entries || []).map((entry, index) => ({
      rank: index + 1,
      name: entry.team?.displayName || entry.team?.shortDisplayName || "Ukjent",
      abbreviation: entry.team?.abbreviation || "—",
      logo: entry.team?.logos?.[0]?.href || null,
      note: entry.note?.description || null,
      played: statValue(entry.stats, "gamesPlayed"),
      wins: statValue(entry.stats, "wins"),
      draws: statValue(entry.stats, "ties"),
      losses: statValue(entry.stats, "losses"),
      goalDifference: statValue(entry.stats, "pointDifferential"),
      goalsFor: statValue(entry.stats, "pointsFor"),
      goalsAgainst: statValue(entry.stats, "pointsAgainst"),
      points: statValue(entry.stats, "points"),
    })),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "nb-NO,nb;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDashboardPWA/1.0)",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) throw new Error(`${url} svarte med ${response.status}.`);
  return response.json();
}

export default async function handler(request, response) {
  const fetchedAt = new Date().toISOString();

  try {
    const [scoreboard, standings] = await Promise.all([
      fetchJson(SCOREBOARD_URL),
      fetchJson(STANDINGS_URL),
    ]);

    const now = new Date();
    const events = (scoreboard.events || []).map(normalizeEvent).sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcoming = events.filter((event) => !event.completed && new Date(event.date) >= now).slice(0, 6);
    const recent = events.filter((event) => event.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    const groups = (standings.children || []).map(normalizeStandings);

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    response.status(200).json({
      status: "ok",
      sourceName: "ESPN / VG",
      sourceUrl: "https://www.espn.com/soccer/fixtures/_/league/fifa.world",
      tvSourceUrl: "https://www.vg.no/sport/i/wrn611/fotball-vm-2026-program",
      fetchedAt,
      upcoming,
      recent,
      groups,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.status(500).json({
      status: "error",
      sourceName: "ESPN / VG",
      fetchedAt,
      message: error instanceof Error ? error.message : "Ukjent feil ved henting av VM-data.",
      upcoming: [],
      recent: [],
      groups: [],
    });
  }
}
