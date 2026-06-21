import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFiles = ['.env', '.env.local', 'apps/api/.env', 'apps/api/.env.local'];

for (const envFile of envFiles) {
  loadEnvFile(join(rootDir, envFile));
}

const config = {
  baseUrl: trimTrailingSlash(
    process.env.PERF_API_BASE_URL ?? 'http://localhost:3001/api/v1'
  ),
  concurrency: getPositiveNumber('PERF_CONCURRENCY', 10),
  durationSeconds: getPositiveNumber('PERF_DURATION_SECONDS', 15),
  errorRateThreshold: getPositiveNumber('PERF_ERROR_RATE_THRESHOLD', 0.01),
  p95ThresholdMs: getPositiveNumber('PERF_P95_THRESHOLD_MS', 500),
  requestTimeoutMs: getPositiveNumber('PERF_REQUEST_TIMEOUT_MS', 5000),
  warmupRequests: getPositiveNumber('PERF_WARMUP_REQUESTS', 5)
};

const targets = buildTargets();
const results = [];

console.log(
  JSON.stringify(
    {
      baseUrl: config.baseUrl,
      concurrency: config.concurrency,
      durationSeconds: config.durationSeconds,
      p95ThresholdMs: config.p95ThresholdMs,
      errorRateThreshold: config.errorRateThreshold,
      targets: targets.map((target) => `${target.method} ${target.path}`)
    },
    null,
    2
  )
);

for (const target of targets) {
  await warmup(target);
  results.push(await runTarget(target));
}

const failedResults = results.filter((result) => !result.passed);

console.log(JSON.stringify({ results }, null, 2));

if (failedResults.length > 0) {
  console.error(
    `API performance test failed for: ${failedResults
      .map((result) => result.name)
      .join(', ')}`
  );
  process.exitCode = 1;
}

async function warmup(target) {
  const requests = [];

  for (let index = 0; index < config.warmupRequests; index += 1) {
    requests.push(sendRequest(target).catch(() => undefined));
  }

  await Promise.all(requests);
}

async function runTarget(target) {
  const startedAt = performance.now();
  const deadline = startedAt + config.durationSeconds * 1000;
  const latencies = [];
  const statusCounts = {};
  let requestCount = 0;
  let errorCount = 0;

  async function worker() {
    while (performance.now() < deadline) {
      const result = await sendRequest(target);

      requestCount += 1;
      latencies.push(result.latencyMs);
      statusCounts[result.statusCode] =
        (statusCounts[result.statusCode] ?? 0) + 1;

      if (!target.acceptStatus(result.statusCode)) {
        errorCount += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));

  const finishedAt = performance.now();
  const durationSeconds = (finishedAt - startedAt) / 1000;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 1;
  const summary = {
    name: target.name,
    method: target.method,
    path: target.path,
    requests: requestCount,
    rps: round(requestCount / durationSeconds, 2),
    errorCount,
    errorRate: round(errorRate, 4),
    statusCounts,
    latencyMs: summarizeLatency(latencies),
    thresholds: {
      maxErrorRate: config.errorRateThreshold,
      maxP95Ms: config.p95ThresholdMs
    }
  };

  return {
    ...summary,
    passed:
      requestCount > 0 &&
      errorRate <= config.errorRateThreshold &&
      summary.latencyMs.p95 <= config.p95ThresholdMs
  };
}

async function sendRequest(target) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${config.baseUrl}${target.path}`, {
      headers: target.headers,
      method: target.method,
      signal: controller.signal
    });

    await response.arrayBuffer();

    return {
      latencyMs: performance.now() - startedAt,
      statusCode: response.status
    };
  } catch {
    return {
      latencyMs: performance.now() - startedAt,
      statusCode: 0
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildTargets() {
  const monitoringToken = process.env.MONITORING_TOKEN;
  const defaultTargets = [
    {
      name: 'health',
      path: '/health'
    },
    {
      name: 'health-live',
      path: '/health/live'
    },
    {
      name: 'health-ready',
      path: '/health/ready'
    }
  ];

  if (monitoringToken) {
    defaultTargets.push({
      headers: {
        'x-monitoring-token': monitoringToken
      },
      name: 'monitoring-metrics',
      path: '/monitoring/metrics'
    });
  }

  return defaultTargets.map((target) => ({
    acceptStatus:
      target.acceptStatus ??
      ((statusCode) => statusCode >= 200 && statusCode < 300),
    headers: target.headers ?? {},
    method: target.method ?? 'GET',
    name: target.name,
    path: target.path
  }));
}

function summarizeLatency(latencies) {
  if (latencies.length === 0) {
    return {
      min: 0,
      p50: 0,
      p95: Number.POSITIVE_INFINITY,
      p99: 0,
      max: 0,
      avg: 0
    };
  }

  const sorted = [...latencies].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    min: round(sorted[0], 2),
    p50: round(percentile(sorted, 0.5), 2),
    p95: round(percentile(sorted, 0.95), 2),
    p99: round(percentile(sorted, 0.99), 2),
    max: round(sorted[sorted.length - 1], 2),
    avg: round(total / sorted.length, 2)
  };
}

function percentile(sortedValues, percentileValue) {
  const index = Math.ceil(sortedValues.length * percentileValue) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function getPositiveNumber(key, fallback) {
  const parsed = Number(process.env[key]);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function round(value, decimals) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
