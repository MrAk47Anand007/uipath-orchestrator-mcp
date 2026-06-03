import { describe, expect, it } from 'vitest';
import {
  createSecureStorage,
  createTestSecureStorage,
} from '../src/setup/secure-storage.js';

describe('secure storage', () => {
  it('round-trips plaintext using the test secure storage helper', () => {
    const storage = createTestSecureStorage();
    const sealed = storage.sealSync('super-secret');

    expect(sealed).not.toContain('super-secret');
    expect(storage.unsealSync(sealed)).toBe('super-secret');
  });

  it('rejects plaintext fallback unless explicitly enabled', () => {
    const storage = createSecureStorage({ platform: 'linux' });

    expect(() => storage.sealSync('super-secret')).toThrow(
      /secure storage is not available/i,
    );
  });

  it('allows explicit plaintext fallback when opted in', () => {
    const storage = createSecureStorage({
      platform: 'linux',
      source: {
        UIPATH_ALLOW_PLAINTEXT_STORAGE: 'true',
      },
    });

    const sealed = storage.sealSync('super-secret');
    expect(sealed.startsWith('plain:')).toBe(true);
    expect(storage.unsealSync(sealed)).toBe('super-secret');
  });
});
