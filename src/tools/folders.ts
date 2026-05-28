import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type FolderToolsDeps = {
  foldersApi: {
    listCurrentUserFolders: () => Promise<unknown>;
    searchAccessibleFolders: (query: string) => Promise<unknown>;
  };
};

export function registerFolderTools(server: McpServer, deps: FolderToolsDeps) {
  server.registerTool(
    'uipath_list_folders',
    {
      description: 'List folders the external app can access in UiPath Orchestrator.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await deps.foldersApi.listCurrentUserFolders(), null, 2),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_search_folders',
    {
      description: 'Search accessible UiPath folders by name.',
      inputSchema: z.object({
        searchText: z.string().min(1),
      }),
    },
    async ({ searchText }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.foldersApi.searchAccessibleFolders(searchText),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
