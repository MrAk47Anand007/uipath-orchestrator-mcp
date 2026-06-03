import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createQueuesApi } from '../src/orchestrator/queues.js';

describe('queues api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists queue definitions with filters', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueDefinitions')
      .query({
        $top: '50',
        $count: 'true',
        $filter: "Name eq 'Invoices'",
      })
      .reply(200, { value: [{ Id: 7, Name: 'Invoices' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Queues',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const result = (await queuesApi.listQueueDefinitions({
      top: 50,
      filter: "Name eq 'Invoices'",
    })) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('Invoices');
  });

  it('adds a queue item with specific content', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Queues/UiPathODataSvc.AddQueueItem', {
        itemData: {
          Name: 'Invoices',
          Priority: 'High',
          SpecificContent: { invoiceId: 'INV-1001', amount: 4500 },
          Reference: 'INV-1001',
        },
      })
      .reply(201, { Id: 42, Status: 'New', Reference: 'INV-1001' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const result = (await queuesApi.addQueueItem({
      queueName: 'Invoices',
      priority: 'High',
      specificContent: { invoiceId: 'INV-1001', amount: 4500 },
      reference: 'INV-1001',
    })) as { Status: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Status).toBe('New');
  });

  it('bulk adds queue items in one request', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Queues/UiPathODataSvc.BulkAddQueueItems', {
        queueName: 'Invoices',
        commitType: 'ProcessAllIndependently',
        queueItems: [
          {
            Name: 'Invoices',
            Priority: 'High',
            SpecificContent: { invoiceId: 'INV-1001' },
            Reference: 'INV-1001',
            DeferDate: undefined,
            DueDate: undefined,
            RiskSlaDate: undefined,
            Progress: 'Queued',
          },
          {
            Name: 'Invoices',
            Priority: 'Normal',
            SpecificContent: { invoiceId: 'INV-1002' },
            Reference: 'INV-1002',
            DeferDate: undefined,
            DueDate: undefined,
            RiskSlaDate: undefined,
            Progress: undefined,
          },
        ],
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { Successful: 2, Failed: 0 });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Queues',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const result = (await queuesApi.bulkAddQueueItems({
      queueName: 'Invoices',
      queueItems: [
        {
          priority: 'High',
          specificContent: { invoiceId: 'INV-1001' },
          reference: 'INV-1001',
          progress: 'Queued',
        },
        {
          specificContent: { invoiceId: 'INV-1002' },
          reference: 'INV-1002',
        },
      ],
      folder: { folderKey: 'folder-key-1' },
    })) as { Successful: number; Failed: number };

    expect(scope.isDone()).toBe(true);
    expect(result.Successful).toBe(2);
    expect(result.Failed).toBe(0);
  });

  it('creates and updates a queue definition', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const createBody = {
      Name: 'CodexQueue',
      Description: 'Queue for codex tests',
      MaxNumberOfRetries: 1,
      AcceptAutomaticallyRetry: true,
      RetryAbandonedItems: false,
      EnforceUniqueReference: true,
      Encrypted: false,
      SpecificDataJsonSchema: undefined,
      OutputDataJsonSchema: undefined,
      AnalyticsDataJsonSchema: undefined,
      SlaInMinutes: undefined,
      RiskSlaInMinutes: undefined,
      ReleaseId: undefined,
    };

    const createScope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/QueueDefinitions', createBody)
      .reply(201, { Id: 77, ...createBody });

    const existing = {
      Id: 77,
      Key: 'f6ce13f3-9c55-4b10-82fe-0c658120c3a0',
      Name: 'CodexQueue',
      Description: 'Queue for codex tests',
      MaxNumberOfRetries: 1,
      AcceptAutomaticallyRetry: true,
      RetryAbandonedItems: false,
      EnforceUniqueReference: true,
      Encrypted: false,
    };

    const getScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueDefinitions(77)')
      .reply(200, existing);

    const updateScope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/odata/QueueDefinitions(77)', {
        ...existing,
        Description: 'Updated description',
      })
      .reply(200, { ...existing, Description: 'Updated description' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Queues',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const created = (await queuesApi.createQueueDefinition({
      name: 'CodexQueue',
      description: 'Queue for codex tests',
      maxNumberOfRetries: 1,
      acceptAutomaticallyRetry: true,
      enforceUniqueReference: true,
    })) as { Id: number };

    const updated = (await queuesApi.updateQueueDefinition(77, {
      description: 'Updated description',
    })) as { Description: string };

    expect(createScope.isDone()).toBe(true);
    expect(getScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(created.Id).toBe(77);
    expect(updated.Description).toBe('Updated description');
  });

  it('manages queue item comments and histories', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const createScope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/QueueItemComments', {
        QueueItemId: 42,
        Text: 'Needs manual verification',
      })
      .reply(201, { Id: 11, QueueItemId: 42, Text: 'Needs manual verification' });

    const getScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueItemComments(11)')
      .reply(200, { Id: 11, QueueItemId: 42, Text: 'Needs manual verification' });

    const updateScope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/odata/QueueItemComments(11)', {
        Id: 11,
        QueueItemId: 42,
        Text: 'Reviewed and approved',
      })
      .reply(200, { Id: 11, QueueItemId: 42, Text: 'Reviewed and approved' });

    const historyScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueItemComments/UiPath.Server.Configuration.OData.GetQueueItemCommentsHistory(queueItemId=42)')
      .query({ $count: 'true' })
      .reply(200, { value: [{ Id: 11, Text: 'Reviewed and approved' }] });

    const eventHistoryScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueItemEvents/UiPath.Server.Configuration.OData.GetQueueItemEventsHistory(queueItemId=42)')
      .query({ $count: 'true' })
      .reply(200, { value: [{ Id: 21, EventType: 'Updated' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Queues',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const created = (await queuesApi.createQueueItemComment({
      queueItemId: 42,
      text: 'Needs manual verification',
    })) as { Id: number };

    const updated = (await queuesApi.updateQueueItemComment(11, {
      text: 'Reviewed and approved',
    })) as { Text: string };

    const commentHistory = (await queuesApi.getQueueItemCommentsHistory(42)) as {
      value: Array<{ Text: string }>;
    };

    const eventHistory = (await queuesApi.getQueueItemEventsHistory(42)) as {
      value: Array<{ EventType: string }>;
    };

    expect(createScope.isDone()).toBe(true);
    expect(getScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(historyScope.isDone()).toBe(true);
    expect(eventHistoryScope.isDone()).toBe(true);
    expect(created.Id).toBe(11);
    expect(updated.Text).toBe('Reviewed and approved');
    expect(commentHistory.value[0].Text).toBe('Reviewed and approved');
    expect(eventHistory.value[0].EventType).toBe('Updated');
  });

  it('retrieves queue processing analytics', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const statusScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueProcessingRecords/UiPathODataSvc.RetrieveQueuesProcessingStatus')
      .query({ $count: 'true' })
      .reply(200, {
        value: [{ QueueDefinitionId: 7, QueueDefinitionName: 'Invoices', ItemsToProcess: 3 }],
      });

    const recordsScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueProcessingRecords/UiPathODataSvc.RetrieveLastDaysProcessingRecords(daysNo=7,queueDefinitionId=7)')
      .query({ $count: 'true' })
      .reply(200, {
        value: [{ QueueDefinitionId: 7, NumberOfSuccessfulTransactions: 12 }],
      });

    const processingHistoryScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/QueueItems(42)/UiPathODataSvc.GetItemProcessingHistory')
      .query({ $count: 'true' })
      .reply(200, {
        value: [{ Id: 42, Progress: 'Validated', RetryNumber: 1 }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Queues',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const status = (await queuesApi.retrieveQueuesProcessingStatus()) as {
      value: Array<{ ItemsToProcess: number }>;
    };
    const records = (await queuesApi.retrieveQueueProcessingRecords(7, 7)) as {
      value: Array<{ NumberOfSuccessfulTransactions: number }>;
    };
    const history = (await queuesApi.getQueueItemProcessingHistory(42)) as {
      value: Array<{ Progress: string }>;
    };

    expect(statusScope.isDone()).toBe(true);
    expect(recordsScope.isDone()).toBe(true);
    expect(processingHistoryScope.isDone()).toBe(true);
    expect(status.value[0].ItemsToProcess).toBe(3);
    expect(records.value[0].NumberOfSuccessfulTransactions).toBe(12);
    expect(history.value[0].Progress).toBe('Validated');
  });
});
