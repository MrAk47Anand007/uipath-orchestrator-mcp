import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createResourcesApi } from '../src/orchestrator/resources.js';

describe('resources api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists assets in the selected folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Assets?$top=20')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [{ Name: 'TestAsset', ValueScope: 'Global' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Assets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.listAssets(20, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('TestAsset');
  });

  it('lists storage buckets in the selected folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets?$top=20')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [{ Name: 'TestBucket' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.listBuckets(20, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Name).toBe('TestBucket');
  });

  it('gets a single asset by name using filtered lookup', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get((uri) =>
        uri.startsWith('/acme/DefaultTenant/orchestrator_/odata/Assets/UiPath.Server.Configuration.OData.GetFiltered?'),
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 42, Name: 'TestAsset', StringValue: 'hello' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Assets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.getAssetByName('TestAsset', {
      folderKey: 'folder-key-1',
    })) as { Id: number; Name: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Name).toBe('TestAsset');
    expect(result.Id).toBe(42);
  });

  it('lists files in a storage bucket', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.GetFiles')
      .query({ directory: '/', recursive: 'false', '$top': '20' })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [{ FullPath: 'sample.txt', Length: 12 }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.listBucketFiles(
      7651,
      { folderKey: 'folder-key-1' },
      { recursive: false, top: 20 },
    )) as { value: Array<{ FullPath: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].FullPath).toBe('sample.txt');
  });

  it('gets a direct read uri for a bucket file', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.GetReadUri')
      .query({ path: 'sample.txt', expiryInMinutes: '15' })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { Uri: 'https://download.example/sample.txt' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.getBucketReadUri(
      7651,
      'sample.txt',
      15,
      { folderKey: 'folder-key-1' },
    )) as { Uri: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Uri).toContain('download.example');
  });
});
