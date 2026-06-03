import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const webhookEventSchema = z.object({
  eventType: z.string().min(1),
});

type WebhookToolsDeps = {
  webhooksApi: {
    listWebhooks: (top?: number) => Promise<unknown>;
    getWebhook: (webhookId: number) => Promise<unknown>;
    createWebhook: (webhook: Record<string, unknown>) => Promise<unknown>;
    updateWebhook: (
      webhookId: number,
      webhook: Record<string, unknown>,
    ) => Promise<unknown>;
    deleteWebhook: (webhookId: number) => Promise<unknown>;
    pingWebhook: (webhookId: number) => Promise<unknown>;
    listWebhookEventTypes: () => Promise<unknown>;
    triggerCustomEvent: (event: Record<string, unknown>) => Promise<unknown>;
  };
};

function buildWebhookPayload(input: {
  name: string;
  url: string;
  enabled: boolean;
  subscribeToAllEvents: boolean;
  allowInsecureSsl: boolean;
  description?: string;
  secret?: string;
  events?: Array<{ eventType: string }>;
}) {
  return {
    Name: input.name,
    Description: input.description,
    Url: input.url,
    Enabled: input.enabled,
    Secret: input.secret,
    SubscribeToAllEvents: input.subscribeToAllEvents,
    AllowInsecureSsl: input.allowInsecureSsl,
    Events: input.subscribeToAllEvents
      ? []
      : (input.events ?? []).map((event) => ({
          EventType: event.eventType,
        })),
  };
}

export function registerWebhookTools(
  server: McpServer,
  deps: WebhookToolsDeps,
) {
  server.registerTool(
    'uipath_list_webhooks',
    {
      description: 'List webhook subscriptions configured in UiPath Orchestrator.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(20),
      }),
    },
    async ({ top }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.webhooksApi.listWebhooks(top), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_webhook',
    {
      description: 'Get a single webhook subscription by numeric id.',
      inputSchema: z.object({
        webhookId: z.number().int().positive(),
      }),
    },
    async ({ webhookId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.webhooksApi.getWebhook(webhookId), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_webhook_event_types',
    {
      description: 'List the event types that UiPath webhooks can subscribe to.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.webhooksApi.listWebhookEventTypes(),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_webhook',
    {
      description: 'Create a UiPath webhook subscription.',
      inputSchema: z
        .object({
          name: z.string().min(1),
          url: z.url(),
          enabled: z.boolean().default(true),
          subscribeToAllEvents: z.boolean().default(false),
          allowInsecureSsl: z.boolean().default(false),
          description: z.string().optional(),
          secret: z.string().optional(),
          events: z.array(webhookEventSchema).default([]),
        })
        .superRefine((value, ctx) => {
          if (!value.subscribeToAllEvents && value.events.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Provide at least one event when subscribeToAllEvents is false.',
              path: ['events'],
            });
          }
        }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.webhooksApi.createWebhook(buildWebhookPayload(input)),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_update_webhook',
    {
      description: 'Replace an existing UiPath webhook subscription.',
      inputSchema: z
        .object({
          webhookId: z.number().int().positive(),
          name: z.string().min(1),
          url: z.url(),
          enabled: z.boolean().default(true),
          subscribeToAllEvents: z.boolean().default(false),
          allowInsecureSsl: z.boolean().default(false),
          description: z.string().optional(),
          secret: z.string().optional(),
          events: z.array(webhookEventSchema).default([]),
        })
        .superRefine((value, ctx) => {
          if (!value.subscribeToAllEvents && value.events.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Provide at least one event when subscribeToAllEvents is false.',
              path: ['events'],
            });
          }
        }),
    },
    async ({ webhookId, ...input }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.webhooksApi.updateWebhook(
              webhookId,
              buildWebhookPayload(input),
            ),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_delete_webhook',
    {
      description: 'Delete a UiPath webhook subscription.',
      inputSchema: z.object({
        webhookId: z.number().int().positive(),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ webhookId, confirm }) => {
      if (!confirm) {
        throw new Error('Set confirm=true to delete a webhook subscription.');
      }

      await deps.webhooksApi.deleteWebhook(webhookId);
      return {
        content: [
          {
            type: 'text',
            text: `Deleted webhook ${webhookId}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_ping_webhook',
    {
      description: 'Send a connectivity test ping to a UiPath webhook endpoint.',
      inputSchema: z.object({
        webhookId: z.number().int().positive(),
      }),
    },
    async ({ webhookId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.webhooksApi.pingWebhook(webhookId), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_trigger_custom_webhook_event',
    {
      description:
        'Trigger a custom webhook event from UiPath Orchestrator with arbitrary event data.',
      inputSchema: z.object({
        type: z.string().min(1).default('custom'),
        eventId: z.string().min(1),
        entityKey: z.uuid().optional(),
        timestamp: z.string().datetime(),
        eventTime: z.string().datetime().optional(),
        tenantId: z.number().int().optional(),
        organizationUnitId: z.number().int().optional(),
        organizationUnitKey: z.uuid().optional(),
        eventData: z.record(z.string(), z.unknown()).default({}),
      }),
    },
    async ({
      type,
      eventId,
      entityKey,
      timestamp,
      eventTime,
      tenantId,
      organizationUnitId,
      organizationUnitKey,
      eventData,
    }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.webhooksApi.triggerCustomEvent({
              Type: type,
              EventId: eventId,
              EntityKey: entityKey,
              Timestamp: timestamp,
              EventTime: eventTime,
              TenantId: tenantId,
              OrganizationUnitId: organizationUnitId,
              OrganizationUnitKey: organizationUnitKey,
              EventData: eventData,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
