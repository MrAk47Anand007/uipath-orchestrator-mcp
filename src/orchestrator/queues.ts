import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createQueuesApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listQueueDefinitions(folder?: FolderSelector) {
      return client.get('/odata/QueueDefinitions?$top=100', folder);
    },
    listQueueItems(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/QueueItems?${query.toString()}`, folder);
    },
    addQueueItem(input: {
      queueName: string;
      priority?: 'High' | 'Normal' | 'Low';
      specificContent: Record<string, unknown>;
      reference?: string;
      folder?: FolderSelector;
    }) {
      return client.post(
        '/odata/Queues/UiPathODataSvc.AddQueueItem',
        {
          itemData: {
            Name: input.queueName,
            Priority: input.priority ?? 'Normal',
            SpecificContent: input.specificContent,
            Reference: input.reference,
          },
        },
        input.folder,
      );
    },
    setQueueItemProgress(
      queueItemId: number,
      progress: string,
      folder?: FolderSelector,
    ) {
      return client.post(
        `/odata/QueueItems(${queueItemId})/UiPathODataSvc.SetTransactionProgress`,
        { progress },
        folder,
      );
    },
  };
}
