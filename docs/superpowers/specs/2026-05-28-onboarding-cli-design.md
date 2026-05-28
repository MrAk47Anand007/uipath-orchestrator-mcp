# Onboarding CLI Design

## Goal

Make first-time setup simple for a developer or RPA engineer who understands UiPath concepts but should not have to manually assemble `.env`, discover folder keys, or guess why auth is failing.

## Scope

This slice adds a guided onboarding layer on top of the existing MCP server:

- `init` command to generate `.env`
- `doctor` command to validate configuration and tenant access
- folder discovery and default folder selection by name
- friendlier startup validation for `serve`
- README quickstart rewritten around CLI onboarding

This slice does not automate UiPath admin setup itself. Users still create the external app, set scopes, add redirect URLs, and grant folder access in UiPath.

## Target User

Primary target: a developer or RPA engineer setting up the repo locally for the first time.

## Commands

### `init`

Guided CLI setup that:

- asks for Orchestrator URL or org and tenant
- asks for auth mode: `interactive` or `service`
- asks for the right app id for the selected mode
- asks for the client secret only in service mode
- writes or updates `.env`
- keeps folder key optional at this step
- points the user to `login` or `doctor` next

### `doctor`

Validation and setup assistant that:

- parses config and reports missing or inconsistent values
- verifies auth for the selected mode
- checks Orchestrator reachability
- checks accessible folders
- lists folders by name
- can store a selected folder as `UIPATH_FOLDER_KEY`
- reports next actions in plain language

### `login`

Interactive browser login for PKCE mode. Existing functionality remains, but onboarding now expects it as part of the normal setup flow.

### `serve`

Starts the MCP server only after clear validation. If the most important onboarding prerequisites are missing, it should fail with actionable guidance instead of a raw low-level error.

## UX Principles

- Prefer guided prompts over asking users to edit config by hand
- Keep output actionable and specific
- Never make the user look up a folder GUID manually if folder access can be queried
- Separate setup from diagnosis so partial progress is easy to recover
- Keep service mode and interactive mode equally supported

## Data and File Handling

- `.env` remains the source of truth for tenant config
- interactive session continues to live under the local auth storage path
- `init` updates only the keys it manages and preserves unrelated lines where possible

## Validation Rules

### Service mode

- requires `UIPATH_CLIENT_ID`
- requires `UIPATH_CLIENT_SECRET`
- token request must succeed

### Interactive mode

- requires `UIPATH_INTERACTIVE_CLIENT_ID`
- session must exist or user should run `login`
- refresh or current token must succeed

### Shared checks

- `UIPATH_BASE_URL`, org, and tenant must be consistent
- accessible folder list should be fetched when auth succeeds
- selected folder key should be validated if present

## Folder Selection

`doctor` should display folders in a short numbered list and optionally persist the chosen folder key into `.env`. The user should choose by folder name, not by GUID.

## Testing

Add tests for:

- env-file update helpers
- `doctor` result formatting and failure guidance
- folder selection persistence
- safer serve-time validation messaging

## Success Criteria

A new developer should be able to do the following with minimal manual editing:

1. run `init`
2. run `login` if using interactive mode
3. run `doctor` to validate and select a folder
4. run `serve`
