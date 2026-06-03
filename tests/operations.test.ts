import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server.js';

describe('operations tools', () => {
  it('registers borrowed operator-friendly tools', () => {
    const server = createServer({
      foldersApi: {
        listCurrentUserFolders: vi.fn(),
        searchAccessibleFolders: vi.fn(),
      },
      jobsApi: {
        listProcesses: vi.fn(),
        listReleases: vi.fn(),
        listJobs: vi.fn(),
        resumeJob: vi.fn(),
      },
      queuesApi: {
        retrieveQueuesProcessingStatus: vi.fn(),
        bulkAddQueueItems: vi.fn(),
      },
      robotsApi: {
        getStatus: vi.fn(),
        getJobsStats: vi.fn(),
        getSessionsStats: vi.fn(),
      },
      logsApi: {
        listRobotLogs: vi.fn(),
      },
      resourcesApi: {
        getAssetByName: vi.fn(),
        readBucketFile: vi.fn(),
      },
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(registeredTools?.uipath_health_check).toBeDefined();
    expect(registeredTools?.uipath_dashboard_summary).toBeDefined();
    expect(registeredTools?.uipath_get_running_jobs).toBeDefined();
    expect(registeredTools?.uipath_get_faulted_jobs).toBeDefined();
    expect(registeredTools?.uipath_get_error_logs).toBeDefined();
    expect(registeredTools?.uipath_get_asset_value).toBeDefined();
    expect(registeredTools?.uipath_read_bucket_file).toBeDefined();
    expect(registeredTools?.uipath_add_queue_items_bulk).toBeDefined();
    expect(registeredTools?.uipath_resume_job).toBeDefined();
  });
});
