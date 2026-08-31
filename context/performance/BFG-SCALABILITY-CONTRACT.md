# BFG SCALABILITY CONTRACT

Status: `750_NOT_PASSING` for the measured Profile A public HTTP workload;
500 remains evidenced, and 1,000 remains unproven. Revalidated 2026-08-31.

## Ticket follow-up — 2026-08-31

The unchanged harness/profile was reproduced and decomposed by route. Two
application-owned costs were reduced: public routes no longer execute Clerk
middleware, and the Ready Stock initial projection now uses one-minute ISR.
The latest 750 Production sample still returned 1,166 requests at 336.12 RPS,
p95 3,147 ms, p99 3,232 ms, and 0% errors. Three repeat samples immediately
after the initial ISR change also failed p95 (2,173/2,802/2,373 ms), so the
single warm 1,605-ms sample is not accepted as the contract result.

Vercel request logs showed static cache hits for all five Profile A routes and
no 429/5xx. Detailed queue/function metrics are unavailable because the live
metrics query returned `payment_required`. The remaining degradation is a
shared edge/client-path boundary, not a route-specific Convex query proven by
the available evidence. No speculative infrastructure or provider change was
made. Sustained 750 and 1,000 were not run after the short-run stop.

## Current Platform

| Platform | Actual evidence                                                                                              | Capacity interpretation                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel   | Project `blessing-for-good`, Production plan `hobby`, Fluid Compute metadata observed; default region `iad1` | Official docs list autoscaled Function concurrency up to 30,000 for Hobby/Pro, but the account's live queue/function metrics were unavailable because the metrics query returned `payment_required`; platform maximum is not BFG capacity evidence. |
| Convex   | Production deployment `clean-eel-522`; Development `content-snake-214`                                       | Official deployment classes list 1,000 concurrent sessions on S16 and 10,000 on S256, with different function-execution limits; the BFG deployment class, usage limits, and current utilization are `BLOCKED_BY_ACCOUNT_ACCESS`. |
| Clerk    | Canonical identity/session provider                                                                          | Official docs publish endpoint rate limits (Production Backend API 1,000 requests/10 seconds; Development 100/10 seconds), not a BFG session-concurrency guarantee. Authentication capacity was not stress-tested or credential-stuffed. |

Current official references used for this contract:

- [Vercel Functions limitations](https://vercel.com/docs/functions/limitations)
- [Vercel platform limits](https://vercel.com/docs/limits)
- [Vercel plans](https://vercel.com/docs/plans)
- [Convex production limits](https://docs.convex.dev/production/state/limits)
- [Convex usage limits](https://docs.convex.dev/production/usage-limits)
- [Clerk rate limits](https://clerk.com/docs/guides/how-clerk-works/system-limits)

## Capacity Target

The explicit target is **1,000 concurrent active client sessions**, not 1,000
simultaneous financial mutations. A valid 1,000 verdict requires a
representative realtime/authenticated workload, progressive ramp, observable
latency/errors/queueing, and all stop criteria staying clear.

## Load Profiles

| Profile                 | Workload                                                                                                    | Environment / status                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A — Read Heavy          | Public homepage/how-to-order/join/catalog/Ready Stock HTTP reads; safe, non-mutating                        | Production 500 remains aggregate-green; repeated 750 runs fail p95 after application fixes; 1,000 not launched |
| B — Authenticated Mixed | Customer dashboard, Buku Saya, invoices, activity, catalog access, profile reads, occasional safe mutations | Deterministic Convex fixtures and existing permission suites; no 1,000-identity Production run |
| C — Operational Burst   | Order submission, catalog unlock, payment confirmation, Admin review patterns, bulk/import boundaries       | Development deterministic tests only; no unsafe Production write burst                         |
| F — Close PO            | Read-heavy Customer pressure with a smaller authenticated order-write share; Admin 1–5 session overlay       | Not run: no authorized session or isolated Production fixture; public read pressure and deterministic writes are reported separately |

## Application Query Design

- Public Ready Stock uses publication/index filters and a 200-book ceiling,
  returns at most 100 items, omits private inventory fields, and uses one-minute
  ISR for the initial public projection; the hydrated live query remains.
- Customer lists use current-user ownership indexes and pagination/take caps.
- Admin queues and reports use pagination or explicit operational ceilings.
- Bulk Import caps file/rows/cell length and confirms atomically.
- The current scan found no raw SQL, dynamic SQL-like filter construction,
  unbounded public `collect`, or user-controlled table/resource authority.
- Remaining scale ceilings are bounded Admin projections and the
  public-book fan-out (publisher/variants/inventory/media per bounded book).

## Subscription / Fan-Out Review

The source review found no custom server-side subscription fan-out loop. The
client uses Convex reactive queries on authenticated pages, but a live browser
session/subscription count was not captured because a 1,000-identity
authenticated Production test is prohibited for this phase. The Profile A
harness is explicitly HTTP/edge-only and must not be interpreted as Convex
realtime capacity.

## Provisional Acceptance Thresholds

For the measured public HTTP profile:

- p95 ≤ 2,000 ms;
- p99 ≤ 5,000 ms;
- 5xx = 0;
- error rate < 1%;
- 429s only when an intentional limiter is exercised;
- no unexpected authorization failure, data mutation, or financial
  consequence;
- no continuously growing observable queue.

These are Phase 09.1 operational targets, not original functional PRD SLOs.

## Stop Conditions

Stop a ramp if any of the following occurs: unexpected 5xx spike, unexpected
authorization failure, continuously growing queue, critical latency breach,
service unavailability, unsafe cost/usage signal, Production error spike, or
any unexpected state-changing mutation. The harness stops at 5xx, ≥1% error
rate, p95 >2,000 ms, or p99 >5,000 ms. The 2026-08-31 750 stop was triggered
by p95 latency.

## Cost Guardrails

- Do not create 1,000 Production accounts or send write-heavy Production
  traffic.
- Convex usage/spending thresholds were not verified because the active CLI
  session lacks access to the BFG project; no limits were changed.
- Vercel live observability metrics were not available on the current plan;
  do not use absence of metrics as evidence of absence of queueing.
- Load runs are short, progressive, bounded, and abortable. The repeatable
  harness contains no credentials and sends only GET requests in Profile A.
- The latest 2026-08-31 staged run passed 1/5/10/100/250/500; 500 reached
  1,500 requests at measured 429.68 RPS with p95 1,143 ms and p99 1,233 ms.

## Observed Bottleneck

The original 750 result was 1,508 HTTP 200 responses with p95 2,264 ms and
p99 2,416 ms. Route isolation then showed all five public routes degrading,
with Ready Stock carrying an avoidable dynamic Convex projection. Narrowing
public Clerk middleware and making Ready Stock ISR reduced application work;
Vercel logs subsequently showed static cache hits for every Profile A route.
The latest 750 still measured p95 3,147 ms with 0% errors. Because detailed
Vercel function/queue metrics remain unavailable, the residual edge/client
boundary cannot be assigned to a more specific provider component. Current
classification: `750_NOT_PASSING /
PLATFORM_LIMIT_OBSERVABILITY_UNAVAILABLE`.

## Recommended Headroom

Treat **500 Profile A users** as the currently evidenced supported ceiling for
this harness. Keep 750 open until a repeated sample meets the latency target
and provider edge metrics explain the residual boundary. Do not promise 1,000
authenticated realtime users. The next safe action is authorized platform
observability/edge review, not an application rewrite or speculative service.

## Verdict

```text
READ-HEAVY PUBLIC HTTP: VALIDATED_TO_CAPACITY_500
750: NOT PASSING / REPEATED P95 LATENCY STOP (latest p95 3,147 ms; 0% HTTP errors)
1,000: NOT VALIDATED
AUTHENTICATED REALTIME: NOT VALIDATED
WRITE-HEAVY PRODUCTION: NOT RUN BY SAFETY CONTRACT
APPLICATION CORRECTNESS UNDER DETERMINISTIC CONTENTION: GREEN_EVIDENCE
DETERMINISTIC ORDER/BATCH INTEGRITY: GREEN AT 25 CONCURRENT SUBMISSIONS
```
