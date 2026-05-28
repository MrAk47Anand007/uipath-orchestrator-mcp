import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { createServer, type AppDependencies } from './server.js';
import type { AppConfig } from './config.js';
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

export function getBrowserOpenCommand(platformName: NodeJS.Platform, urlText: string) {
  if (platformName === 'win32') {
    return {
      command: 'explorer.exe',
      args: [urlText],
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

export async function runServeCommand(
  deps?: AppDependencies,
  transport = new StdioServerTransport(),
) {
  const server = createServer(deps);
  await server.connect(transport);
}
