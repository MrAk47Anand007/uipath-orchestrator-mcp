import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createWebhooksApi } from '../src/orchestrator/webhooks.js';

describe('webhooks api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists webhooks', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Webhooks')
      .query({ $top: '20', $count: 'true' })
      .reply(200, { value: [{ Id: 11, Name: 'Teams Alerts' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.listWebhooks(20)) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('Teams Alerts');
  });

  it('gets a webhook by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Webhooks(11)')
      .reply(200, { Id: 11, Name: 'Teams Alerts', Url: 'https://example.com/hook' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.getWebhook(11)) as { Url: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Url).toBe('https://example.com/hook');
  });

  it('creates a webhook', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'Teams Alerts',
      Description: 'Alert sink',
      Url: 'https://example.com/hook',
      Enabled: true,
      Secret: 'hook-secret',
      SubscribeToAllEvents: false,
      AllowInsecureSsl: false,
      Events: [{ EventType: 'job.completed' }],
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Webhooks', body)
      .reply(201, { Id: 11, ...body });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.createWebhook(body)) as { Id: number };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(11);
  });

  it('updates a webhook', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'Teams Alerts',
      Description: 'Alert sink updated',
      Url: 'https://example.com/hook',
      Enabled: true,
      Secret: 'hook-secret',
      SubscribeToAllEvents: true,
      AllowInsecureSsl: false,
      Events: [],
    };

    const scope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/odata/Webhooks(11)', body)
      .reply(200, { Id: 11, ...body });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.updateWebhook(11, body)) as { Description: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Description).toBe('Alert sink updated');
  });

  it('deletes a webhook', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete('/acme/DefaultTenant/orchestrator_/odata/Webhooks(11)')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    await api.deleteWebhook(11);

    expect(scope.isDone()).toBe(true);
  });

  it('pings a webhook', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Webhooks(11)/UiPath.Server.Configuration.OData.Ping', {})
      .reply(202, { Type: 'ping', EventId: 'evt-1' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.pingWebhook(11)) as { Type: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Type).toBe('ping');
  });

  it('lists webhook event types', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Webhooks/UiPath.Server.Configuration.OData.GetEventTypes')
      .query({ $count: 'true' })
      .reply(200, { value: [{ Name: 'job.completed', Group: 'Jobs' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.listWebhookEventTypes()) as {
      value: Array<{ Name: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('job.completed');
  });

  it('triggers a custom webhook event', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Type: 'custom',
      EventId: 'evt-custom-1',
      Timestamp: '2026-06-03T10:00:00.000Z',
      EventData: { source: 'codex' },
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Webhooks/UiPath.Server.Configuration.OData.TriggerCustom', body)
      .reply(200, { value: true });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Webhooks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createWebhooksApi(client);
    const result = (await api.triggerCustomEvent(body)) as { value: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(true);
  });
});

describe('webhook MCP tools', () => {
  it('registers webhook tools', async () => {
    const server = createServer({
      foldersApi: {
        listCurrentUserFolders: vi.fn(),
        listAccessibleFolders: vi.fn(),
        searchAccessibleFolders: vi.fn(),
      },
      jobsApi: {
        listProcesses: vi.fn(),
        listReleases: vi.fn(),
        listJobs: vi.fn(),
        startJob: vi.fn(),
        stopJob: vi.fn(),
        restartJob: vi.fn(),
      },
      logsApi: {
        listRobotLogs: vi.fn(),
        getRobotLogTotalCount: vi.fn(),
        getJobDetails: vi.fn(),
        listExecutionMedia: vi.fn(),
      },
      adminApi: {
        searchDirectoryObjects: vi.fn(),
        listRoles: vi.fn(),
        getUsersForRole: vi.fn(),
        getUserIdsForRole: vi.fn(),
        listFolderUsers: vi.fn(),
        getFolderRolesForUser: vi.fn(),
        getDirectoryPermissions: vi.fn(),
        assignUsersToFolders: vi.fn(),
        assignRolesToUser: vi.fn(),
        toggleUserRole: vi.fn(),
      },
      queuesApi: {
        listQueueDefinitions: vi.fn(),
        listQueueItems: vi.fn(),
        addQueueItem: vi.fn(),
        setQueueItemProgress: vi.fn(),
      },
      releasesApi: {
        listReleases: vi.fn(),
        getReleaseByKey: vi.fn(),
        createRelease: vi.fn(),
        updateRelease: vi.fn(),
        deleteRelease: vi.fn(),
        uploadProcessPackage: vi.fn(),
        deleteProcessPackage: vi.fn(),
        updateReleaseToLatestPackage: vi.fn(),
        updateReleaseToSpecificPackage: vi.fn(),
        rollbackRelease: vi.fn(),
      },
      resourcesApi: {
        listAssets: vi.fn(),
        getAssetByName: vi.fn(),
        createAsset: vi.fn(),
        updateAsset: vi.fn(),
        listBuckets: vi.fn(),
        listBucketFiles: vi.fn(),
        getBucketReadUri: vi.fn(),
        uploadBucketFile: vi.fn(),
        deleteBucketFile: vi.fn(),
      },
      robotsApi: {
        listSessions: vi.fn(),
        listRobots: vi.fn(),
        listMachines: vi.fn(),
        getMachine: vi.fn(),
        getAssignedMachines: vi.fn(),
        getFolderRuntimes: vi.fn(),
        getMachineSessionRuntimes: vi.fn(),
        getFolderMachineSessionRuntimes: vi.fn(),
        toggleRobotEnabledStatus: vi.fn(),
        deleteInactiveUnattendedSessions: vi.fn(),
        updateMachinesToFolderAssociations: vi.fn(),
        getJobsStats: vi.fn(),
        getSessionsStats: vi.fn(),
        getStatus: vi.fn(),
      },
      schedulesApi: {
        listSchedules: vi.fn(),
        createSchedule: vi.fn(),
        setSchedulesEnabled: vi.fn(),
        deleteSchedule: vi.fn(),
      },
      webhooksApi: {
        listWebhooks: vi.fn(),
        getWebhook: vi.fn(),
        createWebhook: vi.fn(),
        updateWebhook: vi.fn(),
        deleteWebhook: vi.fn(),
        pingWebhook: vi.fn(),
        listWebhookEventTypes: vi.fn(),
        triggerCustomEvent: vi.fn(),
      },
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(registeredTools?.uipath_list_webhooks).toBeDefined();
    expect(registeredTools?.uipath_get_webhook).toBeDefined();
    expect(registeredTools?.uipath_list_webhook_event_types).toBeDefined();
    expect(registeredTools?.uipath_create_webhook).toBeDefined();
    expect(registeredTools?.uipath_update_webhook).toBeDefined();
    expect(registeredTools?.uipath_delete_webhook).toBeDefined();
    expect(registeredTools?.uipath_ping_webhook).toBeDefined();
    expect(registeredTools?.uipath_trigger_custom_webhook_event).toBeDefined();
  });
});
