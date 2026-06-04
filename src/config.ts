import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defaultUipAuthPath } from './auth/uip-cli.js';
import {
  readPersistedConfigSync,
  readPersistedServiceSecretSync,
  resolveServiceSecretPath,
} from './setup/config-file.js';
import {
  createSecureStorage,
  type SecureStorage,
} from './setup/secure-storage.js';

const envSchema = z.object({
  UIPATH_BASE_URL: z.url().optional(),
  UIPATH_ACCOUNT_LOGICAL_NAME: z.string().min(1).optional(),
  UIPATH_TENANT_LOGICAL_NAME: z.string().min(1).optional(),
  UIPATH_CLIENT_ID: z.string().min(1).optional(),
  UIPATH_CLIENT_SECRET: z.string().min(1).optional(),
  UIPATH_FOLDER_KEY: z.uuid().optional(),
  UIPATH_OAUTH_SCOPES: z.string().default('OR.Default'),
  UIPATH_TOKEN_URL: z.url().optional(),
  UIPATH_AUTH_MODE: z.enum(['service', 'interactive', 'uip']).default('service'),
  UIPATH_AUTH_STORAGE_PATH: z.string().optional(),
  UIPATH_INTERACTIVE_CLIENT_ID: z.string().min(1).optional(),
  UIPATH_INTERACTIVE_REDIRECT_URL: z.url().optional(),
  UIPATH_INTERACTIVE_OAUTH_SCOPES: z.string().optional(),
  UIPATH_AUTHORIZE_URL: z.url().optional(),
  UIPATH_CONFIG_PATH: z.string().optional(),
  UIPATH_UIP_AUTH_PATH: z.string().optional(),
});

export type AuthMode = 'service' | 'interactive' | 'uip';

export type ServiceAuthConfig = {
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
  tokenUrl: URL;
};

export type UipAuthConfig = {
  authPath: string;
  tokenUrl: URL;
};

export type InteractiveAuthConfig = {
  clientId: string;
  oauthScopes: string;
  redirectUrl: URL;
  authorizeUrl: URL;
  tokenUrl: URL;
};

export type AppConfig = {
  baseUrl: URL;
  accountLogicalName: string;
  tenantLogicalName: string;
  defaultFolderKey?: string;
  oauthScopes: string;
  tokenUrl: URL;
  auth: {
    mode: AuthMode;
    storagePath: string;
    service?: ServiceAuthConfig;
    interactive?: InteractiveAuthConfig;
      uip?: UipAuthConfig;
  };
};

function buildIdentityUrl(
  accountLogicalName: string,
  pathname: 'token' | 'authorize',
) {
  return new URL(
    `https://cloud.uipath.com/${accountLogicalName}/identity_/connect/${pathname}`,
  );
}

function resolveAuthStoragePath(source: Record<string, string | undefined>) {
  return (
    source.UIPATH_AUTH_STORAGE_PATH ??
    join(
      source.APPDATA ?? join(homedir(), '.config'),
      'uipath-orchestrator-mcp',
      'auth.json',
    )
  );
}

export function loadConfig(
  source: Record<string, string | undefined> = process.env,
  options: {
    includePersistedConfig?: boolean;
    secureStorage?: SecureStorage;
  } = {},
): AppConfig {
  const shouldIncludePersistedConfig =
    options.includePersistedConfig ?? source === process.env;
  const mergedSource =
    shouldIncludePersistedConfig
      ? {
          ...readPersistedConfigSync(source).values,
          ...source,
        }
      : source;
  const secureStorage = options.secureStorage ?? createSecureStorage();
  const shouldReadPersistedSecret =
    shouldIncludePersistedConfig ||
    Boolean(mergedSource.UIPATH_CONFIG_PATH || mergedSource.UIPATH_SERVICE_SECRET_PATH);
  const persistedClientSecret =
    mergedSource.UIPATH_CLIENT_SECRET ??
    (shouldReadPersistedSecret
      ? readPersistedServiceSecretSync(
          resolveServiceSecretPath(mergedSource),
          secureStorage,
        )
      : undefined);
  // For `uip` auth mode, auto-populate missing values from ~/.uipath/.auth
  const authMode = (mergedSource.UIPATH_AUTH_MODE ?? 'service') as string;
  let uipDefaults: Record<string, string> = {};
  if (authMode === 'uip') {
    const uipAuthPath = mergedSource.UIPATH_UIP_AUTH_PATH ?? defaultUipAuthPath();
    try {
      if (existsSync(uipAuthPath)) {
        const raw = readFileSync(uipAuthPath, 'utf8');
        for (const line of raw.split('\n')) {
          const eq = line.indexOf('=');
          if (eq === -1) continue;
          const k = line.slice(0, eq).trim();
          const v = line.slice(eq + 1).trim();
          if (k === 'UIPATH_ORGANIZATION_NAME' && !mergedSource.UIPATH_ACCOUNT_LOGICAL_NAME) {
            uipDefaults['UIPATH_ACCOUNT_LOGICAL_NAME'] = v;
          }
          if (k === 'UIPATH_TENANT_NAME' && !mergedSource.UIPATH_TENANT_LOGICAL_NAME) {
            uipDefaults['UIPATH_TENANT_LOGICAL_NAME'] = v;
          }
          if (k === 'UIPATH_URL' && !mergedSource.UIPATH_BASE_URL) {
            // Compose the Orchestrator base URL from the cloud URL + org + tenant
            uipDefaults['_UIPATH_CLOUD_URL'] = v;
          }
        }
        // Build base URL if not set
        if (!mergedSource.UIPATH_BASE_URL && uipDefaults['_UIPATH_CLOUD_URL']) {
          const org = uipDefaults['UIPATH_ACCOUNT_LOGICAL_NAME'] ?? mergedSource.UIPATH_ACCOUNT_LOGICAL_NAME ?? '';
          const tenant = uipDefaults['UIPATH_TENANT_LOGICAL_NAME'] ?? mergedSource.UIPATH_TENANT_LOGICAL_NAME ?? '';
          uipDefaults['UIPATH_BASE_URL'] = `${uipDefaults['_UIPATH_CLOUD_URL']}/${org}/${tenant}/orchestrator_`;
        }
      }
    } catch {
      // Non-fatal — validation will surface the missing fields below.
    }
  }

  const env = envSchema.parse({
    ...uipDefaults,
    ...mergedSource,
    UIPATH_CLIENT_SECRET: persistedClientSecret,
  });
  const baseUrl = new URL(env.UIPATH_BASE_URL ?? '');

  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }

  const accountLogicalName = env.UIPATH_ACCOUNT_LOGICAL_NAME ?? '';
  const tenantLogicalName = env.UIPATH_TENANT_LOGICAL_NAME ?? '';

  const tokenUrl = env.UIPATH_TOKEN_URL
    ? new URL(env.UIPATH_TOKEN_URL)
    : buildIdentityUrl(accountLogicalName, 'token');

  const service =
    env.UIPATH_CLIENT_ID && env.UIPATH_CLIENT_SECRET
      ? {
          clientId: env.UIPATH_CLIENT_ID,
          clientSecret: env.UIPATH_CLIENT_SECRET,
          oauthScopes: env.UIPATH_OAUTH_SCOPES,
          tokenUrl,
        }
      : undefined;

  const interactive = env.UIPATH_INTERACTIVE_CLIENT_ID
    ? {
        clientId: env.UIPATH_INTERACTIVE_CLIENT_ID,
        oauthScopes:
          env.UIPATH_INTERACTIVE_OAUTH_SCOPES ??
          `${env.UIPATH_OAUTH_SCOPES} offline_access`,
        redirectUrl: new URL(
          env.UIPATH_INTERACTIVE_REDIRECT_URL ??
            'http://127.0.0.1:8787/callback',
        ),
        authorizeUrl: env.UIPATH_AUTHORIZE_URL
          ? new URL(env.UIPATH_AUTHORIZE_URL)
          : buildIdentityUrl(accountLogicalName, 'authorize'),
        tokenUrl,
      }
    : undefined;

  const uip =
    env.UIPATH_AUTH_MODE === 'uip'
      ? {
          authPath: env.UIPATH_UIP_AUTH_PATH ?? defaultUipAuthPath(),
          tokenUrl,
        }
      : undefined;

  if (env.UIPATH_AUTH_MODE === 'service' && !service) {
    throw new Error(
      'Service auth mode requires UIPATH_CLIENT_ID and UIPATH_CLIENT_SECRET.',
    );
  }

  if (env.UIPATH_AUTH_MODE === 'interactive' && !interactive) {
    throw new Error(
      'Interactive auth mode requires UIPATH_INTERACTIVE_CLIENT_ID.',
    );
  }

  return {
    baseUrl,
    accountLogicalName,
    tenantLogicalName,
    defaultFolderKey: env.UIPATH_FOLDER_KEY,
    oauthScopes: env.UIPATH_OAUTH_SCOPES,
    tokenUrl,
    auth: {
      mode: env.UIPATH_AUTH_MODE,
      storagePath: resolveAuthStoragePath(mergedSource),
      service,
      interactive,
      uip,
    },
  };
}
