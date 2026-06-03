import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrchestratorClient } from '../src/orchestrator/client.js';
import { createServer } from '../src/server.js';
import { createCalendarsApi } from '../src/orchestrator/calendars.js';

describe('calendars api', () => {
  beforeEach(() => nock.cleanAll());

  it('lists calendars for the current tenant', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Calendars')
      .query({
        $top: '20',
        $count: 'true',
      })
      .reply(function () {
        expect(this.req.headers['x-uipath-folderkey']).toBeUndefined();
        return [
          200,
          {
            value: [{ Id: 14, Key: 'cal-key-1', Name: 'India Holidays' }],
          },
        ];
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
      defaultFolderKey: 'folder-key-1',
    });

    const api = createCalendarsApi(client);
    const result = (await api.listCalendars(20)) as {
      value: Array<{ Id: number; Name: string }>;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.value[0].Id).toBe(14);
    expect(result.value[0].Name).toBe('India Holidays');
  });

  it('gets a calendar by numeric id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .get('/acme/DefaultTenant/orchestrator_/odata/Calendars(14)')
      .reply(200, {
        Id: 14,
        Key: 'cal-key-1',
        Name: 'India Holidays',
        TimeZoneId: 'India Standard Time',
        ExcludedDates: ['2026-08-15T00:00:00Z'],
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
    });

    const api = createCalendarsApi(client);
    const result = (await api.getCalendar(14)) as {
      Id: number;
      Name: string;
      TimeZoneId: string;
    };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(14);
    expect(result.TimeZoneId).toBe('India Standard Time');
  });

  it('creates a calendar', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'India Holidays',
      TimeZoneId: 'India Standard Time',
      ExcludedDates: ['2026-08-15T00:00:00Z', '2026-10-02T00:00:00Z'],
    };

    const scope = nock('https://cloud.uipath.com')
      .post('/acme/DefaultTenant/orchestrator_/odata/Calendars', body)
      .reply(201, {
        Id: 14,
        Key: 'cal-key-1',
        ...body,
      });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
    });

    const api = createCalendarsApi(client);
    const result = (await api.createCalendar(body)) as { Id: number; Name: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Id).toBe(14);
    expect(result.Name).toBe('India Holidays');
  });

  it('updates a calendar by numeric id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const body = {
      Name: 'India Holidays Updated',
      TimeZoneId: 'India Standard Time',
      ExcludedDates: ['2026-08-15T00:00:00Z'],
      Id: 14,
      Key: 'cal-key-1',
    };

    const scope = nock('https://cloud.uipath.com')
      .put('/acme/DefaultTenant/orchestrator_/odata/Calendars(14)', body)
      .reply(200, body);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
    });

    const api = createCalendarsApi(client);
    const result = (await api.updateCalendar(14, body)) as { Name: string };

    expect(scope.isDone()).toBe(true);
    expect(result.Name).toBe('India Holidays Updated');
  });

  it('deletes a calendar by numeric id', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .delete('/acme/DefaultTenant/orchestrator_/odata/Calendars(14)')
      .reply(204);

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
    });

    const api = createCalendarsApi(client);
    await api.deleteCalendar(14);

    expect(scope.isDone()).toBe(true);
  });

  it('validates whether a calendar name already exists', async () => {
    nock('https://cloud.uipath.com')
      .post('/acme/identity_/connect/token')
      .reply(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3600 });

    const scope = nock('https://cloud.uipath.com')
      .post(
        '/acme/DefaultTenant/orchestrator_/odata/Calendars/UiPath.Server.Configuration.OData.CalendarExists',
        { calendarName: 'India Holidays' },
      )
      .reply(200, { value: true });

    const client = createOrchestratorClient({
      baseUrl: new URL('https://cloud.uipath.com/acme/DefaultTenant/orchestrator_/'),
      tokenUrl: new URL('https://cloud.uipath.com/acme/identity_/connect/token'),
      clientId: 'client-id',
      clientSecret: 'client-secret',
      oauthScopes: 'OR.Settings',
    });

    const api = createCalendarsApi(client);
    const result = (await api.calendarExists('India Holidays')) as { value: boolean };

    expect(scope.isDone()).toBe(true);
    expect(result.value).toBe(true);
  });
});

describe('calendars MCP tools', () => {
  it('registers calendar tools', () => {
    const server = createServer({
      calendarsApi: {
        listCalendars: vi.fn(),
        getCalendar: vi.fn(),
        createCalendar: vi.fn(),
        updateCalendar: vi.fn(),
        deleteCalendar: vi.fn(),
        calendarExists: vi.fn(),
      },
    } as never);

    const registeredTools = (server as unknown as {
      _registeredTools?: Record<string, unknown>;
    })._registeredTools;

    expect(registeredTools?.uipath_list_calendars).toBeDefined();
    expect(registeredTools?.uipath_get_calendar).toBeDefined();
    expect(registeredTools?.uipath_create_calendar).toBeDefined();
    expect(registeredTools?.uipath_update_calendar).toBeDefined();
    expect(registeredTools?.uipath_delete_calendar).toBeDefined();
    expect(registeredTools?.uipath_calendar_exists).toBeDefined();
  });
});
