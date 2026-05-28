import { describe, expect, it } from 'vitest';
import { getBrowserOpenCommand } from '../src/cli.js';

describe('getBrowserOpenCommand', () => {
  it('uses explorer.exe on Windows so OAuth URLs keep their query string intact', () => {
    const command = getBrowserOpenCommand(
      'win32',
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    );

    expect(command.command).toBe('explorer.exe');
    expect(command.args).toEqual([
      'https://cloud.uipath.com/identity_/connect/authorize?client_id=test&scope=OR.Execution+offline_access&state=abc',
    ]);
  });
});
