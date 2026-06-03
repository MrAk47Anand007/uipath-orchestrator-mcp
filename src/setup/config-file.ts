import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  createSecureStorage,
  type SecureStorage,
} from './secure-storage.js';

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

export function resolveServiceSecretPath(
  source: Record<string, string | undefined> = process.env,
) {
  if (source.UIPATH_SERVICE_SECRET_PATH) {
    return source.UIPATH_SERVICE_SECRET_PATH;
  }

  if (source.UIPATH_CONFIG_PATH) {
    return join(dirname(source.UIPATH_CONFIG_PATH), 'service-secret.dat');
  }

  return (
    join(resolveConfigDirectory(source), 'service-secret.dat')
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

export function readPersistedServiceSecretSync(
  path: string,
  secureStorage: SecureStorage = createSecureStorage(),
) {
  if (!existsSync(path)) {
    return undefined;
  }

  const sealed = readFileSync(path, 'utf8').trim();

  if (!sealed) {
    return undefined;
  }

  return secureStorage.unsealSync(sealed);
}

export async function writePersistedServiceSecret(
  path: string,
  secret: string,
  secureStorage: SecureStorage = createSecureStorage(),
) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${secureStorage.sealSync(secret)}\n`, 'utf8');
}
