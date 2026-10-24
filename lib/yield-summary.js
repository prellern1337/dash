// Age is measured from the end of the source period, never the fetch time.
export const YIELD_AGE_WARNING_DAYS = 180;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function describeYieldPeriod(period, now = new Date()) {
  const label = typeof period === 'string' ? period.trim() : '';
  const quarter = label.match(/^Q([1-4]) (20\d{2})$/);
  const month = label.match(/^(\S+) (20\d{2})$/);
  let end = null;
  let start = null;
  if (quarter) {
    start = Date.UTC(Number(quarter[2]), (Number(quarter[1]) - 1) * 3, 1);
    end = Date.UTC(Number(quarter[2]), Number(quarter[1]) * 3, 1) - 1;
  } else if (month && MONTHS.includes(month[1])) {
    start = Date.UTC(Number(month[2]), MONTHS.indexOf(month[1]), 1);
    end = Date.UTC(Number(month[2]), MONTHS.indexOf(month[1]) + 1, 1) - 1;
  }
  const status = !label ? 'missing' : end === null ? 'unknown' : start > now.getTime() ? 'future' : now.getTime() - end > YIELD_AGE_WARNING_DAYS * 86400000 ? 'old' : 'dated';
  const warning = { missing: 'Periode ikke oppgitt', unknown: 'Ukjent periodeformat', future: 'Fremtidig periode', old: 'Eldre enn 180 dager' }[status] || null;
  return { label: label || 'Periode ikke oppgitt', status, warning };
}

export function summariseYieldSources(sources = {}, now = new Date()) {
  const included = Object.values(sources).filter((item) => item.value !== null && item.value !== undefined && item.value !== '' && Number.isFinite(Number(item.value)));
  const observations = included.map((item) => ({ source: item.source, ...describeYieldPeriod(item.period, now) }));
  const mixed = new Set(observations.map((item) => item.label)).size > 1;
  const uncertain = observations.some((item) => item.status !== 'dated');
  return {
    count: included.length,
    observations,
    mixed,
    warning: !included.length ? 'Ingen observasjoner' : mixed ? 'Ulike kildeperioder – ikke et samtidig markedsnivå.' : uncertain ? 'Eldre eller usikker periode – ikke et bekreftet aktuelt markedsnivå.' : 'Enkelt, uvektet kildesnitt.',
    periods: observations.map((item) => `${item.source}: ${item.label}${item.warning && item.status !== 'missing' ? ` (${item.warning})` : ''}`).join(' · '),
  };
}
