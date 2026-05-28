import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type LogsToolsDeps = {
  logsApi: {
    listRobotLogs: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    getRobotLogTotalCount: (input?: {
      filter?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    listExecutionMedia: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
  };
  jobsApi: {
    getJobById: (
      jobId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
};

export function registerLogsTools(server: McpServer, deps: LogsToolsDeps) {
  server.registerTool(
    'uipath_list_robot_logs',
    {
      description:
        'List recent UiPath robot logs. Supports OData filter strings so callers can scope by process, level, job key, or time range.',
      inputSchema: z.object({
        top: z.number().int().positive().max(200).default(50),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
        orderBy: z.string().default('TimeStamp desc'),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ top, skip, filter, orderBy, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.logsApi.listRobotLogs({
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
    'uipath_get_robot_log_total_count',
    {
      description:
        'Get the total number of UiPath robot log entries matching an optional OData filter.',
      inputSchema: z.object({
        filter: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ filter, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.logsApi.getRobotLogTotalCount({
              filter,
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
    'uipath_get_job_details',
    {
      description:
        'Fetch a UiPath job by numeric id, including state, info, input arguments, and output arguments when available.',
      inputSchema: z.object({
        jobId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ jobId, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobsApi.getJobById(jobId, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_execution_media',
    {
      description:
        'List execution media records such as recordings or attachments associated with UiPath jobs.',
      inputSchema: z.object({
        top: z.number().int().positive().max(100).default(20),
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
            await deps.logsApi.listExecutionMedia({
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
}
