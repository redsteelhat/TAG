import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFiles = ['.env', '.env.local', 'apps/api/.env', 'apps/api/.env.local'];

for (const envFile of envFiles) {
  loadEnvFile(join(rootDir, envFile));
}

const isWatchMode = process.argv.includes('--watch');
const intervalHours = getPositiveNumber('BACKUP_INTERVAL_HOURS', 24);

if (isWatchMode) {
  await runBackupSafely();
  setInterval(
    () => {
      void runBackupSafely();
    },
    intervalHours * 60 * 60 * 1000
  );
} else {
  await runBackup();
}

async function runBackupSafely() {
  try {
    await runBackup();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Postgres backup failed.'
    );
    process.exitCode = 1;
  }
}

async function runBackup() {
  const startedAt = new Date();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database backup.');
  }

  const backupDir = resolve(
    rootDir,
    process.env.BACKUP_DIR ?? 'backups/postgres'
  );
  const retentionDays = getPositiveNumber('BACKUP_RETENTION_DAYS', 14);
  const prefix = sanitizeFilename(
    process.env.BACKUP_FILE_PREFIX ?? 'tag-finance'
  );
  const timestamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const backupPath = join(backupDir, `${prefix}-${timestamp}.sql.gz`);

  mkdirSync(backupDir, { recursive: true });

  const command = buildPgDumpCommand(databaseUrl);
  const pgDump = spawn(command.binary, command.args, {
    env: command.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const stderrChunks = [];
  pgDump.stderr.on('data', (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  const output = createWriteStream(backupPath, { flags: 'wx' });
  const pipePromise = pipeline(pgDump.stdout, createGzip({ level: 9 }), output);
  const exitCode = await waitForExit(pgDump);

  await pipePromise.catch((error) => {
    pgDump.kill('SIGTERM');
    throw error;
  });

  if (exitCode !== 0) {
    removePartialBackup(backupPath);
    const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
    throw new Error(
      `pg_dump failed with exit code ${exitCode}.${stderr ? ` ${stderr}` : ''}`
    );
  }

  const deletedFiles = pruneOldBackups(backupDir, prefix, retentionDays);
  const finishedAt = new Date();
  const stats = statSync(backupPath);

  console.log(
    JSON.stringify(
      {
        backupPath,
        deletedFiles,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        finishedAt: finishedAt.toISOString(),
        retentionDays,
        sizeBytes: stats.size,
        startedAt: startedAt.toISOString(),
        status: 'completed'
      },
      null,
      2
    )
  );
}

function buildPgDumpCommand(databaseUrl) {
  const url = new URL(databaseUrl);
  const schema = process.env.BACKUP_PG_SCHEMA ?? url.searchParams.get('schema');
  const dockerContainer = process.env.BACKUP_DOCKER_CONTAINER;

  if (dockerContainer) {
    const shellCommand = [
      'pg_dump',
      '-U "$POSTGRES_USER"',
      '-d "$POSTGRES_DB"',
      '--no-owner',
      '--no-privileges',
      schema ? `--schema ${escapeShellArg(schema)}` : ''
    ]
      .filter(Boolean)
      .join(' ');
    const args = ['exec', '-i', dockerContainer, 'sh', '-c', shellCommand];

    return {
      args,
      binary: 'docker',
      env: process.env
    };
  }

  const dumpUrl = new URL(databaseUrl);
  dumpUrl.searchParams.delete('schema');

  const args = [
    '--dbname',
    dumpUrl.toString(),
    '--no-owner',
    '--no-privileges'
  ];

  if (schema) {
    args.push('--schema', schema);
  }

  return {
    args,
    binary: process.env.BACKUP_PG_DUMP_BIN ?? 'pg_dump',
    env: process.env
  };
}

function pruneOldBackups(backupDir, prefix, retentionDays) {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  const deletedFiles = [];

  for (const fileName of readdirSync(backupDir)) {
    if (!fileName.startsWith(`${prefix}-`) || !fileName.endsWith('.sql.gz')) {
      continue;
    }

    const filePath = join(backupDir, fileName);
    const stats = statSync(filePath);

    if (stats.mtimeMs >= cutoff) {
      continue;
    }

    rmSync(filePath, { force: true });
    deletedFiles.push(fileName);
  }

  return deletedFiles;
}

function waitForExit(childProcess) {
  return new Promise((resolveExit, rejectExit) => {
    childProcess.once('error', rejectExit);
    childProcess.once('close', resolveExit);
  });
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

function removePartialBackup(path) {
  rmSync(path, { force: true });
}

function sanitizeFilename(value) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function escapeShellArg(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(
      'BACKUP_PG_SCHEMA must contain only letters, numbers, and underscores.'
    );
  }

  return value;
}
