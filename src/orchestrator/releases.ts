import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createReleasesApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listReleases(top = 20, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: String(top),
        $count: 'true',
      });
      return client.get(`/odata/Releases?${query.toString()}`, folder);
    },
    getReleaseByKey(releaseKey: string, folder?: FolderSelector) {
      return client.get(
        `/odata/Releases/UiPath.Server.Configuration.OData.GetByKey(identifier=${releaseKey})`,
        folder,
      );
    },
    createRelease(release: Record<string, unknown>, folder?: FolderSelector) {
      return client.post('/odata/Releases', release, folder);
    },
    updateRelease(
      releaseId: number,
      release: Record<string, unknown>,
      folder?: FolderSelector,
    ) {
      return client.patch(`/odata/Releases(${releaseId})`, release, folder);
    },
    deleteRelease(releaseId: number, folder?: FolderSelector) {
      return client.delete(`/odata/Releases(${releaseId})`, folder);
    },
    updateReleaseToLatestPackage(releaseKey: string, folder?: FolderSelector) {
      return client.post(
        `/odata/Releases/UiPath.Server.Configuration.OData.UpdateToLatestPackageVersionByKey(identifier=${releaseKey})`,
        {},
        folder,
      );
    },
    updateReleaseToSpecificPackage(
      releaseKey: string,
      packageVersion: string,
      folder?: FolderSelector,
    ) {
      return client.post(
        `/odata/Releases/UiPath.Server.Configuration.OData.UpdateToSpecificPackageVersionByKey(identifier=${releaseKey})`,
        { packageVersion },
        folder,
      );
    },
    rollbackRelease(releaseKey: string, folder?: FolderSelector) {
      return client.post(
        `/odata/Releases/UiPath.Server.Configuration.OData.RollbackToPreviousReleaseVersionByKey(identifier=${releaseKey})`,
        {},
        folder,
      );
    },
    async uploadProcessPackage(
      localFilePath: string,
      folder?: FolderSelector,
      options?: { feedId?: string },
    ) {
      if (!localFilePath.toLowerCase().endsWith('.nupkg')) {
        throw new Error(
          `UiPath package upload expects a .nupkg file. Received ${basename(localFilePath)}.`,
        );
      }

      const bytes = await readFile(localFilePath);
      const file = new File([bytes], basename(localFilePath), {
        type: 'application/octet-stream',
      });
      const formData = new FormData();
      formData.set('file1', file);

      const query = new URLSearchParams();
      if (options?.feedId) {
        query.set('feedId', options.feedId);
      }

      const path = `/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage${
        query.size ? `?${query.toString()}` : ''
      }`;

      return client.postFormData(path, formData, folder);
    },
    deleteProcessPackage(
      processKey: string,
      folder?: FolderSelector,
      options?: { feedId?: string },
    ) {
      const query = new URLSearchParams();
      if (options?.feedId) {
        query.set('feedId', options.feedId);
      }

      const encodedKey = processKey.replace(/'/g, "''");
      const path = `/odata/Processes('${encodedKey}')${
        query.size ? `?${query.toString()}` : ''
      }`;
      return client.delete(path, folder);
    },
  };
}
