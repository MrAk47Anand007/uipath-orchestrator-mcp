/**
 * UiPath CLI auth source — reads the session saved by `uip login`
 * at ~/.uipath/.auth (a plain KEY=VALUE file).
 *
 * Token refresh uses the same client-id that the official UiPath CLI uses
 * (36dea5b8-e8bb-423d-8e7b-c808df8f1c00) and the refresh_token grant.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AccessTokenProvider } from '../orchestrator/auth.js';

/** Client ID registered for the official UiPath CLI (`@uipath/cli`). */
const UIP_CLI_CLIENT_ID = '36dea5b8-e8bb-423d-8e7b-c808df8f1c00';

/** Default path where `uip login` saves session data. */
export function defaultUipAuthPath(): string {
  return join(homedir(), '.uipath', '.auth');
}

type UipSession = {
  accessToken: string;
  refreshToken: string;
  /** ISO string or epoch seconds from the JWT `exp` claim. */
  expiresAt: number;
  organizationName: string;
  tenantName: string;
  url: string;
};

/** Parse the key=value file that `uip login` writes. */
function parseUipAuthFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    result[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return result;
}

/** Decode a JWT payload without verifying the signature. */
function decodeJwtExpiry(token: string): number | undefined {
  try {
    const [, payload] = token.split('.');
    if (!payload) return undefined;
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { exp?: number };
    return decoded.exp ? decoded.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

async function loadUipSession(authPath: string): Promise<UipSession> {
  let content: string;
  try {
    content = await readFile(authPath, 'utf8');
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new Error(
        `No UiPath CLI session found at ${authPath}. Run \`uip login\` first.`,
      );
    }
    throw error;
  }

  const values = parseUipAuthFile(content);
  const accessToken = values['UIPATH_ACCESS_TOKEN'];
  const refreshToken = values['UIPATH_REFRESH_TOKEN'];

  if (!accessToken || !refreshToken) {
    throw new Error(
      `Incomplete UiPath CLI session at ${authPath}. Run \`uip login\` again.`,
    );
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: decodeJwtExpiry(accessToken) ?? Date.now(),
    organizationName: values['UIPATH_ORGANIZATION_NAME'] ?? '',
    tenantName: values['UIPATH_TENANT_NAME'] ?? '',
    url: values['UIPATH_URL'] ?? 'https://cloud.uipath.com',
  };
}

async function refreshUipSession(
  session: UipSession,
  tokenUrl: URL,
): Promise<UipSession> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: UIP_CLI_CLIENT_ID,
      refresh_token: session.refreshToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `UiPath CLI token refresh failed: ${response.status} ${response.statusText} ${text}. ` +
        'Run `uip login` again.',
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/** Persist a refreshed session back to the auth file so `uip` tools also benefit. */
async function saveUipSession(
  authPath: string,
  session: UipSession,
): Promise<void> {
  const lines = [
    `UIPATH_ACCESS_TOKEN=${session.accessToken}`,
    `UIPATH_REFRESH_TOKEN=${session.refreshToken}`,
    `UIPATH_URL=${session.url}`,
    `UIPATH_ORGANIZATION_NAME=${session.organizationName}`,
    `UIPATH_TENANT_NAME=${session.tenantName}`,
  ];
  await writeFile(authPath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Create an access-token provider that reads and auto-refreshes the session
 * saved by `uip login` at `~/.uipath/.auth`.
 */
export function createUipCliTokenProvider(config: {
  authPath?: string;
  tokenUrl: URL;
}): AccessTokenProvider {
  const authPath = config.authPath ?? defaultUipAuthPath();
  let cached: UipSession | undefined;

  return async function getAccessToken(): Promise<string> {
    cached ??= await loadUipSession(authPath);

    // Token still valid (with 60-second buffer)?
    if (cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    // Refresh silently — no browser needed.
    cached = await refreshUipSession(cached, config.tokenUrl);
    await saveUipSession(authPath, cached).catch(() => {
      // Non-fatal: best-effort write back so `uip` tools also stay fresh.
    });

    return cached.accessToken;
  };
}

/** Read org/tenant from the uip auth file (used during config auto-detection). */
export async function readUipCliIdentity(authPath?: string): Promise<{
  organizationName: string;
  tenantName: string;
  url: string;
} | undefined> {
  try {
    const session = await loadUipSession(authPath ?? defaultUipAuthPath());
    return {
      organizationName: session.organizationName,
      tenantName: session.tenantName,
      url: session.url,
    };
  } catch {
    return undefined;
  }
}
