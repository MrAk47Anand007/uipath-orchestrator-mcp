import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createTasksApi } from '../src/orchestrator/tasks.js';

describe('tasks api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists tasks from the current folder inbox', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Tasks')
      .query({ $top: '20', $count: 'true' })
      .reply(200, { value: [{ Id: 1, Title: 'Approve invoice' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Tasks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createTasksApi(client);
    const result = (await api.listTasks()) as { value: Array<{ Title: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Title).toBe('Approve invoice');
  });

  it('creates a generic task', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      title: 'Approve invoice',
      type: 'ExternalTask',
      priority: 'High',
      data: { invoiceId: 'INV-1001' },
      externalTag: 'ERP-42',
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/tasks/GenericTasks/CreateTask', body)
      .reply(201, { id: 42, title: 'Approve invoice', status: 'Pending' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Tasks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createTasksApi(client);
    const result = (await api.createGenericTask(body)) as { id: number };

    expect(scope.isDone()).toBe(true);
    expect(result.id).toBe(42);
  });

  it('saves and completes a generic task', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const saveScope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/tasks/GenericTasks/SaveTaskData', {
        taskId: 42,
        data: { approved: true },
      })
      .reply(204);

    const completeScope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/tasks/GenericTasks/CompleteTask', {
        taskId: 42,
        data: { approved: true },
        action: 'Approve',
      })
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Tasks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createTasksApi(client);
    await api.saveGenericTaskData(42, { approved: true });
    await api.completeGenericTask(42, { approved: true }, 'Approve');

    expect(saveScope.isDone()).toBe(true);
    expect(completeScope.isDone()).toBe(true);
  });

  it('reassigns a generic task with a note', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      SaveData: true,
      Data: { triage: 'needs manager' },
      NoteText: 'Escalating for manager approval',
      TaskId: 42,
      UserId: 595422,
      UserNameOrEmail: undefined,
      AssignmentCriteria: 'SingleUser',
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/tasks/GenericTasks/SaveAndReassignTask', body)
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Tasks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createTasksApi(client);
    await api.saveAndReassignGenericTask({
      taskId: 42,
      userId: 595422,
      assignmentCriteria: 'SingleUser',
      noteText: 'Escalating for manager approval',
      data: { triage: 'needs manager' },
    });

    expect(scope.isDone()).toBe(true);
  });

  it('creates and lists task notes and activities', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const createNoteScope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/TaskNotes/UiPath.Server.Configuration.OData.CreateTaskNote',
        { Text: 'Investigating this case', TaskId: 42 },
      )
      .reply(201, { Id: 5, Text: 'Investigating this case' });

    const listNotesScope = nock('https://cloud.uipath.com')
      .get(
        '/acme/DefaultTenant/orchestrator_/odata/TaskNotes/UiPath.Server.Configuration.OData.GetByTaskId(taskId=42)',
      )
      .query({ $top: '50', $count: 'true' })
      .reply(200, { value: [{ Id: 5, Text: 'Investigating this case' }] });

    const listActivitiesScope = nock('https://cloud.uipath.com')
      .get(
        '/acme/DefaultTenant/orchestrator_/odata/TaskActivities/UiPath.Server.Configuration.OData.GetByTaskId(taskId=42)',
      )
      .query({ $top: '50', $count: 'true' })
      .reply(200, { value: [{ TaskNoteId: 5, Message: 'Note added' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Tasks',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createTasksApi(client);
    const note = (await api.createTaskNote(42, 'Investigating this case')) as {
      Id: number;
    };
    const notes = (await api.listTaskNotes(42)) as {
      value: Array<{ Text: string }>;
    };
    const activities = (await api.listTaskActivities(42)) as {
      value: Array<{ Message: string }>;
    };

    expect(createNoteScope.isDone()).toBe(true);
    expect(listNotesScope.isDone()).toBe(true);
    expect(listActivitiesScope.isDone()).toBe(true);
    expect(note.Id).toBe(5);
    expect(notes.value[0].Text).toBe('Investigating this case');
    expect(activities.value[0].Message).toBe('Note added');
  });
});

describe('task MCP tools', () => {
  it('registers task inbox and generic task tools', async () => {
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

    expect(registeredTools?.uipath_list_tasks).toBeDefined();
    expect(registeredTools?.uipath_get_task).toBeDefined();
    expect(registeredTools?.uipath_get_task_by_key).toBeDefined();
    expect(registeredTools?.uipath_list_tasks_across_folders).toBeDefined();
    expect(registeredTools?.uipath_get_task_permissions).toBeDefined();
    expect(registeredTools?.uipath_get_task_users).toBeDefined();
    expect(registeredTools?.uipath_create_generic_task).toBeDefined();
    expect(registeredTools?.uipath_get_generic_task_data).toBeDefined();
    expect(registeredTools?.uipath_save_generic_task_data).toBeDefined();
    expect(registeredTools?.uipath_complete_generic_task).toBeDefined();
    expect(registeredTools?.uipath_save_and_reassign_generic_task).toBeDefined();
    expect(registeredTools?.uipath_list_task_notes).toBeDefined();
    expect(registeredTools?.uipath_create_task_note).toBeDefined();
    expect(registeredTools?.uipath_list_task_activities).toBeDefined();
  });
});
