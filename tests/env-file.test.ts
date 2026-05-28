import { describe, expect, it } from 'vitest';
import { parseEnvContent, upsertEnvContent } from '../src/setup/env-file.js';

describe('env file helpers', () => {
  it('parses key value pairs from dotenv content', () => {
    const parsed = parseEnvContent([
      'UIPATH_BASE_URL=https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      'UIPATH_AUTH_MODE=interactive',
      '',
    ].join('\n'));

    expect(parsed.UIPATH_AUTH_MODE).toBe('interactive');
    expect(parsed.UIPATH_BASE_URL).toBe(
      'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
    );
  });

  it('updates existing keys and appends new ones while preserving other lines', () => {
    const content = [
      'UIPATH_BASE_URL=https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      'UIPATH_AUTH_MODE=service',
      '# keep this comment',
      'UIPATH_CLIENT_ID=old-client-id',
      '',
    ].join('\n');

    const updated = upsertEnvContent(content, {
      UIPATH_AUTH_MODE: 'interactive',
      UIPATH_INTERACTIVE_CLIENT_ID: 'interactive-client-id',
    });

    expect(updated).toContain('UIPATH_AUTH_MODE=interactive');
    expect(updated).toContain('UIPATH_CLIENT_ID=old-client-id');
    expect(updated).toContain('# keep this comment');
    expect(updated).toContain(
      'UIPATH_INTERACTIVE_CLIENT_ID=interactive-client-id',
    );
  });
});
