export type DoctorMode = 'service' | 'interactive';

export type FolderSummary = {
  id: number;
  key: string;
  displayName: string;
  fullyQualifiedName: string;
  folderType?: string;
};

export type DoctorStep = {
  label: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
};

export type DoctorReport = {
  mode: DoctorMode;
  steps: DoctorStep[];
  folders: FolderSummary[];
  advice: string[];
};

export function validateDoctorEnv(source: Record<string, string | undefined>) {
  const missing = ['UIPATH_BASE_URL', 'UIPATH_ACCOUNT_LOGICAL_NAME', 'UIPATH_TENANT_LOGICAL_NAME'].filter(
    (key) => !source[key],
  );
  const mode = (source.UIPATH_AUTH_MODE ?? 'service') as DoctorMode;

  if (mode === 'interactive') {
    if (!source.UIPATH_INTERACTIVE_CLIENT_ID) {
      missing.push('UIPATH_INTERACTIVE_CLIENT_ID');
    }
  } else {
    if (!source.UIPATH_CLIENT_ID) {
      missing.push('UIPATH_CLIENT_ID');
    }

    if (!source.UIPATH_CLIENT_SECRET) {
      missing.push('UIPATH_CLIENT_SECRET');
    }
  }

  return {
    ok: missing.length === 0,
    mode,
    missing,
  };
}

export function normalizeFolderList(payload: unknown): FolderSummary[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const items =
    ('PageItems' in payload && Array.isArray(payload.PageItems) && payload.PageItems) ||
    ('value' in payload && Array.isArray(payload.value) && payload.value) ||
    ('items' in payload && Array.isArray(payload.items) && payload.items) ||
    [];

  const folders: FolderSummary[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const id = typeof item.Id === 'number' ? item.Id : undefined;
    const key = typeof item.Key === 'string' ? item.Key : undefined;
    const displayName =
      typeof item.DisplayName === 'string'
        ? item.DisplayName
        : typeof item.Name === 'string'
          ? item.Name
          : undefined;
    const fullyQualifiedName =
      typeof item.FullyQualifiedName === 'string'
        ? item.FullyQualifiedName
        : displayName;

    if (id === undefined || key === undefined || displayName === undefined) {
      continue;
    }

    folders.push({
      id,
      key,
      displayName,
      fullyQualifiedName,
      folderType:
        typeof item.FolderType === 'string' ? item.FolderType : undefined,
    });
  }

  return folders;
}

export function buildDoctorAdvice(input: {
  folderCount: number;
  hasDefaultFolderKey: boolean;
  authMode: DoctorMode;
  authSucceeded: boolean;
}) {
  const advice: string[] = [];

  if (!input.authSucceeded) {
    if (input.authMode === 'interactive') {
      advice.push('Run `login` to create or refresh your interactive UiPath session.');
    } else {
      advice.push('Check the service app id, secret, scopes, and folder access in UiPath.');
    }

    return advice;
  }

  if (input.folderCount === 0) {
    advice.push('No accessible folders were found. Grant the app or user access to at least one Orchestrator folder.');
  } else if (!input.hasDefaultFolderKey) {
    advice.push(
      'Pick a default folder so the MCP can scope requests without asking for a folder key each time.',
    );
  }

  advice.push('Run `serve` when you are ready.');
  return advice;
}

export function formatDoctorReport(report: DoctorReport) {
  const lines = [`Auth mode: ${report.mode}`, ''];

  for (const step of report.steps) {
    lines.push(`${step.label}: ${step.status.toUpperCase()} - ${step.message}`);
  }

  lines.push('');
  lines.push(`Accessible folders: ${report.folders.length}`);

  for (const folder of report.folders) {
    lines.push(`- ${folder.displayName} (${folder.folderType ?? 'Unknown'}) [${folder.key}]`);
  }

  if (report.advice.length > 0) {
    lines.push('');
    lines.push('Next steps:');

    for (const tip of report.advice) {
      lines.push(`- ${tip}`);
    }
  }

  return lines.join('\n');
}
