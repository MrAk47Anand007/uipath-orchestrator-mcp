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

export function createAlertsApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listAlerts(input?: {
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

      return client.get(`/odata/Alerts?${query}`);
    },
    getUnreadCount() {
      return client.get('/odata/Alerts/UiPath.Server.Configuration.OData.GetUnreadCount');
    },
    markAsRead(ids: string[]) {
      return client.post(
        '/odata/Alerts/UiPath.Server.Configuration.OData.MarkAsRead',
        { ids },
      );
    },
    raiseProcessAlert(input: {
      message: string;
      severity: 'Info' | 'Success' | 'Warn' | 'Error' | 'Fatal';
      robotName: string;
      processName: string;
    }) {
      return client.post(
        '/odata/Alerts/UiPath.Server.Configuration.OData.RaiseProcessAlert',
        {
          processAlert: {
            Message: input.message,
            Severity: input.severity,
            RobotName: input.robotName,
            ProcessName: input.processName,
          },
        },
      );
    },
  };
}
