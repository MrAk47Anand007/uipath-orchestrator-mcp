import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { assertLocalFilePathAllowed } from '../setup/local-path-policy.js';

type ReleaseToolsDeps = {
  releasesApi: {
    listReleases: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getReleaseByKey: (
      releaseKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    createRelease: (
      release: Record<string, unknown>,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    updateRelease: (
      releaseId: number,
      release: Record<string, unknown>,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    deleteRelease: (
      releaseId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    updateReleaseToLatestPackage: (
      releaseKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    updateReleaseToSpecificPackage: (
      releaseKey: string,
      packageVersion: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    rollbackRelease: (
      releaseKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    uploadProcessPackage: (
      localFilePath: string,
      folder?: { folderKey?: string },
      options?: { feedId?: string },
    ) => Promise<unknown>;
    deleteProcessPackage: (
      processKey: string,
      folder?: { folderKey?: string },
      options?: { feedId?: string },
    ) => Promise<unknown>;
  };
};

export function registerReleaseTools(
  server: McpServer,
  deps: ReleaseToolsDeps,
) {
  server.registerTool(
    'uipath_list_releases',
    {
      description: 'List UiPath releases in the selected folder.',
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
            await deps.releasesApi.listReleases(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_release',
    {
      description: 'Get a UiPath release by its GUID release key.',
      inputSchema: z.object({
        releaseKey: z.string().uuid(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ releaseKey, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.releasesApi.getReleaseByKey(releaseKey, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_release',
    {
      description:
        'Create a UiPath release from an existing process package name and version.',
      inputSchema: z.object({
        name: z.string().min(1),
        processKey: z.string().min(1),
        processVersion: z.string().min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ name, processKey, processVersion, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.releasesApi.createRelease(
              {
                Name: name,
                ProcessKey: processKey,
                ProcessVersion: processVersion,
              },
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
    'uipath_update_release',
    {
      description:
        'Update basic UiPath release metadata such as name or default input arguments.',
      inputSchema: z.object({
        releaseId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        name: z.string().min(1).optional(),
        inputArguments: z.record(z.string(), z.unknown()).optional(),
      }),
    },
    async ({ releaseId, folderKey, name, inputArguments }) => {
      const patch: Record<string, unknown> = {};
      if (name) {
        patch.Name = name;
      }
      if (inputArguments) {
        patch.InputArguments = JSON.stringify(inputArguments);
      }
      if (!Object.keys(patch).length) {
        throw new Error('Provide at least one field to update.');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.releasesApi.updateRelease(releaseId, patch, {
                folderKey,
              }),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_delete_release',
    {
      description: 'Delete a UiPath release by numeric id.',
      inputSchema: z.object({
        releaseId: z.number().int().positive(),
        confirm: z.boolean().default(false),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ releaseId, confirm, folderKey }) => {
      if (!confirm) {
        throw new Error('Deleting a release requires confirm=true.');
      }

      await deps.releasesApi.deleteRelease(releaseId, { folderKey });
      return {
        content: [{ type: 'text', text: `Deleted release ${releaseId}.` }],
      };
    },
  );

  server.registerTool(
    'uipath_upload_process_package',
    {
      description:
        'Upload a local UiPath .nupkg process package from the MCP host machine.',
      inputSchema: z.object({
        localFilePath: z.string().min(1),
        confirm: z.boolean().default(false),
        folderKey: z.uuid().optional(),
        feedId: z.string().uuid().optional(),
      }),
    },
    async ({ localFilePath, confirm, folderKey, feedId }) => {
      if (!confirm) {
        throw new Error(
          'Uploading a local process package requires confirm=true because it reads a local host file.',
        );
      }

      assertLocalFilePathAllowed(localFilePath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.releasesApi.uploadProcessPackage(
                localFilePath,
                { folderKey },
                { feedId },
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
    'uipath_delete_process_package',
    {
      description: 'Delete a UiPath process package by process key.',
      inputSchema: z.object({
        processKey: z.string().min(1),
        confirm: z.boolean().default(false),
        folderKey: z.uuid().optional(),
        feedId: z.string().uuid().optional(),
      }),
    },
    async ({ processKey, confirm, folderKey, feedId }) => {
      if (!confirm) {
        throw new Error('Deleting a process package requires confirm=true.');
      }

      await deps.releasesApi.deleteProcessPackage(
        processKey,
        { folderKey },
        { feedId },
      );
      return {
        content: [
          { type: 'text', text: `Deleted process package ${processKey}.` },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_update_release_to_latest_package',
    {
      description: 'Move a release to the latest available package version.',
      inputSchema: z.object({
        releaseKey: z.string().uuid(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ releaseKey, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.releasesApi.updateReleaseToLatestPackage(releaseKey, {
              folderKey,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_update_release_to_specific_package',
    {
      description: 'Move a release to a specific package version.',
      inputSchema: z.object({
        releaseKey: z.string().uuid(),
        packageVersion: z.string().min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ releaseKey, packageVersion, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.releasesApi.updateReleaseToSpecificPackage(
              releaseKey,
              packageVersion,
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
    'uipath_rollback_release',
    {
      description: 'Rollback a release to its previous package version.',
      inputSchema: z.object({
        releaseKey: z.string().uuid(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ releaseKey, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.releasesApi.rollbackRelease(releaseKey, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
