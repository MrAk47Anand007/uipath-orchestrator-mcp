import { createOrchestratorClient } from './client.js';

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

type AuditedService = 'Orchestrator' | 'TestAutomation';

function buildAuditHeaders(auditedService: AuditedService) {
  return {
    'x-UIPATH-AuditedService': auditedService,
  };
}

export function createAuditApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listAuditLogs(input?: {
      auditedService?: AuditedService;
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    }) {
      const query = buildQuery({
        $top: input?.top ?? 50,
        $skip: input?.skip,
        $count: input?.count ?? true,
        $filter: input?.filter,
        $orderby: input?.orderBy,
        $expand: input?.expand,
        $select: input?.select,
      });

      return client.getWithHeaders(
        `/odata/AuditLogs?${query}`,
        buildAuditHeaders(input?.auditedService ?? 'Orchestrator'),
      );
    },
    exportAuditLogs(input?: {
      auditedService?: AuditedService;
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    }) {
      const query = buildQuery({
        auditedService: input?.auditedService ?? 'Orchestrator',
        $top: input?.top ?? 50,
        $skip: input?.skip,
        $count: input?.count ?? true,
        $filter: input?.filter,
        $orderby: input?.orderBy,
        $expand: input?.expand,
        $select: input?.select,
      });

      return client.post(`/odata/AuditLogs/UiPath.Server.Configuration.OData.Export?${query}`, {});
    },
    getAuditLogDetails(
      auditLogId: number,
      auditedService: AuditedService = 'Orchestrator',
    ) {
      return client.getWithHeaders(
        `/odata/AuditLogs/UiPath.Server.Configuration.OData.GetAuditLogDetails(auditLogId=${auditLogId})`,
        buildAuditHeaders(auditedService),
      );
    },
  };
}
