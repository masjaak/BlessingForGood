# BFG LOAD TEST REPORT

Status: `VALIDATED_TO_CAPACITY_500`; 750 stop boundary; 1,000 not run.
Executed 2026-08-22 against canonical Production with no writes.

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
- Stop: any 5xx or error rate ≥5%; no later level was launched after stop.
- A second 750 run used a 30-second timeout to check whether the boundary was
  only the 10-second timeout; it still breached the error/latency threshold.
- No authenticated identities, mutations, uploads, access-code attempts, or
  business records were created or changed in Production.

## Results

| Users | Profile       | Duration | Requests |      p50 |       p95 |       p99 | Errors | 429 | 5xx | Queue          | Result  |
| ----: | ------------- | -------: | -------: | -------: | --------: | --------: | -----: | --: | --: | -------------- | ------- |
|    10 | A public HTTP |      3 s |       30 |    77 ms |    261 ms |    266 ms |     0% |   0 |   0 | not observable | PASS    |
|    50 | A public HTTP |      3 s |      150 |    71 ms |    206 ms |    231 ms |     0% |   0 |   0 | not observable | PASS    |
|   100 | A public HTTP |      3 s |      300 |    81 ms |    296 ms |    315 ms |     0% |   0 |   0 | not observable | PASS    |
|   300 | A public HTTP |      3 s |      900 |   247 ms |    980 ms |  1,285 ms |     0% |   0 |   0 | not observable | PASS    |
|   500 | A public HTTP |      3 s |    1,500 |   234 ms |    808 ms |    860 ms |     0% |   0 |   0 | not observable | PASS    |
|   750 | A public HTTP |      3 s |    1,753 | 1,075 ms | 10,000 ms | 10,001 ms |  6.90% |   0 |   0 | not observable | STOP    |
| 1,000 | A public HTTP |  not run |        — |        — |         — |         — |      — |   — |   — | stop condition | NOT RUN |

At the first 750 run, 121 requests were connection failures and 1,632 were
HTTP 200. A repeat at 750 with a 30-second timeout produced 1,405 requests,
p50 1,739 ms, p95 10,622 ms, p99 10,752 ms, 6.33% errors, 89 connection
failures, 0 429, and 0 5xx. The repeat confirms a real boundary for this
client/edge workload, not merely a single 10-second timeout setting.

## Interpretation

- `10/50/100/300/500`: `PASS` for this short public read-heavy HTTP profile.
- `750`: `BOTTLENECK_AT_750`; stop criteria correctly prevented a 1,000 ramp.
- `1,000`: not validated and must not be described as supported.
- 0 application 5xx means no server error spike was observed in the run; it
  does not prove zero edge/network failures.
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
VALIDATED: 500 concurrent public read-heavy HTTP workers
BOTTLENECK: 750 for the measured client/edge path
NOT VALIDATED: 1,000 concurrent active client sessions
NOT MEASURED: 1,000 authenticated Convex realtime sessions
NOT RUN: 1,000 simultaneous financial mutations
```
