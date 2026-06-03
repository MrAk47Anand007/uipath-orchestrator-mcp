import nock from 'nock';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

  it('reads a bucket file through the signed uri', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const readUriScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.GetReadUri')
      .query({ path: 'sample.txt', expiryInMinutes: '15' })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { Uri: 'https://download.example/sample.txt' });

    const downloadScope = nock('https://download.example')
      .get('/sample.txt')
      .reply(200, 'hello from bucket', {
        'content-type': 'text/plain',
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.readBucketFile(
      7651,
      'sample.txt',
      { folderKey: 'folder-key-1' },
      { expiryInMinutes: 15 },
    )) as { content: string; contentType: string | null; readUri: string };

    expect(readUriScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    expect(result.content).toBe('hello from bucket');
    expect(result.contentType).toBe('text/plain');
    expect(result.readUri).toContain('download.example');
  });

  it('gets a direct write uri for a bucket file', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.GetWriteUri')
      .query({
        path: 'sample.txt',
        expiryInMinutes: '15',
        contentType: 'text/plain',
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        Uri: 'https://upload.example/sample.txt',
        Verb: 'PUT',
        RequiresAuth: false,
        Headers: {
          Keys: ['x-ms-blob-type'],
          Values: ['BlockBlob'],
        },
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = (await resourcesApi.getBucketWriteUri(
      7651,
      'sample.txt',
      'text/plain',
      15,
      { folderKey: 'folder-key-1' },
    )) as { Uri: string; Verb: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Uri).toContain('upload.example');
    expect(result.Verb).toBe('PUT');
  });

  it('uploads a local file to a storage bucket using the write uri', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'uipath-bucket-upload-'));
    const localFilePath = join(tempDir, 'sample.txt');
    await writeFile(localFilePath, 'hello from codex', 'utf8');

    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const writeUriScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.GetWriteUri')
      .query({
        path: 'sample.txt',
        expiryInMinutes: '15',
        contentType: 'text/plain',
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        Uri: 'https://upload.example/sample.txt',
        Verb: 'PUT',
        RequiresAuth: false,
        Headers: { 'x-ms-blob-type': 'BlockBlob' },
      });

    const uploadScope = nock('https://upload.example')
      .put('/sample.txt', 'hello from codex')
      .matchHeader('content-type', 'text/plain')
      .matchHeader('x-ms-blob-type', 'BlockBlob')
      .reply(201);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    const result = await resourcesApi.uploadBucketFile(
      7651,
      localFilePath,
      { folderKey: 'folder-key-1' },
      { contentType: 'text/plain' },
    );

    expect(writeUriScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(result).toEqual({
      bucketId: 7651,
      path: 'sample.txt',
      localFilePath,
      verb: 'PUT',
      uploadUri: 'https://upload.example/sample.txt',
    });
  });

  it('deletes a file from a storage bucket', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete('/acme/DefaultTenant/orchestrator_/odata/Buckets(7651)/UiPath.Server.Configuration.OData.DeleteFile')
      .query({ path: 'sample.txt' })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Buckets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    await resourcesApi.deleteBucketFile(7651, 'sample.txt', {
      folderKey: 'folder-key-1',
    });

    expect(scope.isDone()).toBe(true);
  });

  it('creates a text asset', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Assets', {
        Name: 'NewTextAsset',
        ValueScope: 'Global',
        ValueType: 'Text',
        StringValue: 'hello world',
        Description: 'Created from MCP',
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(201, {
        Id: 99,
        Name: 'NewTextAsset',
        ValueType: 'Text',
        StringValue: 'hello world',
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
    const result = (await resourcesApi.createAsset(
      {
        Name: 'NewTextAsset',
        ValueScope: 'Global',
        ValueType: 'Text',
        StringValue: 'hello world',
        Description: 'Created from MCP',
      },
      { folderKey: 'folder-key-1' },
    )) as { Id: number; Name: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(99);
    expect(result.Name).toBe('NewTextAsset');
  });

  it('updates a text asset by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const getScope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Assets(99)')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        Key: 'asset-key-1',
        Name: 'NewTextAsset',
        CanBeDeleted: true,
        ValueScope: 'Global',
        ValueType: 'Text',
        Value: 'hello world',
        StringValue: 'hello world',
        BoolValue: false,
        IntValue: 0,
        CredentialUsername: '',
        CredentialPassword: '',
        SecretValue: '',
        ExternalName: '',
        CredentialStoreId: null,
        HasDefaultValue: true,
        Description: 'Created from MCP',
        AllowDirectApiAccess: false,
        FoldersCount: 1,
        LastModificationTime: '2026-06-02T00:00:00Z',
        LastModifierUserId: 1,
        CreationTime: '2026-06-01T00:00:00Z',
        CreatorUserId: 1,
        Id: 99,
        KeyValueList: [],
        Tags: [],
      });

    const putScope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/odata/Assets(99)', {
        Key: 'asset-key-1',
        Name: 'NewTextAsset',
        CanBeDeleted: true,
        ValueScope: 'Global',
        ValueType: 'Text',
        Value: 'hello world',
        StringValue: 'updated text',
        BoolValue: false,
        IntValue: 0,
        CredentialUsername: '',
        CredentialPassword: '',
        SecretValue: '',
        ExternalName: '',
        CredentialStoreId: null,
        HasDefaultValue: true,
        Description: 'Updated from MCP',
        AllowDirectApiAccess: false,
        FoldersCount: 1,
        LastModificationTime: '2026-06-02T00:00:00Z',
        LastModifierUserId: 1,
        CreationTime: '2026-06-01T00:00:00Z',
        CreatorUserId: 1,
        Id: 99,
        KeyValueList: [],
        Tags: [],
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Assets',
      defaultFolderKey: 'folder-key-1',
    });

    const resourcesApi = createResourcesApi(client);
    await resourcesApi.updateAsset(
      99,
      {
        Name: 'NewTextAsset',
        ValueScope: 'Global',
        ValueType: 'Text',
        StringValue: 'updated text',
        Description: 'Updated from MCP',
      },
      { folderKey: 'folder-key-1' },
    );

    expect(getScope.isDone()).toBe(true);
    expect(putScope.isDone()).toBe(true);
  });
});
