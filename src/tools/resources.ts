import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type ResourceToolsDeps = {
  resourcesApi: {
    listAssets: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getAssetByName: (
      name: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listBuckets: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listBucketFiles: (
      bucketId: number,
      folder?: { folderKey?: string },
      options?: { directory?: string; recursive?: boolean; top?: number },
    ) => Promise<unknown>;
    getBucketReadUri: (
      bucketId: number,
      path: string,
      expiryInMinutes?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
};

export function registerResourceTools(
  server: McpServer,
  deps: ResourceToolsDeps,
) {
  server.registerTool(
    'uipath_list_assets',
    {
      description: 'List assets available in the selected UiPath folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
        top: z.number().int().positive().max(100).default(20),
      }),
    },
    async ({ folderKey, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.resourcesApi.listAssets(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_buckets',
    {
      description:
        'List storage buckets available in the selected UiPath folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
        top: z.number().int().positive().max(100).default(20),
      }),
    },
    async ({ folderKey, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.resourcesApi.listBuckets(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_asset_by_name',
    {
      description: 'Get a single asset by name from the selected UiPath folder.',
      inputSchema: z.object({
        name: z.string().min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ name, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.resourcesApi.getAssetByName(name, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_bucket_files',
    {
      description: 'List files inside a UiPath storage bucket.',
      inputSchema: z.object({
        bucketId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        directory: z.string().default(''),
        recursive: z.boolean().default(false),
        top: z.number().int().positive().max(100).default(20),
      }),
    },
    async ({ bucketId, folderKey, directory, recursive, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.resourcesApi.listBucketFiles(
              bucketId,
              { folderKey },
              { directory, recursive, top },
            ),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_bucket_read_uri',
    {
      description:
        'Get a temporary direct download URL for a file in a UiPath storage bucket.',
      inputSchema: z.object({
        bucketId: z.number().int().positive(),
        path: z.string().min(1),
        expiryInMinutes: z.number().int().positive().max(1440).default(15),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ bucketId, path, expiryInMinutes, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.resourcesApi.getBucketReadUri(
              bucketId,
              path,
              expiryInMinutes,
              { folderKey },
            ),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
