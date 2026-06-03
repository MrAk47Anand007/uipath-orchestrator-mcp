import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createJobTriggersApi } from '../src/orchestrator/job-triggers.js';

describe('job triggers api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists job triggers in a folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/JobTriggers?$top=20&$count=true')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 18, JobId: 123, TriggerType: 'Inbox', Status: 'Ready' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.listJobTriggers(20, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Id: number; JobId: number }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Id).toBe(18);
    expect(result.value[0].JobId).toBe(123);
  });

  it('gets job triggers by job key', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const jobKey = '9f91a0c1-9287-4f29-8d85-38bad1d5a7a1';
    const encodedJobKey = encodeURIComponent(jobKey);
    const scope = nock('https://cloud.uipath.com')
      .get(
        `/acme/DefaultTenant/orchestrator_/odata/JobTriggers/UiPath.Server.Configuration.OData.GetByJobKey(jobKey=${encodedJobKey})?$top=20&$count=true`,
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 18, ItemKey: jobKey, Status: 'Ready' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.getJobTriggersByJobKey(jobKey, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ ItemKey: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].ItemKey).toBe(jobKey);
  });

  it('gets job trigger wait events by job id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get(
        '/acme/DefaultTenant/orchestrator_/odata/JobTriggers/UiPath.Server.Configuration.OData.GetWithWaitEvents(jobId=123)?$top=20&$count=true',
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 18, JobId: 123, ItemName: 'Review Task', Status: 'Ready' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.getJobTriggerWaitEvents(123, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ ItemName: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].ItemName).toBe('Review Task');
  });

  it('creates an external trigger', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      type: 'DeepRag',
      externalId: '8d39ff1f-eb44-48eb-95ae-e8aeb6e5d119',
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/api/JobTriggers/SaveExternalTrigger', body)
      .reply(201, {
        status: 'Ready',
        type: 'DeepRag',
        externalId: '8d39ff1f-eb44-48eb-95ae-e8aeb6e5d119',
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.createExternalTrigger(body)) as {
      status: string;
      externalId: string;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.status).toBe('Ready');
  });

  it('gets payload for an inbox trigger', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const inboxId = '8d39ff1f-eb44-48eb-95ae-e8aeb6e5d119';
    const scope = nock('https://cloud.uipath.com')
      .get(`/acme/DefaultTenant/orchestrator_/api/JobTriggers/GetPayload/${inboxId}`)
      .reply(200, {
        source: 'codex',
        status: 'ready',
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.getPayload(inboxId)) as {
      source: string;
      status: string;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.source).toBe('codex');
  });

  it('delivers payload to an inbox trigger', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const inboxId = '8d39ff1f-eb44-48eb-95ae-e8aeb6e5d119';
    const body = {
      approved: true,
      ticketId: 'INC-1001',
    };

    const scope = nock('https://cloud.uipath.com')
      .post(`/acme/DefaultTenant/orchestrator_/api/JobTriggers/DeliverPayload/${inboxId}`, body)
      .reply(200, { delivered: true });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Jobs',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createJobTriggersApi(client);
    const result = (await api.deliverPayload(inboxId, body)) as { delivered: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.delivered).toBe(true);
  });
});

describe('job trigger MCP tools', () => {
  it('registers job trigger tools', () => {
    const server = createServer({
      jobTriggersApi: {
        listJobTriggers: vi.fn(),
        getJobTriggersByJobKey: vi.fn(),
        getJobTriggerWaitEvents: vi.fn(),
        createExternalTrigger: vi.fn(),
        getPayload: vi.fn(),
        deliverPayload: vi.fn(),
      },
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(registeredTools?.uipath_list_job_triggers).toBeDefined();
    expect(registeredTools?.uipath_get_job_triggers_by_job_key).toBeDefined();
    expect(registeredTools?.uipath_get_job_trigger_wait_events).toBeDefined();
    expect(registeredTools?.uipath_create_external_job_trigger).toBeDefined();
    expect(registeredTools?.uipath_get_job_trigger_payload).toBeDefined();
    expect(registeredTools?.uipath_deliver_job_trigger_payload).toBeDefined();
  });
});
