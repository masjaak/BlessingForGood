# BFG LOAD TEST REPORT

Status: `750_NOT_PASSING`; application-owned public bottlenecks were reduced,
but repeated same-profile Production runs still fail the 750 p95 threshold.
500 remains evidenced; 1,000 was not run. Revalidated 2026-08-31 against
canonical Production with no writes.

## Ticket follow-up — 2026-08-31

This section records the 750 investigation and preserves the earlier baseline
below. The harness, five-route Profile A, 3-second stage, 1-second pacing,
10-second timeout, and p95/p99/error thresholds were unchanged.

### Measured application boundaries

| Boundary | Evidence | Smallest change |
| --- | --- | --- |
| Public middleware | Pre-fix public responses carried Clerk signed-out middleware headers even for static public routes. | `src/proxy.ts` matcher narrowed to Admin/auth/invitation/API paths in `845ead6`; public pages no longer execute Clerk middleware. |
| Ready Stock initial render | Isolated `/ready-stock` was the first application-owned slow route after middleware removal; it awaited a Convex publisher/variant/inventory/storage projection on every request and duplicated that work after hydration. | `src/app/ready-stock/page.tsx` changed from `force-dynamic` to ISR, first at 5 seconds in `1f3839c`, then 60 seconds in `1697e97`; the live client query remains. |
| Remaining 750 boundary | After the fixes, Vercel logs showed static cache hits for all five routes, with no 429/5xx. Repeated 750 degradation was global rather than one route's Convex/rendering path. | No speculative provider/infrastructure change was justified. Vercel queue/function metrics returned `payment_required`, so the residual edge/client boundary is not further attributable from this account. |

### Route isolation before application fixes

| Route | Requests | p95 | p99 | Errors | Observation |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 1,501 | 2,202 ms | 2,258 ms | 0% | shared public degradation |
| `/how-to-order` | 1,504 | 2,039 ms | 2,102 ms | 0.07% | one connection failure |
| `/join` | 1,501 | 2,031 ms | 2,083 ms | 0% | shared public degradation |
| `/catalog` | 1,527 | 1,997 ms | 10,000 ms | 1.51% | 23 connection failures/timeouts |
| `/ready-stock` | 1,584 | 1,991 ms | 2,080 ms | 0% | closest application-owned boundary |

The route-isolated result distinguished a shared public path from the Ready
Stock server projection: every route degraded at 750, while Ready Stock had a
separate avoidable dynamic/fan-out cost. No full-data projection was removed.

### Before

| Users | Requests | RPS | p50 | p95 | p99 | Errors | 429 | 5xx | Result |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 500 | 1,500 | 429.68 | 288 ms | 1,143 ms | 1,233 ms | 0% | 0 | 0 | PASS |
| 750 | 1,508 | 388.36 | 825 ms | 2,264 ms | 2,416 ms | 0% | 0 | 0 | FAIL — p95 |

### After — same-profile Production runs

The first warm post-ISR sample passed 750, but it was not repeatable. The
later repeated runs are retained rather than selecting the lucky sample.

| Run | Commit | Users | Requests | RPS | p50 | p95 | p99 | Errors | 429 | 5xx | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 500 regression | `1697e97` | 500 | 1,274 | 326.75 | 717 ms | 1,959 ms | 2,273 ms | 0% | 0 | 0 | PASS |
| 750 warm sample | `1f3839c` | 750 | 2,250 | 575.30 | 466 ms | 1,605 ms | 1,740 ms | 0% | 0 | 0 | PASS |
| 750 repeat 1 | `1f3839c` | 750 | 1,475 | 453.29 | 1,729 ms | 2,173 ms | 2,297 ms | 0% | 0 | 0 | FAIL — p95 |
| 750 repeat 2 | `1f3839c` | 750 | 1,284 | 375.99 | 2,225 ms | 2,802 ms | 2,990 ms | 0% | 0 | 0 | FAIL — p95 |
| 750 repeat 3 | `1f3839c` | 750 | 1,473 | 433.62 | 1,796 ms | 2,373 ms | 2,544 ms | 0% | 0 | 0 | FAIL — p95 |
| 750 latest | `1697e97` | 750 | 1,166 | 336.12 | 2,749 ms | 3,147 ms | 3,232 ms | 0% | 0 | 0 | FAIL — p95 |

The `1697e97` 500 regression was aggregate-green, but the latest 750 was not.
No 30–60-second sustained 750 run was launched because the short controlled
sample already breached the stop condition. No 1,000 run was launched.

### Production observability boundary

- Vercel request logs during the repeated runs showed static `HIT` responses
  for `/`, `/how-to-order`, `/join`, `/catalog`, and `/ready-stock`; no 429 or
  5xx was observed in those runs.
- `vercel metrics vercel.request.count` returned `payment_required` for the
  current team, so queue depth, function duration, and provider saturation are
  not available evidence here.
- A local `next start` diagnostic at 500 also queued heavily (688 requests,
  p95 3,724 ms); it is diagnostic only and is not Production capacity proof.

### Ticket classification

```text
APPLICATION BOUNDARIES: REDUCED AT MEASURED MIDDLEWARE/READY-STOCK PATHS
750 PUBLIC CONTRACT: NOT MET / NOT REPEATABLY PROVEN
SUSTAINED 750: NOT RUN AFTER SHORT-RUN STOP
1,000 PUBLIC READ-HEAVY: NOT RUN
AUTHENTICATED / REALTIME / WRITE CAPACITY: NOT MEASURED
```

## Revalidation — 2026-08-31

- Harness: `scripts/load/bfg-read-load.mjs`, Node built-in `fetch`, no runtime
  dependency and no credentials.
- Environment: `https://www.blessingforgood.com` Production.
- Profile: `A_READ_HEAVY_PUBLIC_HTTP` against `/`, `/how-to-order`, `/join`,
  `/catalog`, and `/ready-stock`.
- Warmup: one request per route before each invocation.
- Virtual-user pacing: one request per user per second while the stage runs;
  achieved RPS is measured, not assumed.
- Stage duration: 3 seconds; request timeout: 10 seconds.
- Thresholds: p95 ≤2,000 ms, p99 ≤5,000 ms, error rate <1%, and 5xx = 0.
  The harness stops on the first stage that breaches any threshold.
- Revalidation run: `1 → 5 → 10 → 100 → 250 → 500`; 750 was run separately
  only after 500 remained green. 1,000 was not launched after the 750 stop.
- No authenticated identities, Clerk login attempts, Convex realtime sessions,
  mutations, uploads, access-code attempts, or business records were created
  or changed in Production.

| Users | Requests | Success | RPS    | p50       | p95        | p99        | Error | 429 | 5xx | Timeouts | Result |
| ----: | --------: | ------: | -----: | --------: | ---------: | ---------: | ----: | --: | --: | -------: | ------ |
| 1     | 3         | 3       | 1.00   | 63 ms     | 67 ms      | 67 ms      | 0%    | 0   | 0   | 0         | PASS |
| 5     | 15        | 15      | 4.99   | 127 ms    | 438 ms     | 438 ms     | 0%    | 0   | 0   | 0         | PASS |
| 10    | 30        | 30      | 9.97   | 92 ms     | 409 ms     | 462 ms     | 0%    | 0   | 0   | 0         | PASS |
| 100   | 301       | 301     | 84.38  | 120 ms    | 712 ms     | 1,401 ms   | 0%    | 0   | 0   | 0         | PASS |
| 250   | 750       | 750     | 238.70 | 121 ms    | 648 ms     | 789 ms     | 0%    | 0   | 0   | 0         | PASS |
| 500   | 1,500     | 1,500   | 429.68 | 288 ms    | 1,143 ms   | 1,233 ms   | 0%    | 0   | 0   | 0         | PASS |
| 750   | 1,508     | 1,508   | 388.36 | 825 ms    | 2,264 ms   | 2,416 ms   | 0%    | 0   | 0   | 0         | STOP — p95 |
| 1,000 | not run   | —       | —      | —         | —          | —          | —     | —   | —   | —         | NOT RUN |

The latest 750 stage returned only HTTP 200 responses and no 429/5xx/timeouts,
but the measured p95 was 2,264 ms. Earlier same-day 750 repetitions also
crossed or approached the p95 boundary (`2,541 ms` with 0% errors, `1,984 ms`
with `1.02%` connection failures, and `2,031 ms` with `0.13%` errors). The
error count varied, but the latency stop was reproducible. The prior
2026-08-22 post-deployment run also stopped at 750 (`p95 2,552 ms`).

## Architecture and blocked profiles

The browser's authenticated Customer path is not an HTTP page-only workload:
Clerk supplies the session token, Convex owns reactive reads, and the Customer
projection is loaded through `catalogAccess.getUnlocked`. Secret Catalog
search/filter is client-only after projection load. No authorized Clerk QA
session, safe Production Catalog fixture, or isolated authenticated load
environment was available, so authenticated realtime capacity and the
70/20/10 Close PO mix were not run.

The protected Convex suite provides correctness evidence, not throughput:

- five concurrent Ready Stock reservations never oversold stock;
- two concurrent payment submissions created one pending consequence;
- two concurrent deposit allocations kept available/reserved balance valid;
- 25 concurrent preorder submissions produced exactly 25 orders, 25 items,
  25 unique order references, and 25 automatic assignments to the one
  eligible Batch, with no cross-Catalog assignment;
- invoice creation is a later Admin mutation, not part of `orders.submit`; the
  concurrent preorder fixture therefore correctly has zero invoices at submit
  time, while existing invoice tests cover the one-active-invoice invariant.

The write test uses `convex-test` fixtures only. It does not claim Production
write throughput and does not create real Customer orders or invoices.

The repeatable command is:

```text
node scripts/load/bfg-read-load.mjs \
  --profile A_READ_HEAVY_PUBLIC_HTTP \
  --url https://www.blessingforgood.com \
  --levels 1,5,10,100,250,500,750,1000 \
  --duration-ms 3000 \
  --interval-ms 1000 \
  --timeout-ms 10000 \
  --p95-ms 2000 \
  --p99-ms 5000 \
  --max-error-percent 1
```

The harness supports safe route selection with `--routes`. Authenticated and
write profiles fail closed until isolated fixtures and authorized sessions
exist.

## Current interpretation

- `1/5/10/100/250/500`: `PASS` for this short public HTTP profile.
- `750`: `BOTTLENECK_AT_750`; it is outside the p95 contract even when HTTP
  status errors are zero.
- `500`: maximum currently evidenced public read-heavy ceiling for this
  harness.
- `1,000`: not validated and must not be described as supported.
- The harness observes edge HTTP timing only. It cannot attribute the p95
  boundary to Vercel, network, or another provider without platform metrics.

## Historical 2026-08-22 report

The prior report remains below as historical evidence for `ea724bc`.

## Methodology

- Harness: `scripts/load/bfg-read-load.mjs`, Node built-in `fetch`, no new
  runtime dependency and no credentials.
- Environment: `https://www.blessingforgood.com` Production.
- Profile: `A_READ_HEAVY_PUBLIC_HTTP` against `/`, `/how-to-order`, `/join`,
  `/catalog`, and `/ready-stock`.
- Warmup: one request per route.
- Ramp: 10 → 50 → 100 → 300 → 500 → 750 → 1,000.
- Level duration: 3 seconds, 1 second inter-request pacing per virtual user,
  10 second request timeout.
- Acceptance: p95 ≤2,000 ms, p99 ≤5,000 ms, 5xx = 0, and error rate <5%.
- Stop: any 5xx, error rate ≥5%, critical latency breach, or unexpected
  Production behavior; no later level was launched after stop.
- The post-deployment 750 run had no HTTP errors, but p95 exceeded the
  2,000-ms target, so the ramp stopped before 1,000.
- No authenticated identities, mutations, uploads, access-code attempts, or
  business records were created or changed in Production.

## Results

| Users | Profile       | Duration | Requests |      p50 |      p95 |      p99 | Errors | 429 | 5xx | Queue          | Result       |
| ----: | ------------- | -------: | -------: | -------: | -------: | -------: | -----: | --: | --: | -------------- | ------------ |
|    10 | A public HTTP |      3 s |       30 |   139 ms |   226 ms |   250 ms |     0% |   0 |   0 | not observable | PASS         |
|    50 | A public HTTP |      3 s |      150 |    81 ms |   244 ms |   508 ms |     0% |   0 |   0 | not observable | PASS         |
|   100 | A public HTTP |      3 s |      300 |   108 ms |   348 ms |   357 ms |     0% |   0 |   0 | not observable | PASS         |
|   300 | A public HTTP |      3 s |      900 |   124 ms |   655 ms |   669 ms |     0% |   0 |   0 | not observable | PASS         |
|   500 | A public HTTP |      3 s |    1,500 |   710 ms | 1,140 ms | 1,199 ms |     0% |   0 |   0 | not observable | PASS         |
|   750 | A public HTTP |      3 s |    1,396 | 2,082 ms | 2,552 ms | 2,702 ms |     0% |   0 |   0 | not observable | STOP_LATENCY |
| 1,000 | A public HTTP |  not run |        — |        — |        — |        — |      — |   — |   — | stop condition | NOT RUN      |

The pre-deployment run at 750 was materially worse: 121 connection failures,
6.90% errors, and p95 10,000 ms. A 30-second-timeout repeat still produced
6.33% errors and p95 10,622 ms. After `ea724bc`, the bounded 750 run returned
1,396 HTTP 200 responses with 0 errors, 0 429, and 0 5xx, but p95 was 2,552
ms, above the 2,000-ms acceptance target. The exact edge/network cause is not
isolated because queue and platform metrics were unavailable.

## Interpretation

- `10/50/100/300/500`: `PASS` for this short post-deployment public
  read-heavy HTTP profile.
- `750`: `BOTTLENECK_AT_750`; the latency target, rather than HTTP error rate,
  correctly prevented a 1,000 ramp.
- `1,000`: not validated and must not be described as supported.
- The post-deployment run had 0 5xx, 0 429, and 0 request errors; it does not
  prove that the 750 latency breach is harmless.
- Queue depth and Convex function metrics were not observable: Vercel metrics
  returned `payment_required`, and the local Convex account could not access
  the BFG project. Exact root cause is therefore not attributed to Convex.

## Profile B / C Evidence

Profile B authenticated mixed behavior and Profile C operational burst are
covered by deterministic Convex authorization, business-state, rate-limit,
and concurrency suites. They were not run as 1,000-user Production load:
doing so would require synthetic authenticated identities and unsafe writes.
Those suites prove correctness under representative calls, not throughput.

## Repeatability

```text
node scripts/load/bfg-read-load.mjs \
  --url https://www.blessingforgood.com \
  --levels 10,50,100,300,500,750,1000 \
  --duration-ms 3000 \
  --interval-ms 1000 \
  --timeout-ms 10000
```

Stop manually with Ctrl-C if the service shows unexpected errors. Use only
safe GET routes in Production. Mutation profiles require deterministic
Development fixtures and must not reuse Production credentials.

## Final Capacity Result

```text
VALIDATED: 500 concurrent public read-heavy HTTP workers after `ea724bc`
BOTTLENECK: 750 latency target for the measured client/edge path
NOT VALIDATED: 1,000 concurrent active client sessions
NOT MEASURED: 1,000 authenticated Convex realtime sessions
NOT RUN: 1,000 simultaneous financial mutations
```
