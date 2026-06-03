import { existsSync, realpathSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, relative, resolve } from 'node:path';

export function resolveAllowedLocalRoots(
  source: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
) {
  const configured = source.UIPATH_ALLOWED_LOCAL_PATHS?.trim();

  if (!configured) {
    return [resolve(cwd).replaceAll('\\', '/')];
  }

  return configured
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => resolve(entry).replaceAll('\\', '/'));
}

function isPathInsideRoot(targetPath: string, rootPath: string) {
  const rel = relative(rootPath, targetPath);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function assertLocalFilePathAllowed(
  targetPath: string,
  options: {
    source?: Record<string, string | undefined>;
    cwd?: string;
  } = {},
) {
  const resolvedPath = resolve(options.cwd ?? process.cwd(), targetPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Local file does not exist: ${resolvedPath}`);
  }

  const realTargetPath = realpathSync(resolvedPath);
  const stats = statSync(realTargetPath);

  if (!stats.isFile()) {
    throw new Error(`Local path must point to a file: ${realTargetPath}`);
  }

  const allowedRoots = resolveAllowedLocalRoots(
    options.source,
    options.cwd,
  ).map((rootPath) => realpathSync(rootPath));

  if (!allowedRoots.some((rootPath) => isPathInsideRoot(realTargetPath, rootPath))) {
    throw new Error(
      `Local file path is outside the allowed local file roots. Allowed roots: ${allowedRoots.join(', ')}`,
    );
  }

  return realTargetPath;
}
