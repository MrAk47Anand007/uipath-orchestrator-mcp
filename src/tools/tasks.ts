import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const taskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);
const taskTypeSchema = z.enum([
  'FormTask',
  'ExternalTask',
  'DocumentValidationTask',
  'DocumentClassificationTask',
  'DataLabelingTask',
  'AppTask',
  'QuickFormTask',
]);
const assignmentCriteriaSchema = z.enum([
  'SingleUser',
  'Workload',
  'AllUsers',
  'RoundRobin',
  'Hierarchy',
]);

type TasksToolsDeps = {
  tasksApi: {
    listTasks: (options?: Record<string, unknown>) => Promise<unknown>;
    getTask: (taskId: number) => Promise<unknown>;
    getTaskByKey: (taskKey: string) => Promise<unknown>;
    listTasksAcrossFolders: (options?: Record<string, unknown>) => Promise<unknown>;
    getTaskPermissions: () => Promise<unknown>;
    getTaskUsers: (organizationUnitId: number) => Promise<unknown>;
    createGenericTask: (task: Record<string, unknown>) => Promise<unknown>;
    getGenericTaskDataById: (taskId: number) => Promise<unknown>;
    getGenericTaskDataByKey: (taskKey: string) => Promise<unknown>;
    saveGenericTaskData: (taskId: number, data: unknown) => Promise<unknown>;
    completeGenericTask: (
      taskId: number,
      data: unknown,
      action?: string,
    ) => Promise<unknown>;
    saveAndReassignGenericTask: (input: {
      taskId: number;
      saveData?: boolean;
      data?: unknown;
      noteText?: string;
      userId?: number;
      userNameOrEmail?: string;
      assignmentCriteria?: 'SingleUser' | 'Workload' | 'AllUsers' | 'RoundRobin' | 'Hierarchy';
    }) => Promise<unknown>;
    listTaskNotes: (taskId: number, top?: number) => Promise<unknown>;
    createTaskNote: (taskId: number, text: string) => Promise<unknown>;
    listTaskActivities: (taskId: number, top?: number) => Promise<unknown>;
  };
};

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function registerTaskTools(server: McpServer, deps: TasksToolsDeps) {
  server.registerTool(
    'uipath_list_tasks',
    {
      description: 'List tasks in the current UiPath folder inbox.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(20),
        skip: z.number().int().min(0).optional(),
        count: z.boolean().default(true),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
        expand: z.string().optional(),
        select: z.string().optional(),
      }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.listTasks(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_task',
    {
      description: 'Get a task by numeric id from UiPath Orchestrator.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
      }),
    },
    async ({ taskId }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.getTask(taskId)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_task_by_key',
    {
      description: 'Get a task by UiPath task key (GUID).',
      inputSchema: z.object({
        taskKey: z.uuid(),
      }),
    },
    async ({ taskKey }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.getTaskByKey(taskKey)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_tasks_across_folders',
    {
      description:
        'List tasks across folders, optionally including only folders where the current user has task admin permissions.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(20),
        skip: z.number().int().min(0).optional(),
        count: z.boolean().default(true),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
        expand: z.string().optional(),
        select: z.string().optional(),
        jobId: z.string().optional(),
        event: z.enum(['ForwardedEver']).optional(),
        adminOnly: z.boolean().default(false),
      }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.listTasksAcrossFolders(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_task_permissions',
    {
      description: 'Get the current user task-related permissions for the current folder.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.getTaskPermissions()),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_task_users',
    {
      description:
        'List users in a folder who have task view/edit permissions and can work tasks.',
      inputSchema: z.object({
        organizationUnitId: z.number().int().positive(),
      }),
    },
    async ({ organizationUnitId }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.getTaskUsers(organizationUnitId)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_generic_task',
    {
      description: 'Create a generic human-in-the-loop UiPath task.',
      inputSchema: z.object({
        title: z.string().min(1).max(512),
        type: taskTypeSchema.default('ExternalTask'),
        priority: taskPrioritySchema.default('Medium'),
        data: z.unknown().optional(),
        taskCatalogName: z.string().max(50).optional(),
        externalTag: z.string().max(512).optional(),
        parentOperationId: z.string().max(128).optional(),
        taskSchemaKey: z.uuid().optional(),
        fpsContext: z.unknown().optional(),
        isActionableMessageEnabled: z.boolean().optional(),
      }),
    },
    async ({
      title,
      type,
      priority,
      data,
      taskCatalogName,
      externalTag,
      parentOperationId,
      taskSchemaKey,
      fpsContext,
      isActionableMessageEnabled,
    }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(
            await deps.tasksApi.createGenericTask({
              title,
              type,
              priority,
              data,
              taskCatalogName,
              externalTag,
              parentOperationId,
              taskSchemaKey,
              fpsContext,
              isActionableMessageEnabled,
            }),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_generic_task_data',
    {
      description: 'Get the task data payload for a generic task by id or key.',
      inputSchema: z
        .object({
          taskId: z.number().int().positive().optional(),
          taskKey: z.uuid().optional(),
        })
        .refine((value) => value.taskId !== undefined || value.taskKey !== undefined, {
          message: 'Provide taskId or taskKey.',
        }),
    },
    async ({ taskId, taskKey }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(
            taskId !== undefined
              ? await deps.tasksApi.getGenericTaskDataById(taskId)
              : await deps.tasksApi.getGenericTaskDataByKey(taskKey!),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_save_generic_task_data',
    {
      description: 'Save task data for an existing generic task without completing it.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
        data: z.unknown(),
      }),
    },
    async ({ taskId, data }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.saveGenericTaskData(taskId, data)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_complete_generic_task',
    {
      description: 'Complete a generic task and optionally persist final task data.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
        data: z.unknown().default({}),
        action: z.string().optional(),
      }),
    },
    async ({ taskId, data, action }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(
            await deps.tasksApi.completeGenericTask(taskId, data, action),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_save_and_reassign_generic_task',
    {
      description:
        'Save a task and reassign it to another user by user id or email/username.',
      inputSchema: z
        .object({
          taskId: z.number().int().positive(),
          saveData: z.boolean().default(true),
          data: z.unknown().optional(),
          noteText: z.string().max(512).optional(),
          userId: z.number().int().positive().optional(),
          userNameOrEmail: z.string().max(256).optional(),
          assignmentCriteria: assignmentCriteriaSchema.optional(),
        })
        .refine(
          (value) => value.userId !== undefined || value.userNameOrEmail !== undefined,
          {
            message: 'Provide userId or userNameOrEmail.',
          },
        ),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.saveAndReassignGenericTask(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_task_notes',
    {
      description: 'List notes attached to a UiPath task.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
        top: z.number().int().positive().max(1000).default(50),
      }),
    },
    async ({ taskId, top }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.listTaskNotes(taskId, top)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_task_note',
    {
      description: 'Add a note to a UiPath task.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
        text: z.string().min(1).max(512),
      }),
    },
    async ({ taskId, text }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.createTaskNote(taskId, text)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_task_activities',
    {
      description: 'List the activity/event trail for a UiPath task.',
      inputSchema: z.object({
        taskId: z.number().int().positive(),
        top: z.number().int().positive().max(1000).default(50),
      }),
    },
    async ({ taskId, top }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.tasksApi.listTaskActivities(taskId, top)),
        },
      ],
    }),
  );
}
