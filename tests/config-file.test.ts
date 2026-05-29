import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readPersistedConfig,
  resolveConfigPath,
  writePersistedConfig,
} from '../src/setup/config-file.js';

describe('config file storage', () => {
  it('resolves the default package config location', () => {
    const path = resolveConfigPath({
      APPDATA: 'C:/Users/Test/AppData/Roaming',
    });

    expect(path.replaceAll('\\', '/')).toBe(
      'C:/Users/Test/AppData/Roaming/uipath-orchestrator-mcp/config.json',
    );
  });

  it('writes and reads persisted config values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-config-'));
    const path = join(dir, 'config.json');

    await writePersistedConfig(path, {
      UIPATH_BASE_URL:
        'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_AUTH_MODE: 'interactive',
      UIPATH_INTERACTIVE_CLIENT_ID: 'interactive-client-id',
    });

    const saved = JSON.parse(await readFile(path, 'utf8')) as Record<string, string>;
    expect(saved.UIPATH_AUTH_MODE).toBe('interactive');

    const loaded = await readPersistedConfig({
      UIPATH_CONFIG_PATH: path,
    });
    expect(loaded.values.UIPATH_INTERACTIVE_CLIENT_ID).toBe(
      'interactive-client-id',
    );
  });

  it('ignores missing config files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-config-'));
    const loaded = await readPersistedConfig({
      UIPATH_CONFIG_PATH: join(dir, 'missing.json'),
    });

    expect(loaded.values).toEqual({});
  });

  it('normalizes non-string persisted values into strings', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-config-'));
    const path = join(dir, 'config.json');
    await writeFile(
      path,
      JSON.stringify({
        UIPATH_AUTH_MODE: 'service',
        UIPATH_SOME_BOOLEAN: true,
        UIPATH_SOME_NUMBER: 42,
      }),
      'utf8',
    );

    const loaded = await readPersistedConfig({
      UIPATH_CONFIG_PATH: path,
    });

    expect(loaded.values.UIPATH_SOME_BOOLEAN).toBe('true');
    expect(loaded.values.UIPATH_SOME_NUMBER).toBe('42');
  });
});
