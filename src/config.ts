import { z } from 'zod';

const envSchema = z.object({
  UIPATH_BASE_URL: z.url(),
  UIPATH_ACCOUNT_LOGICAL_NAME: z.string().min(1),
  UIPATH_TENANT_LOGICAL_NAME: z.string().min(1),
  UIPATH_CLIENT_ID: z.string().min(1),
  UIPATH_CLIENT_SECRET: z.string().min(1),
  UIPATH_FOLDER_KEY: z.uuid().optional(),
  UIPATH_OAUTH_SCOPES: z.string().default('OR.Default'),
  UIPATH_TOKEN_URL: z
    .url()
    .default('https://cloud.uipath.com/identity_/connect/token'),
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

export function loadConfig(
  source: Record<string, string | undefined> = process.env,
): AppConfig {
  const env = envSchema.parse(source);
  const baseUrl = new URL(env.UIPATH_BASE_URL);

  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }

  return {
    baseUrl,
    accountLogicalName: env.UIPATH_ACCOUNT_LOGICAL_NAME,
    tenantLogicalName: env.UIPATH_TENANT_LOGICAL_NAME,
    clientId: env.UIPATH_CLIENT_ID,
    clientSecret: env.UIPATH_CLIENT_SECRET,
    defaultFolderKey: env.UIPATH_FOLDER_KEY,
    oauthScopes: env.UIPATH_OAUTH_SCOPES,
    tokenUrl: new URL(env.UIPATH_TOKEN_URL),
  };
}
