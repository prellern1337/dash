import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYieldView } from './yield-view.js';
import { describeYieldPeriod } from './yield-summary.js';

const now = new Date('2026-10-24T12:00:00Z');
const row = (source, segment, value, period) => ({ metric_key: `yield_${source}_${segment}`, value, raw: { period }, status: 'ok', fetched_at: '2026-10-21T12:00:00Z' });
const fixture = () => [
  row('union', 'office', 4.75, 'mai 2026'), row('union', 'retail', 5, 'mai 2026'), row('union', 'logistics', 5.25, 'mars 2026'),
  row('newsec', 'office', 4.5, 'Q3 2026'), row('newsec', 'retail', 5.25, 'Q3 2026'), row('newsec', 'logistics', 5.25, 'Q3 2026'),
  row('akershus', 'office', 4.5, 'oktober 2026'), row('akershus', 'retail', 4.75, 'oktober 2026'), row('akershus', 'logistics', 5.5, 'oktober 2026'),
];

test('UNION preserves individual segment dates and does not invent a shared period', () => {
  const view = buildYieldView(fixture(), now);
  const union = view.rows[0];
  assert.equal(union.period, null);
  assert.equal(union.office.period, 'mai 2026');
  assert.equal(union.retail.period, 'mai 2026');
  assert.equal(union.logistics.period, 'mars 2026');
  assert.equal(union.logistics.periodInfo.status, 'old');
  assert.equal(union.office.periodInfo.status, 'dated');
  for (const input of fixture()) {
    const [, source, segment] = input.metric_key.split('_');
    assert.equal(view.data[segment].sources[source].value, input.value);
  }
});

test('Newsec Q3 and Akershus October remain distinct in the average basis', () => {
  const view = buildYieldView(fixture().filter(r => !r.metric_key.includes('union')), now);
  for (const segment of Object.values(view.data)) {
    assert.equal(segment.averageInfo.mixed, true);
    assert.equal(segment.averageInfo.count, 2);
    assert.match(segment.averageInfo.warning, /ikke et samtidig markedsnivå/);
    assert.match(segment.averageInfo.periods, /Newsec: Q3 2026/);
    assert.match(segment.averageInfo.periods, /Akershus: oktober 2026/);
  }
  assert.equal(view.data.office.average, 4.5);
  assert.equal(view.data.retail.average, 5);
  assert.equal(view.data.logistics.average, 5.375);
});

test('missing period preserves value but explicitly warns about uncertainty', () => {
  const view = buildYieldView([row('union', 'office', 4.75, null)], now);
  assert.equal(view.data.office.average, 4.75);
  assert.equal(view.data.office.sources.union.periodInfo.status, 'missing');
  assert.match(view.data.office.averageInfo.periods, /UNION: Periode ikke oppgitt/);
  assert.match(view.data.office.averageInfo.warning, /usikker periode/);
});

test('unknown and future periods are not treated as current', () => {
  assert.equal(describeYieldPeriod('ukjent', now).status, 'unknown');
  assert.equal(describeYieldPeriod('januar 2027', now).status, 'future');
  assert.equal(describeYieldPeriod('mai', now).status, 'unknown');
});

test('180-day warning uses period end, with explicit boundary', () => {
  const end = Date.UTC(2026, 3, 1) - 1;
  assert.equal(describeYieldPeriod('mars 2026', new Date(end + 180 * 86400000)).status, 'dated');
  assert.equal(describeYieldPeriod('mars 2026', new Date(end + 180 * 86400000 + 1)).status, 'old');
  assert.equal(describeYieldPeriod('Q3 2026', now).status, 'dated');
});

test('Newsec document period fallback remains supported', () => {
  const input = row('newsec', 'office', 4.5, null);
  input.source_document = 'Newsec Quality Board Q3 2026';
  assert.equal(buildYieldView([input], now).data.office.sources.newsec.period, 'Q3 2026');
});

test('no observations and invalid numeric values do not become zero yields', () => {
  for (const rows of [[], [row('union', 'office', null, null)], [row('union', 'office', 'bad', null)]]) {
    const view = buildYieldView(rows, now);
    assert.equal(view.status, 'empty');
    assert.equal(view.data.office.average, null);
    assert.equal(view.data.office.averageInfo.count, 0);
  }
});

test('failed newer fetch remains excluded from values and average basis', () => {
  const error = { ...row('union', 'office', null, null), status: 'error', message: 'failure', fetched_at: '2026-10-22T12:00:00Z' };
  const view = buildYieldView([error, ...fixture()], now);
  assert.equal(view.status, 'partial');
  assert.equal(view.data.office.sources.union.value, null);
  assert.equal(view.data.office.averageInfo.count, 2);
  assert.doesNotMatch(view.data.office.averageInfo.periods, /UNION/);
});
