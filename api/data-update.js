import { getSupabaseAdmin } from '../lib/supabase.js';
import { authorized, createStore, runDataset } from '../lib/data-scheduler.js';
import { DATASETS, freshness } from '../lib/data-schedule.js';
export const config = { maxDuration: 60 };

const loaders = {
  news: () => import('./news.js'),
  swaps: () => import('./swaps.js'),
  indices: () => import('./indices.js'),
  watchlist: () => import('./watchlist.js'),
};

// Invoke existing update code directly: no HTTP loopback, protection bypass, or duplicate scraping implementation.
export async function invokeUpdate(handler) {
  let payload;
  let code = 200;
  const response = {
    setHeader() {},
    status(value) { code = value; return this; },
    json(value) { payload = value; return this; },
  };
  await handler({ url: '/?action=update', query: { action: 'update' } }, response);
  if (code >= 400) throw new Error('Dataset update failed');
  return payload;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!authorized(request.headers?.authorization, process.env.CRON_SECRET)) {
    return response.status(401).json({ status: 'unauthorized' });
  }
  const url = new URL(request.url, 'https://local');
  const dataset = request.query?.dataset || url.searchParams.get('dataset');
  if (!DATASETS[dataset]) return response.status(400).json({ status: 'unknown_dataset' });
  try {
    const store = createStore(getSupabaseAdmin());
    if ((request.query?.action || url.searchParams.get('action')) === 'health') {
      const result = freshness(dataset, await store.state(dataset));
      return response.status(result.status === 'stale' ? 503 : 200).json(result);
    }
    const result = await runDataset(dataset, {
      store,
      update: async () => invokeUpdate((await loaders[dataset]()).default),
    });
    return response.status(result.runStatus === 'failed' || result.status === 'stale' ? 503 : 200).json(result);
  } catch {
    // Do not leak credentials or source payloads into scheduler logs.
    return response.status(503).json({ status: 'error', dataset });
  }
}
