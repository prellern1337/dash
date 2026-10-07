import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('actual PostgreSQL setup: claim, completion, cooldown, recovery, permissions and idempotent writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table public.market_metrics (value numeric);
      grant all on public.market_metrics to service_role;`);
    const sql = readFileSync(new URL('../db/data-scheduler.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql); // repeatable activation
    const query = async (sql, params=[]) => (await db.query(sql,params)).rows;
    const tokenA='00000000-0000-0000-0000-000000000001';
    const tokenB='00000000-0000-0000-0000-000000000002';
    const slot='2020-01-01T15:05:00Z'; // fixed past slots, no wall-clock timing assertions
    const next='2020-01-02T15:05:00Z';
    await db.exec('set role service_role');
    const claim = async (s,t=tokenA) => (await query('select public.claim_data_update($1,$2,$3) as ok',['news',s,t]))[0].ok;
    const finish = async (t,ok) => (await query('select public.finish_data_update($1,$2,$3) as ok',['news',t,ok]))[0].ok;
    assert.equal(await claim(slot),true);
    assert.equal(await claim(slot,tokenB),false);
    assert.equal(await claim(next,tokenB),false); // lease spans different slots too
    assert.equal(await finish(tokenB,true),false);
    assert.equal(await finish(tokenA,false),true);
    assert.equal(await claim(slot),false); // cooldown after failure
    await db.exec("update public.data_update_state set retry_at=now()-interval '1 second'");
    assert.equal(await claim(slot,tokenB),true);
    assert.equal(await finish(tokenB,true),true);
    assert.equal(await claim(slot),false);
    assert.equal(await claim(next),true);
    await db.exec("update public.data_update_state set lease_until=now()-interval '1 second', retry_at=now()-interval '1 second'");
    assert.equal(await finish(tokenA,true),false); // expired worker cannot finish
    assert.equal(await claim(next,tokenB),true);
    assert.equal(await finish(tokenA,true),false); // stale token cannot finish recovered worker
    assert.equal(await finish(tokenB,true),true);
    await db.exec("insert into public.market_metrics(value,scheduler_key) values (1,'stable') on conflict (scheduler_key) do nothing; insert into public.market_metrics(value,scheduler_key) values (2,'stable') on conflict (scheduler_key) do nothing;");
    assert.equal((await query('select count(*)::int as n from public.market_metrics'))[0].n,1);
    await db.exec('reset role');
    const acl=await query(`select has_function_privilege('anon','public.claim_data_update(text,timestamptz,uuid)','execute') as claim,
      has_table_privilege('authenticated','public.data_update_state','select') as state,
      (select relrowsecurity from pg_class where oid='public.data_update_state'::regclass) as rls`);
    assert.deepEqual(acl[0],{claim:false,state:false,rls:true});
  } finally { await db.close(); }
});
