# UiPath Orchestrator MCP Server

`uipath-orchestrator-mcp` is a standalone MCP server for UiPath Orchestrator.

It exposes common Orchestrator operations as MCP tools so an MCP client such as Claude Desktop, Codex, or ChatGPT can:

- start and monitor jobs
- work with queues, assets, and storage buckets
- inspect logs and operational status
- manage schedules, releases, and webhooks
- handle selected admin and access-management tasks

## What this project is

This package is an MCP server, not a UiPath project generator and not a replacement for UiPath CLI skills.

Use it when you want an MCP client to call UiPath Orchestrator directly through a package you can install and run.

## Current state

This package has been exercised against a real UiPath Cloud tenant.

- package-first CLI onboarding is implemented: `init`, `doctor`, `login`, `whoami`, `serve`, `logout`
- three persisted auth modes are supported: `uip` session reuse, service account, and interactive PKCE
- the default `login` command also supports a zero-config browser flow that uses the same public client as the current UiPath CLI
- the package is published as `uipath-orchestrator-mcp`
- core runtime, resource, scheduling, deployment, and admin surfaces are implemented

## Supported areas

The MCP currently includes tools across these areas:

- folders and discovery
- jobs and execution state
- logs and diagnostics
- queues and queue item operations
- assets and storage buckets
- schedules and job triggers
- releases and process package management
- robots, machines, sessions, and runtimes
- tasks and human-in-the-loop operations
- webhooks
- audit logs and alerts
- users, roles, and folder permissions

The package intentionally groups many small Orchestrator operations into MCP tools, so the exact tool count is less important than the supported surface.

## Quickstart

### Option 1 — Zero-config browser login (recommended for local use)

No UiPath app registration needed. Works exactly like `uip login`.

```bash
npx uipath-orchestrator-mcp login
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

- `login` opens your browser. If you are already signed into UiPath Cloud, it completes automatically in about one second — no credentials to type.
- Org, tenant, and base URL are discovered automatically from the token. Nothing to configure beforehand.
- `doctor` verifies auth and folder access.
- `serve` starts the MCP server.

### Option 1b — Reuse an existing `uip login` session

If you already use the official UiPath CLI locally, this package can reuse that saved session.

```bash
uip login
set UIPATH_AUTH_MODE=uip
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

On PowerShell, you can also set it for the current shell only:

```powershell
$env:UIPATH_AUTH_MODE = "uip"
```

### Option 2 — Headless service account login (CI/CD or unattended)

No browser needed. Requires a UiPath External Application (confidential type).

```bash
npx uipath-orchestrator-mcp login --client-id <id> --client-secret <secret>
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

If org and tenant cannot be inferred from an existing config, pass them explicitly:

```bash
npx uipath-orchestrator-mcp login \
  --client-id <id> \
  --client-secret <secret> \
  --account <org-logical-name> \
  --tenant DefaultTenant
```

### Option 3 — Your own interactive app (custom external app)

If you have registered your own Non-confidential external app in UiPath, set these before running `login`:

```
UIPATH_AUTH_MODE=interactive
UIPATH_INTERACTIVE_CLIENT_ID=<your-app-client-id>
UIPATH_INTERACTIVE_REDIRECT_URL=http://127.0.0.1:8787/callback
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
```

## Auth modes

### Built-in browser login (default, zero config)

The recommended path for local desktop use. Uses the same public OAuth client that the official UiPath CLI (`uip`) uses — no app registration required.

- OAuth flow: `authorization_code + PKCE`
- Redirect URI: `http://localhost:8104/oidc/login`
- Client ID: built-in (no configuration needed)
- Scopes: auto-selected to match UiPath CLI defaults
- Org, tenant, and Orchestrator URL: discovered automatically from the returned token

```bash
npx uipath-orchestrator-mcp login
```

Logout clears the session and resets the saved config:

```bash
npx uipath-orchestrator-mcp logout
```

This path is convenient, but it depends on the current behavior of UiPath's public CLI client. If you want the most explicit and durable setup, use service mode or your own interactive app.

### `uip` session mode

Use this when you already have a local `uip login` session and want the MCP server to reuse it instead of storing a separate browser-login session.

- `UIPATH_AUTH_MODE=uip`
- reads the session from `~/.uipath/.auth`
- refreshes the token through the same client used by the official UiPath CLI
- best suited for local developer machines, not shared servers

### Service mode (headless, no browser)

For shared agents, CI/CD pipelines, or unattended server use.

- UiPath app type: `Confidential`
- OAuth flow: `client_credentials`

```bash
npx uipath-orchestrator-mcp login --client-id <id> --client-secret <secret>
```

Safer variant:

```bash
set UIPATH_CLIENT_SECRET=your-client-secret
npx uipath-orchestrator-mcp login --client-id <id> --client-secret env.UIPATH_CLIENT_SECRET
```

Credentials are encrypted and saved to disk. The MCP server uses them automatically on `serve`.

Required values (resolved automatically if passed via `--account` / `--tenant`):

- `UIPATH_CLIENT_ID`
- `UIPATH_CLIENT_SECRET`
- `UIPATH_ACCOUNT_LOGICAL_NAME`
- `UIPATH_TENANT_LOGICAL_NAME`

### Interactive mode (custom external app)

Use this only if you have registered your own Non-confidential external app and need custom scopes or a different redirect URL.

- UiPath app type: `Non-confidential`
- OAuth flow: `authorization_code + PKCE`

Required values:

- `UIPATH_AUTH_MODE=interactive`
- `UIPATH_INTERACTIVE_CLIENT_ID`
- `UIPATH_INTERACTIVE_REDIRECT_URL`
- `UIPATH_BASE_URL`
- `UIPATH_ACCOUNT_LOGICAL_NAME`
- `UIPATH_TENANT_LOGICAL_NAME`

## CLI commands

```
npx uipath-orchestrator-mcp login                                      # browser login, zero config
npx uipath-orchestrator-mcp login --client-id <id> --client-secret env.UIPATH_CLIENT_SECRET   # headless service login
npx uipath-orchestrator-mcp logout                                     # clear session and config
npx uipath-orchestrator-mcp doctor                                     # verify auth and folder access
npx uipath-orchestrator-mcp whoami                                     # show current session info
npx uipath-orchestrator-mcp serve                                      # start the MCP server
npx uipath-orchestrator-mcp init                                       # interactive config wizard
```

## Local config and secret storage

Normal package usage does not require editing a repo-local `.env`.

After `login`, everything is saved automatically:

| File | What it stores |
|---|---|
| `%APPDATA%\uipath-orchestrator-mcp\config.json` | org, tenant, base URL, auth mode |
| `%APPDATA%\uipath-orchestrator-mcp\auth.json` | encrypted access + refresh token |
| `%APPDATA%\uipath-orchestrator-mcp\service-secret.dat` | encrypted client secret (service mode) |

On macOS/Linux the directory is `~/.config/uipath-orchestrator-mcp/`.

`logout` removes both `auth.json` and the interactive auth keys from `config.json`.

For contributors and repo-based development, `.env` is still supported as an override layer.

## UiPath-side setup

### Built-in browser login

Nothing to set up in UiPath. The built-in client and scopes are pre-configured.

### Service mode

1. In UiPath Automation Cloud go to **Admin → External Applications → Add Application**.
2. Choose **Confidential application**.
3. Add the scopes your MCP needs (see list below).
4. Copy the **Client ID** and **Client Secret**.
5. Run `npx uipath-orchestrator-mcp login --client-id <id> --client-secret env.UIPATH_CLIENT_SECRET`.

Typical scopes for service mode:

- `OR.Folders`
- `OR.Execution`
- `OR.Jobs`
- `OR.Queues`
- `OR.Robots`
- `OR.Monitoring`
- `OR.Assets`
- `OR.Buckets`
- `OR.Users`
- `OR.Machines`
- `OR.Tasks`
- `OR.Webhooks`
- `OR.Settings`
- `OR.Audit`

Scopes alone are not enough. Folder access still matters.

## MCP client example

Example Claude Desktop configuration using service mode:

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "npx",
      "args": ["uipath-orchestrator-mcp", "serve"]
    }
  }
}
```

After running `login`, no env vars are needed — the saved config is picked up automatically.

For explicit env var configuration (service mode):

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "npx",
      "args": ["uipath-orchestrator-mcp", "serve"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_",
        "UIPATH_ACCOUNT_LOGICAL_NAME": "your-org",
        "UIPATH_TENANT_LOGICAL_NAME": "DefaultTenant",
        "UIPATH_AUTH_MODE": "service",
        "UIPATH_CLIENT_ID": "your-client-id",
        "UIPATH_CLIENT_SECRET": "your-client-secret",
        "UIPATH_FOLDER_KEY": "your-folder-key"
      }
    }
  }
}
```

## Example prompts

- `Start the UiPathAgentTesting process in Shared with these input arguments.`
- `Show failed queue items from today.`
- `Fetch logs for the last failed job.`
- `Upload C:\\docs\\invoice.pdf to the UiPathAgentTesting bucket.`
- `Create a daily schedule for this release at 9 AM India time.`
- `List roles assigned to this user in Shared.`

## Local development

```bash
npm install
npm test
npm run build
npm run serve
```

Useful local shortcuts:

```bash
npm run init
npm run doctor
npm run login
npm run whoami
npm run serve
npm run logout
```

## Known limitations

These are the main known limitations today:

- `uipath_list_calendars` still returns `500 Internal Server Error` in the tenant used for live validation, even though calendar create/get/update/delete work
- `uipath_health_check` currently behaves more like a connectivity probe because the UiPath status endpoint returns an empty body in that tenant
- `uipath_resume_job` is implemented and tested, but live validation still depends on having a suspended job available
- wider testing across more tenant configurations is still useful

## Safety notes

Some tools change Orchestrator state and are intentionally guarded.

Examples include:

- role changes
- folder-user assignment
- release deletion
- process package deletion
- local file uploads from the MCP host machine

For local host file operations, this package now expects confirmation and enforces allowed local path checks.

## Security notes

- keep `.env`, local config, and auth/session storage out of git
- client secrets are stored encrypted on disk — never in plain text
- prefer `--client-secret env.UIPATH_CLIENT_SECRET` over putting the secret directly in shell history
- use `doctor` to validate setup before connecting an MCP client
- prefer least-privilege scopes and folder access where possible

## When not to use this package

If you already rely on the official UiPath CLI skill catalog for local agent workflows, some platform operations may already be available through `uip`.

This package is most useful when you specifically want:

- a standalone MCP server
- package-based MCP installation
- direct Orchestrator actions from an MCP client
- a reusable Orchestrator tool surface outside the UiPath skill system
