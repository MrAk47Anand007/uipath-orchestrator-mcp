import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type AdminToolsDeps = {
  adminApi: {
    listUsers: (input?: {
      top?: number;
      skip?: number;
      filter?: string;
      orderBy?: string;
      count?: boolean;
    }) => Promise<unknown>;
    getUserById: (userId: number) => Promise<unknown>;
    getUserByKey: (userKey: string) => Promise<unknown>;
    getCurrentUser: () => Promise<unknown>;
    getCurrentPermissions: () => Promise<unknown>;
    validateUsers: (userIds: number[]) => Promise<unknown>;
    getDirectoryPermissions: (input: {
      username?: string;
      domain?: string;
    }) => Promise<unknown>;
    searchDirectoryObjects: (input: {
      searchTerm: string;
      type?: 'User' | 'Group' | 'Robot' | 'ExternalApplication';
      domain?: string;
    }) => Promise<unknown>;
    listRoles: (input?: {
      top?: number;
      skip?: number;
      filter?: string;
      count?: boolean;
    }) => Promise<unknown>;
    getUsersForRole: (roleId: number) => Promise<unknown>;
    getUserIdsForRole: (roleId: number) => Promise<unknown>;
    listFolderUsers: (
      folderId: number,
      input?: {
        includeInherited?: boolean;
        top?: number;
        skip?: number;
        count?: boolean;
      },
    ) => Promise<unknown>;
    getFolderRolesForUser: (
      username: string,
      input?: {
        skip?: number;
        take?: number;
        type?: 'User' | 'Group' | 'Machine' | 'Robot' | 'ExternalApplication';
        searchText?: string;
      },
    ) => Promise<unknown>;
    assignUsersToFolders: (input: {
      userIds: number[];
      rolesPerFolder: Array<{ folderId: number; roleIds: number[] }>;
    }) => Promise<unknown>;
    assignRolesToUser: (userId: number, roleIds: number[]) => Promise<unknown>;
    toggleUserRole: (
      userId: number,
      role: string,
      toggle: boolean,
    ) => Promise<unknown>;
  };
};

function assertConfirmed(confirm: boolean, action: string) {
  if (!confirm) {
    throw new Error(
      `${action} is a privileged change. Re-run with confirm=true after reviewing the user and role details.`,
    );
  }
}

export function registerAdminTools(server: McpServer, deps: AdminToolsDeps) {
  server.registerTool(
    'uipath_list_users',
    {
      description:
        'List UiPath users with optional OData filters, sorting, and pagination.',
      inputSchema: z.object({
        top: z.number().int().positive().max(1000).default(25),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
        orderBy: z.string().optional(),
      }),
    },
    async ({ top, skip, filter, orderBy }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.listUsers({
              top,
              skip,
              filter,
              orderBy,
              count: true,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_user',
    {
      description: 'Get a UiPath user by numeric id.',
      inputSchema: z.object({
        userId: z.number().int().positive(),
      }),
    },
    async ({ userId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.adminApi.getUserById(userId), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_user_by_key',
    {
      description: 'Get a UiPath user by GUID key.',
      inputSchema: z.object({
        userKey: z.uuid(),
      }),
    },
    async ({ userKey }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.adminApi.getUserByKey(userKey), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_current_user',
    {
      description: 'Get the currently authenticated UiPath user.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.adminApi.getCurrentUser(), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_current_permissions',
    {
      description:
        'Get the current UiPath user and the permission names associated with that session.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.getCurrentPermissions(),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_validate_users',
    {
      description:
        'Validate whether the given UiPath users are available or blocked by robot-busy constraints.',
      inputSchema: z.object({
        userIds: z.array(z.number().int().positive()).min(1),
      }),
    },
    async ({ userIds }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.adminApi.validateUsers(userIds), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_directory_permissions',
    {
      description:
        'Get tenant-level directory permissions currently associated with a UiPath user.',
      inputSchema: z.object({
        username: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ username, domain }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.getDirectoryPermissions({ username, domain }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_search_directory_objects',
    {
      description:
        'Search UiPath directory users, groups, robots, or external applications by name or identity.',
      inputSchema: z.object({
        searchTerm: z.string().min(1),
        type: z
          .enum(['User', 'Group', 'Robot', 'ExternalApplication'])
          .optional(),
        domain: z.string().optional(),
      }),
    },
    async ({ searchTerm, type, domain }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.searchDirectoryObjects({
              searchTerm,
              type,
              domain,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_roles',
    {
      description:
        'List available UiPath roles so an admin can inspect role ids, names, and role types before assignment.',
      inputSchema: z.object({
        top: z.number().int().positive().max(100).default(25),
        skip: z.number().int().min(0).optional(),
        filter: z.string().optional(),
      }),
    },
    async ({ top, skip, filter }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.listRoles({
              top,
              skip,
              filter,
              count: true,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_users_for_role',
    {
      description: 'List users currently associated with a UiPath role id.',
      inputSchema: z.object({
        roleId: z.number().int().positive(),
      }),
    },
    async ({ roleId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.adminApi.getUsersForRole(roleId), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_role_user_ids',
    {
      description: 'Fetch numeric user ids currently associated with a UiPath role id.',
      inputSchema: z.object({
        roleId: z.number().int().positive(),
      }),
    },
    async ({ roleId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.getUserIdsForRole(roleId),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_list_folder_users',
    {
      description:
        'List users who have access to a folder, optionally including inherited assignments.',
      inputSchema: z.object({
        folderId: z.number().int().positive(),
        includeInherited: z.boolean().default(false),
        top: z.number().int().positive().max(100).default(25),
        skip: z.number().int().min(0).default(0),
      }),
    },
    async ({ folderId, includeInherited, top, skip }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.listFolderUsers(folderId, {
              includeInherited,
              top,
              skip,
              count: true,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_user_folder_roles',
    {
      description:
        'Map a user, group, robot, or external application to its folder role assignments.',
      inputSchema: z.object({
        username: z.string().min(1),
        type: z
          .enum(['User', 'Group', 'Machine', 'Robot', 'ExternalApplication'])
          .default('User'),
        skip: z.number().int().min(0).default(0),
        take: z.number().int().positive().max(100).default(25),
        searchText: z.string().optional(),
      }),
    },
    async ({ username, type, skip, take, searchText }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.adminApi.getFolderRolesForUser(username, {
              type,
              skip,
              take,
              searchText,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_assign_roles_to_user',
    {
      description:
        'Assign one or more role ids to a specific UiPath user. This is a privileged admin action and requires confirm=true.',
      inputSchema: z.object({
        userId: z.number().int().positive(),
        roleIds: z.array(z.number().int().positive()).min(1),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ userId, roleIds, confirm }) => {
      assertConfirmed(confirm, 'Role assignment');
      await deps.adminApi.assignRolesToUser(userId, roleIds);
      return {
        content: [
          {
            type: 'text',
            text: `Assigned roles ${roleIds.join(', ')} to user ${userId}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_assign_users_to_folders',
    {
      description:
        'Assign one or more users to folders with specific folder role ids. This is a privileged admin action and requires confirm=true.',
      inputSchema: z.object({
        userIds: z.array(z.number().int().positive()).min(1),
        assignments: z
          .array(
            z.object({
              folderId: z.number().int().positive(),
              roleIds: z.array(z.number().int().positive()).min(1),
            }),
          )
          .min(1),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ userIds, assignments, confirm }) => {
      assertConfirmed(confirm, 'Folder access assignment');
      await deps.adminApi.assignUsersToFolders({
        userIds,
        rolesPerFolder: assignments,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Assigned ${userIds.length} user(s) to ${assignments.length} folder assignment set(s).`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_toggle_user_role',
    {
      description:
        'Associate or dissociate a named role for a specific UiPath user. This is a privileged admin action and requires confirm=true.',
      inputSchema: z.object({
        userId: z.number().int().positive(),
        role: z.string().min(1),
        toggle: z.boolean(),
        confirm: z.boolean().default(false),
      }),
    },
    async ({ userId, role, toggle, confirm }) => {
      assertConfirmed(
        confirm,
        toggle ? 'Role association' : 'Role dissociation',
      );
      await deps.adminApi.toggleUserRole(userId, role, toggle);
      return {
        content: [
          {
            type: 'text',
            text: `${toggle ? 'Added' : 'Removed'} role ${role} ${
              toggle ? 'to' : 'from'
            } user ${userId}.`,
          },
        ],
      };
    },
  );
}
