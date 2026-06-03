import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createAlertsApi } from '../src/orchestrator/alerts.js';

describe('alerts api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists alerts with filters', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Alerts')
      .query({
        $top: '20',
        $count: 'true',
        $orderby: 'CreationTime desc',
        $filter: "Component eq 'Queues'",
      })
      .reply(200, {
        value: [{ Id: '5ed7b85a-d1b1-4671-a784-0be46b3912aa', Component: 'Queues' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
    });

    const api = createAlertsApi(client);
    const result = (await api.listAlerts({
      top: 20,
      filter: "Component eq 'Queues'",
      orderBy: 'CreationTime desc',
    })) as { value: Array<{ Component: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Component).toBe('Queues');
  });

  it('gets unread alert count', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Alerts/UiPath.Server.Configuration.OData.GetUnreadCount')
      .reply(200, { value: 4 });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
    });

    const api = createAlertsApi(client);
    const result = (await api.getUnreadCount()) as { value: number };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(4);
  });

  it('marks alerts as read', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const ids = ['5ed7b85a-d1b1-4671-a784-0be46b3912aa'];
    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Alerts/UiPath.Server.Configuration.OData.MarkAsRead',
        { ids },
      )
      .reply(200, { value: 3 });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
    });

    const api = createAlertsApi(client);
    const result = (await api.markAsRead(ids)) as { value: number };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(3);
  });

  it('raises a process alert', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      processAlert: {
        Message: 'Queue backlog high',
        Severity: 'Warn',
        RobotName: 'mcptest-unattended',
        ProcessName: 'UiPathAgentTesting',
      },
    };

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Alerts/UiPath.Server.Configuration.OData.RaiseProcessAlert',
        body,
      )
      .reply(200, { value: true });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Monitoring',
    });

    const api = createAlertsApi(client);
    const result = (await api.raiseProcessAlert({
      message: 'Queue backlog high',
      severity: 'Warn',
      robotName: 'mcptest-unattended',
      processName: 'UiPathAgentTesting',
    })) as { value: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(true);
  });
});

describe('alerts MCP tools', () => {
  it('registers alerts tools', () => {
    const server = createServer({
      alertsApi: {
        listAlerts: vi.fn(),
        getUnreadCount: vi.fn(),
        markAsRead: vi.fn(),
        raiseProcessAlert: vi.fn(),
      },
      auditApi: {
        listAuditLogs: vi.fn(),
        exportAuditLogs: vi.fn(),
        getAuditLogDetails: vi.fn(),
      },
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
        getQueueDefinition: vi.fn(),
        getQueueDefinitionByKey: vi.fn(),
        createQueueDefinition: vi.fn(),
        updateQueueDefinition: vi.fn(),
        deleteQueueDefinition: vi.fn(),
        listQueueItems: vi.fn(),
        getQueueItemProcessingHistory: vi.fn(),
        listQueueItemComments: vi.fn(),
        createQueueItemComment: vi.fn(),
        updateQueueItemComment: vi.fn(),
        deleteQueueItemComment: vi.fn(),
        getQueueItemCommentsHistory: vi.fn(),
        listQueueItemEvents: vi.fn(),
        getQueueItemEventsHistory: vi.fn(),
        retrieveQueuesProcessingStatus: vi.fn(),
        retrieveQueueProcessingRecords: vi.fn(),
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
      tasksApi: {
        listTasks: vi.fn(),
        getTask: vi.fn(),
        getTaskByKey: vi.fn(),
        listTasksAcrossFolders: vi.fn(),
        getTaskPermissions: vi.fn(),
        getTaskUsers: vi.fn(),
        createGenericTask: vi.fn(),
        getGenericTaskDataById: vi.fn(),
        getGenericTaskDataByKey: vi.fn(),
        saveGenericTaskData: vi.fn(),
        completeGenericTask: vi.fn(),
        saveAndReassignGenericTask: vi.fn(),
        listTaskNotes: vi.fn(),
        createTaskNote: vi.fn(),
        listTaskActivities: vi.fn(),
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

    expect(registeredTools?.uipath_list_alerts).toBeDefined();
    expect(registeredTools?.uipath_get_unread_alert_count).toBeDefined();
    expect(registeredTools?.uipath_mark_alerts_as_read).toBeDefined();
    expect(registeredTools?.uipath_raise_process_alert).toBeDefined();
  });
});
