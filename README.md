# UiPath Orchestrator MCP Server

Expose UiPath Orchestrator as MCP tools so Claude, ChatGPT, Codex, and other AI agents can run jobs, manage queues, inspect logs, work with assets and buckets, monitor robots and runtimes, and handle admin access tasks through natural language.

This project bridges deterministic RPA with agentic AI. The LLM decides what to do, the MCP server translates that intent into safe UiPath Orchestrator actions, and UiPath executes the real automation.

## Why this exists

UiPath already gives strong automation execution. MCP makes that execution layer callable by AI agents.

That means an agent can do things like:

- start a UiPath process with input arguments
- check if a robot or runtime is available
- inspect failed queue items
- fetch execution logs for a job
- upload a file into a storage bucket
- create or pause a schedule
- inspect roles, users, and folder permissions

Instead of building a custom integration for every AI workflow, you expose Orchestrator once as a reusable tool surface.

## Current status

This repo is already live-tested against a real UiPath Cloud tenant.

- `61` MCP tools are registered today
- service auth and interactive PKCE auth both work
- onboarding CLI is implemented: `init`, `doctor`, `login`, `whoami`, `serve`, `logout`
- core jobs, queues, logs, buckets, schedules, releases, roles, permissions, machines, and runtimes are implemented

## Demo

### Setup demo placeholder

Add your setup GIF here tomorrow:

```md
![Setup Demo](./docs/media/setup-demo.gif)
```

### Live usage demo placeholder

Add your product demo GIF here tomorrow:

```md
![Usage Demo](./docs/media/usage-demo.gif)
```

## What the MCP can do

### Folder and discovery

- `uipath_list_folders`
- `uipath_search_folders`
- `uipath_list_processes`
- `uipath_list_releases`
- `uipath_get_release`

### Jobs and execution

- `uipath_start_job`
- `uipath_stop_job`
- `uipath_restart_job`
- `uipath_get_job_details`
- `uipath_get_jobs_stats`
- `uipath_list_execution_media`

### Logs and diagnostics

- `uipath_list_robot_logs`
- `uipath_get_robot_log_total_count`
- `uipath_get_status`

### Queues

- `uipath_list_queue_definitions`
- `uipath_list_queue_items`
- `uipath_add_queue_item`
- `uipath_set_queue_item_progress`

### Robots, machines, and runtimes

- `uipath_list_robot_sessions`
- `uipath_list_robots`
- `uipath_get_robot_stats`
- `uipath_list_machines`
- `uipath_get_machine`
- `uipath_get_assigned_machines`
- `uipath_get_folder_runtimes`
- `uipath_get_machine_session_runtimes`
- `uipath_get_folder_machine_session_runtimes`
- `uipath_toggle_robot_enabled_status`
- `uipath_delete_inactive_unattended_sessions`
- `uipath_update_machines_to_folder_associations`

### Assets and storage buckets

- `uipath_list_assets`
- `uipath_get_asset_by_name`
- `uipath_create_asset`
- `uipath_update_asset`
- `uipath_list_buckets`
- `uipath_list_bucket_files`
- `uipath_get_bucket_read_uri`
- `uipath_upload_bucket_file`
- `uipath_delete_bucket_file`

### Schedules and triggers

- `uipath_list_schedules`
- `uipath_create_schedule`
- `uipath_set_schedule_enabled`
- `uipath_delete_schedule`

### Releases and packages

- `uipath_create_release`
- `uipath_update_release`
- `uipath_delete_release`
- `uipath_upload_process_package`
- `uipath_delete_process_package`
- `uipath_update_release_to_latest_package`
- `uipath_update_release_to_specific_package`
- `uipath_rollback_release`

### Roles, users, and access management

- `uipath_search_directory_objects`
- `uipath_list_roles`
- `uipath_get_users_for_role`
- `uipath_get_role_user_ids`
- `uipath_assign_roles_to_user`
- `uipath_toggle_user_role`
- `uipath_get_directory_permissions`
- `uipath_list_folder_users`
- `uipath_get_user_folder_roles`
- `uipath_assign_users_to_folders`

## Supported auth modes

This server supports both developer-friendly desktop login and enterprise-friendly service auth.

### Service mode

Use this for CI, shared agents, backend services, or non-interactive execution.

- UiPath app type: `Confidential`
- OAuth flow: `client_credentials`
- primary env vars:
  - `UIPATH_AUTH_MODE=service`
  - `UIPATH_CLIENT_ID`
  - `UIPATH_CLIENT_SECRET`

### Interactive mode

Use this for local desktop usage where a user logs in through the browser.

- UiPath app type: `Non-confidential`
- OAuth flow: `authorization_code + PKCE`
- redirect URL:
  - `http://127.0.0.1:8787/callback`
- primary env vars:
  - `UIPATH_AUTH_MODE=interactive`
  - `UIPATH_INTERACTIVE_CLIENT_ID`
  - `UIPATH_INTERACTIVE_REDIRECT_URL`

Interactive login stores tokens locally on Windows by default at:

- `C:\Users\<you>\AppData\Roaming\uipath-orchestrator-mcp\auth.json`

You can override that with `UIPATH_AUTH_STORAGE_PATH`.

## Quickstart

For a developer or RPA engineer, this is the smoothest path:

```bash
npm install
npm run init
npm run login
npm run doctor
npm run serve
```

What each command does:

- `init` creates or updates your `.env`
- `login` opens UiPath login in the browser for interactive auth
- `doctor` validates auth, folder access, and config
- `serve` starts the MCP server

If you want service mode instead, skip `login`, set service credentials in `.env`, and run:

```bash
npm run doctor
npm run serve
```

## UiPath-side setup

You still need a small amount of tenant setup before the MCP can do useful work.

### For service mode

1. Create a `Confidential` external app in UiPath.
2. Add the required application scopes.
3. Grant the app access to the target Orchestrator folder.
4. Put the client id, client secret, base URL, and folder key in `.env`.

### For interactive mode

1. Create a `Non-confidential` external app in UiPath.
2. Add user scopes.
3. Set redirect URL to `http://127.0.0.1:8787/callback`.
4. Grant the user appropriate Orchestrator access and folder permissions.
5. Put the interactive client id in `.env`.
6. Run `npm run login`.

### Typical scopes

The exact scopes depend on what you want the agent to do, but common ones include:

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

Important: OAuth scopes are not enough by themselves. The app or logged-in user also needs real Orchestrator folder access.

## Environment examples

### Service mode

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_CLIENT_ID=your-service-client-id
UIPATH_CLIENT_SECRET=your-service-client-secret
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines
UIPATH_AUTH_MODE=service
```

### Interactive mode

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_AUTH_MODE=interactive
UIPATH_INTERACTIVE_CLIENT_ID=your-interactive-client-id
UIPATH_INTERACTIVE_REDIRECT_URL=http://127.0.0.1:8787/callback
UIPATH_INTERACTIVE_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines offline_access
```

## CLI

```bash
npm run init
npm run doctor
npm run login
npm run whoami
npm run serve
npm run logout
```

## Install and run

```bash
npm install
npm run build
npm run serve
```

For development:

```bash
npm run dev
```

For verification:

```bash
npm test
npm run build
```

## MCP client configuration

### Claude Desktop example

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
        "UIPATH_CLIENT_ID": "your-client-id",
        "UIPATH_CLIENT_SECRET": "your-client-secret",
        "UIPATH_FOLDER_KEY": "your-folder-key",
        "UIPATH_AUTH_MODE": "service"
      }
    }
  }
}
```

## Example prompts

These are the kinds of requests this MCP is built for:

- `Run the UiPathAgentTesting process in Shared with these input arguments.`
- `Show failed queue items from today.`
- `Which robots and runtimes are available right now in Shared?`
- `Fetch logs for the last failed job.`
- `Upload C:\\docs\\invoice.pdf to the UiPathAgentTesting bucket.`
- `Create a daily schedule for the release at 9 AM India time.`
- `Find the roles assigned to anand.kale@xalta.tech.`
- `Assign Automation User to this user in the Shared folder.`

## Known gaps and hold list

Most of the project is live-tested, but a few items are intentionally still on hold:

- live asset create/update behavior still needs a final UiPath API workaround
- live `.nupkg` upload test is pending a safe real package file
- live process package delete test is pending a disposable test package
- live rollback test needs a release with real version history
- live verification of `update to latest package version` needs a tenant setup where version movement is observable

So the code surface is broad, but a small number of deeper release/resource write flows still need final live validation.

## Safety notes

Some tools can change production-like automation state. The more sensitive ones already require explicit confirmation in the MCP layer, including:

- role assignment and role toggling
- folder-user assignment
- robot enable/disable
- inactive session cleanup
- folder-machine association changes

That helps keep the server useful for agents without making it reckless.

## Project direction

This repo is moving toward a complete AI control plane for UiPath Orchestrator:

- deterministic bot execution
- operational visibility
- queue and asset orchestration
- deployment and scheduling controls
- admin and access workflows

That makes it useful not only for demos, but also for real enterprise automation operations.

## Notes

- keep `.env` and local auth storage out of git
- folder access matters as much as scopes
- `doctor` is the fastest way to understand what is missing in a fresh setup
- service-mode apps may not always return browseable folder lists even when the configured folder key works; the CLI handles that more gracefully now
