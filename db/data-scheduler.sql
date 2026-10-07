-- Apply once to the dashboard database before enabling DATA_SCHEDULER_ENABLED.
-- Existing rows remain untouched; NULL scheduler keys remain unrestricted.
begin;
alter table public.market_metrics add column if not exists scheduler_key text;
create unique index if not exists market_metrics_scheduler_key_uidx on public.market_metrics(scheduler_key);
create table if not exists public.data_update_state (
  dataset text primary key check (dataset in ('news', 'swaps', 'indices', 'watchlist')),
  success_slot timestamptz,
  last_success_at timestamptz,
  attempt_slot timestamptz,
  retry_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  last_attempt_status text check (last_attempt_status in ('running', 'ok', 'error'))
);
alter table public.data_update_state enable row level security;
revoke all on public.data_update_state from public, anon, authenticated;
grant select, insert, update on public.data_update_state to service_role;

create or replace function public.claim_data_update(p_dataset text, p_slot timestamptz, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare claimed text;
begin
  if p_slot > now() or p_token is null then raise exception 'Invalid claim'; end if;
  insert into public.data_update_state as s (dataset, attempt_slot, lease_token, lease_until, retry_at, last_attempt_status)
  values (p_dataset, p_slot, p_token, now() + interval '3 minutes', now() + interval '5 minutes', 'running')
  on conflict (dataset) do update set
    attempt_slot = p_slot, lease_token = p_token, lease_until = now() + interval '3 minutes',
    retry_at = now() + interval '5 minutes', last_attempt_status = 'running'
  where (s.success_slot is null or s.success_slot < p_slot)
    and (s.lease_until is null or s.lease_until <= now())
    and (s.retry_at is null or s.retry_at <= now() or s.attempt_slot < p_slot)
  returning dataset into claimed;
  return claimed is not null;
end;
$$;
create or replace function public.finish_data_update(p_dataset text, p_token uuid, p_ok boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare finished text;
begin
  update public.data_update_state set
    success_slot = case when p_ok then attempt_slot else success_slot end,
    last_success_at = case when p_ok then now() else last_success_at end,
    last_attempt_status = case when p_ok then 'ok' else 'error' end,
    lease_until = null, lease_token = null
  where dataset = p_dataset and lease_token = p_token and lease_until > now()
  returning dataset into finished;
  return finished is not null;
end;
$$;
revoke all on function public.claim_data_update(text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.finish_data_update(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_data_update(text, timestamptz, uuid) to service_role;
grant execute on function public.finish_data_update(text, uuid, boolean) to service_role;
commit;
