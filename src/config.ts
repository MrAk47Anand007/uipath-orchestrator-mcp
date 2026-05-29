import { z } from 'zod';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readPersistedConfigSync } from './setup/config-file.js';

const envSchema = z.object({
  UIPATH_BASE_URL: z.url(),
  UIPATH_ACCOUNT_LOGICAL_NAME: z.string().min(1),
  UIPATH_TENANT_LOGICAL_NAME: z.string().min(1),
  UIPATH_CLIENT_ID: z.string().min(1).optional(),
  UIPATH_CLIENT_SECRET: z.string().min(1).optional(),
  UIPATH_FOLDER_KEY: z.uuid().optional(),
  UIPATH_OAUTH_SCOPES: z.string().default('OR.Default'),
  UIPATH_TOKEN_URL: z.url().optional(),
  UIPATH_AUTH_MODE: z.enum(['service', 'interactive']).default('service'),
  UIPATH_AUTH_STORAGE_PATH: z.string().optional(),
  UIPATH_INTERACTIVE_CLIENT_ID: z.string().min(1).optional(),
  UIPATH_INTERACTIVE_REDIRECT_URL: z.url().optional(),
  UIPATH_INTERACTIVE_OAUTH_SCOPES: z.string().optional(),
  UIPATH_AUTHORIZE_URL: z.url().optional(),
  UIPATH_CONFIG_PATH: z.string().optional(),
});

export type AuthMode = 'service' | 'interactive';

export type ServiceAuthConfig = {
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
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
  options: { includePersistedConfig?: boolean } = {},
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
  const env = envSchema.parse(mergedSource);
  const baseUrl = new URL(env.UIPATH_BASE_URL);

  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }

  const tokenUrl = env.UIPATH_TOKEN_URL
    ? new URL(env.UIPATH_TOKEN_URL)
    : buildIdentityUrl(env.UIPATH_ACCOUNT_LOGICAL_NAME, 'token');

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
          : buildIdentityUrl(env.UIPATH_ACCOUNT_LOGICAL_NAME, 'authorize'),
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
    accountLogicalName: env.UIPATH_ACCOUNT_LOGICAL_NAME,
    tenantLogicalName: env.UIPATH_TENANT_LOGICAL_NAME,
    defaultFolderKey: env.UIPATH_FOLDER_KEY,
    oauthScopes: env.UIPATH_OAUTH_SCOPES,
    tokenUrl,
    auth: {
      mode: env.UIPATH_AUTH_MODE,
      storagePath: resolveAuthStoragePath(mergedSource),
      service,
      interactive,
    },
  };
}
