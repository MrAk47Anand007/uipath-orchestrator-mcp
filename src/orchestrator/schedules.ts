import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createSchedulesApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listSchedules(top = 20, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: String(top),
        $count: 'true',
      });

      return client.get(`/odata/ProcessSchedules?${query.toString()}`, folder);
    },
    createSchedule(schedule: Record<string, unknown>, folder?: FolderSelector) {
      return client.post('/odata/ProcessSchedules', schedule, folder);
    },
    setSchedulesEnabled(
      scheduleIds: number[],
      enabled: boolean,
      folder?: FolderSelector,
    ) {
      return client.post(
        '/odata/ProcessSchedules/UiPath.Server.Configuration.OData.SetEnabled',
        {
          enabled,
          scheduleIds,
        },
        folder,
      );
    },
    deleteSchedule(scheduleId: number, folder?: FolderSelector) {
      return client.delete(`/odata/ProcessSchedules(${scheduleId})`, folder);
    },
  };
}
