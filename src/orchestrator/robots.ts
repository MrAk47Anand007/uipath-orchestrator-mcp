import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

type RuntimeType =
  | 'NonProduction'
  | 'Attended'
  | 'Unattended'
  | 'Development'
  | 'Studio'
  | 'RpaDeveloper'
  | 'StudioX'
  | 'CitizenDeveloper'
  | 'Headless'
  | 'StudioPro'
  | 'RpaDeveloperPro'
  | 'TestAutomation'
  | 'AutomationCloud'
  | 'Serverless'
  | 'AutomationKit'
  | 'ServerlessTestAutomation'
  | 'AutomationCloudTestAutomation'
  | 'AttendedStudioWeb'
  | 'Hosting'
  | 'AssistantWeb'
  | 'ProcessOrchestration'
  | 'AgentService'
  | 'AppTest'
  | 'PerformanceTest'
  | 'BusinessRule'
  | 'CaseManagement'
  | 'Flow'
  | 'Agent';

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

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
    listMachines(top = 25) {
      return client.get(`/odata/Machines?${buildQuery({ $top: top, $count: true })}`);
    },
    getMachine(machineId: number) {
      return client.get(`/odata/Machines(${machineId})`);
    },
    getAssignedMachines(
      folderId: number,
      options: {
        robotId?: number;
        top?: number;
      } = {},
    ) {
      return client.get(
        `/odata/Machines/UiPath.Server.Configuration.OData.GetAssignedMachines(folderId=${folderId})?${buildQuery({
          robotId: options.robotId,
          $top: options.top ?? 100,
          $count: true,
        })}`,
      );
    },
    getFolderRuntimes(folderId: number) {
      return client.get(
        `/odata/Machines/UiPath.Server.Configuration.OData.GetRuntimesForFolder(folderId=${folderId})?${buildQuery({
          $count: true,
        })}`,
      );
    },
    getMachineSessionRuntimes(
      options: {
        runtimeType?: RuntimeType;
        top?: number;
        skip?: number;
      } = {},
    ) {
      return client.get(
        `/odata/Sessions/UiPath.Server.Configuration.OData.GetMachineSessionRuntimes?${buildQuery({
          runtimeType: options.runtimeType,
          $top: options.top ?? 100,
          $skip: options.skip,
          $count: true,
        })}`,
      );
    },
    getFolderMachineSessionRuntimes(
      folderId: number,
      options: {
        robotId?: number;
        runtimeType?: RuntimeType;
        top?: number;
        skip?: number;
      } = {},
    ) {
      return client.get(
        `/odata/Sessions/UiPath.Server.Configuration.OData.GetMachineSessionRuntimesByFolderId(folderId=${folderId})?${buildQuery({
          robotId: options.robotId,
          runtimeType: options.runtimeType,
          $top: options.top ?? 100,
          $skip: options.skip,
          $count: true,
        })}`,
      );
    },
    toggleRobotEnabledStatus(
      robotIds: number[],
      enabled: boolean,
      folder?: FolderSelector,
    ) {
      return client.post(
        '/odata/Robots/UiPath.Server.Configuration.OData.ToggleEnabledStatus',
        { robotIds, enabled },
        folder,
      );
    },
    deleteInactiveUnattendedSessions(sessionIds: number[]) {
      return client.post(
        '/odata/Sessions/UiPath.Server.Configuration.OData.DeleteInactiveUnattendedSessions',
        { sessionIds },
      );
    },
    updateMachinesToFolderAssociations(input: {
      folderId: number;
      addedMachineIds?: number[];
      removedMachineIds?: number[];
    }) {
      return client.post(
        '/odata/Folders/UiPath.Server.Configuration.OData.UpdateMachinesToFolderAssociations',
        {
          associations: {
            FolderId: input.folderId,
            AddedMachineIds: input.addedMachineIds ?? [],
            RemovedMachineIds: input.removedMachineIds ?? [],
          },
        },
      );
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
