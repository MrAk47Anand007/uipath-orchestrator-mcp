import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createSchedulesApi } from '../src/orchestrator/schedules.js';

describe('schedules api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists process schedules in the selected folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/ProcessSchedules?$top=20&$count=true')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 18, Name: 'Nightly Finance Sync', Enabled: true }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const schedulesApi = createSchedulesApi(client);
    const result = (await schedulesApi.listSchedules(20, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Id: number; Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Id).toBe(18);
    expect(result.value[0].Name).toBe('Nightly Finance Sync');
  });

  it('creates a disabled time-based process schedule', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'Codex Test Schedule',
      Enabled: false,
      StartStrategy: 1,
      SpecificPriorityValue: null,
      JobPriority: null,
      RuntimeType: 'Unattended',
      InputArguments: '{"source":"codex"}',
      ResumeOnSameContext: false,
      StopProcessExpression: '',
      RunAsMe: false,
      IsConnected: false,
      UseCalendar: false,
      ActivateOnJobComplete: false,
      EntryPointPath: null,
      StartProcessCronDetails: '{"advancedCron":"0 0 9 * * ?"}',
      StartProcessCron: '0 0 9 * * ?',
      ExecutorRobots: [],
      ReleaseId: 3456,
      ReleaseName: 'UiPathAgentTesting',
      TimeZoneId: 'India Standard Time',
      StopProcessDate: null,
      ExternalJobKey: '',
      MachineRobots: [],
      Tags: [],
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/ProcessSchedules', body)
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(201, {
        Id: 77,
        ...body,
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const schedulesApi = createSchedulesApi(client);
    const result = (await schedulesApi.createSchedule(
      {
        Name: 'Codex Test Schedule',
        ReleaseId: 3456,
        StartProcessCron: '0 0 9 * * ?',
        StartStrategy: 1,
        TimeZoneId: 'India Standard Time',
        Enabled: false,
        InputArguments: '{"source":"codex"}',
        ReleaseName: 'UiPathAgentTesting',
        SpecificPriorityValue: null,
        JobPriority: null,
        RuntimeType: 'Unattended',
        ResumeOnSameContext: false,
        StopProcessExpression: '',
        RunAsMe: false,
        IsConnected: false,
        UseCalendar: false,
        ActivateOnJobComplete: false,
        EntryPointPath: null,
        StartProcessCronDetails: '{"advancedCron":"0 0 9 * * ?"}',
        ExecutorRobots: [],
        StopProcessDate: null,
        ExternalJobKey: '',
        MachineRobots: [],
        Tags: [],
      },
      { folderKey: 'folder-key-1' },
    )) as { Id: number; Name: string; Enabled: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(77);
    expect(result.Enabled).toBe(false);
  });

  it('enables or disables schedules in bulk', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/ProcessSchedules/UiPath.Server.Configuration.OData.SetEnabled',
        {
          enabled: false,
          scheduleIds: [77],
        },
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [{ Id: 77, Enabled: false }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const schedulesApi = createSchedulesApi(client);
    const result = (await schedulesApi.setSchedulesEnabled(
      [77],
      false,
      { folderKey: 'folder-key-1' },
    )) as { value: Array<{ Id: number; Enabled: boolean }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Enabled).toBe(false);
  });

  it('deletes a process schedule by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete('/acme/DefaultTenant/orchestrator_/odata/ProcessSchedules(77)')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const schedulesApi = createSchedulesApi(client);
    await schedulesApi.deleteSchedule(77, { folderKey: 'folder-key-1' });

    expect(scope.isDone()).toBe(true);
  });
});
