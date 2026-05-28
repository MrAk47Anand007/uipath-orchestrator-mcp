import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createQueuesApi } from '../src/orchestrator/queues.js';

describe('queues api', () => {
  beforeEach(() => nock.cleanAll());

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
});
