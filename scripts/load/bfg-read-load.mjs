const DEFAULT_URL = "https://www.blessingforgood.com";
const DEFAULT_LEVELS = [10, 50, 100, 300, 500, 750, 1000];
const ROUTES = ["/", "/how-to-order", "/join", "/catalog", "/ready-stock"];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function numbers(value) {
  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchRoute(baseUrl, route, timeoutMs) {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    return {
      status: response.status,
      latencyMs: performance.now() - startedAt,
      ok: response.status >= 200 && response.status < 300,
    };
  } catch (error) {
    return {
      status: 0,
      latencyMs: performance.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.name : "fetch_error",
    };
  }
}

async function runLevel(baseUrl, users, durationMs, intervalMs, timeoutMs) {
  const results = [];
  let nextRoute = 0;
  const startedAt = Date.now();
  const stopAt = startedAt + durationMs;
  await Promise.all(
    Array.from({ length: users }, async (_, userIndex) => {
      while (Date.now() < stopAt) {
        const route = ROUTES[(userIndex + nextRoute++) % ROUTES.length];
        const result = await fetchRoute(baseUrl, route, timeoutMs);
        results.push({ ...result, route });
        const remaining = intervalMs - result.latencyMs;
        if (remaining > 0 && Date.now() < stopAt) await sleep(remaining);
      }
    }),
  );
  const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
  const errors = results.filter((result) => !result.ok);
  const fiveXX = results.filter((result) => result.status >= 500).length;
  const throttles = results.filter((result) => result.status === 429).length;
  return {
    users,
    profile: "A_READ_HEAVY_PUBLIC_HTTP",
    durationMs,
    requests: results.length,
    p50Ms: Math.round(percentile(latencies, 0.5)),
    p95Ms: Math.round(percentile(latencies, 0.95)),
    p99Ms: Math.round(percentile(latencies, 0.99)),
    errorPercent: Number(((errors.length / Math.max(1, results.length)) * 100).toFixed(2)),
    throttles429: throttles,
    errors5xx: fiveXX,
    connectionFailures: results.filter((result) => result.status === 0).length,
    statuses: Object.fromEntries(
      Object.entries(Object.groupBy(results, (result) => String(result.status))).map(([status, rows]) => [
        status,
        rows.length,
      ]),
    ),
    queue: "not_observable_from_edge_harness",
    result: fiveXX > 0 || errors.length / Math.max(1, results.length) >= 0.05 ? "STOP" : "PASS",
  };
}

const baseUrl = option("--url", DEFAULT_URL);
const levels = numbers(option("--levels", DEFAULT_LEVELS.join(",")));
const durationMs = Number(option("--duration-ms", "3000"));
const intervalMs = Number(option("--interval-ms", "1000"));
const timeoutMs = Number(option("--timeout-ms", "10000"));

if (!levels.length || !Number.isFinite(durationMs) || !Number.isFinite(intervalMs) || !Number.isFinite(timeoutMs)) {
  throw new Error("Invalid load-test options");
}

for (const route of ROUTES) await fetchRoute(baseUrl, route, timeoutMs);
console.log(JSON.stringify({ phase: "warmup", profile: "A_READ_HEAVY_PUBLIC_HTTP", routes: ROUTES }));

for (const users of levels) {
  const result = await runLevel(baseUrl, users, durationMs, intervalMs, timeoutMs);
  console.log(JSON.stringify(result));
  if (result.result === "STOP") {
    console.log(JSON.stringify({ stopReason: "5xx_or_error_rate_threshold", stoppedAt: users }));
    break;
  }
}
