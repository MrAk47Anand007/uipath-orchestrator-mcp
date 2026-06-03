import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import type { AccessTokenProvider } from '../orchestrator/auth.js';
import {
  createSecureStorage,
  type SecureStorage,
} from '../setup/secure-storage.js';
export { createTestSecureStorage } from '../setup/secure-storage.js';

type TokenEndpointResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

export type InteractiveSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  tokenType: string;
  scope?: string;
  accountLogicalName: string;
  tenantLogicalName: string;
  clientId: string;
};

export type StoredInteractiveSession = InteractiveSession;

type StoredInteractiveSessionEnvelope =
  | StoredInteractiveSession
  | {
      version: 1;
      kind: 'secure';
      payload: string;
    };

function toBase64Url(value: Buffer) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function createCodeChallenge(codeVerifier: string) {
  return toBase64Url(createHash('sha256').update(codeVerifier).digest());
}

export async function createPkcePair() {
  const codeVerifier = toBase64Url(randomBytes(64));
  const codeChallenge = await createCodeChallenge(codeVerifier);

  return { codeVerifier, codeChallenge };
}

export function createOAuthState() {
  return toBase64Url(randomBytes(32));
}

export function buildAuthorizeUrl(config: {
  authorizeUrl: URL;
  clientId: string;
  redirectUrl: URL;
  oauthScopes: string;
  codeChallenge: string;
  state: string;
}) {
  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUrl.href);
  authorizeUrl.searchParams.set('scope', config.oauthScopes);
  authorizeUrl.searchParams.set('code_challenge', config.codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', config.state);

  return authorizeUrl;
}

async function postTokenRequest(
  tokenUrl: URL,
  body: URLSearchParams,
): Promise<TokenEndpointResponse> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `UiPath interactive OAuth failed: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  return (await response.json()) as TokenEndpointResponse;
}

function tokenResponseToSession(
  response: TokenEndpointResponse,
  metadata: {
    accountLogicalName: string;
    tenantLogicalName: string;
    clientId: string;
  },
): StoredInteractiveSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
    tokenType: response.token_type,
    scope: response.scope,
    accountLogicalName: metadata.accountLogicalName,
    tenantLogicalName: metadata.tenantLogicalName,
    clientId: metadata.clientId,
  };
}

export async function exchangeAuthorizationCode(config: {
  tokenUrl: URL;
  clientId: string;
  code: string;
  redirectUrl: URL;
  codeVerifier: string;
}) {
  const response = await postTokenRequest(
    config.tokenUrl,
    new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'authorization_code',
      code: config.code,
      redirect_uri: config.redirectUrl.href,
      code_verifier: config.codeVerifier,
    }),
  );

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
    tokenType: response.token_type,
    scope: response.scope,
  };
}

export async function refreshInteractiveSession(config: {
  tokenUrl: URL;
  clientId: string;
  refreshToken: string;
  session: Pick<
    StoredInteractiveSession,
    'accountLogicalName' | 'tenantLogicalName' | 'clientId'
  >;
}) {
  const response = await postTokenRequest(
    config.tokenUrl,
    new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }),
  );

  return tokenResponseToSession(response, config.session);
}

export async function saveInteractiveSession(
  storagePath: string,
  session: StoredInteractiveSession,
  secureStorage: SecureStorage = createSecureStorage(),
) {
  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(
    storagePath,
    JSON.stringify(
      {
        version: 1,
        kind: 'secure',
        payload: secureStorage.sealSync(JSON.stringify(session)),
      },
      null,
      2,
    ),
    'utf8',
  );
}

export async function loadInteractiveSession(
  storagePath: string,
  secureStorage: SecureStorage = createSecureStorage(),
) {
  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw) as StoredInteractiveSessionEnvelope;

    if (
      parsed &&
      typeof parsed === 'object' &&
      'kind' in parsed &&
      parsed.kind === 'secure' &&
      'payload' in parsed &&
      typeof parsed.payload === 'string'
    ) {
      return JSON.parse(
        secureStorage.unsealSync(parsed.payload),
      ) as StoredInteractiveSession;
    }

    return parsed as StoredInteractiveSession;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }

    throw error;
  }
}

export async function clearInteractiveSession(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }

    throw error;
  }
}

function isSessionValid(session: StoredInteractiveSession) {
  return new Date(session.expiresAt).getTime() > Date.now() + 30_000;
}

export function listenForAuthorizationCode(config: {
  redirectUrl: URL;
  expectedState: string;
  timeoutMs?: number;
}) {
  return new Promise<string>((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? '/', config.redirectUrl);

      if (requestUrl.pathname !== config.redirectUrl.pathname) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const state = requestUrl.searchParams.get('state');
      const code = requestUrl.searchParams.get('code');
      const error = requestUrl.searchParams.get('error');

      if (error) {
        response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('UiPath login returned an error. You can close this window.');
        cleanup(new Error(`UiPath login failed: ${error}`));
        return;
      }

      if (!code && !state) {
        response.writeHead(202, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Waiting for UiPath login to finish.');
        return;
      }

      if (state !== config.expectedState || !code) {
        response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Invalid login callback. You can close this window.');
        cleanup(new Error('UiPath login callback did not include the expected state or code.'));
        return;
      }

      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('UiPath login complete. You can close this window.');
      cleanup(undefined, code);
    });

    const timeout = setTimeout(() => {
      cleanup(new Error('Timed out waiting for the UiPath login callback.'));
    }, config.timeoutMs ?? 120_000);

    const cleanup = (error?: Error, code?: string) => {
      clearTimeout(timeout);
      server.close(() => {
        if (error) {
          reject(error);
          return;
        }

        resolve(code as string);
      });
    };

    server.on('error', reject);
    server.listen(Number(config.redirectUrl.port), config.redirectUrl.hostname);
  });
}

export function createInteractiveTokenProvider(config: {
  tokenUrl: URL;
  storagePath: string;
  clientId: string;
  secureStorage?: SecureStorage;
}): AccessTokenProvider {
  let cached: StoredInteractiveSession | undefined;
  const secureStorage = config.secureStorage ?? createSecureStorage();

  return async function getAccessToken() {
    cached ??= await loadInteractiveSession(config.storagePath, secureStorage);

    if (!cached) {
      throw new Error(
        `No interactive UiPath session found at ${config.storagePath}. Run the login command first.`,
      );
    }

    if (isSessionValid(cached)) {
      return cached.accessToken;
    }

    if (!cached.refreshToken) {
      throw new Error(
        'Interactive UiPath session expired and no refresh token is available. Run the login command again.',
      );
    }

    cached = await refreshInteractiveSession({
      tokenUrl: config.tokenUrl,
      clientId: config.clientId,
      refreshToken: cached.refreshToken,
      session: {
        accountLogicalName: cached.accountLogicalName,
        tenantLogicalName: cached.tenantLogicalName,
        clientId: cached.clientId,
      },
    });

    await saveInteractiveSession(config.storagePath, cached, secureStorage);
    return cached.accessToken;
  };
}
