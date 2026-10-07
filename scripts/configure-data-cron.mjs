import { readFileSync, writeFileSync } from 'node:fs';
// Explicit activation only after plan/secret/schema checks in SCHEDULER.md.
if (!process.argv.includes('--confirmed-pro')) {
  throw new Error('Verify Vercel Pro/Enterprise first; see SCHEDULER.md');
}
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
config.crons = config.crons.filter(cron => !cron.path.startsWith('/api/data-update') && cron.path !== '/api/swap-refresh');
for (const dataset of ['news', 'swaps', 'indices', 'watchlist']) {
  config.crons.push({ path: `/api/data-update?dataset=${dataset}`, schedule: '*/5 * * * *' });
}
writeFileSync('vercel.json', `${JSON.stringify(config, null, 2)}\n`);
