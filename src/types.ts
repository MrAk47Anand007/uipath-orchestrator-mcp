export type FolderSelector = {
  folderKey?: string;
  folderId?: number;
  folderPath?: string;
};

export type OrchestratorRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  folder?: FolderSelector;
  headers?: Record<string, string>;
  skipDefaultFolder?: boolean;
};
