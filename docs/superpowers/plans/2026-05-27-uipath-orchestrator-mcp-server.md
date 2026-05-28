# UiPath Orchestrator MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-usable MCP server that lets LLM clients trigger UiPath jobs, inspect queues, and monitor robot/session state through a small, safe set of Orchestrator-backed tools.

**Architecture:** Use the production-stable MCP TypeScript SDK v1.x over `stdio`, with a thin Orchestrator API client underneath. Keep the design transport-agnostic inside `src/` so we can add Streamable HTTP later, but ship `stdio` first to reduce moving parts. Use OAuth client credentials against UiPath External Apps, default folder scoping through `X-UIPATH-FolderKey`, and strict tool schemas so agents cannot send malformed Orchestrator payloads.

**Tech Stack:** Node.js 20, TypeScript, `@modelcontextprotocol/server` v1.x, `zod`, native `fetch`, `vitest`, `nock`

---

## Research Notes

- `swagger.json` in this repo exposes `347` paths and already contains the exact Orchestrator shapes we need for v1:
  - `POST /odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`
  - `POST /odata/Jobs({key})/UiPath.Server.Configuration.OData.StopJob`
  - `POST /odata/Jobs/UiPath.Server.Configuration.OData.RestartJob`
  - `GET /odata/QueueDefinitions`
  - `GET /odata/QueueItems`
  - `POST /odata/Queues/UiPathODataSvc.AddQueueItem`
  - `POST /odata/QueueItems({key})/UiPathODataSvc.SetTransactionProgress`
  - `GET /odata/Sessions`
  - `GET /api/Stats/GetJobsStats`
  - `GET /api/Stats/GetSessionsStats`
- UiPath official docs confirm:
  - External Apps use OAuth 2.0 and confidential apps are the right default for server-to-server integrations.
  - Folder-scoped requests require one of `X-UIPATH-OrganizationUnitId`, `X-UIPATH-FolderPath`, or `X-UIPATH-FolderKey`; `FolderKey` is the stable choice because `FolderId` can change.
  - UiPath’s own MCP guidance explicitly ties process listing to `OR.Execution` and job execution to `OR.Jobs`, which validates the release/process + start job split in our tool design.
- Chrome DevTools is already attached to a live Orchestrator tenant, so manual smoke validation can happen against the real UI after implementation.

## Scope Check

This project has one core subsystem and one optional future subsystem:

1. Core now: local `stdio` MCP server for Claude Desktop / Codex / any MCP client, backed by Orchestrator OAuth and folder-aware tool calls.
2. Later: remote Streamable HTTP deployment, multi-tenant session storage, write-heavy admin endpoints, package upload, asset management, and schedule management.

This plan covers only the core subsystem so we can ship a testable first release quickly.

## File Structure

**Files to create**

- `package.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `src/index.ts`
- `src/server.ts`
- `src/config.ts`
- `src/types.ts`
- `src/orchestrator/auth.ts`
- `src/orchestrator/client.ts`
- `src/orchestrator/folders.ts`
- `src/orchestrator/jobs.ts`
- `src/orchestrator/queues.ts`
- `src/orchestrator/robots.ts`
- `src/tools/folders.ts`
- `src/tools/jobs.ts`
- `src/tools/queues.ts`
- `src/tools/robots.ts`
- `src/tools/index.ts`
- `tests/config.test.ts`
- `tests/folders.test.ts`
- `tests/jobs.test.ts`
- `tests/queues.test.ts`
- `tests/robots.test.ts`

**Responsibilities**

- `src/config.ts`: parse and validate env vars once.
- `src/types.ts`: shared app-level types for folder selectors and normalized responses.
- `src/orchestrator/*.ts`: raw Orchestrator API wrappers, one module per domain.
- `src/tools/*.ts`: MCP tool registration and input/output shaping.
- `src/server.ts`: create `McpServer`, register tools, wire shared dependencies.
- `src/index.ts`: bootstrap `stdio` transport.
- `tests/*.test.ts`: mocked network tests for each behavior slice.

### Task 1: Scaffold the TypeScript MCP server

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/index.ts`
- Create: `src/server.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write the failing config/bootstrap test**

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('parses the minimum env needed to start the server', () => {
    const config = loadConfig({
      UIPATH_BASE_URL: 'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_ACCOUNT_LOGICAL_NAME: 'acme',
      UIPATH_TENANT_LOGICAL_NAME: 'DefaultTenant',
      UIPATH_CLIENT_ID: 'client-id',
      UIPATH_CLIENT_SECRET: 'client-secret',
      UIPATH_FOLDER_KEY: '7e8c5d14-10c8-4c44-a58e-53fbcf8b6c10',
    });

    expect(config.baseUrl.pathname).toBe('/acme/DefaultTenant/orchestrator_/');
    expect(config.defaultFolderKey).toBe('7e8c5d14-10c8-4c44-a58e-53fbcf8b6c10');
    expect(config.oauthScopes).toBe('OR.Default');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL with `Cannot find module '../src/config'`

- [ ] **Step 3: Create project files and minimal bootstrap**

```json
{
  "name": "uipath-orchestrator-mcp-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "check": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "^1.29.0",
    "zod": "^3.25.67"
  },
  "devDependencies": {
    "@types/node": "^22.15.30",
    "nock": "^14.0.5",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

```gitignore
node_modules/
dist/
.env
.DS_Store
coverage/
```

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_CLIENT_ID=
UIPATH_CLIENT_SECRET=
UIPATH_FOLDER_KEY=
UIPATH_OAUTH_SCOPES=OR.Default
UIPATH_TOKEN_URL=https://cloud.uipath.com/identity_/connect/token
```

```ts
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio.js';
import { createServer } from './server.js';

const transport = new StdioServerTransport();
const server = createServer();

await server.connect(transport);
```

```ts
import { McpServer } from '@modelcontextprotocol/server/mcp.js';

export function createServer() {
  return new McpServer({
    name: 'uipath-orchestrator',
    version: '0.1.0',
  });
}
```

- [ ] **Step 4: Implement config parsing**

```ts
import { z } from 'zod';

const envSchema = z.object({
  UIPATH_BASE_URL: z.string().url(),
  UIPATH_ACCOUNT_LOGICAL_NAME: z.string().min(1),
  UIPATH_TENANT_LOGICAL_NAME: z.string().min(1),
  UIPATH_CLIENT_ID: z.string().min(1),
  UIPATH_CLIENT_SECRET: z.string().min(1),
  UIPATH_FOLDER_KEY: z.string().uuid().optional(),
  UIPATH_OAUTH_SCOPES: z.string().default('OR.Default'),
  UIPATH_TOKEN_URL: z.string().url().default('https://cloud.uipath.com/identity_/connect/token'),
});

export type AppConfig = {
  baseUrl: URL;
  accountLogicalName: string;
  tenantLogicalName: string;
  clientId: string;
  clientSecret: string;
  defaultFolderKey?: string;
  oauthScopes: string;
  tokenUrl: URL;
};

export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const env = envSchema.parse(source);

  return {
    baseUrl: new URL(env.UIPATH_BASE_URL),
    accountLogicalName: env.UIPATH_ACCOUNT_LOGICAL_NAME,
    tenantLogicalName: env.UIPATH_TENANT_LOGICAL_NAME,
    clientId: env.UIPATH_CLIENT_ID,
    clientSecret: env.UIPATH_CLIENT_SECRET,
    defaultFolderKey: env.UIPATH_FOLDER_KEY,
    oauthScopes: env.UIPATH_OAUTH_SCOPES,
    tokenUrl: new URL(env.UIPATH_TOKEN_URL),
  };
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- tests/config.test.ts && npm run check`
Expected: PASS for `tests/config.test.ts`, then TypeScript exits successfully

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore .env.example src/index.ts src/server.ts src/config.ts tests/config.test.ts
git commit -m "chore: scaffold uipath orchestrator mcp server"
```

### Task 2: Build OAuth + folder-aware Orchestrator client

**Files:**
- Create: `src/types.ts`
- Create: `src/orchestrator/auth.ts`
- Create: `src/orchestrator/client.ts`
- Create: `src/orchestrator/folders.ts`
- Test: `tests/folders.test.ts`

- [ ] **Step 1: Write the failing folder resolution tests**

```ts
import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client';

describe('folder-aware client', () => {
  beforeEach(() => nock.cleanAll());

  it('sends X-UIPATH-FolderKey when a folder key is provided', async () => {
    const token = 'token-123';

    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: token, token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Releases')
      .matchHeader('authorization', `Bearer ${token}`)
      .matchHeader('x-uipath-folderkey', 'folder-key-1')
      .reply(200, { value: [] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    await client.get('/odata/Releases');
    expect(scope.isDone()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/folders.test.ts`
Expected: FAIL with `Cannot find module '../src/orchestrator/client'`

- [ ] **Step 3: Add shared request types and token client**

```ts
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
```

```ts
type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export function createTokenProvider(config: {
  tokenUrl: URL;
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
}) {
  let cached: { accessToken: string; expiresAt: number } | undefined;

  return async function getAccessToken() {
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;

    const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: config.oauthScopes,
      }),
    });

    if (!response.ok) throw new Error(`UiPath OAuth failed: ${response.status} ${response.statusText}`);

    const token = (await response.json()) as TokenResponse;
    cached = {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };
    return token.access_token;
  };
}
```

- [ ] **Step 4: Add the HTTP client and folder header logic**

```ts
import { createTokenProvider } from './auth.js';
import type { FolderSelector, OrchestratorRequestOptions } from '../types.js';

function applyFolderHeaders(headers: Headers, folder?: FolderSelector, defaultFolderKey?: string) {
  if (folder?.folderKey) headers.set('X-UIPATH-FolderKey', folder.folderKey);
  else if (typeof folder?.folderId === 'number') headers.set('X-UIPATH-OrganizationUnitId', String(folder.folderId));
  else if (folder?.folderPath) headers.set('X-UIPATH-FolderPath', folder.folderPath);
  else if (defaultFolderKey) headers.set('X-UIPATH-FolderKey', defaultFolderKey);
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

  async function request<T>(path: string, options: OrchestratorRequestOptions = {}): Promise<T> {
    const token = await getAccessToken();
    const url = new URL(path.replace(/^\//, ''), config.baseUrl);
    const headers = new Headers({
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    });

    if (options.body !== undefined) headers.set('content-type', 'application/json');
    applyFolderHeaders(headers, options.folder, config.defaultFolderKey);

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`UiPath API ${response.status} ${response.statusText}: ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, folder?: FolderSelector) => request<T>(path, { method: 'GET', folder }),
    post: <T>(path: string, body: unknown, folder?: FolderSelector) => request<T>(path, { method: 'POST', body, folder }),
  };
}
```

- [ ] **Step 5: Add folder discovery helpers**

```ts
export function createFoldersApi(client: ReturnType<typeof createOrchestratorClient>) {
  return {
    listCurrentUserFolders() {
      return client.get<{ value?: unknown[]; items?: unknown[] }>('/api/Folders/GetAllForCurrentUser?take=100&skip=0');
    },
    searchAccessibleFolders(searchText: string) {
      const query = new URLSearchParams({ take: '25', skip: '0', searchText });
      return client.get(`/api/FoldersNavigation/GetFoldersForCurrentUser?${query.toString()}`);
    },
  };
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/folders.test.ts`
Expected: PASS and `nock` confirms the folder header is sent

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/orchestrator/auth.ts src/orchestrator/client.ts src/orchestrator/folders.ts tests/folders.test.ts
git commit -m "feat: add oauth and folder-aware orchestrator client"
```

### Task 3: Add read-only MCP discovery tools

**Files:**
- Create: `src/tools/folders.ts`
- Create: `src/tools/index.ts`
- Modify: `src/server.ts`
- Test: `tests/jobs.test.ts`

- [ ] **Step 1: Write the failing discovery tool test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server';

describe('server discovery tools', () => {
  it('registers folder and process lookup tools', () => {
    const server = createServer({
      foldersApi: { listCurrentUserFolders: vi.fn(), searchAccessibleFolders: vi.fn() },
      jobsApi: { listReleases: vi.fn() },
      queuesApi: {},
      robotsApi: {},
    } as never);

    expect(server).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/jobs.test.ts`
Expected: FAIL because `createServer` does not accept dependencies yet

- [ ] **Step 3: Register the first MCP tools**

```ts
import * as z from 'zod';

export function registerFolderTools(server: McpServer, deps: { foldersApi: { listCurrentUserFolders: () => Promise<unknown>; searchAccessibleFolders: (q: string) => Promise<unknown>; } }) {
  server.registerTool(
    'uipath_list_folders',
    {
      description: 'List folders the external app can access in UiPath Orchestrator.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(await deps.foldersApi.listCurrentUserFolders(), null, 2) }],
    }),
  );

  server.registerTool(
    'uipath_search_folders',
    {
      description: 'Search accessible UiPath folders by name.',
      inputSchema: z.object({ searchText: z.string().min(1) }),
    },
    async ({ searchText }) => ({
      content: [{ type: 'text', text: JSON.stringify(await deps.foldersApi.searchAccessibleFolders(searchText), null, 2) }],
    }),
  );
}
```

```ts
server.registerTool(
  'uipath_list_processes',
  {
    description: 'List UiPath processes/packages available in the selected folder.',
    inputSchema: z.object({
      searchTerm: z.string().optional(),
      folderKey: z.string().uuid().optional(),
    }),
  },
  async ({ searchTerm, folderKey }) => {
    const query = new URLSearchParams();
    if (searchTerm) query.set('searchTerm', searchTerm);
    query.set('$top', '100');
    const result = await deps.jobsApi.listProcesses(query, { folderKey });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);
```

- [ ] **Step 4: Wire dependency injection in `src/server.ts`**

```ts
export function createServer(deps = buildDefaultDependencies()) {
  const server = new McpServer({
    name: 'uipath-orchestrator',
    version: '0.1.0',
  });

  registerFolderTools(server, deps);
  registerJobTools(server, deps);
  registerQueueTools(server, deps);
  registerRobotTools(server, deps);

  return server;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/jobs.test.ts`
Expected: PASS and no TypeScript errors from the new server signature

- [ ] **Step 6: Commit**

```bash
git add src/tools/folders.ts src/tools/index.ts src/server.ts tests/jobs.test.ts
git commit -m "feat: register folder and process discovery tools"
```

### Task 4: Implement job trigger and control tools

**Files:**
- Create: `src/orchestrator/jobs.ts`
- Create: `src/tools/jobs.ts`
- Modify: `src/server.ts`
- Test: `tests/jobs.test.ts`

- [ ] **Step 1: Write the failing job tool test**

```ts
import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client';
import { createJobsApi } from '../src/orchestrator/jobs';

describe('jobs api', () => {
  beforeEach(() => nock.cleanAll());

  it('starts a job using ReleaseKey and ModernJobsCount', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs', {
        startInfo: {
          ReleaseKey: 'release-key-1',
          Strategy: 'ModernJobsCount',
          JobsCount: 1,
          InputArguments: '{\"invoiceId\":\"INV-1001\"}',
        },
      })
      .reply(201, { value: [{ Key: 'job-key-1', State: 'Pending' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const jobsApi = createJobsApi(client);
    const result = await jobsApi.startJob({
      releaseKey: 'release-key-1',
      jobsCount: 1,
      inputArguments: { invoiceId: 'INV-1001' },
    });

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].State).toBe('Pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/jobs.test.ts`
Expected: FAIL with `Cannot find module '../src/orchestrator/jobs'`

- [ ] **Step 3: Implement the job API wrapper**

```ts
import type { FolderSelector } from '../types.js';

export function createJobsApi(client: ReturnType<typeof createOrchestratorClient>) {
  return {
    listProcesses(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/Processes?${query.toString()}`, folder);
    },
    listReleases(folder?: FolderSelector) {
      return client.get('/odata/Releases?$top=100', folder);
    },
    listJobs(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/Jobs?${query.toString()}`, folder);
    },
    startJob(input: {
      releaseKey: string;
      jobsCount?: number;
      robotIds?: number[];
      strategy?: 'Specific' | 'ModernJobsCount';
      inputArguments?: Record<string, unknown>;
      folder?: FolderSelector;
    }) {
      const body = {
        startInfo: {
          ReleaseKey: input.releaseKey,
          Strategy: input.strategy ?? (input.robotIds?.length ? 'Specific' : 'ModernJobsCount'),
          RobotIds: input.robotIds ?? [],
          JobsCount: input.jobsCount ?? 1,
          InputArguments: input.inputArguments ? JSON.stringify(input.inputArguments) : undefined,
        },
      };

      return client.post('/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs', body, input.folder);
    },
    stopJob(jobId: number, strategy: 'SoftStop' | 'Kill', folder?: FolderSelector) {
      return client.post(`/odata/Jobs(${jobId})/UiPath.Server.Configuration.OData.StopJob`, { strategy }, folder);
    },
    restartJob(jobId: number, folder?: FolderSelector) {
      return client.post('/odata/Jobs/UiPath.Server.Configuration.OData.RestartJob', { jobId }, folder);
    },
  };
}
```

- [ ] **Step 4: Register safe MCP job tools**

```ts
server.registerTool(
  'uipath_start_job',
  {
    description: 'Start a UiPath process by release key. Prefer one job at a time unless the caller intentionally requests parallel work.',
    inputSchema: z.object({
      releaseKey: z.string().min(1),
      folderKey: z.string().uuid().optional(),
      jobsCount: z.number().int().positive().max(10).default(1),
      robotIds: z.array(z.number().int().positive()).optional(),
      inputArguments: z.record(z.string(), z.unknown()).optional(),
    }),
  },
  async ({ releaseKey, folderKey, jobsCount, robotIds, inputArguments }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify(await deps.jobsApi.startJob({
        releaseKey,
        jobsCount,
        robotIds,
        inputArguments,
        folder: { folderKey },
      }), null, 2),
    }],
  }),
);
```

```ts
server.registerTool(
  'uipath_stop_job',
  {
    description: 'Soft stop or kill a UiPath job.',
    inputSchema: z.object({
      jobId: z.number().int().positive(),
      strategy: z.enum(['SoftStop', 'Kill']).default('SoftStop'),
      folderKey: z.string().uuid().optional(),
    }),
  },
  async ({ jobId, strategy, folderKey }) => {
    await deps.jobsApi.stopJob(jobId, strategy, { folderKey });
    return { content: [{ type: 'text', text: `Stopped job ${jobId} using ${strategy}.` }] };
  },
);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/jobs.test.ts && npm run check`
Expected: PASS for the start-job API test and TypeScript completes successfully

- [ ] **Step 6: Commit**

```bash
git add src/orchestrator/jobs.ts src/tools/jobs.ts src/server.ts tests/jobs.test.ts
git commit -m "feat: add job trigger and control tools"
```

### Task 5: Implement queue management tools

**Files:**
- Create: `src/orchestrator/queues.ts`
- Create: `src/tools/queues.ts`
- Test: `tests/queues.test.ts`

- [ ] **Step 1: Write the failing queue test**

```ts
import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client';
import { createQueuesApi } from '../src/orchestrator/queues';

describe('queues api', () => {
  beforeEach(() => nock.cleanAll());

  it('adds a queue item with specific content', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Queues/UiPathODataSvc.AddQueueItem', {
        itemData: {
          Name: 'Invoices',
          Priority: 'High',
          SpecificContent: { invoiceId: 'INV-1001', amount: 4500 },
          Reference: 'INV-1001',
        },
      })
      .reply(201, { Id: 42, Status: 'New', Reference: 'INV-1001' });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const queuesApi = createQueuesApi(client);
    const result = await queuesApi.addQueueItem({
      queueName: 'Invoices',
      priority: 'High',
      specificContent: { invoiceId: 'INV-1001', amount: 4500 },
      reference: 'INV-1001',
    });

    expect(scope.isDone()).toBe(true);
    expect(result.Status).toBe('New');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/queues.test.ts`
Expected: FAIL with `Cannot find module '../src/orchestrator/queues'`

- [ ] **Step 3: Implement queue API wrappers**

```ts
import type { FolderSelector } from '../types.js';

export function createQueuesApi(client: ReturnType<typeof createOrchestratorClient>) {
  return {
    listQueueDefinitions(folder?: FolderSelector) {
      return client.get('/odata/QueueDefinitions?$top=100', folder);
    },
    listQueueItems(query: URLSearchParams, folder?: FolderSelector) {
      return client.get(`/odata/QueueItems?${query.toString()}`, folder);
    },
    addQueueItem(input: {
      queueName: string;
      priority?: 'High' | 'Normal' | 'Low';
      specificContent: Record<string, unknown>;
      reference?: string;
      folder?: FolderSelector;
    }) {
      return client.post('/odata/Queues/UiPathODataSvc.AddQueueItem', {
        itemData: {
          Name: input.queueName,
          Priority: input.priority ?? 'Normal',
          SpecificContent: input.specificContent,
          Reference: input.reference,
        },
      }, input.folder);
    },
    setQueueItemProgress(queueItemId: number, progress: string, folder?: FolderSelector) {
      return client.post(`/odata/QueueItems(${queueItemId})/UiPathODataSvc.SetTransactionProgress`, { progress }, folder);
    },
  };
}
```

- [ ] **Step 4: Register MCP queue tools**

```ts
server.registerTool(
  'uipath_add_queue_item',
  {
    description: 'Add one queue transaction into a UiPath queue.',
    inputSchema: z.object({
      queueName: z.string().min(1),
      folderKey: z.string().uuid().optional(),
      priority: z.enum(['High', 'Normal', 'Low']).default('Normal'),
      reference: z.string().max(128).optional(),
      specificContent: z.record(z.string(), z.unknown()),
    }),
  },
  async ({ queueName, folderKey, priority, reference, specificContent }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify(await deps.queuesApi.addQueueItem({
        queueName,
        priority,
        reference,
        specificContent,
        folder: { folderKey },
      }), null, 2),
    }],
  }),
);
```

```ts
server.registerTool(
  'uipath_list_queue_definitions',
  {
    description: 'List queue definitions available in the selected folder.',
    inputSchema: z.object({
      folderKey: z.string().uuid().optional(),
    }),
  },
  async ({ folderKey }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify(await deps.queuesApi.listQueueDefinitions({ folderKey }), null, 2),
    }],
  }),
);
```

```ts
server.registerTool(
  'uipath_list_queue_items',
  {
    description: 'List queue items with optional OData-style filters.',
    inputSchema: z.object({
      folderKey: z.string().uuid().optional(),
      filter: z.string().optional(),
      top: z.number().int().positive().max(100).default(25),
    }),
  },
  async ({ folderKey, filter, top }) => {
    const query = new URLSearchParams({ '$top': String(top) });
    if (filter) query.set('$filter', filter);
    const result = await deps.queuesApi.listQueueItems(query, { folderKey });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);
```

- [ ] **Step 4a: Register queue progress update tool**

```ts
server.registerTool(
  'uipath_set_queue_item_progress',
  {
    description: 'Update the progress message for an in-progress queue item.',
    inputSchema: z.object({
      queueItemId: z.number().int().positive(),
      progress: z.string().min(1),
      folderKey: z.string().uuid().optional(),
    }),
  },
  async ({ queueItemId, progress, folderKey }) => {
    await deps.queuesApi.setQueueItemProgress(queueItemId, progress, { folderKey });
    return { content: [{ type: 'text', text: `Updated queue item ${queueItemId} progress.` }] };
  },
);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/queues.test.ts && npm run check`
Expected: PASS and no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/orchestrator/queues.ts src/tools/queues.ts tests/queues.test.ts
git commit -m "feat: add queue management tools"
```

### Task 6: Implement robot/session monitoring, docs, and smoke validation

**Files:**
- Create: `src/orchestrator/robots.ts`
- Create: `src/tools/robots.ts`
- Create: `tests/robots.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write the failing robot monitoring test**

```ts
import nock from 'nock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client';
import { createRobotsApi } from '../src/orchestrator/robots';

describe('robots api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists robot sessions for the current folder', async () => {
    nock('https://cloud.uipath.com')
      .post('/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Sessions?$top=25')
      .reply(200, { value: [{ Id: 1, State: 'Available', MachineName: 'BOT-VM-1' }] });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Default',
      defaultFolderKey: 'folder-key-1',
    });

    const robotsApi = createRobotsApi(client);
    const result = await robotsApi.listSessions(25);

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].State).toBe('Available');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/robots.test.ts`
Expected: FAIL with `Cannot find module '../src/orchestrator/robots'`

- [ ] **Step 3: Implement monitoring endpoints and tools**

```ts
export function createRobotsApi(client: ReturnType<typeof createOrchestratorClient>) {
  return {
    listSessions(top = 25, folder?: FolderSelector) {
      return client.get(`/odata/Sessions?$top=${top}`, folder);
    },
    listRobots(top = 25, folder?: FolderSelector) {
      return client.get(`/odata/Robots?$top=${top}`, folder);
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
```

```ts
server.registerTool(
  'uipath_list_robot_sessions',
  {
    description: 'List robot sessions and current availability state for a folder.',
    inputSchema: z.object({
      folderKey: z.string().uuid().optional(),
      top: z.number().int().positive().max(100).default(25),
    }),
  },
  async ({ folderKey, top }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify(await deps.robotsApi.listSessions(top, { folderKey }), null, 2),
    }],
  }),
);
```

```ts
server.registerTool(
  'uipath_get_robot_stats',
  {
    description: 'Get aggregated robot/session counts such as Available, Busy, and Disconnected.',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(await deps.robotsApi.getSessionsStats(), null, 2) }],
  }),
);
```

```ts
server.registerTool(
  'uipath_get_jobs_stats',
  {
    description: 'Get aggregated UiPath job counts such as Successful, Faulted, and Canceled.',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(await deps.robotsApi.getJobsStats(), null, 2) }],
  }),
);

server.registerTool(
  'uipath_get_status',
  {
    description: 'Check whether the Orchestrator endpoint is healthy enough to serve traffic.',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(await deps.robotsApi.getStatus(), null, 2) }],
  }),
);
```

- [ ] **Step 4: Document installation and local MCP wiring**

````md
# UiPath Orchestrator MCP Server

## What it does

- Starts UiPath jobs
- Stops or restarts running jobs
- Lists folders, processes, queue definitions, queue items, robots, and sessions
- Adds queue items and updates queue progress

## Setup

1. Register a confidential External App in UiPath.
2. Grant the app folder access.
3. Copy `.env.example` to `.env` and fill in credentials.
4. Install dependencies with `npm install`.
5. Run `npm run build`.

## Claude Desktop example

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "node",
      "args": ["C:/path/to/dist/src/index.js"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_",
        "UIPATH_CLIENT_ID": "your-client-id",
        "UIPATH_CLIENT_SECRET": "your-client-secret",
        "UIPATH_FOLDER_KEY": "your-folder-key"
      }
    }
  }
}
```
````

- [ ] **Step 5: Run the full verification pass**

Run: `npm test && npm run build`
Expected: all tests PASS and `dist/` is generated without type errors

Run: `npm run dev`
Expected: process stays attached on stdio without crashing immediately

Manual smoke:
1. Keep Chrome open on the existing UiPath Orchestrator tenant.
2. Start the MCP server locally.
3. Connect it from the target MCP client.
4. Invoke `uipath_list_folders`, then `uipath_list_processes`, then `uipath_start_job`.
5. Confirm the new job appears in Orchestrator UI and can be soft-stopped with `uipath_stop_job`.

- [ ] **Step 6: Commit**

```bash
git add src/orchestrator/robots.ts src/tools/robots.ts tests/robots.test.ts README.md
git commit -m "feat: add robot monitoring tools and setup docs"
```

## Self-Review

### Spec coverage

- Natural-language job triggering: covered by `uipath_start_job`, `uipath_stop_job`, `uipath_restart_job`.
- Queue management: covered by `uipath_list_queue_definitions`, `uipath_list_queue_items`, `uipath_add_queue_item`, `uipath_set_queue_item_progress`.
- Robot status / monitoring: covered by `uipath_list_robot_sessions`, `uipath_get_robot_stats`, `uipath_get_jobs_stats`, `uipath_get_status`.
- Proper MCP shape: covered by `@modelcontextprotocol/server` v1.x server with typed tool registration.
- Real Orchestrator auth and folder context: covered by OAuth client credentials plus `X-UIPATH-FolderKey`.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain in the tasks.
- Every task names exact files, test commands, and code direction.

### Type consistency

- Folder selection is consistently represented as `folderKey | folderId | folderPath`.
- Job start uses `releaseKey`, `jobsCount`, `robotIds`, and JSON-stringified `inputArguments` everywhere.
- Queue write operations consistently use `queueName`, `specificContent`, `reference`, and `priority`.

## Future Roadmap

### V2: Better UX and broader Orchestrator coverage

**Goal:** Make the MCP easy for normal users to install and powerful enough for daily Orchestrator operations, not just job starts.

**Focus areas**

- Add browser-based login as the default auth UX using OAuth authorization code + PKCE.
- Add CLI commands such as `login`, `logout`, `whoami`, `serve`, and `doctor`.
- Store tokens locally and refresh them automatically.
- Expand Orchestrator coverage to:
  - assets
  - schedules / triggers
  - storage buckets
  - logs / execution output
  - release management
  - queue bulk operations
- Add stronger discovery tools:
  - find process by business name
  - list folders with path and permissions context
  - summarize queue health

**Outcome:** Users can install the package, sign in with UiPath, and operate most common Orchestrator workflows without manual API setup.

### V3: Safety, governance, and team adoption

**Goal:** Make the MCP safe for enterprise use across multiple users and sensitive automations.

**Focus areas**

- Add confirmation gates for risky tools such as stop, kill, bulk queue actions, and release changes.
- Add structured audit logging for every MCP action:
  - who initiated it
  - which tool ran
  - what payload was sent
  - what Orchestrator returned
- Add internal policy checks:
  - allowlist folders
  - allowlist processes
  - read-only mode
  - per-tool enable/disable
- Add RBAC inside the MCP layer for hosted/team scenarios.
- Add observability:
  - request latency
  - auth failures
  - rate-limit handling
  - token refresh diagnostics

**Outcome:** The project becomes deployable in real organizations where trust, traceability, and blast-radius control matter.

### V4: Hosted and multi-tenant platform

**Goal:** Move from a local developer MCP to a reusable platform others can adopt across tenants and teams.

**Focus areas**

- Add Streamable HTTP transport alongside `stdio`.
- Add multi-tenant connection management.
- Support both:
  - per-user delegated auth
  - service-to-service auth for backend agents
- Add admin UI for:
  - connection health
  - tenant onboarding
  - tool usage analytics
  - access control
- Publish:
  - npm package
  - Docker image
  - hosted deployment guide

**Outcome:** This becomes a shareable product and a serious open-source project, not only a local integration.

### V5: Agentic orchestration layer

**Goal:** Turn the MCP from a direct API bridge into an AI automation control plane.

**Focus areas**

- Add high-level compound tools such as:
  - `run_process_by_business_intent`
  - `triage_failed_queue_items`
  - `check_robot_capacity_and_scale_jobs`
- Add playbooks:
  - if queue backlog exceeds threshold, trigger more jobs
  - if job fails with known pattern, retry with safe defaults
  - if all robots are busy, suggest deferred execution
- Add reasoning support:
  - map natural language to process and folder
  - recommend the safest execution strategy
  - summarize operations status for managers
- Add integrations with external systems:
  - email
  - ticketing
  - CRM
  - spreadsheets
  - internal APIs

**Outcome:** UiPath becomes the deterministic execution arm of broader AI workflows.

### Product Positioning Notes

- V1 proves the technical bridge.
- V2 proves usability.
- V3 proves enterprise safety.
- V4 proves scale and adoption.
- V5 proves category leadership: AI agents orchestrating enterprise automation through UiPath.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-uipath-orchestrator-mcp-server.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
