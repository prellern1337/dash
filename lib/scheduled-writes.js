import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
const context = new AsyncLocalStorage();
export function withScheduledSlot(dataset, slot, work) {
  return context.run({ dataset, slot }, work);
}
export function scheduledRows(rows) {
  const run = context.getStore();
  if (!run) return rows;
  return rows.map(row => ({ ...row, scheduler_key: createHash('sha256')
    .update(JSON.stringify([run.dataset, run.slot, row.metric_key, row.observed_date,
      run.dataset === 'news' ? row.raw?.url || row.source_url : null, row.status]))
    .digest('hex') }));
}
export function metricInsert(client, rows) {
  if (!context.getStore()) return client.from('market_metrics').insert(rows);
  return client.from('market_metrics').upsert(scheduledRows(rows), {
    onConflict: 'scheduler_key', ignoreDuplicates: true,
  });
}
