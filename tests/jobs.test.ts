import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createJobsApi } from '../src/orchestrator/jobs.js';
import { createServer } from '../src/server.js';

describe('server discovery tools', () => {
  it('registers folder and process lookup tools', () => {
    const server = createServer({
      foldersApi: {
        listCurrentUserFolders: vi.fn(),
        searchAccessibleFolders: vi.fn(),
      },
      jobsApi: {
        listProcesses: vi.fn(),
        listReleases: vi.fn(),
      },
      queuesApi: {},
      robotsApi: {},
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(Object.keys(registeredTools ?? {}).length).toBeGreaterThanOrEqual(3);
    expect(registeredTools?.uipath_list_folders).toBeDefined();
    expect(registeredTools?.uipath_search_folders).toBeDefined();
    expect(registeredTools?.uipath_list_processes).toBeDefined();
  });
});

describe('jobs api', () => {
  beforeEach(() => nock.cleanAll());

  it('starts a job using ReleaseKey and ModernJobsCount', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs', {
        startInfo: {
          ReleaseKey: 'release-key-1',
          Strategy: 'ModernJobsCount',
          RobotIds: [],
          JobsCount: 1,
          InputArguments: '{"invoiceId":"INV-1001"}',
        },
      })
      .reply(201, { value: [{ Key: 'job-key-1', State: 'Pending' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const jobsApi = createJobsApi(client);
    const result = (await jobsApi.startJob({
      releaseKey: 'release-key-1',
      jobsCount: 1,
      inputArguments: { invoiceId: 'INV-1001' },
    })) as { value: Array<{ State: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].State).toBe('Pending');
  });
});
