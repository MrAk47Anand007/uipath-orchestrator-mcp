import { createOrchestratorClient } from './client.js';

export function createFoldersApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listCurrentUserFolders() {
      return client.get<{ value?: unknown[]; items?: unknown[] }>(
        '/api/Folders/GetAllForCurrentUser?take=100&skip=0',
      );
    },
    searchAccessibleFolders(searchText: string) {
      const query = new URLSearchParams({
        take: '25',
        skip: '0',
        searchText,
      });

      return client.get(
        `/api/FoldersNavigation/GetFoldersForCurrentUser?${query.toString()}`,
      );
    },
  };
}
