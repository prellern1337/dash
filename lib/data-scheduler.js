import { randomUUID, timingSafeEqual } from 'node:crypto';
import { latestSlot, freshness, DATASETS } from './data-schedule.js';
import { withScheduledSlot } from './scheduled-writes.js';

export function authorized(header, secret) {
  if (!secret || typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createStore(client) {
  return {
    async state(dataset) {
      const { data, error } = await client.from('data_update_state').select('*').eq('dataset', dataset).maybeSingle();
      if (error) throw error;
      return data;
    },
    async claim(dataset, slot, token) {
      const { data, error } = await client.rpc('claim_data_update', { p_dataset: dataset, p_slot: slot, p_token: token });
      if (error) throw error;
      return data === true;
    },
    async finish(dataset, token, ok) {
      const { data, error } = await client.rpc('finish_data_update', { p_dataset: dataset, p_token: token, p_ok: ok });
      if (error) throw error;
      if (data !== true) throw new Error('Scheduler lease lost');
    },
  };
}

// One dataset per invocation; never replay all old intraday slots against today's feed.
export async function runDataset(dataset, { store, update, clock = () => new Date(), token = randomUUID() }) {
  if (!DATASETS[dataset]) throw new Error('Unknown dataset');
  const slot = latestSlot(dataset, clock());
  const claimed = await store.claim(dataset, slot, token);
  let status = 'skipped';
  if (claimed) {
    let ok = false;
    try {
      const result = await withScheduledSlot(dataset, slot, update);
      ok = result?.status === 'ok'; // partial/error/empty are not complete successful refreshes
      status = ok ? 'updated' : 'failed';
    } finally {
      await store.finish(dataset, token, ok);
    }
  }
  return { ...freshness(dataset, await store.state(dataset), clock()), runStatus: status };
}
