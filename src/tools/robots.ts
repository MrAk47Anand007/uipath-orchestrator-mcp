import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const runtimeTypeSchema = z.enum([
  'NonProduction',
  'Attended',
  'Unattended',
  'Development',
  'Studio',
  'RpaDeveloper',
  'StudioX',
  'CitizenDeveloper',
  'Headless',
  'StudioPro',
  'RpaDeveloperPro',
  'TestAutomation',
  'AutomationCloud',
  'Serverless',
  'AutomationKit',
  'ServerlessTestAutomation',
  'AutomationCloudTestAutomation',
  'AttendedStudioWeb',
  'Hosting',
  'AssistantWeb',
  'ProcessOrchestration',
  'AgentService',
  'AppTest',
  'PerformanceTest',
  'BusinessRule',
  'CaseManagement',
  'Flow',
  'Agent',
]);

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
    listMachines: (top?: number) => Promise<unknown>;
    getMachine: (machineId: number) => Promise<unknown>;
    getAssignedMachines: (
      folderId: number,
      options?: { robotId?: number; top?: number },
    ) => Promise<unknown>;
    getFolderRuntimes: (folderId: number) => Promise<unknown>;
    getMachineSessionRuntimes: (options?: {
      runtimeType?: z.infer<typeof runtimeTypeSchema>;
      top?: number;
      skip?: number;
    }) => Promise<unknown>;
    getFolderMachineSessionRuntimes: (
      folderId: number,
      options?: {
        robotId?: number;
        runtimeType?: z.infer<typeof runtimeTypeSchema>;
        top?: number;
        skip?: number;
      },
    ) => Promise<unknown>;
    toggleRobotEnabledStatus: (
      robotIds: number[],
      enabled: boolean,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    deleteInactiveUnattendedSessions: (sessionIds: number[]) => Promise<unknown>;
    updateMachinesToFolderAssociations: (input: {
      folderId: number;
      addedMachineIds?: number[];
      removedMachineIds?: number[];
    }) => Promise<unknown>;
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
    'uipath_list_machines',
    {
      description: 'List UiPath machines and templates with runtime capacity information.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(25),
      }),
    },
    async ({ top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.robotsApi.listMachines(top), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_machine',
    {
      description: 'Get a specific machine or machine template by id.',
      inputSchema: z.object({
        machineId: z.number().int().positive(),
      }),
    },
    async ({ machineId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.robotsApi.getMachine(machineId), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_assigned_machines',
    {
      description:
        'List machines assigned to a folder, optionally filtered to the machine choices for a specific robot.',
      inputSchema: z.object({
        folderId: z.number().int().positive(),
        robotId: z.number().int().positive().optional(),
        top: z.number().int().positive().max(1000).default(100),
      }),
    },
    async ({ folderId, robotId, top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.getAssignedMachines(folderId, { robotId, top }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_folder_runtimes',
    {
      description: 'Show runtime capacity and allocation details for a folder.',
      inputSchema: z.object({
        folderId: z.number().int().positive(),
      }),
    },
    async ({ folderId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.getFolderRuntimes(folderId),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_machine_session_runtimes',
    {
      description:
        'List machine runtime sessions across the tenant, including runtime usage and availability.',
      inputSchema: z.object({
        runtimeType: runtimeTypeSchema.optional(),
        top: z.number().int().positive().max(1000).default(100),
        skip: z.number().int().min(0).optional(),
      }),
    },
    async ({ runtimeType, top, skip }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.getMachineSessionRuntimes({
              runtimeType,
              top,
              skip,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_folder_machine_session_runtimes',
    {
      description:
        'List machine runtime sessions scoped to a folder, optionally filtered by robot or runtime type.',
      inputSchema: z.object({
        folderId: z.number().int().positive(),
        robotId: z.number().int().positive().optional(),
        runtimeType: runtimeTypeSchema.optional(),
        top: z.number().int().positive().max(1000).default(100),
        skip: z.number().int().min(0).optional(),
      }),
    },
    async ({ folderId, robotId, runtimeType, top, skip }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.robotsApi.getFolderMachineSessionRuntimes(folderId, {
              robotId,
              runtimeType,
              top,
              skip,
            }),
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
    'uipath_toggle_robot_enabled_status',
    {
      description:
        'Enable or disable one or more robots in a folder. Use confirm=true to avoid accidental robot outages.',
      inputSchema: z.object({
        robotIds: z.array(z.number().int().positive()).min(1),
        enabled: z.boolean(),
        folderKey: z.uuid().optional(),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ robotIds, enabled, folderKey, confirm }) => {
      if (!confirm) {
        throw new Error(
          'Set confirm=true to change robot enabled status in UiPath.',
        );
      }

      const result = await deps.robotsApi.toggleRobotEnabledStatus(
        robotIds,
        enabled,
        { folderKey },
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                enabled,
                robotIds,
                result,
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
    'uipath_delete_inactive_unattended_sessions',
    {
      description:
        'Delete disconnected or unresponsive unattended sessions by id. Use confirm=true because this is a cleanup action.',
      inputSchema: z.object({
        sessionIds: z.array(z.number().int().positive()).min(1),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ sessionIds, confirm }) => {
      if (!confirm) {
        throw new Error(
          'Set confirm=true to delete inactive unattended sessions.',
        );
      }

      const result = await deps.robotsApi.deleteInactiveUnattendedSessions(
        sessionIds,
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                sessionIds,
                result,
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
    'uipath_update_machines_to_folder_associations',
    {
      description:
        'Add or remove machine associations for a folder. Use confirm=true because it changes folder execution capacity.',
      inputSchema: z.object({
        folderId: z.number().int().positive(),
        addedMachineIds: z.array(z.number().int().positive()).default([]),
        removedMachineIds: z.array(z.number().int().positive()).default([]),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ folderId, addedMachineIds, removedMachineIds, confirm }) => {
      if (!confirm) {
        throw new Error(
          'Set confirm=true to change machine associations for a folder.',
        );
      }

      const result = await deps.robotsApi.updateMachinesToFolderAssociations({
        folderId,
        addedMachineIds,
        removedMachineIds,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                folderId,
                addedMachineIds,
                removedMachineIds,
                result,
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
