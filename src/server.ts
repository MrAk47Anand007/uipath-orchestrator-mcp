import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { createOrchestratorClient } from './orchestrator/client.js';
import { createFoldersApi } from './orchestrator/folders.js';
import { createJobsApi } from './orchestrator/jobs.js';
import { createQueuesApi } from './orchestrator/queues.js';
import { createRobotsApi } from './orchestrator/robots.js';
import {
  registerFolderTools,
  registerJobTools,
  registerQueueTools,
  registerRobotTools,
} from './tools/index.js';

export type AppDependencies = ReturnType<typeof buildDefaultDependencies>;

export function buildDefaultDependencies() {
  const config = loadConfig();
  const client = createOrchestratorClient({
    baseUrl: config.baseUrl,
    tokenUrl: config.tokenUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    oauthScopes: config.oauthScopes,
    defaultFolderKey: config.defaultFolderKey,
  });

  return {
    foldersApi: createFoldersApi(client),
    jobsApi: createJobsApi(client),
    queuesApi: createQueuesApi(client),
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
  registerRobotTools(server, deps);

  return server;
}
