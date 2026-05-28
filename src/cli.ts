import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { platform } from 'node:os';
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
import { parseEnvContent, upsertEnvContent } from './setup/env-file.js';
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

export async function runLoginCommand(
  config: AppConfig,
  dependencies: {
    openBrowser?: (url: URL) => Promise<void>;
  } = {},
) {
  const interactive = config.auth.interactive;

  if (!interactive) {
    throw new Error(
      'Interactive auth is not configured. Set UIPATH_INTERACTIVE_CLIENT_ID first.',
    );
  }

  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = createOAuthState();
  const authorizeUrl = buildAuthorizeUrl({
    authorizeUrl: interactive.authorizeUrl,
    clientId: interactive.clientId,
    redirectUrl: interactive.redirectUrl,
    oauthScopes: interactive.oauthScopes,
    codeChallenge,
    state,
  });

  const waitForCallback = listenForAuthorizationCode({
    redirectUrl: interactive.redirectUrl,
    expectedState: state,
  });

  console.log(`Opening UiPath login in your browser: ${authorizeUrl}`);
  await (dependencies.openBrowser ?? openUrlInBrowser)(authorizeUrl);

  const code = await waitForCallback;
  const token = await exchangeAuthorizationCode({
    tokenUrl: interactive.tokenUrl,
    clientId: interactive.clientId,
    code,
    redirectUrl: interactive.redirectUrl,
    codeVerifier,
  });

  await saveInteractiveSession(config.auth.storagePath, {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    tokenType: token.tokenType,
    scope: token.scope,
    accountLogicalName: config.accountLogicalName,
    tenantLogicalName: config.tenantLogicalName,
    clientId: interactive.clientId,
  });

  console.log(
    `UiPath login saved to ${config.auth.storagePath}. Token expires at ${token.expiresAt}.`,
  );
}

export async function runLogoutCommand(config: AppConfig) {
  await clearInteractiveSession(config.auth.storagePath);
  console.log(`Removed interactive UiPath session from ${config.auth.storagePath}.`);
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
  } = {},
) {
  const prompt = createPrompt(dependencies.prompt);
  const envFile = await readEnvFile(dependencies.envPath);
  const current = envFile.values;
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
            'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets offline_access',
        )
      : await prompt(
          'Service scopes',
          current.UIPATH_OAUTH_SCOPES ??
            'OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets',
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
    UIPATH_CLIENT_SECRET: serviceClientSecret,
  });

  await writeFile(envFile.path, nextContent.endsWith('\n') ? nextContent : `${nextContent}\n`, 'utf8');

  console.log(`Saved onboarding config to ${envFile.path}.`);
  if (authMode === 'interactive') {
    console.log('Next step: run `login`, then run `doctor`.');
  } else {
    console.log('Next step: run `doctor` to verify the service app and folder access.');
  }
}

export async function runDoctorCommand(
  dependencies: {
    prompt?: PromptFn;
    envPath?: string;
  } = {},
) {
  const prompt = createPrompt(dependencies.prompt);
  const envFile = await readEnvFile(dependencies.envPath);
  const validation = validateDoctorEnv(envFile.values);
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
          'Run `init` to generate or repair your .env file.',
        ],
      }),
    );
    return;
  }

  let config: AppConfig;

  try {
    config = loadConfig({
      ...process.env,
      ...envFile.values,
    });
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
        const updatedContent = upsertEnvContent(envFile.content, {
          UIPATH_FOLDER_KEY: selected.key,
        });

        await writeFile(
          envFile.path,
          updatedContent.endsWith('\n') ? updatedContent : `${updatedContent}\n`,
          'utf8',
        );

        steps.push({
          label: 'Folder selection',
          status: 'ok',
          message: `Saved ${selected.fullyQualifiedName} as the default folder.`,
        });

        envFile.values.UIPATH_FOLDER_KEY = selected.key;
      }
    }
  }

  const folderKey = envFile.values.UIPATH_FOLDER_KEY;
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
