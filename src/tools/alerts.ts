import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const alertSeveritySchema = z.enum(['Info', 'Success', 'Warn', 'Error', 'Fatal']);

type AlertsToolsDeps = {
  alertsApi: {
    listAlerts: (input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    }) => Promise<unknown>;
    getUnreadCount: () => Promise<unknown>;
    markAsRead: (ids: string[]) => Promise<unknown>;
    raiseProcessAlert: (input: {
      message: string;
      severity: 'Info' | 'Success' | 'Warn' | 'Error' | 'Fatal';
      robotName: string;
      processName: string;
    }) => Promise<unknown>;
  };
};

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function registerAlertsTools(server: McpServer, deps: AlertsToolsDeps) {
  server.registerTool(
    'uipath_list_alerts',
    {
      description:
        'List UiPath alerts and notifications with optional OData filters by component, severity, state, or time.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(50),
        skip: z.number().int().min(0).optional(),
        count: z.boolean().default(true),
        filter: z.string().optional(),
        orderBy: z.string().default('CreationTime desc'),
        expand: z.string().optional(),
        select: z.string().optional(),
      }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.alertsApi.listAlerts(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_unread_alert_count',
    {
      description: 'Get the number of unread UiPath alerts for the current user.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.alertsApi.getUnreadCount()),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_mark_alerts_as_read',
    {
      description: 'Mark one or more UiPath alerts as read using their alert ids.',
      inputSchema: z.object({
        ids: z.array(z.uuid()).min(1),
      }),
    },
    async ({ ids }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.alertsApi.markAsRead(ids)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_raise_process_alert',
    {
      description:
        'Raise a process alert manually in UiPath for operational workflows or test notifications.',
      inputSchema: z.object({
        message: z.string().min(1).max(512),
        severity: alertSeveritySchema.default('Warn'),
        robotName: z.string().min(1).max(512),
        processName: z.string().min(1).max(512),
      }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.alertsApi.raiseProcessAlert(input)),
        },
      ],
    }),
  );
}
