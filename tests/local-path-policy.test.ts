import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertLocalFilePathAllowed,
  resolveAllowedLocalRoots,
} from '../src/setup/local-path-policy.js';

describe('local path policy', () => {
  it('defaults to the current working directory as the only allowed root', () => {
    const roots = resolveAllowedLocalRoots({}, 'C:/workspace/project');
    expect(roots).toEqual(['C:/workspace/project']);
  });

  it('accepts configured allowlisted roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'uipath-mcp-root-'));
    const file = join(root, 'allowed.txt');
    await writeFile(file, 'ok', 'utf8');

    expect(() =>
      assertLocalFilePathAllowed(file, {
        source: {
          UIPATH_ALLOWED_LOCAL_PATHS: root,
        },
      }),
    ).not.toThrow();
  });

  it('rejects files outside the allowlisted roots', async () => {
    const allowedRoot = await mkdtemp(join(tmpdir(), 'uipath-mcp-allowed-'));
    const otherRoot = await mkdtemp(join(tmpdir(), 'uipath-mcp-other-'));
    const file = join(otherRoot, 'blocked.txt');
    await writeFile(file, 'blocked', 'utf8');

    expect(() =>
      assertLocalFilePathAllowed(file, {
        source: {
          UIPATH_ALLOWED_LOCAL_PATHS: allowedRoot,
        },
      }),
    ).toThrow(/outside the allowed local file roots/i);
  });
});
