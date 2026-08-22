# BFG LOAD TEST REPORT

Status: `VALIDATED_TO_CAPACITY_500`; 750 reached but failed the p95 target;
1,000 not run. Executed 2026-08-22 against canonical Production with no
writes. The final table below is the post-deployment run for `ea724bc`.

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
