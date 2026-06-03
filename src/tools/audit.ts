import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const auditedServiceSchema = z.enum(['Orchestrator', 'TestAutomation']);

type AuditToolsDeps = {
  auditApi: {
    listAuditLogs: (input?: {
      auditedService?: 'Orchestrator' | 'TestAutomation';
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    }) => Promise<unknown>;
    exportAuditLogs: (input?: {
      auditedService?: 'Orchestrator' | 'TestAutomation';
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    }) => Promise<unknown>;
    getAuditLogDetails: (
      auditLogId: number,
      auditedService?: 'Orchestrator' | 'TestAutomation',
    ) => Promise<unknown>;
  };
};

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function registerAuditTools(server: McpServer, deps: AuditToolsDeps) {
  server.registerTool(
    'uipath_list_audit_logs',
    {
      description:
        'List UiPath audit logs with optional OData filters for component, action, user, and time range.',
      inputSchema: z.object({
        auditedService: auditedServiceSchema.default('Orchestrator'),
        top: z.number().int().positive().max(1000).default(50),
        skip: z.number().int().min(0).optional(),
        count: z.boolean().default(true),
        filter: z.string().optional(),
        orderBy: z.string().default('ExecutionTime desc'),
        expand: z.string().optional(),
        select: z.string().optional(),
      }),
    },
    async (input) => ({
      content: [
        {
          type: 'text',
          text: jsonText(await deps.auditApi.listAuditLogs(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_export_audit_logs',
    {
      description:
        'Request a CSV export job for audit logs that match the given OData query parameters.',
      inputSchema: z.object({
        auditedService: auditedServiceSchema.default('Orchestrator'),
        top: z.number().int().positive().max(1000).default(50),
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
          text: jsonText(await deps.auditApi.exportAuditLogs(input)),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_audit_log_details',
    {
      description:
        'Get entity-level details for a specific audit log entry, including old/new values when available.',
      inputSchema: z.object({
        auditLogId: z.number().int().positive(),
        auditedService: auditedServiceSchema.default('Orchestrator'),
      }),
    },
    async ({ auditLogId, auditedService }) => ({
      content: [
        {
          type: 'text',
          text: jsonText(
            await deps.auditApi.getAuditLogDetails(auditLogId, auditedService),
          ),
        },
      ],
    }),
  );
}
