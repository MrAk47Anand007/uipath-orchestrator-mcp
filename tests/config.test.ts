import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('parses the minimum env needed to start the server', () => {
    const config = loadConfig({
      UIPATH_BASE_URL: 'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_ACCOUNT_LOGICAL_NAME: 'acme',
      UIPATH_TENANT_LOGICAL_NAME: 'DefaultTenant',
      UIPATH_CLIENT_ID: 'client-id',
      UIPATH_CLIENT_SECRET: 'client-secret',
      UIPATH_FOLDER_KEY: '7e8c5d14-10c8-4c44-a58e-53fbcf8b6c10',
    });

    expect(config.baseUrl.pathname).toBe('/acme/DefaultTenant/orchestrator_/');
    expect(config.defaultFolderKey).toBe('7e8c5d14-10c8-4c44-a58e-53fbcf8b6c10');
    expect(config.oauthScopes).toBe('OR.Default');
  });
});
