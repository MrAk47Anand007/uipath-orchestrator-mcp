import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { assertLocalFilePathAllowed } from '../setup/local-path-policy.js';

const assetValueSchema = z.discriminatedUnion('valueType', [
  z.object({
    valueType: z.literal('Text'),
    stringValue: z.string(),
  }),
  z.object({
    valueType: z.literal('Bool'),
    boolValue: z.boolean(),
  }),
  z.object({
    valueType: z.literal('Integer'),
    intValue: z.number().int(),
  }),
  z.object({
    valueType: z.literal('Secret'),
    secretValue: z.string(),
  }),
]);

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
    createAsset: (
      asset: Record<string, unknown>,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    updateAsset: (
      assetId: number,
      asset: Record<string, unknown>,
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
    getBucketWriteUri: (
      bucketId: number,
      path: string,
      contentType?: string,
      expiryInMinutes?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    uploadBucketFile: (
      bucketId: number,
      localFilePath: string,
      folder?: { folderKey?: string },
      options?: {
        targetPath?: string;
        contentType?: string;
        expiryInMinutes?: number;
      },
    ) => Promise<unknown>;
    deleteBucketFile: (
      bucketId: number,
      path: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
};

function sanitizeAssetForModel(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const asset = { ...(value as Record<string, unknown>) };

  if ('SecretValue' in asset) {
    asset.SecretValue = '[REDACTED]';
  }

  if ('CredentialPassword' in asset) {
    asset.CredentialPassword = '[REDACTED]';
  }

  if (
    asset.ValueType === 'Secret' ||
    (typeof asset.CredentialUsername === 'string' && asset.CredentialUsername.length > 0)
  ) {
    asset.Redacted = true;
  }

  return asset;
}

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
    'uipath_create_asset',
    {
      description:
        'Create a UiPath asset. This version supports Text, Bool, Integer, and Secret value types.',
      inputSchema: z.object({
        name: z.string().min(1),
        valueScope: z.enum(['Global', 'PerRobot']).default('Global'),
        description: z.string().optional(),
        folderKey: z.uuid().optional(),
        value: assetValueSchema,
      }),
    },
    async ({ name, valueScope, description, folderKey, value }) => {
      const asset = {
        Name: name,
        ValueScope: valueScope,
        ValueType: value.valueType,
        Description: description,
        ...(value.valueType === 'Text'
          ? { StringValue: value.stringValue }
          : value.valueType === 'Bool'
            ? { BoolValue: value.boolValue }
            : value.valueType === 'Integer'
              ? { IntValue: value.intValue }
              : { SecretValue: value.secretValue }),
      };
      const createdAsset = await deps.resourcesApi.createAsset(asset, {
        folderKey,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              sanitizeAssetForModel(createdAsset),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_update_asset',
    {
      description:
        'Update a UiPath asset by id. This version supports Text, Bool, Integer, and Secret value types.',
      inputSchema: z.object({
        assetId: z.number().int().positive(),
        name: z.string().min(1),
        valueScope: z.enum(['Global', 'PerRobot']).default('Global'),
        description: z.string().optional(),
        folderKey: z.uuid().optional(),
        value: assetValueSchema,
      }),
    },
    async ({ assetId, name, valueScope, description, folderKey, value }) => {
      const asset = {
        Name: name,
        ValueScope: valueScope,
        ValueType: value.valueType,
        Description: description,
        ...(value.valueType === 'Text'
          ? { StringValue: value.stringValue }
          : value.valueType === 'Bool'
            ? { BoolValue: value.boolValue }
            : value.valueType === 'Integer'
              ? { IntValue: value.intValue }
              : { SecretValue: value.secretValue }),
      };

      await deps.resourcesApi.updateAsset(assetId, asset, { folderKey });
      return {
        content: [
          {
            type: 'text',
            text: `Updated asset ${assetId}.`,
          },
        ],
      };
    },
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
            sanitizeAssetForModel(
              await deps.resourcesApi.getAssetByName(name, { folderKey }),
            ),
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

  server.registerTool(
    'uipath_upload_bucket_file',
    {
      description:
        'Upload a local file from the MCP host machine into a UiPath storage bucket.',
      inputSchema: z.object({
        bucketId: z.number().int().positive(),
        localFilePath: z.string().min(1),
        confirm: z.boolean().default(false),
        targetPath: z.string().min(1).optional(),
        contentType: z.string().min(1).optional(),
        expiryInMinutes: z.number().int().positive().max(1440).default(15),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({
      bucketId,
      localFilePath,
      confirm,
      targetPath,
      contentType,
      expiryInMinutes,
      folderKey,
    }) => {
      if (!confirm) {
        throw new Error(
          'Uploading a local host file requires confirm=true because it can move local data into a remote UiPath bucket.',
        );
      }

      assertLocalFilePathAllowed(localFilePath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.resourcesApi.uploadBucketFile(
                bucketId,
                localFilePath,
                { folderKey },
                { targetPath, contentType, expiryInMinutes },
              ),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_delete_bucket_file',
    {
      description: 'Delete a file from a UiPath storage bucket.',
      inputSchema: z.object({
        bucketId: z.number().int().positive(),
        path: z.string().min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ bucketId, path, folderKey }) => {
      await deps.resourcesApi.deleteBucketFile(bucketId, path, { folderKey });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted bucket file ${path} from bucket ${bucketId}.`,
          },
        ],
      };
    },
  );
}
