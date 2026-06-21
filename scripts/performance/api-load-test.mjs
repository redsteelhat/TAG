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
    process.env.LOAD_API_BASE_URL ??
      process.env.PERF_API_BASE_URL ??
      'http://localhost:3001/api/v1'
  ),
  errorRateThreshold: getPositiveNumber('LOAD_ERROR_RATE_THRESHOLD', 0.02),
  p95ThresholdMs: getPositiveNumber('LOAD_P95_THRESHOLD_MS', 750),
  requestTimeoutMs: getPositiveNumber('LOAD_REQUEST_TIMEOUT_MS', 5000),
  stages: parseStages(process.env.LOAD_STAGES ?? '10:10,25:20,50:30,10:10'),
  warmupRequests: getPositiveNumber('LOAD_WARMUP_REQUESTS', 10)
};

const targets = buildTargets();
const aggregate = createAccumulator();
const stageResults = [];

console.log(
  JSON.stringify(
    {
      baseUrl: config.baseUrl,
      errorRateThreshold: config.errorRateThreshold,
      p95ThresholdMs: config.p95ThresholdMs,
      stages: config.stages,
      targets: targets.map(
        (target) => `${target.weight}x ${target.method} ${target.path}`
      )
    },
    null,
    2
  )
);

await warmup();

for (const [index, stage] of config.stages.entries()) {
  const stageResult = await runStage(stage, index + 1);
  stageResults.push(stageResult);
  mergeAccumulator(aggregate, stageResult.raw);

  console.log(
    JSON.stringify(
      {
        stage: stageResult.stage,
        summary: stageResult.summary
      },
      null,
      2
    )
  );
}

const summary = summarizeAccumulator(aggregate);
const passed =
  summary.requests > 0 &&
  summary.errorRate <= config.errorRateThreshold &&
  summary.latencyMs.p95 <= config.p95ThresholdMs;

console.log(
  JSON.stringify(
    {
      passed,
      summary,
      thresholds: {
        maxErrorRate: config.errorRateThreshold,
        maxP95Ms: config.p95ThresholdMs
      }
    },
    null,
    2
  )
);

if (!passed) {
  console.error('API load test failed.');
  process.exitCode = 1;
}

async function warmup() {
  const requests = [];

  for (let index = 0; index < config.warmupRequests; index += 1) {
    requests.push(sendRequest(pickTarget(index)).catch(() => undefined));
  }

  await Promise.all(requests);
}

async function runStage(stage, stageNumber) {
  const raw = createAccumulator();
  const startedAt = performance.now();
  const deadline = startedAt + stage.durationSeconds * 1000;

  async function worker(workerIndex) {
    let requestIndex = workerIndex;

    while (performance.now() < deadline) {
      const target = pickTarget(requestIndex);
      const result = await sendRequest(target);

      recordResult(raw, target, result);
      requestIndex += stage.concurrency;
    }
  }

  await Promise.all(
    Array.from({ length: stage.concurrency }, (_, index) => worker(index))
  );

  const finishedAt = performance.now();

  return {
    raw,
    stage: {
      number: stageNumber,
      concurrency: stage.concurrency,
      durationSeconds: round((finishedAt - startedAt) / 1000, 2)
    },
    summary: summarizeAccumulator(raw)
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
      ok: target.acceptStatus(response.status),
      statusCode: response.status
    };
  } catch {
    return {
      latencyMs: performance.now() - startedAt,
      ok: false,
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
      path: '/health',
      weight: 3
    },
    {
      name: 'health-live',
      path: '/health/live',
      weight: 2
    },
    {
      name: 'health-ready',
      path: '/health/ready',
      weight: 4
    }
  ];

  if (monitoringToken) {
    defaultTargets.push({
      headers: {
        'x-monitoring-token': monitoringToken
      },
      name: 'monitoring-metrics',
      path: '/monitoring/metrics',
      weight: 1
    });
  }

  return defaultTargets.map((target) => ({
    acceptStatus:
      target.acceptStatus ??
      ((statusCode) => statusCode >= 200 && statusCode < 300),
    headers: target.headers ?? {},
    method: target.method ?? 'GET',
    name: target.name,
    path: target.path,
    weight: target.weight ?? 1
  }));
}

function pickTarget(index) {
  const totalWeight = targets.reduce((sum, target) => sum + target.weight, 0);
  let cursor = index % totalWeight;

  for (const target of targets) {
    if (cursor < target.weight) {
      return target;
    }

    cursor -= target.weight;
  }

  return targets[0];
}

function createAccumulator() {
  return {
    errors: 0,
    latencies: [],
    requests: 0,
    statusCounts: {},
    targetCounts: {}
  };
}

function recordResult(accumulator, target, result) {
  accumulator.requests += 1;
  accumulator.latencies.push(result.latencyMs);
  accumulator.statusCounts[result.statusCode] =
    (accumulator.statusCounts[result.statusCode] ?? 0) + 1;
  accumulator.targetCounts[target.name] =
    (accumulator.targetCounts[target.name] ?? 0) + 1;

  if (!result.ok) {
    accumulator.errors += 1;
  }
}

function mergeAccumulator(target, source) {
  target.errors += source.errors;
  target.requests += source.requests;
  target.latencies.push(...source.latencies);

  for (const [statusCode, count] of Object.entries(source.statusCounts)) {
    target.statusCounts[statusCode] =
      (target.statusCounts[statusCode] ?? 0) + count;
  }

  for (const [targetName, count] of Object.entries(source.targetCounts)) {
    target.targetCounts[targetName] =
      (target.targetCounts[targetName] ?? 0) + count;
  }
}

function summarizeAccumulator(accumulator) {
  const errorRate =
    accumulator.requests > 0 ? accumulator.errors / accumulator.requests : 1;

  return {
    requests: accumulator.requests,
    errors: accumulator.errors,
    errorRate: round(errorRate, 4),
    statusCounts: accumulator.statusCounts,
    targetCounts: accumulator.targetCounts,
    latencyMs: summarizeLatency(accumulator.latencies)
  };
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

function parseStages(value) {
  const stages = value
    .split(',')
    .map((stage) => stage.trim())
    .filter(Boolean)
    .map((stage) => {
      const [concurrency, durationSeconds] = stage.split(':').map(Number);

      if (
        !Number.isFinite(concurrency) ||
        !Number.isFinite(durationSeconds) ||
        concurrency <= 0 ||
        durationSeconds <= 0
      ) {
        throw new Error(
          `Invalid LOAD_STAGES item "${stage}". Expected concurrency:durationSeconds.`
        );
      }

      return {
        concurrency,
        durationSeconds
      };
    });

  if (stages.length === 0) {
    throw new Error('LOAD_STAGES must define at least one stage.');
  }

  return stages;
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
