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
- service auth and interactive PKCE auth are both supported
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

For most local users, this is the easiest path:

```bash
npx uipath-orchestrator-mcp init
npx uipath-orchestrator-mcp login
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

What each command does:

- `init` saves package config locally
- `login` performs browser-based interactive auth
- `doctor` checks configuration, auth, and folder readiness
- `serve` starts the MCP server

For service mode:

```bash
npx uipath-orchestrator-mcp init
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

## Auth modes

### Interactive mode

Use interactive mode for local desktop usage.

- UiPath app type: `Non-confidential`
- OAuth flow: `authorization_code + PKCE`
- redirect URL:
  - `http://127.0.0.1:8787/callback`

Required values:

- `UIPATH_AUTH_MODE=interactive`
- `UIPATH_INTERACTIVE_CLIENT_ID`
- `UIPATH_INTERACTIVE_REDIRECT_URL`

### Service mode

Use service mode for shared agents, CI/CD, or unattended server use.

- UiPath app type: `Confidential`
- OAuth flow: `client_credentials`

Required values:

- `UIPATH_AUTH_MODE=service`
- `UIPATH_CLIENT_ID`
- `UIPATH_CLIENT_SECRET`

## Local config and secret storage

Normal package usage does not require editing a repo-local `.env`.

By default on Windows, package config is stored under:

- `C:\Users\<you>\AppData\Roaming\uipath-orchestrator-mcp\config.json`

Interactive auth session data is stored under:

- `C:\Users\<you>\AppData\Roaming\uipath-orchestrator-mcp\auth.json`

Service secrets are stored separately from `config.json`.

For contributors and repo-based development, `.env` is still supported as an override layer.

## UiPath-side setup

Before this MCP can do useful work, you still need a small amount of UiPath setup:

1. Create the appropriate external app in UiPath.
2. Add the required scopes.
3. Grant the app or user access to the target Orchestrator folder.
4. Run `init` and then `doctor`.

Typical scopes depend on what you want the MCP to do, but common ones include:

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

## CLI commands

```bash
npx uipath-orchestrator-mcp init
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp login
npx uipath-orchestrator-mcp whoami
npx uipath-orchestrator-mcp serve
npx uipath-orchestrator-mcp logout
```

## MCP client example

Example Claude Desktop configuration:

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "node",
      "args": ["C:/path/to/uipath-orchestrator-mcp/dist/src/index.js", "serve"],
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
- use `doctor` to validate setup before connecting an MCP client
- prefer least-privilege scopes and folder access where possible

## When not to use this package

If you already rely on the official UiPath CLI skill catalog for local agent workflows, some platform operations may already be available through `uip`.

This package is most useful when you specifically want:

- a standalone MCP server
- package-based MCP installation
- direct Orchestrator actions from an MCP client
- a reusable Orchestrator tool surface outside the UiPath skill system
