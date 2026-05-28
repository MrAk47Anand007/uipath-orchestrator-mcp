import { describe, expect, it } from 'vitest';
import { getBrowserOpenCommand } from '../src/cli.js';

describe('getBrowserOpenCommand', () => {
  it('uses the Windows URL handler so login opens in the default browser', () => {
    const command = getBrowserOpenCommand(
      'win32',
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    );

    expect(command.command).toBe('rundll32.exe');
    expect(command.args).toEqual([
      'url.dll,FileProtocolHandler',
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    ]);
  });
});
