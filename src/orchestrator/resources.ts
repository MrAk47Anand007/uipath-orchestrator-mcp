import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createResourcesApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listAssets(top = 20, folder?: FolderSelector) {
      return client.get(`/odata/Assets?$top=${top}`, folder);
    },
    async getAssetByName(name: string, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: '1',
        $filter: `Name eq '${name.replace(/'/g, "''")}'`,
      });
      const result = (await client.get(
        `/odata/Assets/UiPath.Server.Configuration.OData.GetFiltered?${query.toString()}`,
        folder,
      )) as { value?: unknown[] };

      return result.value?.[0] ?? null;
    },
    listBuckets(top = 20, folder?: FolderSelector) {
      return client.get(`/odata/Buckets?$top=${top}`, folder);
    },
    listBucketFiles(
      bucketId: number,
      folder?: FolderSelector,
      options?: {
        directory?: string;
        recursive?: boolean;
        top?: number;
      },
    ) {
      const query = new URLSearchParams({
        recursive: String(options?.recursive ?? false),
        $top: String(options?.top ?? 20),
      });

      query.set('directory', options?.directory || '/');

      return client.get(
        `/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetFiles?${query.toString()}`,
        folder,
      );
    },
    getBucketReadUri(
      bucketId: number,
      path: string,
      expiryInMinutes = 15,
      folder?: FolderSelector,
    ) {
      const query = new URLSearchParams({
        path,
        expiryInMinutes: String(expiryInMinutes),
      });

      return client.get(
        `/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetReadUri?${query.toString()}`,
        folder,
      );
    },
  };
}
