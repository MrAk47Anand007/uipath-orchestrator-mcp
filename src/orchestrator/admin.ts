import { createOrchestratorClient } from './client.js';

export function createAdminApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listUsers(input?: {
      top?: number;
      skip?: number;
      filter?: string;
      orderBy?: string;
      count?: boolean;
    }) {
      const query = new URLSearchParams({
        $top: String(input?.top ?? 25),
        $count: String(input?.count ?? true),
      });

      if (input?.skip !== undefined) {
        query.set('$skip', String(input.skip));
      }

      if (input?.filter) {
        query.set('$filter', input.filter);
      }

      if (input?.orderBy) {
        query.set('$orderby', input.orderBy);
      }

      return client.get(`/odata/Users?${query.toString()}`);
    },
    getUserById(userId: number) {
      return client.get(`/odata/Users(${userId})`);
    },
    getUserByKey(userKey: string) {
      return client.get(
        `/odata/Users/UiPath.Server.Configuration.OData.GetByKey(identifier=${userKey})`,
      );
    },
    getCurrentUser() {
      return client.get('/odata/Users/UiPath.Server.Configuration.OData.GetCurrentUser');
    },
    getCurrentPermissions() {
      return client.get(
        '/odata/Users/UiPath.Server.Configuration.OData.GetCurrentPermissions',
      );
    },
    validateUsers(userIds: number[]) {
      const ids = userIds.join(',');
      return client.get(
        `/odata/Users/UiPath.Server.Configuration.OData.Validate(userIds=[${ids}])`,
      );
    },
    getDirectoryPermissions(input: { username?: string; domain?: string }) {
      const query = new URLSearchParams();
      if (input.username) {
        query.set('username', input.username);
      }
      if (input.domain) {
        query.set('domain', input.domain);
      }

      return client.get(
        `/api/DirectoryService/GetDirectoryPermissions?${query.toString()}`,
      );
    },
    searchDirectoryObjects(input: {
      searchTerm: string;
      type?: 'User' | 'Group' | 'Robot' | 'ExternalApplication';
      domain?: string;
    }) {
      const query = new URLSearchParams({
        prefix: input.searchTerm,
      });

      if (input.domain) {
        query.set('domain', input.domain);
      }

      if (input.type) {
        const searchContextMap = {
          User: 'Users',
          Group: 'Groups',
          Robot: 'Robots',
          ExternalApplication: 'ExternalApplications',
        } as const;

        query.set('searchContext', searchContextMap[input.type]);
      }

      return client.get(
        `/api/DirectoryService/SearchForUsersAndGroups?${query.toString()}`,
      );
    },
    listRoles(input?: {
      top?: number;
      skip?: number;
      filter?: string;
      count?: boolean;
    }) {
      const query = new URLSearchParams({
        $top: String(input?.top ?? 25),
        $count: String(input?.count ?? true),
      });

      if (input?.skip !== undefined) {
        query.set('$skip', String(input.skip));
      }

      if (input?.filter) {
        query.set('$filter', input.filter);
      }

      return client.get(`/odata/Roles?${query.toString()}`);
    },
    getUsersForRole(roleId: number) {
      return client.get(
        `/odata/Roles/UiPath.Server.Configuration.OData.GetUsersForRole(key=${roleId})`,
      );
    },
    getUserIdsForRole(roleId: number) {
      return client.get(
        `/odata/Roles/UiPath.Server.Configuration.OData.GetUserIdsForRole(key=${roleId})`,
      );
    },
    listFolderUsers(
      folderId: number,
      input?: {
        includeInherited?: boolean;
        top?: number;
        skip?: number;
        count?: boolean;
      },
    ) {
      const query = new URLSearchParams({
        $top: String(input?.top ?? 25),
        $count: String(input?.count ?? true),
      });

      if (input?.skip !== undefined) {
        query.set('$skip', String(input.skip));
      }

      return client.get(
        `/odata/Folders/UiPath.Server.Configuration.OData.GetUsersForFolder(key=${folderId},includeInherited=${String(
          input?.includeInherited ?? false,
        )})?${query.toString()}`,
      );
    },
    getFolderRolesForUser(
      username: string,
      input?: {
        skip?: number;
        take?: number;
        type?: 'User' | 'Group' | 'Machine' | 'Robot' | 'ExternalApplication';
        searchText?: string;
      },
    ) {
      const encodedUsername = encodeURIComponent(username);
      const skip = input?.skip ?? 0;
      const take = input?.take ?? 25;
      const query = new URLSearchParams();

      if (input?.type) {
        query.set('type', input.type);
      }
      if (input?.searchText) {
        query.set('searchText', input.searchText);
      }

      const suffix = query.size ? `?${query.toString()}` : '';

      return client.get(
        `/odata/Folders/UiPath.Server.Configuration.OData.GetAllRolesForUser(username='${encodedUsername}',skip=${skip},take=${take})${suffix}`,
      );
    },
    assignUsersToFolders(input: {
      userIds: number[];
      rolesPerFolder: Array<{ folderId: number; roleIds: number[] }>;
    }) {
      return client.post(
        '/odata/Folders/UiPath.Server.Configuration.OData.AssignUsers',
        {
          assignments: {
            UserIds: input.userIds,
            RolesPerFolder: input.rolesPerFolder.map((assignment) => ({
              FolderId: assignment.folderId,
              RoleIds: assignment.roleIds,
            })),
          },
        },
      );
    },
    assignRolesToUser(userId: number, roleIds: number[]) {
      return client.post(
        `/odata/Users(${userId})/UiPath.Server.Configuration.OData.AssignRoles`,
        { roleIds },
      );
    },
    toggleUserRole(userId: number, role: string, toggle: boolean) {
      return client.post(
        `/odata/Users(${userId})/UiPath.Server.Configuration.OData.ToggleRole`,
        { role, toggle },
      );
    },
  };
}
