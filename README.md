# UiPath Orchestrator MCP Server

An MCP server for UiPath Orchestrator that lets AI agents trigger jobs, manage queues, work with assets and buckets, and monitor robots through natural language.

## What it does

- Exposes UiPath Orchestrator operations as MCP tools for Claude, ChatGPT, Codex, and other MCP clients
- Supports both service-to-service auth and browser-based user login
- Uses folder-aware headers so tools work cleanly inside scoped Orchestrator folders
- Covers job execution, queue operations, robot monitoring, assets, and storage buckets

## Tool coverage

Current MCP tools include:

- `uipath_list_folders`
- `uipath_search_folders`
- `uipath_list_processes`
- `uipath_start_job`
- `uipath_stop_job`
- `uipath_restart_job`
- `uipath_list_queue_definitions`
- `uipath_list_queue_items`
- `uipath_add_queue_item`
- `uipath_set_queue_item_progress`
- `uipath_list_robot_sessions`
- `uipath_list_robots`
- `uipath_get_robot_stats`
- `uipath_get_jobs_stats`
- `uipath_get_status`
- `uipath_list_assets`
- `uipath_get_asset_by_name`
- `uipath_list_buckets`
- `uipath_list_bucket_files`
- `uipath_get_bucket_read_uri`

## Auth modes

This project supports two auth models.

### 1. Service mode

Use this for backend automation, CI, or shared agents.

- UiPath app type: `Confidential`
- OAuth flow: `client_credentials`
- Required env: `UIPATH_CLIENT_ID`, `UIPATH_CLIENT_SECRET`
- Recommended env: `UIPATH_AUTH_MODE=service`

### 2. Interactive mode

Use this for local desktop usage where the user logs into UiPath in the browser and grants consent.

- UiPath app type: `Non-confidential`
- OAuth flow: `authorization_code + PKCE`
- Redirect URL: `http://127.0.0.1:8787/callback`
- Required env: `UIPATH_INTERACTIVE_CLIENT_ID`
- Recommended env: `UIPATH_AUTH_MODE=interactive`

Interactive login stores tokens locally at:

- `C:\Users\<you>\AppData\Roaming\uipath-orchestrator-mcp\auth.json` on Windows by default

You can override that path with `UIPATH_AUTH_STORAGE_PATH`.

## Setup

1. Create a UiPath External App.
2. Grant the app Orchestrator access and folder access.
3. Copy `.env.example` to `.env` and fill in your tenant values.
4. Install dependencies with `npm install`.
5. Run `npm run build`.

## Environment

Example `.env` for service mode:

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_CLIENT_ID=your-service-client-id
UIPATH_CLIENT_SECRET=your-service-client-secret
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets
UIPATH_AUTH_MODE=service
```

Example `.env` for interactive mode:

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_AUTH_MODE=interactive
UIPATH_INTERACTIVE_CLIENT_ID=your-interactive-client-id
UIPATH_INTERACTIVE_REDIRECT_URL=http://127.0.0.1:8787/callback
UIPATH_INTERACTIVE_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets offline_access
```

## CLI commands

```bash
npm run login
npm run whoami
npm run serve
npm run logout
```

`login` opens the browser, completes the UiPath OAuth flow, and saves the user session locally.

## Development

```bash
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
```

## Claude Desktop example

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "node",
      "args": ["C:/path/to/dist/src/index.js", "serve"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_",
        "UIPATH_ACCOUNT_LOGICAL_NAME": "your-org",
        "UIPATH_TENANT_LOGICAL_NAME": "DefaultTenant",
        "UIPATH_CLIENT_ID": "your-client-id",
        "UIPATH_CLIENT_SECRET": "your-client-secret",
        "UIPATH_FOLDER_KEY": "your-folder-key",
        "UIPATH_AUTH_MODE": "service"
      }
    }
  }
}
```

## Notes

- UiPath scopes alone are not enough. The app also needs folder access in Orchestrator.
- For interactive login, include `offline_access` if you want refresh tokens.
- Keep `.env` and local auth storage out of git.
