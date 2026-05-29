import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export function resolveConfigDirectory(
  source: Record<string, string | undefined> = process.env,
) {
  return (
    source.UIPATH_CONFIG_DIR ??
    join(
      source.APPDATA ?? join(homedir(), '.config'),
      'uipath-orchestrator-mcp',
    )
  );
}

export function resolveConfigPath(
  source: Record<string, string | undefined> = process.env,
) {
  return (
    source.UIPATH_CONFIG_PATH ??
    join(resolveConfigDirectory(source), 'config.json')
  );
}

function normalizePersistedConfig(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  const normalized: Record<string, string> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) {
      continue;
    }

    if (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    ) {
      normalized[key] = String(entry);
    }
  }

  return normalized;
}

export function readPersistedConfigSync(
  source: Record<string, string | undefined> = process.env,
) {
  const path = resolveConfigPath(source);

  if (!existsSync(path)) {
    return { path, values: {} as Record<string, string> };
  }

  const content = readFileSync(path, 'utf8');
  return {
    path,
    values: normalizePersistedConfig(JSON.parse(content)),
  };
}

export async function readPersistedConfig(
  source: Record<string, string | undefined> = process.env,
) {
  const path = resolveConfigPath(source);

  try {
    const content = await readFile(path, 'utf8');
    return {
      path,
      values: normalizePersistedConfig(JSON.parse(content)),
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { path, values: {} as Record<string, string> };
    }

    throw error;
  }
}

export async function writePersistedConfig(
  path: string,
  values: Record<string, string | undefined>,
) {
  await mkdir(dirname(path), { recursive: true });

  const nextValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );

  await writeFile(path, `${JSON.stringify(nextValues, null, 2)}\n`, 'utf8');
}
