import { createTokenProvider, type AccessTokenProvider } from './auth.js';
import type { FolderSelector, OrchestratorRequestOptions } from '../types.js';

function applyFolderHeaders(
  headers: Headers,
  folder?: FolderSelector,
  defaultFolderKey?: string,
  skipDefaultFolder = false,
) {
  if (folder?.folderKey) {
    headers.set('X-UIPATH-FolderKey', folder.folderKey);
  } else if (typeof folder?.folderId === 'number') {
    headers.set('X-UIPATH-OrganizationUnitId', String(folder.folderId));
  } else if (folder?.folderPath) {
    headers.set('X-UIPATH-FolderPath', folder.folderPath);
  } else if (!skipDefaultFolder && defaultFolderKey) {
    headers.set('X-UIPATH-FolderKey', defaultFolderKey);
  }
}

type ServiceClientConfig = {
  baseUrl: URL;
  tokenUrl: URL;
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
  defaultFolderKey?: string;
};

type TokenProviderClientConfig = {
  baseUrl: URL;
  defaultFolderKey?: string;
  getAccessToken: AccessTokenProvider;
};

export function createOrchestratorClient(
  config: ServiceClientConfig | TokenProviderClientConfig,
) {
  const getAccessToken =
    'getAccessToken' in config ? config.getAccessToken : createTokenProvider(config);

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

    applyFolderHeaders(
      headers,
      options.folder,
      config.defaultFolderKey,
      options.skipDefaultFolder,
    );

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

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

    const text = await response.text();

    if (!text.trim()) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  return {
    get: <T>(path: string, folder?: FolderSelector) =>
      request<T>(path, { method: 'GET', folder }),
    getTenantScoped: <T>(path: string, folder?: FolderSelector) =>
      request<T>(path, { method: 'GET', folder, skipDefaultFolder: true }),
    getWithoutFolder: <T>(path: string) =>
      request<T>(path, { method: 'GET', skipDefaultFolder: true }),
    getWithHeaders: <T>(
      path: string,
      headers: Record<string, string>,
      folder?: FolderSelector,
    ) => request<T>(path, { method: 'GET', headers, folder }),
    post: <T>(path: string, body: unknown, folder?: FolderSelector) =>
      request<T>(path, { method: 'POST', body, folder }),
    postTenantScoped: <T>(
      path: string,
      body: unknown,
      folder?: FolderSelector,
    ) =>
      request<T>(path, {
        method: 'POST',
        body,
        folder,
        skipDefaultFolder: true,
      }),
    postWithoutFolder: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body, skipDefaultFolder: true }),
    postWithHeaders: <T>(
      path: string,
      body: unknown,
      headers: Record<string, string>,
      folder?: FolderSelector,
    ) => request<T>(path, { method: 'POST', body, headers, folder }),
    put: <T>(path: string, body: unknown, folder?: FolderSelector) =>
      request<T>(path, { method: 'PUT', body, folder }),
    putTenantScoped: <T>(
      path: string,
      body: unknown,
      folder?: FolderSelector,
    ) =>
      request<T>(path, {
        method: 'PUT',
        body,
        folder,
        skipDefaultFolder: true,
      }),
    putWithoutFolder: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PUT', body, skipDefaultFolder: true }),
    patch: <T>(path: string, body: unknown, folder?: FolderSelector) =>
      request<T>(path, { method: 'PATCH', body, folder }),
    delete: <T>(path: string, folder?: FolderSelector) =>
      request<T>(path, { method: 'DELETE', folder }),
    deleteTenantScoped: <T>(path: string, folder?: FolderSelector) =>
      request<T>(path, { method: 'DELETE', folder, skipDefaultFolder: true }),
    deleteWithoutFolder: <T>(path: string) =>
      request<T>(path, { method: 'DELETE', skipDefaultFolder: true }),
    postFormData: async <T>(
      path: string,
      formData: FormData,
      folder?: FolderSelector,
    ) => {
      const token = await getAccessToken();
      const url = new URL(path.replace(/^\//, ''), config.baseUrl);
      const headers = new Headers({
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      });

      applyFolderHeaders(headers, folder, config.defaultFolderKey);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`UiPath API ${response.status} ${response.statusText}: ${text}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();

      if (!text.trim()) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    },
  };
}
