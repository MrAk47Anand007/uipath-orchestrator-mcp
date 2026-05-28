import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';

describe('folder-aware client', () => {
  beforeEach(() => nock.cleanAll());

  it('sends X-UIPATH-FolderKey when a folder key is provided', async () => {
    const token = 'token-123';

    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: token, token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Releases')
      .matchHeader('authorization', `Bearer ${token}`)
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    await client.get('/odata/Releases');
    expect(scope.isDone()).toBe(true);
  });
});
