import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createRobotsApi } from '../src/orchestrator/robots.js';

describe('robots api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists robot sessions for the current folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Sessions?$top=25')
      .reply(200, { value: [{ Id: 1, State: 'Available', MachineName: 'BOT-VM-1' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.listSessions(25)) as {
      value: Array<{ State: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].State).toBe('Available');
  });
});
