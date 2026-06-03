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

- `132` MCP tools are registered today
- service auth and interactive PKCE auth both work
- onboarding CLI is implemented: `init`, `doctor`, `login`, `whoami`, `serve`, `logout`
- core jobs, queues, logs, buckets, schedules, releases, roles, permissions, machines, and runtimes are implemented
- borrowed operator-friendly tools are now live-smoked too: dashboard summary, running/faulted jobs, error logs, asset value lookup, bulk queue add, and direct bucket file read
- `uipath_health_check` works as a connectivity probe in this tenant, but the UiPath status endpoint currently returns an empty body
- `uipath_resume_job` is implemented and tested, but live proof still depends on having a suspended job available in the tenant
- calendar `exists/create/get/update/delete` are live-tested; `uipath_list_calendars` still returns a UiPath-side `500` in this tenant

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
- `uipath_resume_job`
- `uipath_get_job_details`
- `uipath_get_jobs_stats`
- `uipath_get_running_jobs`
- `uipath_get_faulted_jobs`
- `uipath_list_execution_media`

### Job triggers

- `uipath_list_job_triggers`
- `uipath_get_job_triggers_by_job_key`
- `uipath_get_job_trigger_wait_events`
- `uipath_create_external_job_trigger`
- `uipath_get_job_trigger_payload`
- `uipath_deliver_job_trigger_payload`

### Logs and diagnostics

- `uipath_health_check`
- `uipath_dashboard_summary`
- `uipath_list_robot_logs`
- `uipath_get_robot_log_total_count`
- `uipath_get_error_logs`
- `uipath_get_status`

### Alerts

- `uipath_list_alerts`
- `uipath_get_unread_alert_count`
- `uipath_mark_alerts_as_read`
- `uipath_raise_process_alert`

### Audit logs

- `uipath_list_audit_logs`
- `uipath_export_audit_logs`
- `uipath_get_audit_log_details`

### Calendars

- `uipath_list_calendars`
- `uipath_get_calendar`
- `uipath_create_calendar`
- `uipath_update_calendar`
- `uipath_delete_calendar`
- `uipath_calendar_exists`

### Queues

- `uipath_create_queue_definition`
- `uipath_get_queue_definition`
- `uipath_get_queue_definition_by_key`
- `uipath_list_queue_definitions`
- `uipath_update_queue_definition`
- `uipath_delete_queue_definition`
- `uipath_list_queue_items`
- `uipath_add_queue_item`
- `uipath_add_queue_items_bulk`
- `uipath_get_queue_item_processing_history`
- `uipath_list_queue_item_comments`
- `uipath_create_queue_item_comment`
- `uipath_update_queue_item_comment`
- `uipath_delete_queue_item_comment`
- `uipath_get_queue_item_comments_history`
- `uipath_list_queue_item_events`
- `uipath_get_queue_item_events_history`
- `uipath_get_queues_processing_status`
- `uipath_get_queue_processing_records`
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
- `uipath_get_asset_value`
- `uipath_create_asset`
- `uipath_update_asset`
- `uipath_list_buckets`
- `uipath_list_bucket_files`
- `uipath_get_bucket_read_uri`
- `uipath_read_bucket_file`
- `uipath_upload_bucket_file`
- `uipath_delete_bucket_file`

### Schedules and triggers

- `uipath_list_schedules`
- `uipath_create_schedule`
- `uipath_set_schedule_enabled`
- `uipath_delete_schedule`

### Tasks and human-in-the-loop

- `uipath_list_tasks`
- `uipath_get_task`
- `uipath_get_task_by_key`
- `uipath_list_tasks_across_folders`
- `uipath_get_task_permissions`
- `uipath_get_task_users`
- `uipath_create_generic_task`
- `uipath_get_generic_task_data`
- `uipath_save_generic_task_data`
- `uipath_complete_generic_task`
- `uipath_save_and_reassign_generic_task`
- `uipath_list_task_notes`
- `uipath_create_task_note`
- `uipath_list_task_activities`

### Releases and packages

- `uipath_create_release`
- `uipath_update_release`
- `uipath_delete_release`
- `uipath_upload_process_package`
- `uipath_delete_process_package`
- `uipath_update_release_to_latest_package`
- `uipath_update_release_to_specific_package`
- `uipath_rollback_release`

### Webhooks

- `uipath_list_webhooks`
- `uipath_get_webhook`
- `uipath_list_webhook_event_types`
- `uipath_create_webhook`
- `uipath_update_webhook`
- `uipath_delete_webhook`
- `uipath_ping_webhook`
- `uipath_trigger_custom_webhook_event`

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
- `uipath_list_users`
- `uipath_get_user`
- `uipath_get_user_by_key`
- `uipath_get_current_user`
- `uipath_get_current_permissions`
- `uipath_validate_users`

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

Package-first config is stored locally on Windows by default at:

- `C:\Users\<you>\AppData\Roaming\uipath-orchestrator-mcp\config.json`

You can override that with `UIPATH_AUTH_STORAGE_PATH`.

## Quickstart

For a developer or RPA engineer, this is the smoothest path:

```bash
npx uipath-orchestrator-mcp init
npx uipath-orchestrator-mcp login
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

What each command does:

- `init` creates or updates your saved package config
- `login` opens UiPath login in the browser for interactive auth
- `doctor` validates auth, folder access, and config
- `serve` starts the MCP server

If you want service mode instead, skip `login`, set service credentials during `init`, and run:

```bash
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp serve
```

## UiPath-side setup

You still need a small amount of tenant setup before the MCP can do useful work.

### For service mode

1. Create a `Confidential` external app in UiPath.
2. Add the required application scopes.
3. Grant the app access to the target Orchestrator folder.
4. Save the client id, client secret, base URL, and folder key through `init`.

### For interactive mode

1. Create a `Non-confidential` external app in UiPath.
2. Add user scopes.
3. Set redirect URL to `http://127.0.0.1:8787/callback`.
4. Grant the user appropriate Orchestrator access and folder permissions.
5. Save the interactive client id through `init`.
6. Run `npx uipath-orchestrator-mcp login`.

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
- `OR.Tasks`
- `OR.Webhooks`
- `OR.Settings`
- `OR.Audit`

Important: OAuth scopes are not enough by themselves. The app or logged-in user also needs real Orchestrator folder access.

## Environment examples

### Service mode example values

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_CLIENT_ID=your-service-client-id
UIPATH_CLIENT_SECRET=your-service-client-secret
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings
UIPATH_AUTH_MODE=service
```

### Interactive mode example values

```env
UIPATH_BASE_URL=https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_
UIPATH_ACCOUNT_LOGICAL_NAME=your-org
UIPATH_TENANT_LOGICAL_NAME=DefaultTenant
UIPATH_FOLDER_KEY=your-folder-key
UIPATH_AUTH_MODE=interactive
UIPATH_INTERACTIVE_CLIENT_ID=your-interactive-client-id
UIPATH_INTERACTIVE_REDIRECT_URL=http://127.0.0.1:8787/callback
UIPATH_INTERACTIVE_OAUTH_SCOPES=OR.Folders OR.Execution OR.Jobs OR.Queues OR.Robots OR.Monitoring OR.Assets OR.Buckets OR.Users OR.Machines OR.Tasks OR.Webhooks OR.Audit OR.Settings offline_access
```

These examples are still useful for contributors and repo-based development, but normal package usage can rely on the saved `config.json` instead of a project `.env`.

## CLI

```bash
npx uipath-orchestrator-mcp init
npx uipath-orchestrator-mcp doctor
npx uipath-orchestrator-mcp login
npx uipath-orchestrator-mcp whoami
npx uipath-orchestrator-mcp serve
npx uipath-orchestrator-mcp logout
```

## Local development

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

If you are contributing inside the repo, these are equivalent local shortcuts:

```bash
npm run init
npm run doctor
npm run login
npm run whoami
npm run serve
npm run logout
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

## Known gaps

The original live-validation hold items for assets and release/package workflows are now resolved.

At this point, the main remaining work is product polish rather than missing core behavior:

- `uipath_list_calendars` still returns `500 Internal Server Error` from UiPath in this tenant, even though calendar create/get/update/delete work live
- `uipath_health_check` currently acts as a connectivity check because `/api/Status/Get` returns an empty body in this tenant
- `uipath_resume_job` still needs a live suspended-job scenario for end-to-end tenant validation
- npm publish and package metadata cleanup
- demo GIFs and launch material
- broader real-world testing across more UiPath tenant shapes and permission models

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

- keep local `.env`, `config.json`, and auth storage out of git
- folder access matters as much as scopes
- `doctor` is the fastest way to understand what is missing in a fresh setup
- service-mode apps may not always return browseable folder lists even when the configured folder key works; the CLI handles that more gracefully now
