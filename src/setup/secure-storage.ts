import { execFileSync } from 'node:child_process';

export type SecureStorage = {
  sealSync(plaintext: string): string;
  unsealSync(payload: string): string;
};

function createPlaintextFallbackStorage(): SecureStorage {
  return {
    sealSync(plaintext) {
      return `plain:${Buffer.from(plaintext, 'utf8').toString('base64')}`;
    },
    unsealSync(payload) {
      if (!payload.startsWith('plain:')) {
        throw new Error('Unsupported plaintext storage payload.');
      }

      return Buffer.from(payload.slice('plain:'.length), 'base64').toString(
        'utf8',
      );
    },
  };
}

function createUnavailableSecureStorage(): SecureStorage {
  return {
    sealSync() {
      throw new Error(
        'Secure storage is not available on this platform. Set UIPATH_ALLOW_PLAINTEXT_STORAGE=true only if you accept plaintext local storage.',
      );
    },
    unsealSync() {
      throw new Error(
        'Secure storage is not available on this platform. Set UIPATH_ALLOW_PLAINTEXT_STORAGE=true only if you accept plaintext local storage.',
      );
    },
  };
}

function runPowerShell(script: string) {
  return execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

function createWindowsDpapiStorage(): SecureStorage {
  return {
    sealSync(plaintext) {
      const base64 = Buffer.from(plaintext, 'utf8').toString('base64');
      return runPowerShell(
        [
          'Add-Type -AssemblyName System.Security',
          `$inputBytes = [Convert]::FromBase64String('${base64}')`,
          '$protected = [Security.Cryptography.ProtectedData]::Protect(',
          '  $inputBytes,',
          '  $null,',
          "  [Security.Cryptography.DataProtectionScope]::CurrentUser",
          ')',
          '[Convert]::ToBase64String($protected)',
        ].join('\n'),
      );
    },
    unsealSync(payload) {
      const plainText = runPowerShell(
        [
          'Add-Type -AssemblyName System.Security',
          `$inputBytes = [Convert]::FromBase64String('${payload}')`,
          '$unprotected = [Security.Cryptography.ProtectedData]::Unprotect(',
          '  $inputBytes,',
          '  $null,',
          "  [Security.Cryptography.DataProtectionScope]::CurrentUser",
          ')',
          '[Text.Encoding]::UTF8.GetString($unprotected)',
        ].join('\n'),
      );
      return plainText;
    },
  };
}

export function createSecureStorage(options: {
  platform?: NodeJS.Platform;
  source?: Record<string, string | undefined>;
} = {}): SecureStorage {
  const platformName = options.platform ?? process.platform;
  const source = options.source ?? process.env;

  if (platformName === 'win32') {
    return createWindowsDpapiStorage();
  }

  if (source.UIPATH_ALLOW_PLAINTEXT_STORAGE === 'true') {
    return createPlaintextFallbackStorage();
  }

  return createUnavailableSecureStorage();
}

export function createTestSecureStorage(): SecureStorage {
  return createPlaintextFallbackStorage();
}
