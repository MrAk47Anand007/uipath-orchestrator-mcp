import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type QueueToolsDeps = {
  queuesApi: {
    listQueueDefinitions: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    getQueueDefinition: (
      queueDefinitionId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getQueueDefinitionByKey: (
      queueDefinitionKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    createQueueDefinition: (input: {
      name: string;
      description?: string;
      maxNumberOfRetries?: number;
      acceptAutomaticallyRetry?: boolean;
      retryAbandonedItems?: boolean;
      enforceUniqueReference?: boolean;
      encrypted?: boolean;
      specificDataJsonSchema?: string;
      outputDataJsonSchema?: string;
      analyticsDataJsonSchema?: string;
      slaInMinutes?: number;
      riskSlaInMinutes?: number;
      releaseId?: number;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    updateQueueDefinition: (
      queueDefinitionId: number,
      input: {
        name?: string;
        description?: string;
        maxNumberOfRetries?: number;
        acceptAutomaticallyRetry?: boolean;
        retryAbandonedItems?: boolean;
        enforceUniqueReference?: boolean;
        encrypted?: boolean;
        specificDataJsonSchema?: string;
        outputDataJsonSchema?: string;
        analyticsDataJsonSchema?: string;
        slaInMinutes?: number;
        riskSlaInMinutes?: number;
        releaseId?: number;
        folder?: { folderKey?: string };
      },
    ) => Promise<unknown>;
    deleteQueueDefinition: (
      queueDefinitionId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listQueueItems: (
      query: URLSearchParams,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getQueueItemProcessingHistory: (
      queueItemId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listQueueItemComments: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    createQueueItemComment: (input: {
      queueItemId: number;
      text: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    updateQueueItemComment: (
      commentId: number,
      input: { text: string; folder?: { folderKey?: string } },
    ) => Promise<unknown>;
    deleteQueueItemComment: (
      commentId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getQueueItemCommentsHistory: (
      queueItemId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listQueueItemEvents: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    getQueueItemEventsHistory: (
      queueItemId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    retrieveQueuesProcessingStatus: (
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    retrieveQueueProcessingRecords: (
      queueDefinitionId: number,
      daysNo: number,
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
    'uipath_create_queue_definition',
    {
      description: 'Create a new UiPath queue definition in the selected folder.',
      inputSchema: z.object({
        name: z.string().min(1).max(50),
        description: z.string().max(250).optional(),
        maxNumberOfRetries: z.number().int().min(0).max(50).default(0),
        acceptAutomaticallyRetry: z.boolean().default(false),
        retryAbandonedItems: z.boolean().default(false),
        enforceUniqueReference: z.boolean().default(false),
        encrypted: z.boolean().default(false),
        specificDataJsonSchema: z.string().optional(),
        outputDataJsonSchema: z.string().optional(),
        analyticsDataJsonSchema: z.string().optional(),
        slaInMinutes: z.number().int().min(0).optional(),
        riskSlaInMinutes: z.number().int().min(0).optional(),
        releaseId: z.number().int().positive().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ folderKey, ...input }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.createQueueDefinition({
              ...input,
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
    'uipath_get_queue_definition',
    {
      description: 'Get a queue definition by numeric id.',
      inputSchema: z.object({
        queueDefinitionId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueDefinitionId, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.getQueueDefinition(queueDefinitionId, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_queue_definition_by_key',
    {
      description: 'Get a queue definition by GUID key.',
      inputSchema: z.object({
        queueDefinitionKey: z.uuid(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueDefinitionKey, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.getQueueDefinitionByKey(queueDefinitionKey, {
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
        top: z.number().int().positive().max(1000).default(100),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, skip, filter, orderBy, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.listQueueDefinitions({
              top,
              skip,
              count: true,
              filter,
              orderBy,
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
    'uipath_update_queue_definition',
    {
      description: 'Update selected editable fields on an existing queue definition.',
      inputSchema: z.object({
        queueDefinitionId: z.number().int().positive(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().max(250).optional(),
        maxNumberOfRetries: z.number().int().min(0).max(50).optional(),
        acceptAutomaticallyRetry: z.boolean().optional(),
        retryAbandonedItems: z.boolean().optional(),
        enforceUniqueReference: z.boolean().optional(),
        encrypted: z.boolean().optional(),
        specificDataJsonSchema: z.string().optional(),
        outputDataJsonSchema: z.string().optional(),
        analyticsDataJsonSchema: z.string().optional(),
        slaInMinutes: z.number().int().min(0).optional(),
        riskSlaInMinutes: z.number().int().min(0).optional(),
        releaseId: z.number().int().positive().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueDefinitionId, folderKey, ...input }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.updateQueueDefinition(queueDefinitionId, {
              ...input,
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
    'uipath_delete_queue_definition',
    {
      description: 'Delete a queue definition by numeric id.',
      inputSchema: z.object({
        queueDefinitionId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ queueDefinitionId, folderKey, confirm }) => {
      if (!confirm) {
        throw new Error('Set confirm=true to delete a queue definition.');
      }

      await deps.queuesApi.deleteQueueDefinition(queueDefinitionId, { folderKey });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted queue definition ${queueDefinitionId}.`,
          },
        ],
      };
    },
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
    'uipath_get_queue_item_processing_history',
    {
      description:
        'Get the retry and processing history chain for a queue item across related retries.',
      inputSchema: z.object({
        queueItemId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueItemId, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.getQueueItemProcessingHistory(queueItemId, {
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
    'uipath_list_queue_item_comments',
    {
      description: 'List queue item comments with optional OData filters.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(50),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, skip, filter, orderBy, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.listQueueItemComments({
              top,
              skip,
              count: true,
              filter,
              orderBy,
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
    'uipath_create_queue_item_comment',
    {
      description: 'Add a comment to a queue item.',
      inputSchema: z.object({
        queueItemId: z.number().int().positive(),
        text: z.string().min(1).max(512),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueItemId, text, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.createQueueItemComment({
              queueItemId,
              text,
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
    'uipath_update_queue_item_comment',
    {
      description: 'Update an existing queue item comment.',
      inputSchema: z.object({
        commentId: z.number().int().positive(),
        text: z.string().min(1).max(512),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ commentId, text, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.updateQueueItemComment(commentId, {
              text,
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
    'uipath_delete_queue_item_comment',
    {
      description: 'Delete a queue item comment by id.',
      inputSchema: z.object({
        commentId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ commentId, folderKey, confirm }) => {
      if (!confirm) {
        throw new Error('Set confirm=true to delete a queue item comment.');
      }

      await deps.queuesApi.deleteQueueItemComment(commentId, { folderKey });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted queue item comment ${commentId}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_get_queue_item_comments_history',
    {
      description:
        'Get the full comment history for a queue item, including related retries.',
      inputSchema: z.object({
        queueItemId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueItemId, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.getQueueItemCommentsHistory(queueItemId, {
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
    'uipath_list_queue_item_events',
    {
      description: 'List queue item events with optional OData filters.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(50),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, skip, filter, orderBy, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.listQueueItemEvents({
              top,
              skip,
              count: true,
              filter,
              orderBy,
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
    'uipath_get_queue_item_events_history',
    {
      description:
        'Get the event history for a queue item, including retry-related items.',
      inputSchema: z.object({
        queueItemId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueItemId, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.getQueueItemEventsHistory(queueItemId, {
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
    'uipath_get_queues_processing_status',
    {
      description:
        'Get high-level processing status and throughput metrics for queues in the current folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.retrieveQueuesProcessingStatus({ folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_queue_processing_records',
    {
      description:
        'Get aggregated queue processing records for a specific queue over the last N days.',
      inputSchema: z.object({
        queueDefinitionId: z.number().int().positive(),
        daysNo: z.number().int().min(0).max(365).default(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueDefinitionId, daysNo, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.retrieveQueueProcessingRecords(
              queueDefinitionId,
              daysNo,
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
