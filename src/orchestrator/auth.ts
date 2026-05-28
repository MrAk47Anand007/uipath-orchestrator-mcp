type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type AccessTokenProvider = () => Promise<string>;

export function createTokenProvider(config: {
  tokenUrl: URL;
  clientId: string;
  clientSecret: string;
  oauthScopes: string;
}): AccessTokenProvider {
  let cached: { accessToken: string; expiresAt: number } | undefined;

  return async function getAccessToken() {
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      return cached.accessToken;
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.oauthScopes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `UiPath OAuth failed: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    const token = (await response.json()) as TokenResponse;
    cached = {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };

    return token.access_token;
  };
}
