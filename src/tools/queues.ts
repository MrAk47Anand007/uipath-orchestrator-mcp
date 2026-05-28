import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type QueueToolsDeps = {
  queuesApi: {
    listQueueDefinitions: (folder?: { folderKey?: string }) => Promise<unknown>;
    listQueueItems: (
      query: URLSearchParams,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    addQueueItem: (input: {
      queueName: string;
      priority?: 'High' | 'Normal' | 'Low';
      specificContent: Record<string, unknown>;
      reference?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    setQueueItemProgress: (
      queueItemId: number,
      progress: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
};

export function registerQueueTools(server: McpServer, deps: QueueToolsDeps) {
  server.registerTool(
    'uipath_add_queue_item',
    {
      description: 'Add one queue transaction into a UiPath queue.',
      inputSchema: z.object({
        queueName: z.string().min(1),
        folderKey: z.uuid().optional(),
        priority: z.enum(['High', 'Normal', 'Low']).default('Normal'),
        reference: z.string().max(128).optional(),
        specificContent: z.record(z.string(), z.unknown()),
      }),
    },
    async ({ queueName, folderKey, priority, reference, specificContent }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.addQueueItem({
              queueName,
              priority,
              reference,
              specificContent,
              folder: { folderKey },
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_queue_definitions',
    {
      description: 'List queue definitions available in the selected folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.listQueueDefinitions({ folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_queue_items',
    {
      description: 'List queue items with optional OData-style filters.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
        filter: z.string().optional(),
        top: z.number().int().positive().max(100).default(25),
      }),
    },
    async ({ folderKey, filter, top }) => {
      const query = new URLSearchParams({ $top: String(top) });
      if (filter) {
        query.set('$filter', filter);
      }

      const result = await deps.queuesApi.listQueueItems(query, { folderKey });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'uipath_set_queue_item_progress',
    {
      description: 'Update the progress message for an in-progress queue item.',
      inputSchema: z.object({
        queueItemId: z.number().int().positive(),
        progress: z.string().min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueItemId, progress, folderKey }) => {
      await deps.queuesApi.setQueueItemProgress(queueItemId, progress, {
        folderKey,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Updated queue item ${queueItemId} progress.`,
          },
        ],
      };
    },
  );
}
