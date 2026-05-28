import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { createInteractiveTokenProvider } from './auth/interactive.js';
import { createOrchestratorClient } from './orchestrator/client.js';
import { createFoldersApi } from './orchestrator/folders.js';
import { createJobsApi } from './orchestrator/jobs.js';
import { createQueuesApi } from './orchestrator/queues.js';
import { createResourcesApi } from './orchestrator/resources.js';
import { createRobotsApi } from './orchestrator/robots.js';
import {
  registerFolderTools,
  registerJobTools,
  registerQueueTools,
  registerResourceTools,
  registerRobotTools,
} from './tools/index.js';

export type AppDependencies = ReturnType<typeof buildDefaultDependencies>;

export function buildDefaultDependencies() {
  const config = loadConfig();
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
    foldersApi: createFoldersApi(client),
    jobsApi: createJobsApi(client),
    queuesApi: createQueuesApi(client),
    resourcesApi: createResourcesApi(client),
    robotsApi: createRobotsApi(client),
  };
}

export function createServer(deps: AppDependencies = buildDefaultDependencies()) {
  const server = new McpServer({
    name: 'uipath-orchestrator',
    version: '0.1.0',
  });

  registerFolderTools(server, deps);
  registerJobTools(server, deps);
  registerQueueTools(server, deps);
  registerResourceTools(server, deps);
  registerRobotTools(server, deps);

  return server;
}
