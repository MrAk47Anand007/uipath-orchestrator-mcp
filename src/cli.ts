import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir, platform } from 'node:os';
import {
  buildDependenciesFromConfig,
  createServer,
  type AppDependencies,
} from './server.js';
import type { AppConfig, AuthMode } from './config.js';
import { loadConfig } from './config.js';
import {
  buildAuthorizeUrl,
  clearInteractiveSession,
  createOAuthState,
  createPkcePair,
  exchangeAuthorizationCode,
  listenForAuthorizationCode,
  loadInteractiveSession,
  saveInteractiveSession,
} from './auth/interactive.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTokenProvider } from './orchestrator/auth.js';
import { parseEnvContent, upsertEnvContent } from './setup/env-file.js';
import {
  readPersistedConfig,
  resolveConfigPath,
  resolveServiceSecretPath,
  writePersistedServiceSecret,
  writePersistedConfig,
} from './setup/config-file.js';
import { createSecureStorage } from './setup/secure-storage.js';
import {
  buildDoctorAdvice,
  formatDoctorReport,
  normalizeFolderList,
  validateDoctorEnv,
} from './setup/doctor.js';

type PromptFn = (question: string, defaultValue?: string) => Promise<string>;

function createPrompt(prompt: PromptFn = async (question, defaultValue) => {
  const readline = createInterface({ input, output });
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await readline.question(`${question}${suffix}: `);
  readline.close();
  return answer.trim() || defaultValue || '';
}) {
  return prompt;
}

function getEnvPath(envPath = '.env') {
  return resolve(process.cwd(), envPath);
}

function formatCommand(command: string) {
  return `npx uipath-orchestrator-mcp ${command}`;
}

function mergeConfigSources(
  persisted: Record<string, string>,
  envFile: Record<string, string>,
  envSource: Record<string, string | undefined> = process.env,
) {
  return {
    ...persisted,
    ...envFile,
    ...Object.fromEntries(
      Object.entries(envSource).filter(([, value]) => value !== undefined),
    ),
  } as Record<string, string>;
}

async function readEnvFile(envPath = '.env') {
  const path = getEnvPath(envPath);

  try {
    const content = await readFile(path, 'utf8');
    return { path, content, values: parseEnvContent(content) };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { path, content: '', values: {} as Record<string, string> };
    }

    throw error;
  }
}

function deriveOrgTenantFromBaseUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return {
      accountLogicalName: segments[0] ?? '',
      tenantLogicalName: segments[1] ?? '',
    };
  } catch {
    return {
      accountLogicalName: '',
      tenantLogicalName: '',
    };
  }
}

async function promptForFolderSelection(
  folders: Array<{ key: string; displayName: string; fullyQualifiedName: string }>,
  prompt: PromptFn,
) {
  if (folders.length === 0) {
    return undefined;
  }

  console.log('Accessible folders:');
  folders.forEach((folder, index) => {
    console.log(`${index + 1}. ${folder.fullyQualifiedName}`);
  });

  const answer = await prompt(
    'Choose a default folder number, or press Enter to skip',
  );

  if (!answer) {
    return undefined;
  }

  const selectedIndex = Number(answer) - 1;

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= folders.length) {
    console.log('Skipping folder selection because the choice was not valid.');
    return undefined;
  }

  return folders[selectedIndex];
}

export function getBrowserOpenCommand(platformName: NodeJS.Platform, urlText: string) {
  if (platformName === 'win32') {
    return {
      command: 'rundll32.exe',
      args: ['url.dll,FileProtocolHandler', urlText],
    };
  }

  if (platformName === 'darwin') {
    return {
      command: 'open',
      args: [urlText],
    };
  }

  return {
    command: 'xdg-open',
    args: [urlText],
  };
}

export async function openUrlInBrowser(url: URL) {
  const urlText = url.toString();
  const command = getBrowserOpenCommand(platform(), urlText);
  spawn(command.command, command.args, {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

/**
 * Built-in OAuth client registered by UiPath for their CLI tooling.
 * This is a public client (no secret) — safe to embed and reuse
 * in any tool that interacts with UiPath Cloud on behalf of a user.
 */
const UIPATH_BUILTIN_CLIENT_ID = '36dea5b8-e8bb-423d-8e7b-c808df8f1c00';

/**
 * The redirect URI that UiPath's identity server already has allow-listed
 * for the built-in CLI client. Port 8104 is the UiPath Assistant's OIDC port;
 * when no Assistant is running, our own local server listens on it instead.
 */
const UIPATH_BUILTIN_REDIRECT_URL = new URL('http://localhost:8104/oidc/login');

/** Scopes that give full Orchestrator access plus a refresh token. */
/**
 * Scopes that the built-in UiPath CLI client ID actually has permission to request.
 * These are service-level audience scopes — NOT the OR.* resource scopes, which
 * are only valid for custom external apps registered in Automation Cloud.
 * Taken directly from the URL produced by `uip login`.
 */
const UIPATH_BUILTIN_SCOPES = [
  'offline_access',
  'OrchestratorApiUserAccess',
  'ProcessMining',
  'StudioWebBackend',
  'IdentityServerApi',
  'ConnectionService',
  'DataService',
  'DataServiceApiUserAccess',
  'DocumentUnderstanding',
  'EnterpriseContextService',
  'Directory',
  'JamJamApi',
  'LLMGateway',
  'LLMOps',
  'OMS',
  'RCS.FolderAuthorization',
  'RCS.TagsManagement',
  'TestmanagerApiUserAccess',
  'AutomationSolutions',
  'StudioWebTypeCacheService',
  'Docs.GPT.Search',
  'Insights',
].join(' ');

/** Decode a JWT payload without verifying the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * After obtaining a token, resolve the tenant logical name from the
 * UiPath identity API (the JWT only carries the tenant ID, not the name).
 */
async function resolveTenantName(
  accessToken: string,
  organizationName: string,
  tenantId: string,
): Promise<string> {
  try {
    const res = await fetch(
      `https://cloud.uipath.com/${organizationName}/identity_/api/account/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return tenantId;                   // fall back to ID if API fails
    const data = (await res.json()) as {
      tenants?: Array<{ id: string; name: string }>;
    };
    return data.tenants?.find((t) => t.id === tenantId)?.name ?? tenantId;
  } catch {
    return tenantId;
  }
}

export async function runLoginCommand(
  config: AppConfig,
  dependencies: {
    openBrowser?: (url: URL) => Promise<void>;
  } = {},
) {
  // ── Determine which client + redirect to use ───────────────────────────────
  // If the user has configured their own interactive app, use that.
  // Otherwise fall back to the built-in UiPath CLI public client —
  // which requires zero pre-configuration and works exactly like `uip login`.
  const clientId   = config.auth.interactive?.clientId   ?? UIPATH_BUILTIN_CLIENT_ID;
  const redirectUrl = config.auth.interactive?.redirectUrl ?? UIPATH_BUILTIN_REDIRECT_URL;
  const oauthScopes = config.auth.interactive?.oauthScopes ?? UIPATH_BUILTIN_SCOPES;

  // Token URL: prefer configured, otherwise use the generic cloud endpoint
  // (we'll refine it once we know the org from the returned token).
  const genericTokenUrl = new URL('https://cloud.uipath.com/identity_/connect/token');
  const tokenUrl = config.auth.interactive?.tokenUrl ?? genericTokenUrl;

  // Authorize URL: prefer configured, otherwise use the generic cloud endpoint.
  const genericAuthorizeUrl = new URL('https://cloud.uipath.com/identity_/connect/authorize');
  const authorizeUrl = config.auth.interactive?.authorizeUrl ?? genericAuthorizeUrl;

  // ── Build the PKCE authorize URL ───────────────────────────────────────────
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = createOAuthState();
  const loginUrl = buildAuthorizeUrl({
    authorizeUrl,
    clientId,
    redirectUrl,
    oauthScopes,
    codeChallenge,
    state,
  });

  // ── Start local callback server & open browser ─────────────────────────────
  console.log('→ Opening UiPath login in your browser...');
  console.log('  If already signed in, it will complete automatically.');

  const waitForCallback = listenForAuthorizationCode({
    redirectUrl,
    expectedState: state,
  });

  await (dependencies.openBrowser ?? openUrlInBrowser)(loginUrl);

  // ── Exchange code for tokens ───────────────────────────────────────────────
  const code = await waitForCallback;
  const token = await exchangeAuthorizationCode({
    tokenUrl,
    clientId,
    code,
    redirectUrl,
    codeVerifier,
  });

  // ── Resolve org + tenant from the JWT (no extra config needed) ────────────
  const payload = decodeJwtPayload(token.accessToken);
  const orgIdFromToken   = typeof payload['prt_id'] === 'string' ? payload['prt_id'] : '';
  const orgNameFromToken = typeof payload['prt_lgn'] === 'string'
    ? payload['prt_lgn']
    : config.accountLogicalName;

  // Prefer explicitly configured values; fall back to what the token tells us.
  const accountLogicalName = config.accountLogicalName || orgNameFromToken;
  const tenantLogicalName  =
    config.tenantLogicalName ||
    (await resolveTenantName(token.accessToken, accountLogicalName, config.tenantLogicalName));

  // ── Save session ───────────────────────────────────────────────────────────
  await saveInteractiveSession(config.auth.storagePath, {
    accessToken:         token.accessToken,
    refreshToken:        token.refreshToken,
    expiresAt:           token.expiresAt,
    tokenType:           token.tokenType,
    scope:               token.scope,
    accountLogicalName,
    tenantLogicalName,
    clientId,
  });

  console.log('');
  console.log('✓ Login successful!');
  console.log(`  Organization : ${accountLogicalName}`);
  console.log(`  Tenant       : ${tenantLogicalName}`);
  console.log(`  Expires      : ${token.expiresAt}`);
  console.log(`  Session      : ${config.auth.storagePath}`);
  console.log('');
  console.log(`Run \`${formatCommand('doctor')}\` to verify folder access.`);
  void orgIdFromToken; // suppress unused-var warning
}

/**
 * Standalone browser login — zero pre-configuration required.
 *
 * Works exactly like `uip login`:
 *   npx uipath-orchestrator-mcp login
 *
 * Uses the built-in UiPath public client ID + port 8104 redirect.
 * If the user is already signed into cloud.uipath.com in their browser,
 * the auth flow completes automatically with no manual input.
 */
export async function runBrowserLoginCommand(
  dependencies: {
    openBrowser?: (url: URL) => Promise<void>;
    configPath?: string;
  } = {},
) {
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = createOAuthState();

  const loginUrl = buildAuthorizeUrl({
    authorizeUrl: new URL('https://cloud.uipath.com/identity_/connect/authorize'),
    clientId:     UIPATH_BUILTIN_CLIENT_ID,
    redirectUrl:  UIPATH_BUILTIN_REDIRECT_URL,
    oauthScopes:  UIPATH_BUILTIN_SCOPES,
    codeChallenge,
    state,
  });

  console.log('→ Opening UiPath login in your browser...');
  console.log('  If you are already signed in, it will complete automatically.\n');

  const waitForCallback = listenForAuthorizationCode({
    redirectUrl:   UIPATH_BUILTIN_REDIRECT_URL,
    expectedState: state,
  });

  await (dependencies.openBrowser ?? openUrlInBrowser)(loginUrl);

  const code = await waitForCallback;

  const token = await exchangeAuthorizationCode({
    tokenUrl:    new URL('https://cloud.uipath.com/identity_/connect/token'),
    clientId:    UIPATH_BUILTIN_CLIENT_ID,
    code,
    redirectUrl: UIPATH_BUILTIN_REDIRECT_URL,
    codeVerifier,
  });

  // Decode org + tenant from the JWT — no extra API call needed for the org name
  const payload = decodeJwtPayload(token.accessToken);
  const accountLogicalName =
    (typeof payload['prt_lgn'] === 'string' ? payload['prt_lgn'] : '') ||
    (typeof payload['prt_id']  === 'string' ? payload['prt_id']  : '');

  // Resolve the tenant logical name from the identity API
  const tenantId = typeof payload['tid'] === 'string' ? payload['tid'] : '';
  const tenantLogicalName = await resolveTenantName(
    token.accessToken,
    accountLogicalName,
    tenantId,
  );

  // Persist the auth mode and session
  const persistedConfig = await readPersistedConfig({
    ...process.env,
    UIPATH_CONFIG_PATH: dependencies.configPath,
  });
  const configPath =
    dependencies.configPath ??
    resolveConfigPath({ ...process.env, UIPATH_CONFIG_PATH: dependencies.configPath });

  // Derive the Orchestrator base URL from org + tenant
  const baseUrl = `https://cloud.uipath.com/${accountLogicalName}/${tenantLogicalName}/orchestrator_`;

  await writePersistedConfig(configPath, {
    ...persistedConfig.values,
    UIPATH_BASE_URL:              baseUrl,
    UIPATH_ACCOUNT_LOGICAL_NAME:  accountLogicalName,
    UIPATH_TENANT_LOGICAL_NAME:   tenantLogicalName,
    UIPATH_AUTH_MODE:             'interactive',
    UIPATH_INTERACTIVE_CLIENT_ID: UIPATH_BUILTIN_CLIENT_ID,
    UIPATH_INTERACTIVE_REDIRECT_URL: UIPATH_BUILTIN_REDIRECT_URL.href,
    UIPATH_INTERACTIVE_OAUTH_SCOPES: UIPATH_BUILTIN_SCOPES,
  });

  // Derive the storage path from the saved config
  const storagePath =
    persistedConfig.values.UIPATH_AUTH_STORAGE_PATH ??
    join(
      process.env.APPDATA ?? join(homedir(), '.config'),
      'uipath-orchestrator-mcp',
      'auth.json',
    );

  await saveInteractiveSession(storagePath, {
    accessToken:         token.accessToken,
    refreshToken:        token.refreshToken,
    expiresAt:           token.expiresAt,
    tokenType:           token.tokenType,
    scope:               token.scope,
    accountLogicalName,
    tenantLogicalName,
    clientId:            UIPATH_BUILTIN_CLIENT_ID,
  });

  console.log('✓ Login successful!');
  console.log(`  Organization : ${accountLogicalName}`);
  console.log(`  Tenant       : ${tenantLogicalName}`);
  console.log(`  Expires      : ${token.expiresAt}`);
  console.log(`  Config saved : ${configPath}`);
  console.log(`  Session      : ${storagePath}`);
  console.log('');
  console.log(`Run \`${formatCommand('doctor')}\` to verify folder access.`);
}

/**
 * Standalone logout — zero pre-configuration required.
 *
 * Works exactly like `uip logout`:
 *   npx uipath-orchestrator-mcp logout
 *
 * Clears the saved session file and resets the persisted auth mode
 * so the MCP server won't try to use a stale token.
 */
export async function runLogoutCommand(
  dependencies: { configPath?: string } = {},
) {
  const persistedConfig = await readPersistedConfig({
    ...process.env,
    UIPATH_CONFIG_PATH: dependencies.configPath,
  });

  // Resolve session storage path the same way login does
  const storagePath =
    persistedConfig.values.UIPATH_AUTH_STORAGE_PATH ??
    join(
      process.env.APPDATA ?? join(homedir(), '.config'),
      'uipath-orchestrator-mcp',
      'auth.json',
    );

  await clearInteractiveSession(storagePath);

  // Reset auth-related keys in persisted config so the server
  // doesn't attempt to start with a missing/stale session.
  const configPath =
    dependencies.configPath ??
    resolveConfigPath({ ...process.env, UIPATH_CONFIG_PATH: dependencies.configPath });

  const {
    UIPATH_AUTH_MODE: _mode,
    UIPATH_INTERACTIVE_CLIENT_ID: _cid,
    UIPATH_INTERACTIVE_REDIRECT_URL: _rurl,
    UIPATH_INTERACTIVE_OAUTH_SCOPES: _scopes,
    ...remainingConfig
  } = persistedConfig.values;

  await writePersistedConfig(configPath, remainingConfig);

  console.log('✓ Logged out successfully.');
  console.log(`  Session cleared : ${storagePath}`);
  console.log(`  Config reset    : ${configPath}`);
}

export async function runWhoAmICommand(config: AppConfig) {
  const session = await loadInteractiveSession(config.auth.storagePath);

  console.log(`Auth mode: ${config.auth.mode}`);
  console.log(`Tenant: ${config.accountLogicalName}/${config.tenantLogicalName}`);
  console.log(`Session storage: ${config.auth.storagePath}`);

  if (!session) {
    console.log('Interactive session: not logged in');
    return;
  }

  console.log(`Interactive session: logged in for client ${session.clientId}`);
  console.log(`Token expiry: ${session.expiresAt}`);
  console.log(`Scopes: ${session.scope ?? '(not returned by token endpoint)'}`);
}

export async function runInitCommand(
  dependencies: {
    prompt?: PromptFn;
    envPath?: string;
    configPath?: string;
  } = {},
) {
  const prompt = createPrompt(dependencies.prompt);
  const envFile = await readEnvFile(dependencies.envPath);
  const persistedConfig = await readPersistedConfig({
    ...process.env,
    UIPATH_CONFIG_PATH: dependencies.configPath,
  });
  const current = mergeConfigSources(
    persistedConfig.values,
    envFile.values,
  );
  const baseUrl =
    (await prompt(
      'UiPath Orchestrator base URL',
      current.UIPATH_BASE_URL ??
        'https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_',
    )) ?? '';
  const derived = deriveOrgTenantFromBaseUrl(baseUrl);
  const authMode = ((await prompt(
    'Auth mode (interactive/service)',
    current.UIPATH_AUTH_MODE ?? 'interactive',
  )) || 'interactive') as AuthMode;
  const accountLogicalName =
    (await prompt(
      'UiPath account logical name',
      current.UIPATH_ACCOUNT_LOGICAL_NAME ?? derived.accountLogicalName,
    )) ?? '';
  const tenantLogicalName =
    (await prompt(
      'UiPath tenant logical name',
      current.UIPATH_TENANT_LOGICAL_NAME ?? derived.tenantLogicalName,
    )) ?? '';
  const scopes =
    authMode === 'interactive'
      ? await prompt(
          'Interactive scopes',
          current.UIPATH_INTERACTIVE_OAUTH_SCOPES ??
            'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings offline_access',
        )
      : await prompt(
          'Service scopes',
          current.UIPATH_OAUTH_SCOPES ??
            'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings',
        );
  const interactiveClientId =
    authMode === 'interactive'
      ? await prompt(
          'Interactive app client id',
          current.UIPATH_INTERACTIVE_CLIENT_ID,
        )
      : current.UIPATH_INTERACTIVE_CLIENT_ID;
  const serviceClientId =
    authMode === 'service'
      ? await prompt('Service app client id', current.UIPATH_CLIENT_ID)
      : current.UIPATH_CLIENT_ID;
  const serviceClientSecret =
    authMode === 'service'
      ? await prompt('Service app client secret', current.UIPATH_CLIENT_SECRET)
      : current.UIPATH_CLIENT_SECRET;

  const nextContent = upsertEnvContent(envFile.content, {
    UIPATH_BASE_URL: baseUrl,
    UIPATH_ACCOUNT_LOGICAL_NAME: accountLogicalName,
    UIPATH_TENANT_LOGICAL_NAME: tenantLogicalName,
    UIPATH_AUTH_MODE: authMode,
    UIPATH_OAUTH_SCOPES:
      authMode === 'service' ? scopes : current.UIPATH_OAUTH_SCOPES,
    UIPATH_INTERACTIVE_OAUTH_SCOPES:
      authMode === 'interactive'
        ? scopes
        : current.UIPATH_INTERACTIVE_OAUTH_SCOPES,
    UIPATH_INTERACTIVE_CLIENT_ID: interactiveClientId,
    UIPATH_INTERACTIVE_REDIRECT_URL:
      current.UIPATH_INTERACTIVE_REDIRECT_URL ??
      'http://127.0.0.1:8787/callback',
    UIPATH_CLIENT_ID: serviceClientId,
  });

  const persistedValues: Record<string, string | undefined> = {
    UIPATH_BASE_URL: baseUrl,
    UIPATH_ACCOUNT_LOGICAL_NAME: accountLogicalName,
    UIPATH_TENANT_LOGICAL_NAME: tenantLogicalName,
    UIPATH_AUTH_MODE: authMode,
    UIPATH_FOLDER_KEY: current.UIPATH_FOLDER_KEY,
    UIPATH_OAUTH_SCOPES:
      authMode === 'service'
        ? scopes
        : current.UIPATH_OAUTH_SCOPES ??
          'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings',
    UIPATH_INTERACTIVE_OAUTH_SCOPES:
      authMode === 'interactive'
        ? scopes
        : current.UIPATH_INTERACTIVE_OAUTH_SCOPES,
    UIPATH_INTERACTIVE_CLIENT_ID: interactiveClientId,
    UIPATH_INTERACTIVE_REDIRECT_URL:
      current.UIPATH_INTERACTIVE_REDIRECT_URL ??
      'http://127.0.0.1:8787/callback',
    UIPATH_CLIENT_ID: serviceClientId,
  };

  const configPath =
    dependencies.configPath ??
    resolveConfigPath({
      ...process.env,
      UIPATH_CONFIG_PATH: dependencies.configPath,
    });
  await writePersistedConfig(configPath, {
    ...persistedConfig.values,
    ...persistedValues,
  });

  if (authMode === 'service' && serviceClientSecret) {
    await writePersistedServiceSecret(
      resolveServiceSecretPath({
        ...process.env,
        UIPATH_CONFIG_PATH: dependencies.configPath,
      }),
      serviceClientSecret,
      createSecureStorage(),
    );
  }

  if (dependencies.envPath) {
    await writeFile(
      envFile.path,
      nextContent.endsWith('\n') ? nextContent : `${nextContent}\n`,
      'utf8',
    );
    console.log(`Saved local .env fallback to ${envFile.path}.`);
  }

  console.log(`Saved onboarding config to ${configPath}.`);
  if (authMode === 'interactive') {
    console.log(
      `Next step: run \`${formatCommand('login')}\`, then run \`${formatCommand('doctor')}\`.`,
    );
  } else {
    console.log(
      `Next step: run \`${formatCommand('doctor')}\` to verify the service app and folder access.`,
    );
  }
}

export async function runDoctorCommand(
  dependencies: {
    prompt?: PromptFn;
    envPath?: string;
    configPath?: string;
  } = {},
) {
  const prompt = createPrompt(dependencies.prompt);
  const envFile = await readEnvFile(dependencies.envPath);
  const persistedConfig = await readPersistedConfig({
    ...process.env,
    UIPATH_CONFIG_PATH: dependencies.configPath,
  });
  const current = mergeConfigSources(
    persistedConfig.values,
    envFile.values,
  );
  const validation = validateDoctorEnv(current);
  const steps: Array<{ label: string; status: 'ok' | 'warn' | 'error'; message: string }> = [];

  if (!validation.ok) {
    steps.push({
      label: 'Config',
      status: 'error',
      message: `Missing required values: ${validation.missing.join(', ')}`,
    });

    console.log(
      formatDoctorReport({
        mode: validation.mode,
        steps,
        folders: [],
        advice: [
          `Run \`${formatCommand('init')}\` to generate or repair your saved configuration.`,
        ],
      }),
    );
    return;
  }

  let config: AppConfig;

  try {
    config = loadConfig({
      ...current,
      UIPATH_CONFIG_PATH:
        dependencies.configPath ?? current.UIPATH_CONFIG_PATH,
    }, { includePersistedConfig: false });
    steps.push({
      label: 'Config',
      status: 'ok',
      message: 'Environment looks complete.',
    });
  } catch (error) {
    steps.push({
      label: 'Config',
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    });

    console.log(
      formatDoctorReport({
        mode: validation.mode,
        steps,
        folders: [],
        advice: ['Run `init` to repair the config values.'],
      }),
    );
    return;
  }

  const deps = buildDependenciesFromConfig(config);
  let authSucceeded = false;
  let folders: ReturnType<typeof normalizeFolderList> = [];
  let folderKeyValidated = false;

  try {
    const folderPayload = await deps.foldersApi.listAccessibleFolders();
    folders = normalizeFolderList(folderPayload);
    authSucceeded = true;
    steps.push({
      label: 'Auth',
      status: 'ok',
      message:
        config.auth.mode === 'interactive'
          ? 'Interactive session is valid.'
          : 'Service app token request succeeded.',
    });
  } catch (error) {
    steps.push({
      label: 'Auth',
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (authSucceeded) {
    if (config.defaultFolderKey) {
      try {
        await deps.jobsApi.listReleases({ folderKey: config.defaultFolderKey });
        folderKeyValidated = true;
      } catch {
        folderKeyValidated = false;
      }
    }

    const folderMatches = config.defaultFolderKey
      ? folders.some((folder) => folder.key === config.defaultFolderKey)
      : false;

    steps.push({
      label: 'Folders',
      status:
        folders.length === 0 && folderKeyValidated
          ? 'ok'
          : folders.length === 0
          ? 'warn'
          : config.defaultFolderKey && !folderMatches && !folderKeyValidated
            ? 'warn'
            : 'ok',
      message:
        folders.length === 0 && folderKeyValidated
          ? 'Folder discovery returned no items, but the configured default folder key is valid.'
          : folders.length === 0
          ? 'No accessible folders were returned by Orchestrator.'
          : config.defaultFolderKey && !folderMatches && !folderKeyValidated
            ? 'Configured folder key is not in the accessible folder list.'
            : config.defaultFolderKey
              ? 'Default folder key is valid.'
              : 'Folders were discovered successfully.',
    });

    if (
      folders.length > 0 &&
      (!config.defaultFolderKey || !folderMatches)
    ) {
      const selected = await promptForFolderSelection(folders, prompt);

      if (selected) {
        const configPath =
          dependencies.configPath ??
          persistedConfig.path;
        await writePersistedConfig(configPath, {
          ...persistedConfig.values,
          ...current,
          UIPATH_FOLDER_KEY: selected.key,
        });

        if (dependencies.envPath) {
          const updatedContent = upsertEnvContent(envFile.content, {
            UIPATH_FOLDER_KEY: selected.key,
          });

          await writeFile(
            envFile.path,
            updatedContent.endsWith('\n') ? updatedContent : `${updatedContent}\n`,
            'utf8',
          );
        }

        steps.push({
          label: 'Folder selection',
          status: 'ok',
          message: `Saved ${selected.fullyQualifiedName} as the default folder.`,
        });

        current.UIPATH_FOLDER_KEY = selected.key;
      }
    }
  }

  const folderKey = current.UIPATH_FOLDER_KEY;
  const advice = buildDoctorAdvice({
    folderCount: folderKeyValidated && folders.length === 0 ? 1 : folders.length,
    hasDefaultFolderKey: Boolean(folderKey) && (folderKeyValidated || folders.some((folder) => folder.key === folderKey)),
    authMode: config.auth.mode,
    authSucceeded,
  });

  console.log(
    formatDoctorReport({
      mode: config.auth.mode,
      steps,
      folders,
      advice,
    }),
  );
}

export async function runServiceLoginCommand(options: {
  clientId: string;
  clientSecret: string;
  account?: string;
  tenant?: string;
  configPath?: string;
}) {
  // Load any already-persisted config so we can fall back for account/tenant
  const persistedConfig = await readPersistedConfig({
    ...process.env,
    UIPATH_CONFIG_PATH: options.configPath,
  });
  const current = mergeConfigSources(persistedConfig.values, {});

  const accountLogicalName =
    options.account ??
    current.UIPATH_ACCOUNT_LOGICAL_NAME ??
    '';

  const tenantLogicalName =
    options.tenant ??
    current.UIPATH_TENANT_LOGICAL_NAME ??
    '';

  if (!accountLogicalName) {
    throw new Error(
      'Could not determine UiPath organization. Pass --account <org-logical-name> or run `init` first.',
    );
  }

  if (!tenantLogicalName) {
    throw new Error(
      'Could not determine UiPath tenant. Pass --tenant <tenant-name> or run `init` first.',
    );
  }

  const tokenUrl = current.UIPATH_TOKEN_URL
    ? new URL(current.UIPATH_TOKEN_URL)
    : new URL(
        `https://cloud.uipath.com/${accountLogicalName}/identity_/connect/token`,
      );

  const oauthScopes =
    current.UIPATH_OAUTH_SCOPES ??
    'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings';

  console.log('→ Authenticating with Client Credentials...');

  // Verify credentials by fetching a real token
  const getToken = createTokenProvider({
    tokenUrl,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    oauthScopes,
  });

  const accessToken = await getToken();

  if (!accessToken) {
    throw new Error('Authentication failed: no access token returned.');
  }

  // Persist config + encrypted secret
  const baseUrl =
    current.UIPATH_BASE_URL ??
    `https://cloud.uipath.com/${accountLogicalName}/${tenantLogicalName}/orchestrator_`;

  const configPath =
    options.configPath ??
    resolveConfigPath({ ...process.env, UIPATH_CONFIG_PATH: options.configPath });

  await writePersistedConfig(configPath, {
    ...persistedConfig.values,
    UIPATH_BASE_URL: baseUrl,
    UIPATH_ACCOUNT_LOGICAL_NAME: accountLogicalName,
    UIPATH_TENANT_LOGICAL_NAME: tenantLogicalName,
    UIPATH_AUTH_MODE: 'service',
    UIPATH_CLIENT_ID: options.clientId,
    UIPATH_OAUTH_SCOPES: oauthScopes,
  });

  const secretPath = resolveServiceSecretPath({
    ...process.env,
    UIPATH_CONFIG_PATH: options.configPath,
  });

  await writePersistedServiceSecret(secretPath, options.clientSecret, createSecureStorage());

  console.log(`✓ Authenticated successfully.`);
  console.log(`  Organization : ${accountLogicalName}`);
  console.log(`  Tenant       : ${tenantLogicalName}`);
  console.log(`  Config saved : ${configPath}`);
  console.log(`  Secret saved : ${secretPath} (encrypted)`);
  console.log(`\nRun \`${formatCommand('doctor')}\` to verify folder access.`);
}

export async function runServeCommand(
  deps?: AppDependencies,
  transport = new StdioServerTransport(),
) {
  const server = createServer(
    deps ??
      (() => {
        try {
          return buildDependenciesFromConfig(loadConfig());
        } catch (error) {
          throw new Error(
            `Unable to start the MCP server. ${error instanceof Error ? error.message : String(error)} Run \`init\` or \`doctor\` first.`,
          );
        }
      })(),
  );
  await server.connect(transport);
}
