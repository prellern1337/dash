import test from 'node:test';
import assert from 'node:assert/strict';
import { latestSlot, freshness } from './data-schedule.js';
import { runDataset, authorized } from './data-scheduler.js';
import { withScheduledSlot, scheduledRows } from './scheduled-writes.js';

const at = value => new Date(value);
test('late starts, midnight and Monday catch up latest due weekday slot', () => {
  for (const [dataset, now, expected] of [
    ['news','2026-10-06T20:11:00Z','2026-10-06T15:05:00.000Z'],
    ['swaps','2026-10-06T18:51:00Z','2026-10-06T15:00:00.000Z'],
    ['indices','2026-10-07T01:42:00Z','2026-10-06T22:30:00.000Z'],
    ['watchlist','2026-10-07T01:34:00Z','2026-10-06T22:20:00.000Z'],
    ['news','2026-10-12T06:00:00Z','2026-10-09T15:05:00.000Z'],
    ['news','2026-10-26T07:05:00Z','2026-10-26T07:05:00.000Z'],
  ]) assert.equal(latestSlot(dataset, at(now)), expected);
});
test('freshness grace boundary, next slot, weekend, future/invalid success', () => {
  assert.equal(freshness('news',null,at('2026-10-06T15:25:00Z')).status,'pending');
  assert.equal(freshness('news',null,at('2026-10-06T15:25:00.001Z')).status,'stale');
  const state = {success_slot:'2026-10-09T15:05:00Z'};
  assert.equal(freshness('news',state,at('2026-10-11T19:00:00Z')).status,'fresh');
  assert.equal(freshness('news',state,at('2026-10-12T07:26:00Z')).status,'stale');
  assert.equal(freshness('news',{success_slot:'2027-01-01'},at('2026-10-06T18:00:00Z')).status,'stale');
});
function memoryStore() {
  let state = null, locked = false;
  return {
    state: async () => state,
    claim: async (_, slot) => {
      if (locked || state?.success_slot >= slot) return false;
      locked = true; state = {...state, attempt_slot:slot}; return true;
    },
    finish: async (_, token, ok) => {
      if(ok) state = {...state,success_slot:state.attempt_slot};
      locked = false;
    },
  };
}
test('concurrent primary/fallback and repeats run once, latest slot only', async () => {
  const store = memoryStore(); let calls = 0;
  const options = {store,clock:()=>at('2026-10-06T20:11:00Z'),update:async()=>{calls++;return {status:'ok'};}};
  await Promise.all([runDataset('news',options),runDataset('news',options)]);
  assert.equal(calls,1);
  assert.equal((await runDataset('news',options)).runStatus,'skipped');
  assert.equal((await store.state()).success_slot,'2026-10-06T15:05:00.000Z');
});
test('partial and thrown failure do not advance success and can retry', async () => {
  for(const update of [async()=>({status:'partial'}),async()=>{throw new Error('source failed');}]) {
    const store=memoryStore();const options={store,clock:()=>at('2026-10-06T20:11:00Z'),update};
    await runDataset('news',options).catch(()=>{});
    assert.equal((await store.state()).success_slot,undefined);
    assert.equal((await runDataset('news',{...options,update:async()=>({status:'ok'})})).status,'fresh');
  }
});
test('authentication fails closed without secret or on malformed header', () => {
  assert.equal(authorized(undefined,undefined),false);
  assert.equal(authorized('Bearer undefined',undefined),false);
  assert.equal(authorized('Bearer wrong','secret'),false);
  assert.equal(authorized('Bearer secret','secret'),true);
});
test('retry write keys are stable, slots differ, async contexts do not leak', async () => {
  const rows=[{metric_key:'a',observed_date:'2026-10-06',status:'ok',source_url:'url'}];
  const key = slot => withScheduledSlot('indices',slot,async()=>{await Promise.resolve();return scheduledRows(rows)[0].scheduler_key;});
  const [a,b,c]=await Promise.all([key('slot-a'),key('slot-a'),key('slot-b')]);
  assert.equal(a,b);assert.notEqual(a,c);assert.equal(scheduledRows(rows),rows);
  const articles=[...rows.map(r=>({...r,raw:{url:'first'}})),...rows.map(r=>({...r,raw:{url:'second'}}))];
  const keys=withScheduledSlot('news','slot',()=>scheduledRows(articles));
  assert.notEqual(keys[0].scheduler_key,keys[1].scheduler_key);
});

test('activation configuration is explicit and preserves unrelated crons', async () => {
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const dir=mkdtempSync(join(tmpdir(),'dash-cron-'));
  const script=new URL('../scripts/configure-data-cron.mjs',import.meta.url).pathname;
  try {
    writeFileSync(join(dir,'vercel.json'),JSON.stringify({crons:[{path:'/api/swap-refresh',schedule:'45 8 * * 1-5'},{path:'/api/other',schedule:'0 8 * * *'}]}));
    assert.throws(()=>execFileSync(process.execPath,[script],{cwd:dir,stdio:'pipe'}));
    execFileSync(process.execPath,[script,'--confirmed-pro'],{cwd:dir});
    execFileSync(process.execPath,[script,'--confirmed-pro'],{cwd:dir}); // repeatable
    const crons=JSON.parse(readFileSync(join(dir,'vercel.json'))).crons;
    assert.equal(crons.length,5);
    assert.equal(crons[0].path,'/api/other');
    for(const dataset of ['news','swaps','indices','watchlist']) assert.ok(crons.some(c=>c.path===`/api/data-update?dataset=${dataset}`&&c.schedule==='*/5 * * * *'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
