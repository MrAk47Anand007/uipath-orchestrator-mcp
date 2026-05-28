export type FolderSelector = {
  folderKey?: string;
  folderId?: number;
  folderPath?: string;
};

export type OrchestratorRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  folder?: FolderSelector;
};
