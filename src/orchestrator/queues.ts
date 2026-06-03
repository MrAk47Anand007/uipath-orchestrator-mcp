import type { FolderSelector } from '../types.js';
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

export function createQueuesApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listQueueDefinitions(input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: FolderSelector;
    }) {
      const query = buildQuery({
        $top: input?.top ?? 100,
        $skip: input?.skip,
        $count: input?.count ?? true,
        $filter: input?.filter,
        $orderby: input?.orderBy,
      });

      return client.get(`/odata/QueueDefinitions?${query}`, input?.folder);
    },
    getQueueDefinition(queueDefinitionId: number, folder?: FolderSelector) {
      return client.get(`/odata/QueueDefinitions(${queueDefinitionId})`, folder);
    },
    getQueueDefinitionByKey(queueDefinitionKey: string, folder?: FolderSelector) {
      return client.get(
        `/odata/QueueDefinitions/UiPath.Server.Configuration.OData.GetByKey(identifier=${queueDefinitionKey})`,
        folder,
      );
    },
    async createQueueDefinition(input: {
      name: string;
      description?: string;
      maxNumberOfRetries?: number;
      acceptAutomaticallyRetry?: boolean;
      retryAbandonedItems?: boolean;
      enforceUniqueReference?: boolean;
      encrypted?: boolean;
      specificDataJsonSchema?: string;
      outputDataJsonSchema?: string;
      analyticsDataJsonSchema?: string;
      slaInMinutes?: number;
      riskSlaInMinutes?: number;
      releaseId?: number;
      folder?: FolderSelector;
    }) {
      return client.post(
        '/odata/QueueDefinitions',
        {
          Name: input.name,
          Description: input.description,
          MaxNumberOfRetries: input.maxNumberOfRetries ?? 0,
          AcceptAutomaticallyRetry: input.acceptAutomaticallyRetry ?? false,
          RetryAbandonedItems: input.retryAbandonedItems ?? false,
          EnforceUniqueReference: input.enforceUniqueReference ?? false,
          Encrypted: input.encrypted ?? false,
          SpecificDataJsonSchema: input.specificDataJsonSchema,
          OutputDataJsonSchema: input.outputDataJsonSchema,
          AnalyticsDataJsonSchema: input.analyticsDataJsonSchema,
          SlaInMinutes: input.slaInMinutes,
          RiskSlaInMinutes: input.riskSlaInMinutes,
          ReleaseId: input.releaseId,
        },
        input.folder,
      );
    },
    async updateQueueDefinition(
      queueDefinitionId: number,
      input: {
        name?: string;
        description?: string;
        maxNumberOfRetries?: number;
        acceptAutomaticallyRetry?: boolean;
        retryAbandonedItems?: boolean;
        enforceUniqueReference?: boolean;
        encrypted?: boolean;
        specificDataJsonSchema?: string;
        outputDataJsonSchema?: string;
        analyticsDataJsonSchema?: string;
        slaInMinutes?: number;
        riskSlaInMinutes?: number;
        releaseId?: number;
        folder?: FolderSelector;
      },
    ) {
      const existing = (await client.get(
        `/odata/QueueDefinitions(${queueDefinitionId})`,
        input.folder,
      )) as Record<string, unknown>;

      return client.put(
        `/odata/QueueDefinitions(${queueDefinitionId})`,
        {
          ...existing,
          Name: input.name ?? existing.Name,
          Description: input.description ?? existing.Description,
          MaxNumberOfRetries:
            input.maxNumberOfRetries ?? existing.MaxNumberOfRetries,
          AcceptAutomaticallyRetry:
            input.acceptAutomaticallyRetry ?? existing.AcceptAutomaticallyRetry,
          RetryAbandonedItems:
            input.retryAbandonedItems ?? existing.RetryAbandonedItems,
          EnforceUniqueReference:
            input.enforceUniqueReference ?? existing.EnforceUniqueReference,
          Encrypted: input.encrypted ?? existing.Encrypted,
          SpecificDataJsonSchema:
            input.specificDataJsonSchema ?? existing.SpecificDataJsonSchema,
          OutputDataJsonSchema:
            input.outputDataJsonSchema ?? existing.OutputDataJsonSchema,
          AnalyticsDataJsonSchema:
            input.analyticsDataJsonSchema ?? existing.AnalyticsDataJsonSchema,
          SlaInMinutes: input.slaInMinutes ?? existing.SlaInMinutes,
          RiskSlaInMinutes: input.riskSlaInMinutes ?? existing.RiskSlaInMinutes,
          ReleaseId: input.releaseId ?? existing.ReleaseId,
        },
        input.folder,
      );
    },
    deleteQueueDefinition(queueDefinitionId: number, folder?: FolderSelector) {
      return client.delete(`/odata/QueueDefinitions(${queueDefinitionId})`, folder);
    },
    getQueueItemProcessingHistory(queueItemId: number, folder?: FolderSelector) {
      return client.get(
        `/odata/QueueItems(${queueItemId})/UiPathODataSvc.GetItemProcessingHistory?$count=true`,
        folder,
      );
    },
    listQueueItemComments(input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: FolderSelector;
    }) {
      const query = buildQuery({
        $top: input?.top ?? 50,
        $skip: input?.skip,
        $count: input?.count ?? true,
        $filter: input?.filter,
        $orderby: input?.orderBy,
      });

      return client.get(`/odata/QueueItemComments?${query}`, input?.folder);
    },
    createQueueItemComment(input: {
      queueItemId: number;
      text: string;
      folder?: FolderSelector;
    }) {
      return client.post(
        '/odata/QueueItemComments',
        {
          QueueItemId: input.queueItemId,
          Text: input.text,
        },
        input.folder,
      );
    },
    async updateQueueItemComment(
      commentId: number,
      input: {
        text: string;
        folder?: FolderSelector;
      },
    ) {
      const existing = (await client.get(
        `/odata/QueueItemComments(${commentId})`,
        input.folder,
      )) as Record<string, unknown>;

      return client.put(
        `/odata/QueueItemComments(${commentId})`,
        {
          ...existing,
          Text: input.text,
        },
        input.folder,
      );
    },
    deleteQueueItemComment(commentId: number, folder?: FolderSelector) {
      return client.delete(`/odata/QueueItemComments(${commentId})`, folder);
    },
    getQueueItemCommentsHistory(queueItemId: number, folder?: FolderSelector) {
      return client.get(
        `/odata/QueueItemComments/UiPath.Server.Configuration.OData.GetQueueItemCommentsHistory(queueItemId=${queueItemId})?$count=true`,
        folder,
      );
    },
    listQueueItemEvents(input?: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      folder?: FolderSelector;
    }) {
      const query = buildQuery({
        $top: input?.top ?? 50,
        $skip: input?.skip,
        $count: input?.count ?? true,
        $filter: input?.filter,
        $orderby: input?.orderBy,
      });

      return client.get(`/odata/QueueItemEvents?${query}`, input?.folder);
    },
    getQueueItemEventsHistory(queueItemId: number, folder?: FolderSelector) {
      return client.get(
        `/odata/QueueItemEvents/UiPath.Server.Configuration.OData.GetQueueItemEventsHistory(queueItemId=${queueItemId})?$count=true`,
        folder,
      );
    },
    retrieveQueuesProcessingStatus(folder?: FolderSelector) {
      return client.get(
        '/odata/QueueProcessingRecords/UiPathODataSvc.RetrieveQueuesProcessingStatus?$count=true',
        folder,
      );
    },
    retrieveQueueProcessingRecords(
      queueDefinitionId: number,
      daysNo: number,
      folder?: FolderSelector,
    ) {
      return client.get(
        `/odata/QueueProcessingRecords/UiPathODataSvc.RetrieveLastDaysProcessingRecords(daysNo=${daysNo},queueDefinitionId=${queueDefinitionId})?$count=true`,
        folder,
      );
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
    bulkAddQueueItems(input: {
      queueName: string;
      commitType?: 'AllOrNothing' | 'StopOnFirstFailure' | 'ProcessAllIndependently';
      queueItems: Array<{
        priority?: 'High' | 'Normal' | 'Low';
        specificContent: Record<string, unknown>;
        reference?: string;
        deferDate?: string;
        dueDate?: string;
        riskSlaDate?: string;
        progress?: string;
      }>;
      folder?: FolderSelector;
    }) {
      return client.post(
        '/odata/Queues/UiPathODataSvc.BulkAddQueueItems',
        {
          queueName: input.queueName,
          commitType: input.commitType ?? 'ProcessAllIndependently',
          queueItems: input.queueItems.map((item) => ({
            Name: input.queueName,
            Priority: item.priority ?? 'Normal',
            SpecificContent: item.specificContent,
            Reference: item.reference,
            DeferDate: item.deferDate,
            DueDate: item.dueDate,
            RiskSlaDate: item.riskSlaDate,
            Progress: item.progress,
          })),
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
