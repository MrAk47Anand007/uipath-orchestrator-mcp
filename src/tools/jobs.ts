import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type JobToolsDeps = {
  jobsApi: {
    listProcesses: (
      query: URLSearchParams,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    startJob: (input: {
      releaseKey: string;
      jobsCount?: number;
      robotIds?: number[];
      inputArguments?: Record<string, unknown>;
      folder?: { folderKey?: string };
    }) => Promise<unknown>;
    stopJob: (
      jobId: number,
      strategy: 'SoftStop' | 'Kill',
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    restartJob: (
      jobId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
};

export function registerJobTools(server: McpServer, deps: JobToolsDeps) {
  server.registerTool(
    'uipath_list_processes',
    {
      description: 'List UiPath processes/packages available in the selected folder.',
      inputSchema: z.object({
        searchTerm: z.string().optional(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ searchTerm, folderKey }) => {
      const query = new URLSearchParams();
      if (searchTerm) {
        query.set('searchTerm', searchTerm);
      }
      query.set('$top', '100');

      const result = await deps.jobsApi.listProcesses(query, { folderKey });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'uipath_start_job',
    {
      description:
        'Start a UiPath process by release key. Prefer one job at a time unless the caller intentionally requests parallel work.',
      inputSchema: z.object({
        releaseKey: z.string().min(1),
        folderKey: z.uuid().optional(),
        jobsCount: z.number().int().positive().max(10).default(1),
        robotIds: z.array(z.number().int().positive()).optional(),
        inputArguments: z.record(z.string(), z.unknown()).optional(),
      }),
    },
    async ({ releaseKey, folderKey, jobsCount, robotIds, inputArguments }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobsApi.startJob({
              releaseKey,
              jobsCount,
              robotIds,
              inputArguments,
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
    'uipath_stop_job',
    {
      description: 'Soft stop or kill a UiPath job.',
      inputSchema: z.object({
        jobId: z.number().int().positive(),
        strategy: z.enum(['SoftStop', 'Kill']).default('SoftStop'),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ jobId, strategy, folderKey }) => {
      await deps.jobsApi.stopJob(jobId, strategy, { folderKey });
      return {
        content: [{ type: 'text', text: `Stopped job ${jobId} using ${strategy}.` }],
      };
    },
  );

  server.registerTool(
    'uipath_restart_job',
    {
      description: 'Restart a UiPath job by its numeric id.',
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
            await deps.jobsApi.restartJob(jobId, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
