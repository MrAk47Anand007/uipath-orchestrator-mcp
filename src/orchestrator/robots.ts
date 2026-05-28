import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createRobotsApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listSessions(top = 25, folder?: FolderSelector) {
      return client.get(`/odata/Sessions?$top=${top}`, folder);
    },
    listRobots(top = 25, folder?: FolderSelector) {
      return client.get(`/odata/Robots?$top=${top}`, folder);
    },
    getJobsStats() {
      return client.get('/api/Stats/GetJobsStats');
    },
    getSessionsStats() {
      return client.get('/api/Stats/GetSessionsStats');
    },
    getStatus() {
      return client.get('/api/Status/Get');
    },
  };
}
