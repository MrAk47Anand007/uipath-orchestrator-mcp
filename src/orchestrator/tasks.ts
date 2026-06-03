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

export function createTasksApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listTasks(options: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
    } = {}) {
      const query = buildQuery({
        $top: options.top ?? 20,
        $skip: options.skip,
        $count: options.count ?? true,
        $filter: options.filter,
        $orderby: options.orderBy,
        $expand: options.expand,
        $select: options.select,
      });

      return client.get(`/odata/Tasks?${query}`);
    },
    getTask(taskId: number) {
      return client.get(`/odata/Tasks(${taskId})`);
    },
    getTaskByKey(taskKey: string) {
      return client.get(
        `/odata/Tasks/UiPath.Server.Configuration.OData.GetByKey(identifier=${encodeURIComponent(`'${taskKey}'`)})`,
      );
    },
    listTasksAcrossFolders(options: {
      top?: number;
      skip?: number;
      count?: boolean;
      filter?: string;
      orderBy?: string;
      expand?: string;
      select?: string;
      jobId?: string;
      event?: 'ForwardedEver';
      adminOnly?: boolean;
    } = {}) {
      const query = buildQuery({
        event: options.event,
        jobId: options.jobId,
        $top: options.top ?? 20,
        $skip: options.skip,
        $count: options.count ?? true,
        $filter: options.filter,
        $orderby: options.orderBy,
        $expand: options.expand,
        $select: options.select,
      });

      const path = options.adminOnly
        ? '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFoldersForAdmin'
        : '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders';

      return client.get(`${path}?${query}`);
    },
    getTaskPermissions() {
      return client.get(
        '/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskPermissions',
      );
    },
    getTaskUsers(organizationUnitId: number) {
      return client.get(
        `/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskUsers(organizationUnitId=${organizationUnitId})`,
      );
    },
    createGenericTask(task: Record<string, unknown>) {
      return client.post('/tasks/GenericTasks/CreateTask', task);
    },
    getGenericTaskDataById(taskId: number) {
      return client.get(
        `/tasks/GenericTasks/GetTaskDataById?${buildQuery({ taskId })}`,
      );
    },
    getGenericTaskDataByKey(taskKey: string) {
      return client.get(
        `/tasks/GenericTasks/GetTaskDataByKey?${buildQuery({ taskKey })}`,
      );
    },
    saveGenericTaskData(taskId: number, data: unknown) {
      return client.put('/tasks/GenericTasks/SaveTaskData', {
        taskId,
        data,
      });
    },
    completeGenericTask(taskId: number, data: unknown, action?: string) {
      return client.post('/tasks/GenericTasks/CompleteTask', {
        taskId,
        data,
        action,
      });
    },
    saveAndReassignGenericTask(input: {
      taskId: number;
      userId?: number;
      userNameOrEmail?: string;
      assignmentCriteria?: 'SingleUser' | 'Workload' | 'AllUsers' | 'RoundRobin' | 'Hierarchy';
      saveData?: boolean;
      data?: unknown;
      noteText?: string;
    }) {
      return client.post('/tasks/GenericTasks/SaveAndReassignTask', {
        SaveData: input.saveData ?? true,
        Data: input.data,
        NoteText: input.noteText,
        TaskId: input.taskId,
        UserId: input.userId,
        UserNameOrEmail: input.userNameOrEmail,
        AssignmentCriteria: input.assignmentCriteria,
      });
    },
    listTaskNotes(taskId: number, top = 50) {
      return client.get(
        `/odata/TaskNotes/UiPath.Server.Configuration.OData.GetByTaskId(taskId=${taskId})?${buildQuery({
          $top: top,
          $count: true,
        })}`,
      );
    },
    createTaskNote(taskId: number, text: string) {
      return client.post(
        '/odata/TaskNotes/UiPath.Server.Configuration.OData.CreateTaskNote',
        {
          Text: text,
          TaskId: taskId,
        },
      );
    },
    listTaskActivities(taskId: number, top = 50) {
      return client.get(
        `/odata/TaskActivities/UiPath.Server.Configuration.OData.GetByTaskId(taskId=${taskId})?${buildQuery({
          $top: top,
          $count: true,
        })}`,
      );
    },
  };
}
