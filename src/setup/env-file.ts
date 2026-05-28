export function parseEnvContent(content: string) {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function serializeEnvValue(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

export function upsertEnvContent(
  content: string,
  updates: Record<string, string | undefined>,
) {
  const lines = content.length > 0 ? content.split(/\r?\n/) : [];
  const handled = new Set<string>();

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (!match) {
      return line;
    }

    const key = match[1];

    if (!(key in updates) || updates[key] === undefined) {
      return line;
    }

    handled.add(key);
    return `${key}=${serializeEnvValue(updates[key] as string)}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || handled.has(key)) {
      continue;
    }

    nextLines.push(`${key}=${serializeEnvValue(value)}`);
  }

  return nextLines.join('\n');
}
