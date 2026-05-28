import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildAuthorizeUrl,
  listenForAuthorizationCode,
  createCodeChallenge,
  createInteractiveTokenProvider,
  createPkcePair,
  exchangeAuthorizationCode,
  saveInteractiveSession,
  loadInteractiveSession,
  clearInteractiveSession,
} from '../src/auth/interactive.js';

describe('pkce helpers', () => {
  it('creates the RFC 7636 S256 challenge', async () => {
    const challenge = await createCodeChallenge(
      'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    );

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('creates a verifier and challenge pair', async () => {
    const pair = await createPkcePair();

    expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.codeChallenge.length).toBeGreaterThanOrEqual(43);
  });

  it('builds the UiPath authorize URL with PKCE parameters', async () => {
    const url = buildAuthorizeUrl({
      authorizeUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/authorize'),
      clientId: 'interactive-client-id',
      redirectUrl: new URL('http://127.0.0.1:8787/callback'),
      oauthScopes: 'OR.Execution OR.Jobs offline_access',
      codeChallenge: 'challenge-1',
      state: 'state-1',
    });

    expect(url.searchParams.get('client_id')).toBe('interactive-client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(
      'OR.Execution OR.Jobs offline_access',
    );
    expect(url.searchParams.get('code_challenge')).toBe('challenge-1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-1');
  });
});

describe('interactive session storage', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'uipath-mcp-auth-'));
    storagePath = join(tempDir, 'auth.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('saves, loads, and clears the interactive session', async () => {
    await saveInteractiveSession(storagePath, {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresAt: '2026-05-28T12:00:00.000Z',
      tokenType: 'Bearer',
      scope: 'OR.Execution offline_access',
      accountLogicalName: 'acme',
      tenantLogicalName: 'DefaultTenant',
      clientId: 'interactive-client-id',
    });

    const loaded = await loadInteractiveSession(storagePath);

    expect(loaded?.refreshToken).toBe('refresh-token-1');

    await clearInteractiveSession(storagePath);

    await expect(readFile(storagePath, 'utf8')).rejects.toThrow();
  });
});

describe('interactive token exchange', () => {
  beforeEach(() => nock.cleanAll());
  afterEach(() => nock.cleanAll());

  it('exchanges the authorization code using PKCE without a client secret', async () => {
    const tokenScope = nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token', (body) => {
        const params = new URLSearchParams(body as string);
        return (
          params.get('client_id') === 'interactive-client-id' &&
          params.get('grant_type') === 'authorization_code' &&
          params.get('code') === 'auth-code-1' &&
          params.get('redirect_uri') === 'http://127.0.0.1:8787/callback' &&
          params.get('code_verifier') === 'verifier-1'
        );
      })
      .reply(200, {
        access_token: 'access-token-1',
        refresh_token: 'refresh-token-1',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'OR.Execution offline_access',
      });

    const result = await exchangeAuthorizationCode({
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'interactive-client-id',
      code: 'auth-code-1',
      redirectUrl: new URL('http://127.0.0.1:8787/callback'),
      codeVerifier: 'verifier-1',
    });

    expect(tokenScope.isDone()).toBe(true);
    expect(result.refreshToken).toBe('refresh-token-1');
  });
});

describe('interactive token provider', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(async () => {
    nock.cleanAll();
    tempDir = await mkdtemp(join(tmpdir(), 'uipath-mcp-auth-'));
    storagePath = join(tempDir, 'auth.json');
  });

  afterEach(async () => {
    nock.cleanAll();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes an expired session and persists the new token', async () => {
    await saveInteractiveSession(storagePath, {
      accessToken: 'expired-access-token',
      refreshToken: 'refresh-token-1',
      expiresAt: '2020-01-01T00:00:00.000Z',
      tokenType: 'Bearer',
      scope: 'OR.Execution offline_access',
      accountLogicalName: 'acme',
      tenantLogicalName: 'DefaultTenant',
      clientId: 'interactive-client-id',
    });

    const refreshScope = nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token', (body) => {
        const params = new URLSearchParams(body as string);
        return (
          params.get('grant_type') === 'refresh_token' &&
          params.get('refresh_token') === 'refresh-token-1' &&
          params.get('client_id') === 'interactive-client-id'
        );
      })
      .reply(200, {
        access_token: 'refreshed-access-token',
        refresh_token: 'refresh-token-2',
        expires_in: 1800,
        token_type: 'Bearer',
        scope: 'OR.Execution offline_access',
      });

    const getAccessToken = createInteractiveTokenProvider({
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      storagePath,
      clientId: 'interactive-client-id',
    });

    await expect(getAccessToken()).resolves.toBe('refreshed-access-token');
    expect(refreshScope.isDone()).toBe(true);

    const saved = await loadInteractiveSession(storagePath);
    expect(saved?.refreshToken).toBe('refresh-token-2');
  });

  it('returns the stored token when the session is still valid', async () => {
    await saveInteractiveSession(storagePath, {
      accessToken: 'still-valid-token',
      refreshToken: 'refresh-token-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      tokenType: 'Bearer',
      scope: 'OR.Execution offline_access',
      accountLogicalName: 'acme',
      tenantLogicalName: 'DefaultTenant',
      clientId: 'interactive-client-id',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const getAccessToken = createInteractiveTokenProvider({
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      storagePath,
      clientId: 'interactive-client-id',
    });

    await expect(getAccessToken()).resolves.toBe('still-valid-token');
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});

describe('interactive callback listener', () => {
  it('waits for the browser callback and returns the authorization code', async () => {
    const redirectUrl = new URL('http://127.0.0.1:18787/callback');
    const callbackPromise = listenForAuthorizationCode({
      redirectUrl,
      expectedState: 'state-1',
      timeoutMs: 5_000,
    });

    await new Promise<void>((resolve, reject) => {
      const req = request(
        'http://127.0.0.1:18787/callback?code=auth-code-1&state=state-1',
        (response) => {
          response.resume();
          response.on('end', () => resolve());
        },
      );

      req.on('error', reject);
      req.end();
    });

    await expect(callbackPromise).resolves.toBe('auth-code-1');
  });

  it('ignores an empty callback request until the OAuth code arrives', async () => {
    const redirectUrl = new URL('http://127.0.0.1:18788/callback');
    const callbackPromise = listenForAuthorizationCode({
      redirectUrl,
      expectedState: 'state-2',
      timeoutMs: 5_000,
    });

    await new Promise<void>((resolve, reject) => {
      const firstRequest = request('http://127.0.0.1:18788/callback', (response) => {
        response.resume();
        response.on('end', resolve);
      });

      firstRequest.on('error', reject);
      firstRequest.end();
    });

    await new Promise<void>((resolve, reject) => {
      const secondRequest = request(
        'http://127.0.0.1:18788/callback?code=auth-code-2&state=state-2',
        (response) => {
          response.resume();
          response.on('end', resolve);
        },
      );

      secondRequest.on('error', reject);
      secondRequest.end();
    });

    await expect(callbackPromise).resolves.toBe('auth-code-2');
  });
});
