# UiPath Orchestrator MCP Server

MCP server for exposing UiPath Orchestrator operations as LLM-callable tools.

## What it does

- Starts UiPath jobs
- Stops or restarts running jobs
- Lists folders, processes, queue definitions, queue items, robots, and sessions
- Adds queue items and updates queue progress
- Fetches robot and job monitoring stats

## Setup

1. Register a confidential External App in UiPath.
2. Grant the app folder access.
3. Copy `.env.example` to `.env` and fill in credentials.
4. Install dependencies with `npm install`.
5. Run `npm run build`.

## Development

```bash
npm run dev
```

## Claude Desktop example

```json
{
  "mcpServers": {
    "uipath-orchestrator": {
      "command": "node",
      "args": ["C:/path/to/dist/src/index.js"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com/your-org/DefaultTenant/orchestrator_",
        "UIPATH_ACCOUNT_LOGICAL_NAME": "your-org",
        "UIPATH_TENANT_LOGICAL_NAME": "DefaultTenant",
        "UIPATH_CLIENT_ID": "your-client-id",
        "UIPATH_CLIENT_SECRET": "your-client-secret",
        "UIPATH_FOLDER_KEY": "your-folder-key"
      }
    }
  }
}
```
