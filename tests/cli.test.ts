import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import nock from 'nock';
import {
  getBrowserOpenCommand,
  runInitCommand,
  runServiceLoginCommand,
} from '../src/cli.js';

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

  it('resolves service secrets from env.NAME references during login', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uipath-mcp-cli-'));
    const configPath = join(dir, 'config.json');
    process.env.UIPATH_TEST_SERVICE_SECRET = 'resolved-secret';

    try {
      nock('https://cloud.uipath.com')
        .post('/acme/identity_/connect/token')
        .reply(200, {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      await runServiceLoginCommand({
        clientId: 'service-client-id',
        clientSecret: 'env.UIPATH_TEST_SERVICE_SECRET',
        account: 'acme',
        tenant: 'DefaultTenant',
        configPath,
      });

      const saved = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, string>;
      expect(saved.UIPATH_CLIENT_ID).toBe('service-client-id');
      expect(saved.UIPATH_CLIENT_SECRET).toBeUndefined();
    } finally {
      delete process.env.UIPATH_TEST_SERVICE_SECRET;
    }
  });
});
