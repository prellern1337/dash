# Data scheduling

## Status on 7 October 2026

Repository implementation is ready; the new primary scheduler is **not activated**.
Vercel read-only discovery found `dash` (`prj_RLozzxQlocIXOBSpRjdgZoIBtTm2`), team
`team_AOlderxQ4vW7iJc4LsqHgoGi`. Team/project responses omit billing plan.
Listing environment variable metadata returned HTTP 403. No authenticated Vercel
CLI is installed in this workspace. Thus neither Pro/Enterprise nor CRON_SECRET
can be verified. No alternative scheduler credentials were verified.
Supabase read-only inspection of `market-dashboard` (`schezvereahyesmnmkej`) confirmed
`market_metrics` exists and the scheduler column/state are not installed.
No production schema, secrets or schedules were changed.

## Contract

All times are UTC, deliberately matching the old workflows (not Oslo DST).

| Dataset | Due times on weekdays | Freshness grace after newest due slot |
| --- | --- | --- |
| news | 07:05, 10:05, 13:05, 15:05 | 20 min |
| swaps | 07:30, 10:30, 13:00, 15:00 | 20 min |
| indices | 22:30 | 30 min |
| watchlist | 22:20 | 30 min |

`/api/data-update?dataset=NAME` catches up only the latest due weekday slot,
including yesterday after midnight and Friday over the weekend. It does not
replay four historic feed requests or invent past intraday observations.
A three-minute database lease is longer than the endpoint's 60-second maximum.
There is at most one worker per dataset, including across slots. Successful slots
are skipped; errors/partial payloads do not advance success. Retry backoff is
five minutes, and abandoned workers become retryable after both lease and backoff
expire. Token checks reject completion from old workers. Slot-keyed metric
upserts prevent duplicate writes after a crash between data insert and completion.
News with no newly saved articles can still be a successful source refresh.

Freshness means a **complete successful source refresh for the newest due slot**,
not the age of the provider's underlying quote/article. An unchanged/old source
observation must still be interpreted using its observed_date. Holidays have the
same weekday refresh contract; no exchange holiday calendar is asserted.
`action=health` is read-only and returns 503 for stale, 200 for fresh/pending.
Failed updates return 503 even inside grace. Unknown database/secret configuration
fails closed, with no credential/source payload in the response.

## Exact activation steps

1. Confirm the dashboard's production SUPABASE_URL points to the intended database.
   Apply `db/data-scheduler.sql` using the database's approved SQL console. It is
   additive and repeatable, enables RLS, and restricts state/RPCs to service_role.
2. Create a strong CRON_SECRET in Vercel **Production** and the same GitHub Actions
   secret `CRON_SECRET` in `prellern1337/dash`. Keep the existing GitHub
   `VERCEL_AUTOMATION_BYPASS_SECRET` for protected deployments. Redeploy the code.
3. Verify Vercel billing says **Pro or Enterprise**. Hobby cannot provide the
   required intraday cadence/precision. Then run
   `node scripts/configure-data-cron.mjs --confirmed-pro`, commit the resulting
   `vercel.json`, and deploy to production. This keeps the unrelated daily jobs,
   removes the overlapping legacy `/api/swap-refresh` cron, and adds four
   independent five-minute ticks (all days, so missed Friday/late-night slots
   can recover over weekends). The tick does not scrape already successful slots.
4. Verify four jobs exist in Vercel Cron Jobs and invoke each protected endpoint
   with `Authorization: Bearer <CRON_SECRET>`. Repeat: it must return `skipped`.
   Check health for each dataset after its due slot. Vercel deployment protection
   may require the automation bypass header for external callers.
5. Set GitHub repository variable `DATA_SCHEDULER_ENABLED=true`. Existing scheduled
   and workflow_dispatch runs now use the same authenticated, idempotent route as
   Vercel. Until this flag is set they retain their existing update endpoints.
   Observe one business day and the 22:20/22:30 slots, with health fresh by the
   deadlines above. Do not declare activation complete from green legacy runs.

If the plan is Hobby, do not run step 3. Instead use an independently verified
external scheduler to GET each of the four dataset URLs every five minutes,
with the same Authorization and (if needed) protection-bypass headers. Disable
legacy `/api/swap-refresh` in vercel.json at that cutover. No service subscription
or external scheduler has been provisioned by this change.

Rollback: disable primary jobs, set DATA_SCHEDULER_ENABLED=false, restore the
previous vercel.json. Keep additive schema; existing legacy writes have NULL keys.
Read-only health may then become stale because legacy updates do not record slots.

## Validation

`npm test` covers UTC slots, given delayed runs, midnight/Monday/DST/weekends,
freshness boundary, concurrent/repeated triggers, partial/failing retries,
authentication and isolated stable write keys. SQL tests execute the actual setup
against embedded PostgreSQL, including leases, backoff, stale token, ACL/RLS and
unique keys. `npm run build` verifies the existing app. No production feed refresh
is needed to test scheduler semantics.
