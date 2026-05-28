import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createLogsApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listRobotLogs(input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: FolderSelector;
    }) {
      const query = new URLSearchParams({
        $top: String(input?.top ?? 50),
        $count: String(input?.count ?? true),
      });

      if (input?.skip !== undefined) {
        query.set('$skip', String(input.skip));
      }

      if (input?.filter) {
        query.set('$filter', input.filter);
      }

      if (input?.orderBy) {
        query.set('$orderby', input.orderBy);
      }

      return client.get(`/odata/RobotLogs?${query.toString()}`, input?.folder);
    },
    getRobotLogTotalCount(input?: {
      filter?: string;
      folder?: FolderSelector;
    }) {
      const query = new URLSearchParams();

      if (input?.filter) {
        query.set('$filter', input.filter);
      }

      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      return client.get(
        `/odata/RobotLogs/UiPath.Server.Configuration.OData.GetTotalCount${suffix}`,
        input?.folder,
      );
    },
    listExecutionMedia(input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: FolderSelector;
    }) {
      const query = new URLSearchParams({
        $top: String(input?.top ?? 20),
        $count: String(input?.count ?? true),
      });

      if (input?.skip !== undefined) {
        query.set('$skip', String(input.skip));
      }

      if (input?.filter) {
        query.set('$filter', input.filter);
      }

      if (input?.orderBy) {
        query.set('$orderby', input.orderBy);
      }

      return client.get(`/odata/ExecutionMedia?${query.toString()}`, input?.folder);
    },
  };
}
