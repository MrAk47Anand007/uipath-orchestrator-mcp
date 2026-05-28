import { describe, expect, it } from 'vitest';
import {
  buildDoctorAdvice,
  formatDoctorReport,
  normalizeFolderList,
  validateDoctorEnv,
} from '../src/setup/doctor.js';

describe('doctor env validation', () => {
  it('requires the interactive client id in interactive mode', () => {
    const result = validateDoctorEnv({
      UIPATH_BASE_URL: 'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_ACCOUNT_LOGICAL_NAME: 'acme',
      UIPATH_TENANT_LOGICAL_NAME: 'DefaultTenant',
      UIPATH_AUTH_MODE: 'interactive',
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain('UIPATH_INTERACTIVE_CLIENT_ID');
  });

  it('requires service credentials in service mode', () => {
    const result = validateDoctorEnv({
      UIPATH_BASE_URL: 'https://cloud.uipath.com/acme/DefaultTenant/orchestrator_',
      UIPATH_ACCOUNT_LOGICAL_NAME: 'acme',
      UIPATH_TENANT_LOGICAL_NAME: 'DefaultTenant',
      UIPATH_AUTH_MODE: 'service',
      UIPATH_CLIENT_ID: 'client-id',
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain('UIPATH_CLIENT_SECRET');
  });
});

describe('doctor folder helpers', () => {
  it('normalizes folder payloads from UiPath GetAllForCurrentUser responses', () => {
    const folders = normalizeFolderList({
      PageItems: [
        {
          Id: 357953,
          Key: 'folder-key-1',
          DisplayName: 'Shared',
          FullyQualifiedName: 'Shared',
          FolderType: 'Standard',
        },
      ],
      Count: 1,
    });

    expect(folders).toEqual([
      {
        id: 357953,
        key: 'folder-key-1',
        displayName: 'Shared',
        fullyQualifiedName: 'Shared',
        folderType: 'Standard',
      },
    ]);
  });

  it('suggests folder selection when folders exist but no default folder key is set', () => {
    const advice = buildDoctorAdvice({
      folderCount: 2,
      hasDefaultFolderKey: false,
      authMode: 'interactive',
      authSucceeded: true,
    });

    expect(advice).toContain(
      'Pick a default folder so the MCP can scope requests without asking for a folder key each time.',
    );
  });

  it('formats a readable doctor report', () => {
    const output = formatDoctorReport({
      mode: 'interactive',
      steps: [
        { label: 'Config', status: 'ok', message: 'Environment looks complete.' },
        { label: 'Auth', status: 'ok', message: 'Interactive session is valid.' },
      ],
      folders: [
        {
          id: 357953,
          key: 'folder-key-1',
          displayName: 'Shared',
          fullyQualifiedName: 'Shared',
          folderType: 'Standard',
        },
      ],
      advice: ['Run `serve` when you are ready.'],
    });

    expect(output).toContain('Auth mode: interactive');
    expect(output).toContain('Config: OK');
    expect(output).toContain('Shared');
    expect(output).toContain('Run `serve` when you are ready.');
  });
});
