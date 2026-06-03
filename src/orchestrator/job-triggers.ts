import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createJobTriggersApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listJobTriggers(top = 20, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: String(top),
        $count: 'true',
      });

      return client.get(`/odata/JobTriggers?${query.toString()}`, folder);
    },
    getJobTriggersByJobKey(jobKey: string, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: '20',
        $count: 'true',
      });

      return client.get(
        `/odata/JobTriggers/UiPath.Server.Configuration.OData.GetByJobKey(jobKey=${encodeURIComponent(
          jobKey,
        )})?${query.toString()}`,
        folder,
      );
    },
    getJobTriggerWaitEvents(jobId: number, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: '20',
        $count: 'true',
      });

      return client.get(
        `/odata/JobTriggers/UiPath.Server.Configuration.OData.GetWithWaitEvents(jobId=${jobId})?${query.toString()}`,
        folder,
      );
    },
    createExternalTrigger(trigger: Record<string, unknown>) {
      return client.postWithoutFolder('/api/JobTriggers/SaveExternalTrigger', trigger);
    },
    getPayload(inboxId: string) {
      return client.getWithoutFolder(`/api/JobTriggers/GetPayload/${inboxId}`);
    },
    deliverPayload(inboxId: string, payload: unknown) {
      return client.postWithoutFolder(
        `/api/JobTriggers/DeliverPayload/${inboxId}`,
        payload,
      );
    },
  };
}
