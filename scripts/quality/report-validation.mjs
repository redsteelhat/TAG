import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const reportPath =
  process.env.REPORT_VALIDATION_OUTPUT ??
  join('tmp', 'report-validation-report.json');
const pnpmArgs = [
  '--filter',
  '@tag/api',
  'test',
  '--',
  'src/reports/reports.service.spec.ts'
];
const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
const args =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', `pnpm ${pnpmArgs.map(quoteWindowsArg).join(' ')}`]
    : pnpmArgs;

const startedAt = new Date();
const result = await run(command, args);
const finishedAt = new Date();
const passed = result.exitCode === 0;

await mkdir('tmp', { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      checkedAt: finishedAt.toISOString(),
      command: [command, ...args].join(' '),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      exitCode: result.exitCode,
      passed,
      stderr: result.stderr.trim(),
      stdout: result.stdout.trim(),
      validations: [
        'daily/weekly/monthly totalCost formula',
        'daily/weekly/monthly netProfit formula',
        'kmProfit and hourlyProfit derivation',
        'per-km profitability breakdown',
        'per-hour profitability breakdown',
        'break-even revenue, remaining, surplus, and progress formula',
        'overview endpoint composition'
      ]
    },
    null,
    2
  )}\n`
);

console.log(`Report validation: ${passed ? 'passed' : 'failed'}`);
console.log(`Report: ${reportPath}`);

if (!passed) {
  process.exitCode = result.exitCode || 1;
}

function run(commandName, commandArgs) {
  return new Promise((resolve) => {
    const child = spawn(commandName, commandArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stderr,
        stdout
      });
    });
  });
}

function quoteWindowsArg(value) {
  return value.includes(' ') ? `"${value.replace(/"/g, '\\"')}"` : value;
}
