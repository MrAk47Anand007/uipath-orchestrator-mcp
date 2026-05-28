import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createJobsApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listProcesses(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/Processes?${query.toString()}`, folder);
    },
    listReleases(folder?: FolderSelector) {
      return client.get('/odata/Releases?$top=100', folder);
    },
    listJobs(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/Jobs?${query.toString()}`, folder);
    },
    getJobById(jobId: number, folder?: FolderSelector) {
      return client.get(`/odata/Jobs(${jobId})`, folder);
    },
    startJob(input: {
      releaseKey: string;
      jobsCount?: number;
      robotIds?: number[];
      strategy?: 'Specific' | 'ModernJobsCount';
      inputArguments?: Record<string, unknown>;
      folder?: FolderSelector;
    }) {
      const body = {
        startInfo: {
          ReleaseKey: input.releaseKey,
          Strategy:
            input.strategy ??
            (input.robotIds?.length ? 'Specific' : 'ModernJobsCount'),
          RobotIds: input.robotIds ?? [],
          JobsCount: input.jobsCount ?? 1,
          InputArguments: input.inputArguments
            ? JSON.stringify(input.inputArguments)
            : undefined,
        },
      };

      return client.post(
        '/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
        body,
        input.folder,
      );
    },
    stopJob(
      jobId: number,
      strategy: 'SoftStop' | 'Kill',
      folder?: FolderSelector,
    ) {
      return client.post(
        `/odata/Jobs(${jobId})/UiPath.Server.Configuration.OData.StopJob`,
        { strategy },
        folder,
      );
    },
    restartJob(jobId: number, folder?: FolderSelector) {
      return client.post(
        '/odata/Jobs/UiPath.Server.Configuration.OData.RestartJob',
        { jobId },
        folder,
      );
    },
  };
}
