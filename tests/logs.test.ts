import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';

describe('logs api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists robot logs with a filter and folder scope', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/RobotLogs')
      .query({
        $top: '20',
        $count: 'true',
        $orderby: 'TimeStamp desc',
        $filter: "ProcessName eq 'UiPathAgentTesting'",
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [
          {
            Id: 1,
            Level: 'Info',
            Message: 'Execution started',
            ProcessName: 'UiPathAgentTesting',
          },
        ],
      });

    const { createLogsApi } = await import('../src/orchestrator/logs.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
      defaultFolderKey: 'folder-key-1',
    });

    const logsApi = createLogsApi(client);
    const result = (await logsApi.listRobotLogs({
      top: 20,
      orderBy: 'TimeStamp desc',
      filter: "ProcessName eq 'UiPathAgentTesting'",
      folder: { folderKey: 'folder-key-1' },
    })) as { value: Array<{ Message: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Message).toBe('Execution started');
  });

  it('gets total robot log count', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/RobotLogs/UiPath.Server.Configuration.OData.GetTotalCount')
      .query({
        $filter: "Level eq 'Error'",
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: 3 });

    const { createLogsApi } = await import('../src/orchestrator/logs.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
      defaultFolderKey: 'folder-key-1',
    });

    const logsApi = createLogsApi(client);
    const result = (await logsApi.getRobotLogTotalCount({
      filter: "Level eq 'Error'",
      folder: { folderKey: 'folder-key-1' },
    })) as { value: number };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(3);
  });

  it('lists execution media filtered by job id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/ExecutionMedia')
      .query({
        $top: '10',
        $count: 'true',
        $filter: 'JobId eq 12325843',
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 99, Name: 'recording.mp4', JobId: 12325843 }],
      });

    const { createLogsApi } = await import('../src/orchestrator/logs.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
      defaultFolderKey: 'folder-key-1',
    });

    const logsApi = createLogsApi(client);
    const result = (await logsApi.listExecutionMedia({
      top: 10,
      filter: 'JobId eq 12325843',
      folder: { folderKey: 'folder-key-1' },
    })) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('recording.mp4');
  });
});
