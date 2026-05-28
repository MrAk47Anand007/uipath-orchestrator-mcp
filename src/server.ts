import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, type AppConfig } from './config.js';
import { createInteractiveTokenProvider } from './auth/interactive.js';
import { createAdminApi } from './orchestrator/admin.js';
import { createOrchestratorClient } from './orchestrator/client.js';
import { createFoldersApi } from './orchestrator/folders.js';
import { createJobsApi } from './orchestrator/jobs.js';
import { createLogsApi } from './orchestrator/logs.js';
import { createQueuesApi } from './orchestrator/queues.js';
import { createReleasesApi } from './orchestrator/releases.js';
import { createResourcesApi } from './orchestrator/resources.js';
import { createRobotsApi } from './orchestrator/robots.js';
import { createSchedulesApi } from './orchestrator/schedules.js';
import {
  registerFolderTools,
  registerJobTools,
  registerLogsTools,
  registerAdminTools,
  registerQueueTools,
  registerReleaseTools,
  registerResourceTools,
  registerRobotTools,
  registerScheduleTools,
} from './tools/index.js';

export type AppDependencies = ReturnType<typeof buildDefaultDependencies>;

export function buildDependenciesFromConfig(config: AppConfig) {
  const getAccessToken =
    config.auth.mode === 'interactive'
      ? createInteractiveTokenProvider({
          tokenUrl: config.auth.interactive!.tokenUrl,
          storagePath: config.auth.storagePath,
          clientId: config.auth.interactive!.clientId,
        })
      : undefined;
  const client =
    getAccessToken !== undefined
      ? createOrchestratorClient({
          baseUrl: config.baseUrl,
          defaultFolderKey: config.defaultFolderKey,
          getAccessToken,
        })
      : createOrchestratorClient({
          baseUrl: config.baseUrl,
          tokenUrl: config.auth.service!.tokenUrl,
          clientId: config.auth.service!.clientId,
          clientSecret: config.auth.service!.clientSecret,
          oauthScopes: config.auth.service!.oauthScopes,
          defaultFolderKey: config.defaultFolderKey,
        });

  return {
    adminApi: createAdminApi(client),
    foldersApi: createFoldersApi(client),
    jobsApi: createJobsApi(client),
    logsApi: createLogsApi(client),
    queuesApi: createQueuesApi(client),
    releasesApi: createReleasesApi(client),
    resourcesApi: createResourcesApi(client),
    robotsApi: createRobotsApi(client),
    schedulesApi: createSchedulesApi(client),
  };
}

export function buildDefaultDependencies() {
  return buildDependenciesFromConfig(loadConfig());
}

export function createServer(deps: AppDependencies = buildDefaultDependencies()) {
  const server = new McpServer({
    name: 'uipath-orchestrator',
    version: '0.1.0',
  });

  registerFolderTools(server, deps);
  registerJobTools(server, deps);
  registerLogsTools(server, deps);
  registerAdminTools(server, deps);
  registerQueueTools(server, deps);
  registerReleaseTools(server, deps);
  registerResourceTools(server, deps);
  registerRobotTools(server, deps);
  registerScheduleTools(server, deps);

  return server;
}
