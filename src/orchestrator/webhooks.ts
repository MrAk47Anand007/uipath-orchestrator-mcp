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

export function createWebhooksApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listWebhooks(top = 20) {
      return client.get(`/odata/Webhooks?${buildQuery({ $top: top, $count: true })}`);
    },
    getWebhook(webhookId: number) {
      return client.get(`/odata/Webhooks(${webhookId})`);
    },
    createWebhook(webhook: Record<string, unknown>) {
      return client.post('/odata/Webhooks', webhook);
    },
    updateWebhook(webhookId: number, webhook: Record<string, unknown>) {
      return client.put(`/odata/Webhooks(${webhookId})`, webhook);
    },
    deleteWebhook(webhookId: number) {
      return client.delete(`/odata/Webhooks(${webhookId})`);
    },
    pingWebhook(webhookId: number) {
      return client.post(
        `/odata/Webhooks(${webhookId})/UiPath.Server.Configuration.OData.Ping`,
        {},
      );
    },
    listWebhookEventTypes() {
      return client.get(
        `/odata/Webhooks/UiPath.Server.Configuration.OData.GetEventTypes?${buildQuery({
          $count: true,
        })}`,
      );
    },
    triggerCustomEvent(event: Record<string, unknown>) {
      return client.post(
        '/odata/Webhooks/UiPath.Server.Configuration.OData.TriggerCustom',
        event,
      );
    },
  };
}
