import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type OperationsToolsDeps = {
  jobsApi: {
    listJobs: (
      query: URLSearchParams,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    resumeJob: (
      jobKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
  logsApi: {
    listRobotLogs: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
  };
  queuesApi: {
    retrieveQueuesProcessingStatus: (
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    bulkAddQueueItems: (input: {
      queueName: string;
      commitType?: 'AllOrNothing' | 'StopOnFirstFailure' | 'ProcessAllIndependently';
      queueItems: Array<{
        priority?: 'High' | 'Normal' | 'Low';
        specificContent: Record<string, unknown>;
        reference?: string;
        deferDate?: string;
        dueDate?: string;
        riskSlaDate?: string;
        progress?: string;
      }>;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
  };
  resourcesApi: {
    getAssetByName: (
      name: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    readBucketFile: (
      bucketId: number,
      path: string,
      folder?: { folderKey?: string },
      options?: { expiryInMinutes?: number },
    ) => Promise<unknown>;
  };
  robotsApi: {
    getStatus: () => Promise<unknown>;
    getJobsStats: () => Promise<unknown>;
    getSessionsStats: () => Promise<unknown>;
  };
};

function buildJobStateFilter(state: string, existingFilter?: string) {
  const stateFilter = `State eq '${state}'`;
  return existingFilter ? `${stateFilter} and (${existingFilter})` : stateFilter;
}

function buildErrorLogFilter(sinceHours?: number, existingFilter?: string) {
  const filters = [`Level eq 'Error'`];

  if (sinceHours !== undefined) {
    const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    filters.push(`TimeStamp ge ${cutoff}`);
  }

  if (existingFilter) {
    filters.push(`(${existingFilter})`);
  }

  return filters.join(' and ');
}

function extractAssetValue(asset: Record<string, unknown> | null) {
  if (!asset) {
    return null;
  }

  if (asset.ValueType === 'Secret') {
    return {
      name: asset.Name,
      valueType: asset.ValueType,
      redacted: true,
      value: '[REDACTED]',
    };
  }

  return {
    name: asset.Name,
    valueType: asset.ValueType,
    stringValue: asset.StringValue,
    boolValue: asset.BoolValue,
    intValue: asset.IntValue,
    value:
      asset.ValueType === 'Text'
        ? asset.StringValue
        : asset.ValueType === 'Bool'
          ? asset.BoolValue
          : asset.ValueType === 'Integer'
            ? asset.IntValue
            : undefined,
  };
}

export function registerOperationsTools(
  server: McpServer,
  deps: OperationsToolsDeps,
) {
  server.registerTool(
    'uipath_health_check',
    {
      description: 'Check Orchestrator connectivity and service health.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.robotsApi.getStatus(), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_dashboard_summary',
    {
      description:
        'Get a compact operational summary across Orchestrator health, jobs, robots, and queue processing.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ folderKey }) => {
      const [status, jobs, robots, queues] = await Promise.all([
        deps.robotsApi.getStatus(),
        deps.robotsApi.getJobsStats(),
        deps.robotsApi.getSessionsStats(),
        deps.queuesApi.retrieveQueuesProcessingStatus({ folderKey }),
      ]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status,
                jobs,
                robots,
                queues,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_get_running_jobs',
    {
      description: 'List currently running UiPath jobs.',
      inputSchema: z.object({
        top: z.number().int().positive().max(100).default(25),
        filter: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, filter, folderKey }) => {
      const query = new URLSearchParams({
        $top: String(top),
        $filter: buildJobStateFilter('Running', filter),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.jobsApi.listJobs(query, { folderKey }),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_get_faulted_jobs',
    {
      description: 'List faulted UiPath jobs for quick troubleshooting.',
      inputSchema: z.object({
        top: z.number().int().positive().max(100).default(25),
        filter: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, filter, folderKey }) => {
      const query = new URLSearchParams({
        $top: String(top),
        $filter: buildJobStateFilter('Faulted', filter),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.jobsApi.listJobs(query, { folderKey }),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_get_error_logs',
    {
      description:
        'List recent UiPath error logs, optionally scoped to the last N hours.',
      inputSchema: z.object({
        top: z.number().int().positive().max(200).default(50),
        sinceHours: z.number().positive().max(720).optional(),
        filter: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, sinceHours, filter, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.logsApi.listRobotLogs({
              top,
              count: true,
              orderBy: 'TimeStamp desc',
              filter: buildErrorLogFilter(sinceHours, filter),
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
    'uipath_get_asset_value',
    {
      description: 'Get the resolved value of a UiPath asset by name.',
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
            extractAssetValue(
              (await deps.resourcesApi.getAssetByName(name, { folderKey })) as
                | Record<string, unknown>
                | null,
            ),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_read_bucket_file',
    {
      description:
        'Read a UiPath bucket file directly into memory as text via a signed read URL.',
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
            await deps.resourcesApi.readBucketFile(
              bucketId,
              path,
              { folderKey },
              { expiryInMinutes },
            ),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_add_queue_items_bulk',
    {
      description: 'Bulk add multiple items to a UiPath queue in one request.',
      inputSchema: z.object({
        queueName: z.string().min(1),
        commitType: z
          .enum(['AllOrNothing', 'StopOnFirstFailure', 'ProcessAllIndependently'])
          .default('ProcessAllIndependently'),
        items: z
          .array(
            z.object({
              priority: z.enum(['High', 'Normal', 'Low']).default('Normal'),
              reference: z.string().max(128).optional(),
              deferDate: z.iso.datetime().optional(),
              dueDate: z.iso.datetime().optional(),
              riskSlaDate: z.iso.datetime().optional(),
              progress: z.string().optional(),
              specificContent: z.record(z.string(), z.unknown()),
            }),
          )
          .min(1),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ queueName, commitType, items, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.queuesApi.bulkAddQueueItems({
              queueName,
              commitType,
              queueItems: items,
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
    'uipath_resume_job',
    {
      description: 'Resume a suspended UiPath job using its job key.',
      inputSchema: z.object({
        jobKey: z.uuid(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ jobKey, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobsApi.resumeJob(jobKey, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
