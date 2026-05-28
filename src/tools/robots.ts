import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type RobotToolsDeps = {
  robotsApi: {
    listSessions: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    listRobots: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getJobsStats: () => Promise<unknown>;
    getSessionsStats: () => Promise<unknown>;
    getStatus: () => Promise<unknown>;
  };
};

export function registerRobotTools(server: McpServer, deps: RobotToolsDeps) {
  server.registerTool(
    'uipath_list_robot_sessions',
    {
      description: 'List robot sessions and current availability state for a folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
        top: z.number().int().positive().max(100).default(25),
      }),
    },
    async ({ folderKey, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.listSessions(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_robots',
    {
      description: 'List robots registered in the selected folder.',
      inputSchema: z.object({
        folderKey: z.uuid().optional(),
        top: z.number().int().positive().max(100).default(25),
      }),
    },
    async ({ folderKey, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.listRobots(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_robot_stats',
    {
      description:
        'Get aggregated robot/session counts such as Available, Busy, and Disconnected.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.robotsApi.getSessionsStats(), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_jobs_stats',
    {
      description:
        'Get aggregated UiPath job counts such as Successful, Faulted, and Canceled.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.robotsApi.getJobsStats(), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_status',
    {
      description:
        'Check whether the Orchestrator endpoint is healthy enough to serve traffic.',
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
}
