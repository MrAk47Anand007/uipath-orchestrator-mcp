import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createRobotsApi } from '../src/orchestrator/robots.js';
import { createServer } from '../src/server.js';

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

  it('lists machines in the tenant', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Machines')
      .query({ $top: '20', $count: 'true' })
      .reply(200, {
        value: [{ Id: 765, Name: 'ANAND_AK', Type: 'MachineTemplate' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Machines',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.listMachines(20)) as {
      value: Array<{ Name: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('ANAND_AK');
  });

  it('gets a machine by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Machines(765)')
      .reply(200, { Id: 765, Name: 'ANAND_AK', Runtimes: 2 });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Machines',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.getMachine(765)) as {
      Id: number;
      Name: string;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(765);
    expect(result.Name).toBe('ANAND_AK');
  });

  it('gets machines assigned to a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Machines/UiPath.Server.Configuration.OData.GetAssignedMachines(folderId=357953)')
      .query({ robotId: '41', $top: '50', $count: 'true' })
      .reply(200, {
        value: [{ Id: 765, Name: 'ANAND_AK', Runtimes: 2 }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Machines',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.getAssignedMachines(357953, {
      robotId: 41,
      top: 50,
    })) as { value: Array<{ Id: number }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Id).toBe(765);
  });

  it('gets runtimes allocated to a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Machines/UiPath.Server.Configuration.OData.GetRuntimesForFolder(folderId=357953)')
      .query({ $count: 'true' })
      .reply(200, {
        value: [{ MachineId: 765, RuntimeType: 'Unattended', Runtimes: 2 }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Machines',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.getFolderRuntimes(357953)) as {
      value: Array<{ RuntimeType: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].RuntimeType).toBe('Unattended');
  });

  it('gets machine session runtimes filtered by runtime type', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Sessions/UiPath.Server.Configuration.OData.GetMachineSessionRuntimes')
      .query({
        runtimeType: 'Unattended',
        $top: '10',
        $count: 'true',
      })
      .reply(200, {
        value: [{ Id: 22, State: 'Disconnected', RuntimeType: 'Unattended' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Robots',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.getMachineSessionRuntimes({
      runtimeType: 'Unattended',
      top: 10,
    })) as { value: Array<{ RuntimeType: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].RuntimeType).toBe('Unattended');
  });

  it('gets machine session runtimes for a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Sessions/UiPath.Server.Configuration.OData.GetMachineSessionRuntimesByFolderId(folderId=357953)')
      .query({
        robotId: '41',
        runtimeType: 'Unattended',
        $top: '10',
        $count: 'true',
      })
      .reply(200, {
        value: [{ Id: 22, State: 'Available', RuntimeType: 'Unattended' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Robots',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = (await robotsApi.getFolderMachineSessionRuntimes(357953, {
      robotId: 41,
      runtimeType: 'Unattended',
      top: 10,
    })) as { value: Array<{ State: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].State).toBe('Available');
  });

  it('toggles robot enabled status in a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Robots/UiPath.Server.Configuration.OData.ToggleEnabledStatus',
        {
          robotIds: [11, 12],
          enabled: false,
        },
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Robots',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    await robotsApi.toggleRobotEnabledStatus([11, 12], false, {
      folderKey: 'folder-key-1',
    });

    expect(scope.isDone()).toBe(true);
  });

  it('deletes inactive unattended sessions by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Sessions/UiPath.Server.Configuration.OData.DeleteInactiveUnattendedSessions',
        {
          sessionIds: [22, 23],
        },
      )
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Robots',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    await robotsApi.deleteInactiveUnattendedSessions([22, 23]);

    expect(scope.isDone()).toBe(true);
  });

  it('updates folder-machine associations', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.UpdateMachinesToFolderAssociations',
        {
          associations: {
            FolderId: 357953,
            AddedMachineIds: [765],
            RemovedMachineIds: [766],
          },
        },
      )
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Folders',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    await robotsApi.updateMachinesToFolderAssociations({
      folderId: 357953,
      addedMachineIds: [765],
      removedMachineIds: [766],
    });

    expect(scope.isDone()).toBe(true);
  });
});

describe('robot MCP tools', () => {
  it('registers machine and runtime management tools', async () => {
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
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(registeredTools?.uipath_list_machines).toBeDefined();
    expect(registeredTools?.uipath_get_machine).toBeDefined();
    expect(registeredTools?.uipath_get_assigned_machines).toBeDefined();
    expect(registeredTools?.uipath_get_folder_runtimes).toBeDefined();
    expect(registeredTools?.uipath_get_machine_session_runtimes).toBeDefined();
    expect(registeredTools?.uipath_get_folder_machine_session_runtimes).toBeDefined();
    expect(registeredTools?.uipath_toggle_robot_enabled_status).toBeDefined();
    expect(registeredTools?.uipath_delete_inactive_unattended_sessions).toBeDefined();
    expect(
      registeredTools?.uipath_update_machines_to_folder_associations,
    ).toBeDefined();
  });
});
