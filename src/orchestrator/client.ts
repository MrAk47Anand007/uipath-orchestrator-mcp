import { createTokenProvider } from './auth.js';
import type { FolderSelector, OrchestratorRequestOptions } from '../types.js';

function applyFolderHeaders(
  headers: Headers,
  folder?: FolderSelector,
  defaultFolderKey?: string,
) {
  if (folder?.folderKey) {
    headers.set('X-UIPATH-FolderKey', folder.folderKey);
  } else if (typeof folder?.folderId === 'number') {
    headers.set('X-UIPATH-OrganizationUnitId', String(folder.folderId));
  } else if (folder?.folderPath) {
    headers.set('X-UIPATH-FolderPath', folder.folderPath);
  } else if (defaultFolderKey) {
    headers.set('X-UIPATH-FolderKey', defaultFolderKey);
  }
}

export function createOrchestratorClient(config: {
  baseUrl: URL;
  tokenUrl: URL;
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
  defaultFolderKey?: string;
}) {
  const getAccessToken = createTokenProvider(config);

  async function request<T>(
    path: string,
    options: OrchestratorRequestOptions = {},
  ): Promise<T> {
    const token = await getAccessToken();
    const url = new URL(path.replace(/^\//, ''), config.baseUrl);
    const headers = new Headers({
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    });

    if (options.body !== undefined) {
      headers.set('content-type', 'application/json');
    }

    applyFolderHeaders(headers, options.folder, config.defaultFolderKey);

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`UiPath API ${response.status} ${response.statusText}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, folder?: FolderSelector) =>
      request<T>(path, { method: 'GET', folder }),
    post: <T>(path: string, body: unknown, folder?: FolderSelector) =>
      request<T>(path, { method: 'POST', body, folder }),
  };
}
