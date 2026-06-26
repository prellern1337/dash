export const config = { maxDuration: 30 };

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";
const STANDINGS_URL = "https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026";
const VG_SCHEDULE_URL = "https://vglive.vg.no/bff/vg/schedule";
const VG_TV_CHANNELS_URL = "https://vglive.vg.no/bff/vg/events/tv-channels";
const TEAM_ABBREVIATION_ALIASES = {
  HAI: "HTI",
};

function statValue(stats = [], name, fallback = 0) {
  const stat = stats.find((item) => item.name === name || item.type === name);
  return stat?.displayValue ?? stat?.value ?? fallback;
}

function statNumber(stats = [], name, fallback = 0) {
  const stat = stats.find((item) => item.name === name || item.type === name);
  const raw = stat?.value ?? stat?.displayValue ?? fallback;
  const number = Number(String(raw).replace("+", "").replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeToken(value) {
  const token = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  return TEAM_ABBREVIATION_ALIASES[token] || token;
}

function matchMinute(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function osloDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
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
  if (Number.isNaN(date.getTime())) return 12;
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour);
}

function vgScheduleDateKeys(value) {
  const dateKey = osloDateKey(value);
  if (!dateKey) return [];
  if (osloHour(value) >= 6) return [dateKey];
  return [dateKey, osloDateKey(new Date(value).getTime() - 12 * 60 * 60 * 1000)].filter(Boolean);
}

function matchKey(date, abbreviations = []) {
  return `${matchMinute(date)}|${abbreviations.map(normalizeToken).sort().join("-")}`;
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

  const seasonName = `${event?.leagues?.[0]?.season?.type?.name || ""} ${event?.season?.slug || ""} ${note}`;
  const clean = String(seasonName).toLowerCase();
  if (clean.includes("round of 32") || clean.includes("round-of-32")) return "16.delsfinale";
  if (clean.includes("round of 16")) return "Åttedelsfinale";
  if (clean.includes("quarter")) return "Kvartfinale";
  if (clean.includes("semi")) return "Semifinale";
  if (clean.includes("third")) return "Bronsefinale";
  if (clean.includes("final")) return "Finale";
  return note.replace(/^FIFA World Cup,\s*/i, "") || "VM-kamp";
}

function displayChannelName(name) {
  if (/tv\s*2/i.test(name)) return "TV 2";
  if (/nrk/i.test(name)) return "NRK";
  return name || "NRK/TV 2";
}

function fallbackChannelForMatch(event, teams) {
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
    statusName: status.name || "",
    completed: Boolean(status.completed),
    live: status.state === "in" && !status.completed,
    detail: status.shortDetail || status.detail || status.description || "",
    venue: competition.venue?.fullName || null,
    teams,
    channel: fallbackChannelForMatch(event, teams),
    result: teams.every((team) => team.score !== null) ? `${teams[0]?.score ?? "—"}–${teams[1]?.score ?? "—"}` : null,
  };
}

async function fetchVgScheduleDate(dateKey) {
  const url = `${VG_SCHEDULE_URL}?date=${encodeURIComponent(`${dateKey}T12:00:00+02:00`)}&sport=football`;
  return fetchJson(url);
}

async function fetchVgTvChannels(eventIds) {
  const ids = [...new Set(eventIds)].filter(Boolean);
  if (!ids.length) return {};

  const params = new URLSearchParams(ids.map((id) => ["eventIds", String(id)]));
  const payload = await fetchJson(`${VG_TV_CHANNELS_URL}?${params.toString()}`);
  return payload.tvChannels || {};
}

async function buildVgChannelMap(events, now = new Date()) {
  const nextEvents = events
    .filter((event) => !event.completed && new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 20);
  const dateKeys = [...new Set(nextEvents.flatMap((event) => vgScheduleDateKeys(event.date)).filter(Boolean))];
  if (!dateKeys.length) return new Map();

  const schedules = await Promise.allSettled(dateKeys.map(fetchVgScheduleDate));
  const candidates = [];

  for (const result of schedules) {
    if (result.status !== "fulfilled") continue;
    const payload = result.value || {};
    const eventsById = payload.events || {};
    const participants = payload.participants || {};

    for (const event of Object.values(eventsById)) {
      const tournamentName = event?.tournament?.stageName || "";
      if (!/World Cup 2026/i.test(tournamentName)) continue;
      const teams = (event.participantIds || []).map((id) => participants[id]).filter(Boolean);
      candidates.push({
        id: event.id,
        key: matchKey(event.startDate, teams.map((team) => team.shortName || team.countryCode || team.name)),
        hasTv: Number(event.coverageInfo?.assets?.tvChannelsCount || 0) > 0,
      });
    }
  }

  const tvByEventId = await fetchVgTvChannels(candidates.filter((event) => event.hasTv).map((event) => event.id));
  const channelByMatch = new Map();

  for (const event of candidates) {
    const channel = tvByEventId[event.id]?.[0]?.name;
    if (channel) {
      channelByMatch.set(event.key, { name: displayChannelName(channel), confidence: "vg-live", rawName: channel });
    }
  }

  return channelByMatch;
}

async function enrichEventsWithVgChannels(events, now = new Date()) {
  try {
    const channelByMatch = await buildVgChannelMap(events, now);
    if (!channelByMatch.size) return events;

    return events.map((event) => {
      const key = matchKey(event.date, (event.teams || []).map((team) => team.abbreviation));
      const channel = channelByMatch.get(key);
      return channel ? { ...event, channel } : event;
    });
  } catch {
    return events;
  }
}

function phaseOrder(phase) {
  const order = {
    "16.delsfinale": 1,
    "Ã…ttedelsfinale": 2,
    Kvartfinale: 3,
    Semifinale: 4,
    Bronsefinale: 5,
    Finale: 6,
  };

  return order[phase] || 99;
}

function buildKnockoutRounds(events, now = new Date()) {
  const rounds = new Map();

  for (const event of events) {
    if (!event.phase || event.phase.startsWith("Gruppe")) continue;
    if (!rounds.has(event.phase)) rounds.set(event.phase, []);
    rounds.get(event.phase).push(event);
  }

  return Array.from(rounds.entries())
    .map(([phase, matches]) => ({
      phase,
      matches: matches.sort((a, b) => new Date(a.date) - new Date(b.date)),
    }))
    .filter((round) => {
      const firstMatchAt = new Date(round.matches[0]?.date || "");
      return !Number.isNaN(firstMatchAt.getTime()) && firstMatchAt <= now;
    })
    .sort((a, b) => phaseOrder(a.phase) - phaseOrder(b.phase));
}

function normalizeStandings(group) {
  return {
    id: group.id,
    name: String(group.name || group.abbreviation || "Group").replace("Group", "Gruppe"),
    teams: (group.standings?.entries || [])
      .slice()
      .sort((a, b) => (
        statNumber(b.stats, "points") - statNumber(a.stats, "points") ||
        statNumber(b.stats, "pointDifferential") - statNumber(a.stats, "pointDifferential") ||
        statNumber(b.stats, "pointsFor") - statNumber(a.stats, "pointsFor") ||
        String(a.team?.displayName || "").localeCompare(String(b.team?.displayName || ""), "nb")
      ))
      .map((entry, index) => ({
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
    const rawEvents = (scoreboard.events || []).map(normalizeEvent).sort((a, b) => new Date(a.date) - new Date(b.date));
    const events = await enrichEventsWithVgChannels(rawEvents, now);
    const upcoming = events.filter((event) => !event.completed && (event.live || new Date(event.date) >= now)).slice(0, 6);
    const recent = events.filter((event) => event.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    const groups = (standings.children || []).map(normalizeStandings);
    const knockoutRounds = buildKnockoutRounds(events, now);

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
      knockoutRounds,
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
      knockoutRounds: [],
    });
  }
}
