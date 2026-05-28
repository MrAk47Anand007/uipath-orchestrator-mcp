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
    expect(config.auth.mode).toBe('service');
  });

  it('parses interactive auth settings for PKCE login', () => {
    const config = loadConfig({
      UIPATH_BASE_URL: 'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_ACCOUNT_LOGICAL_NAME: 'acme',
      UIPATH_TENANT_LOGICAL_NAME: 'DefaultTenant',
      UIPATH_INTERACTIVE_CLIENT_ID: 'interactive-client-id',
      UIPATH_AUTH_MODE: 'interactive',
      UIPATH_AUTH_STORAGE_PATH: 'C:/temp/uipath-auth.json',
      UIPATH_INTERACTIVE_REDIRECT_URL: 'http://127.0.0.1:8787/callback',
      UIPATH_INTERACTIVE_OAUTH_SCOPES: 'OR.Execution OR.Jobs offline_access',
    });

    expect(config.auth.mode).toBe('interactive');
    expect(config.auth.storagePath).toBe('C:/temp/uipath-auth.json');
    expect(config.auth.interactive?.clientId).toBe('interactive-client-id');
    expect(config.auth.interactive?.redirectUrl.href).toBe(
      'http://127.0.0.1:8787/callback',
    );
    expect(config.auth.interactive?.oauthScopes).toBe(
      'OR.Execution OR.Jobs offline_access',
    );
  });
});
