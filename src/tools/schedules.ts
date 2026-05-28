import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type ScheduleToolsDeps = {
  schedulesApi: {
    listSchedules: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    createSchedule: (
      schedule: Record<string, unknown>,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    setSchedulesEnabled: (
      scheduleIds: number[],
      enabled: boolean,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    deleteSchedule: (
      scheduleId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
  };
  jobsApi: {
    listReleases: (folder?: { folderKey?: string }) => Promise<unknown>;
  };
};

export function registerScheduleTools(
  server: McpServer,
  deps: ScheduleToolsDeps,
) {
  server.registerTool(
    'uipath_list_schedules',
    {
      description: 'List time-based UiPath process schedules in the selected folder.',
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
            await deps.schedulesApi.listSchedules(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_schedule',
    {
      description:
        'Create a time-based UiPath process schedule using a cron expression and timezone.',
      inputSchema: z.object({
        name: z.string().min(1),
        releaseId: z.number().int().positive(),
        cronExpression: z.string().min(1),
        enabled: z.boolean().default(false),
        folderKey: z.uuid().optional(),
        inputArguments: z.record(z.string(), z.unknown()).optional(),
        description: z.string().optional(),
        timeZoneId: z.string().min(1).default('UTC'),
      }),
    },
    async ({
      name,
      releaseId,
      cronExpression,
      timeZoneId,
      enabled,
      folderKey,
      inputArguments,
      description,
    }) => {
      const releases = (await deps.jobsApi.listReleases({
        folderKey,
      })) as { value?: Array<{ Id?: number; Name?: string }> };
      const release = releases.value?.find((item) => item.Id === releaseId);

      if (!release?.Name) {
        throw new Error(
          `Could not resolve release name for releaseId ${releaseId}.`,
        );
      }

      const schedule = {
        Name: name,
        Enabled: enabled,
        StartStrategy: 1,
        SpecificPriorityValue: null,
        JobPriority: null,
        RuntimeType: 'Unattended',
        InputArguments: JSON.stringify(inputArguments ?? {}),
        ResumeOnSameContext: false,
        StopProcessExpression: '',
        RunAsMe: false,
        IsConnected: false,
        UseCalendar: false,
        ActivateOnJobComplete: false,
        EntryPointPath: null,
        StartProcessCronDetails: JSON.stringify({
          advancedCron: cronExpression,
        }),
        StartProcessCron: cronExpression,
        ExecutorRobots: [],
        ReleaseId: releaseId,
        ReleaseName: release.Name,
        TimeZoneId: timeZoneId,
        StopProcessDate: null,
        ExternalJobKey: '',
        MachineRobots: [],
        Tags: [],
        Description: description,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await deps.schedulesApi.createSchedule(schedule, { folderKey }),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_set_schedule_enabled',
    {
      description: 'Enable or disable one or more UiPath schedules.',
      inputSchema: z.object({
        scheduleIds: z.array(z.number().int().positive()).min(1),
        enabled: z.boolean(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ scheduleIds, enabled, folderKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.schedulesApi.setSchedulesEnabled(
              scheduleIds,
              enabled,
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
    'uipath_delete_schedule',
    {
      description: 'Delete a UiPath process schedule by numeric id.',
      inputSchema: z.object({
        scheduleId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
      }),
    },
    async ({ scheduleId, folderKey }) => {
      await deps.schedulesApi.deleteSchedule(scheduleId, { folderKey });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted schedule ${scheduleId}.`,
          },
        ],
      };
    },
  );
}
