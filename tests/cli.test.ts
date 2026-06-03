import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBrowserOpenCommand, runInitCommand } from '../src/cli.js';

describe('getBrowserOpenCommand', () => {
  it('uses the Windows URL handler so login opens in the default browser', () => {
    const command = getBrowserOpenCommand(
      'win32',
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    );

    expect(command.command).toBe('rundll32.exe');
    expect(command.args).toEqual([
      'url.dll,FileProtocolHandler',
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    ]);
  });

  it('writes onboarding values to package config storage', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-cli-'));
    const configPath = join(dir, 'config.json');
    const answers = [
      'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      'interactive',
      'acme',
      'DefaultTenant',
      'OR.Folders OR.Jobs offline_access',
      'interactive-client-id',
    ];

    await runInitCommand({
      configPath,
      prompt: async (_question, defaultValue) => answers.shift() ?? defaultValue ?? '',
    });

    const saved = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, string>;
    expect(saved.UIPATH_AUTH_MODE).toBe('interactive');
    expect(saved.UIPATH_INTERACTIVE_CLIENT_ID).toBe('interactive-client-id');
    expect(saved.UIPATH_BASE_URL).toBe(
      'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
    );
  });

  it('does not persist the service client secret into package config storage', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-cli-'));
    const configPath = join(dir, 'config.json');
    const answers = [
      'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      'service',
      'acme',
      'DefaultTenant',
      'OR.Folders OR.Jobs',
      'service-client-id',
      'service-client-secret',
    ];

    await runInitCommand({
      configPath,
      prompt: async (_question, defaultValue) => answers.shift() ?? defaultValue ?? '',
    });

    const saved = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, string>;
    expect(saved.UIPATH_CLIENT_ID).toBe('service-client-id');
    expect(saved.UIPATH_CLIENT_SECRET).toBeUndefined();
  });
});
