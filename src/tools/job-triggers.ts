import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type JobTriggerToolsDeps = {
  jobTriggersApi: {
    listJobTriggers: (
      top?: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getJobTriggersByJobKey: (
      jobKey: string,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    getJobTriggerWaitEvents: (
      jobId: number,
      folder?: { folderKey?: string },
    ) => Promise<unknown>;
    createExternalTrigger: (
      trigger: Record<string, unknown>,
    ) => Promise<unknown>;
    getPayload: (inboxId: string) => Promise<unknown>;
    deliverPayload: (inboxId: string, payload: unknown) => Promise<unknown>;
  };
};

export function registerJobTriggerTools(
  server: McpServer,
  deps: JobTriggerToolsDeps,
) {
  server.registerTool(
    'uipath_list_job_triggers',
    {
      description:
        'List UiPath job resume triggers in the selected folder, including inbox, timer, task, queue, and API waits.',
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
            await deps.jobTriggersApi.listJobTriggers(top, { folderKey }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_job_triggers_by_job_key',
    {
      description:
        'Get trigger state for a specific UiPath job using the job key, including resume status.',
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
            await deps.jobTriggersApi.getJobTriggersByJobKey(jobKey, {
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
    'uipath_get_job_trigger_wait_events',
    {
      description:
        'Get wait-event details for a specific UiPath job id, including task or inbox assignment context.',
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
            await deps.jobTriggersApi.getJobTriggerWaitEvents(jobId, {
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
    'uipath_create_external_job_trigger',
    {
      description:
        'Create an external UiPath job trigger for supported trigger types and get its external id.',
      inputSchema: z.object({
        type: z.enum([
          'DeepRag',
          'BatchRag',
          'IxpExtraction',
          'IndexIngestion',
          'IxpVsEscalation',
        ]),
        externalId: z.uuid(),
      }),
    },
    async ({ type, externalId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobTriggersApi.createExternalTrigger({
              type,
              externalId,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_job_trigger_payload',
    {
      description: 'Fetch the payload currently waiting in a UiPath trigger inbox.',
      inputSchema: z.object({
        inboxId: z.uuid(),
      }),
    },
    async ({ inboxId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobTriggersApi.getPayload(inboxId),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_deliver_job_trigger_payload',
    {
      description:
        'Deliver a JSON payload into a UiPath trigger inbox to resume a waiting job.',
      inputSchema: z.object({
        inboxId: z.uuid(),
        payload: z.record(z.string(), z.unknown()),
      }),
    },
    async ({ inboxId, payload }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.jobTriggersApi.deliverPayload(inboxId, payload),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
