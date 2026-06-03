import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createAuditApi } from '../src/orchestrator/audit.js';

describe('audit api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists audit logs with audited service header', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/AuditLogs')
      .query({
        $top: '20',
        $count: 'true',
        $orderby: 'ExecutionTime desc',
        $filter: "Component eq 'Tasks'",
      })
      .matchHeader('x-uipath-auditedservice', 'Orchestrator')
      .reply(200, {
        value: [{ Id: 1, Component: 'Tasks', Action: 'Create' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Audit',
    });

    const api = createAuditApi(client);
    const result = (await api.listAuditLogs({
      auditedService: 'Orchestrator',
      top: 20,
      filter: "Component eq 'Tasks'",
      orderBy: 'ExecutionTime desc',
    })) as { value: Array<{ Component: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Component).toBe('Tasks');
  });

  it('exports audit logs with query filters', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/AuditLogs/UiPath.Server.Configuration.OData.Export',
        {},
      )
      .query({
        auditedService: 'Orchestrator',
        $top: '50',
        $count: 'true',
        $filter: "UserName eq 'anand.kale@xalta.tech'",
      })
      .reply(200, { Id: 'export-1', Status: 'Pending' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Audit',
    });

    const api = createAuditApi(client);
    const result = (await api.exportAuditLogs({
      auditedService: 'Orchestrator',
      filter: "UserName eq 'anand.kale@xalta.tech'",
    })) as { Status: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Status).toBe('Pending');
  });

  it('gets audit log details by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get(
        '/acme/DefaultTenant/orchestrator_/odata/AuditLogs/UiPath.Server.Configuration.OData.GetAuditLogDetails(auditLogId=1)',
      )
      .matchHeader('x-uipath-auditedservice', 'Orchestrator')
      .reply(200, {
        value: [{ AuditLogId: 1, EntityName: 'Task', Action: 'Create' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Audit',
    });

    const api = createAuditApi(client);
    const result = (await api.getAuditLogDetails(1)) as {
      value: Array<{ EntityName: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].EntityName).toBe('Task');
  });
});

describe('audit MCP tools', () => {
  it('registers audit tools', () => {
    const server = createServer({
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

    expect(registeredTools?.uipath_list_audit_logs).toBeDefined();
    expect(registeredTools?.uipath_export_audit_logs).toBeDefined();
    expect(registeredTools?.uipath_get_audit_log_details).toBeDefined();
  });
});
