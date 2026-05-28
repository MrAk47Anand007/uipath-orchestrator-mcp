import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';

describe('admin api', () => {
  beforeEach(() => nock.cleanAll());

  it('searches directory objects by query and type', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/api/DirectoryService/SearchForUsersAndGroups')
      .query({
        prefix: 'anand',
        searchContext: 'Users',
      })
      .reply(200, {
        value: [
          {
            type: 'User',
            identifier: 'user-1',
            displayName: 'Anand Kale',
            identityName: 'anand.kale@xalta.tech',
          },
        ],
      });

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Users',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    const result = (await adminApi.searchDirectoryObjects({
      searchTerm: 'anand',
      type: 'User',
    })) as { value: Array<{ displayName: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].displayName).toBe('Anand Kale');
  });

  it('lists roles from odata Roles', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Roles')
      .query({ $top: '20', $count: 'true' })
      .reply(200, {
        value: [{ Id: 1, Name: 'Automation User', Type: 'Tenant' }],
      });

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Users',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    const result = (await adminApi.listRoles({ top: 20 })) as {
      value: Array<{ Name: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('Automation User');
  });

  it('assigns role ids to a user', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Users(42)/UiPath.Server.Configuration.OData.AssignRoles',
        { roleIds: [10, 11] },
      )
      .reply(200);

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Users',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    await adminApi.assignRolesToUser(42, [10, 11]);
    expect(scope.isDone()).toBe(true);
  });

  it('toggles a role for a user by role name', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Users(42)/UiPath.Server.Configuration.OData.ToggleRole',
        { role: 'Automation User', toggle: true },
      )
      .reply(200);

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Users',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    await adminApi.toggleUserRole(42, 'Automation User', true);
    expect(scope.isDone()).toBe(true);
  });

  it('lists users who have access to a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.GetUsersForFolder(key=357953,includeInherited=true)')
      .query({ $top: '25', $count: 'true' })
      .reply(200, {
        value: [
          {
            Id: 595422,
            Name: 'anand.kale@xalta.tech',
            Roles: [{ Id: 3, Name: 'Allow to be Folder Administrator' }],
          },
        ],
      });

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Folders',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    const result = (await adminApi.listFolderUsers(357953, {
      includeInherited: true,
      top: 25,
    })) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('anand.kale@xalta.tech');
  });

  it('maps a user to folder roles across folders', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get("/acme/DefaultTenant/orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.GetAllRolesForUser(username='anand.kale%40xalta.tech',skip=0,take=10)")
      .query({ type: 'User' })
      .reply(200, {
        TenantRoles: [],
        PageItems: [
          {
            Folder: { Id: 357953, DisplayName: 'Shared' },
            Roles: [{ Id: 3, Name: 'Allow to be Folder Administrator' }],
          },
        ],
        Count: 1,
      });

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Folders',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    const result = (await adminApi.getFolderRolesForUser('anand.kale@xalta.tech', {
      skip: 0,
      take: 10,
      type: 'User',
    })) as { Count: number };

    expect(scope.isDone()).toBe(true);
    expect(result.Count).toBe(1);
  });

  it('gets directory permissions for a user', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/api/DirectoryService/GetDirectoryPermissions')
      .query({ username: 'anand.kale@xalta.tech' })
      .reply(200, [
        { Name: 'Users.View' },
        { Name: 'Units.View' },
      ]);

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Users',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    const result = (await adminApi.getDirectoryPermissions({
      username: 'anand.kale@xalta.tech',
    })) as Array<{ Name: string }>;

    expect(scope.isDone()).toBe(true);
    expect(result[0].Name).toBe('Users.View');
  });

  it('assigns users to folders with specific folder roles', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Folders/UiPath.Server.Configuration.OData.AssignUsers', {
        assignments: {
          UserIds: [595422],
          RolesPerFolder: [
            {
              FolderId: 357953,
              RoleIds: [3],
            },
          ],
        },
      })
      .reply(204);

    const { createAdminApi } = await import('../src/orchestrator/admin.js');
    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Folders',
      defaultFolderKey: 'folder-key-1',
    });

    const adminApi = createAdminApi(client);
    await adminApi.assignUsersToFolders({
      userIds: [595422],
      rolesPerFolder: [{ folderId: 357953, roleIds: [3] }],
    });

    expect(scope.isDone()).toBe(true);
  });
});

describe('admin MCP tools', () => {
  it('registers read and write role tools', async () => {
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
      queuesApi: {
        listQueueDefinitions: vi.fn(),
        listQueueItems: vi.fn(),
        addQueueItem: vi.fn(),
        setQueueItemProgress: vi.fn(),
      },
      resourcesApi: {
        listAssets: vi.fn(),
        getAssetByName: vi.fn(),
        listBuckets: vi.fn(),
        listBucketFiles: vi.fn(),
        getBucketReadUri: vi.fn(),
      },
      robotsApi: {
        listSessions: vi.fn(),
        listRobots: vi.fn(),
        getJobsStats: vi.fn(),
        getSessionsStats: vi.fn(),
        getStatus: vi.fn(),
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

    expect(registeredTools?.uipath_search_directory_objects).toBeDefined();
    expect(registeredTools?.uipath_list_roles).toBeDefined();
    expect(registeredTools?.uipath_list_folder_users).toBeDefined();
    expect(registeredTools?.uipath_get_user_folder_roles).toBeDefined();
    expect(registeredTools?.uipath_get_directory_permissions).toBeDefined();
    expect(registeredTools?.uipath_assign_users_to_folders).toBeDefined();
    expect(registeredTools?.uipath_assign_roles_to_user).toBeDefined();
    expect(registeredTools?.uipath_toggle_user_role).toBeDefined();
  });
});
