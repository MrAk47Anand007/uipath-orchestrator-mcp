import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createReleasesApi } from '../src/orchestrator/releases.js';

describe('releases api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists releases in the selected folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Releases?$top=20&$count=true')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        value: [{ Id: 130974, Name: 'UiPathAgentTesting', Key: 'release-key-1' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.listReleases(20, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Id: number; Name: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Id).toBe(130974);
  });

  it('gets a release by guid key', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get("/acme/DefaultTenant/orchestrator_/odata/Releases/UiPath.Server.Configuration.OData.GetByKey(identifier=release-key-1)")
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, {
        Id: 130974,
        Key: 'release-key-1',
        Name: 'UiPathAgentTesting',
        ProcessKey: 'UiPathAgentTesting',
        ProcessVersion: '1.0.2',
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.getReleaseByKey('release-key-1', {
      folderKey: 'folder-key-1',
    })) as { ProcessVersion: string };

    expect(scope.isDone()).toBe(true);
    expect(result.ProcessVersion).toBe('1.0.2');
  });

  it('creates a release', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'UiPathAgentTesting Copy',
      ProcessKey: 'UiPathAgentTesting',
      ProcessVersion: '1.0.2',
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Releases', body)
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(201, {
        Id: 200001,
        Key: 'release-key-copy',
        ...body,
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.createRelease(body, {
      folderKey: 'folder-key-1',
    })) as { Id: number; Name: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(200001);
  });

  it('deletes a release by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete('/acme/DefaultTenant/orchestrator_/odata/Releases(200001)')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    await releasesApi.deleteRelease(200001, { folderKey: 'folder-key-1' });

    expect(scope.isDone()).toBe(true);
  });

  it('patches a release by id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .patch('/acme/DefaultTenant/orchestrator_/odata/Releases(200001)', {
        Name: 'UiPathAgentTesting Updated',
        InputArguments: '{"source":"codex"}',
      })
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: true });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.updateRelease(
      200001,
      {
        Name: 'UiPathAgentTesting Updated',
        InputArguments: '{"source":"codex"}',
      },
      { folderKey: 'folder-key-1' },
    )) as { value: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(true);
  });

  it('updates a release to the latest package version', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Releases/UiPath.Server.Configuration.OData.UpdateToLatestPackageVersionByKey(identifier=release-key-1)')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: 'release-key-1' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.updateReleaseToLatestPackage('release-key-1', {
      folderKey: 'folder-key-1',
    })) as { value: string };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe('release-key-1');
  });

  it('updates a release to a specific package version', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Releases/UiPath.Server.Configuration.OData.UpdateToSpecificPackageVersionByKey(identifier=release-key-1)',
        { packageVersion: '1.0.1' },
      )
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: 'release-key-1' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.updateReleaseToSpecificPackage(
      'release-key-1',
      '1.0.1',
      { folderKey: 'folder-key-1' },
    )) as { value: string };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe('release-key-1');
  });

  it('rolls back a release to the previous package version', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Releases/UiPath.Server.Configuration.OData.RollbackToPreviousReleaseVersionByKey(identifier=release-key-1)')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: 'release-key-1' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.rollbackRelease('release-key-1', {
      folderKey: 'folder-key-1',
    })) as { value: string };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe('release-key-1');
  });

  it('uploads a local .nupkg process package', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'uipath-package-upload-'));
    const localFilePath = join(tempDir, 'UiPathAgentTesting.1.0.3.nupkg');
    await writeFile(localFilePath, 'package-bytes', 'utf8');

    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage')
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .matchHeader('content-type', /multipart\/form-data; boundary=/)
      .reply(200, {
        value: [{ Id: 300001, Key: 'UiPathAgentTesting', Version: '1.0.3' }],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    const result = (await releasesApi.uploadProcessPackage(localFilePath, {
      folderKey: 'folder-key-1',
    })) as { value: Array<{ Version: string }> };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Version).toBe('1.0.3');
  });

  it('deletes a process package by process key', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete("/acme/DefaultTenant/orchestrator_/odata/Processes('UiPathAgentTesting')")
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Execution',
      defaultFolderKey: 'folder-key-1',
    });

    const releasesApi = createReleasesApi(client);
    await releasesApi.deleteProcessPackage('UiPathAgentTesting', {
      folderKey: 'folder-key-1',
    });

    expect(scope.isDone()).toBe(true);
  });
});
