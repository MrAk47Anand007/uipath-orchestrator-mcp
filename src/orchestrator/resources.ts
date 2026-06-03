import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

function normalizeUploadHeaders(
  headers?: Record<string, string> | { Keys?: string[]; Values?: string[] },
) {
  const normalized = new Headers();

  if (!headers) {
    return normalized;
  }

  if (Array.isArray((headers as { Keys?: string[] }).Keys)) {
    const keyedHeaders = headers as { Keys?: string[]; Values?: string[] };
    const keys = keyedHeaders.Keys ?? [];
    const values = keyedHeaders.Values ?? [];

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const value = values[index];

      if (key && typeof value === 'string') {
        normalized.set(key, value);
      }
    }

    return normalized;
  }

  for (const [key, value] of Object.entries(headers)) {
    normalized.set(key, value);
  }

  return normalized;
}

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
    createAsset(asset: Record<string, unknown>, folder?: FolderSelector) {
      return client.post('/odata/Assets', asset, folder);
    },
    updateAsset(
      assetId: number,
      asset: Record<string, unknown>,
      folder?: FolderSelector,
    ) {
      return (async () => {
        const existing = (await client.get(
          `/odata/Assets(${assetId})`,
          folder,
        )) as Record<string, unknown>;

        return client.put(
          `/odata/Assets(${assetId})`,
          {
            ...existing,
            ...asset,
          },
          folder,
        );
      })();
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
    getBucketWriteUri(
      bucketId: number,
      path: string,
      contentType = 'application/octet-stream',
      expiryInMinutes = 15,
      folder?: FolderSelector,
    ) {
      const query = new URLSearchParams({
        path,
        expiryInMinutes: String(expiryInMinutes),
        contentType,
      });

      return client.get(
        `/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.GetWriteUri?${query.toString()}`,
        folder,
      );
    },
    async uploadBucketFile(
      bucketId: number,
      localFilePath: string,
      folder?: FolderSelector,
      options?: {
        targetPath?: string;
        contentType?: string;
        expiryInMinutes?: number;
      },
    ) {
      const targetPath = options?.targetPath || basename(localFilePath);
      const contentType = options?.contentType || 'application/octet-stream';
      const writeAccess = (await this.getBucketWriteUri(
        bucketId,
        targetPath,
        contentType,
        options?.expiryInMinutes ?? 15,
        folder,
      )) as {
        Uri: string;
        Verb?: string;
        Headers?: Record<string, string> | { Keys?: string[]; Values?: string[] };
      };
      const fileBytes = await readFile(localFilePath);
      const headers = normalizeUploadHeaders(writeAccess.Headers);
      headers.set('content-type', contentType);

      const uploadResponse = await fetch(writeAccess.Uri, {
        method: writeAccess.Verb || 'PUT',
        headers,
        body: fileBytes,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `UiPath bucket upload failed: ${uploadResponse.status} ${uploadResponse.statusText} ${errorText}`,
        );
      }

      return {
        bucketId,
        path: targetPath,
        localFilePath,
        verb: writeAccess.Verb || 'PUT',
        uploadUri: writeAccess.Uri,
      };
    },
    deleteBucketFile(bucketId: number, path: string, folder?: FolderSelector) {
      const query = new URLSearchParams({ path });
      return client.delete(
        `/odata/Buckets(${bucketId})/UiPath.Server.Configuration.OData.DeleteFile?${query.toString()}`,
        folder,
      );
    },
  };
}
