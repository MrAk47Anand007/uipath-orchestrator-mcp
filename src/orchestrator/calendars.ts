import type { FolderSelector } from '../types.js';
import { createOrchestratorClient } from './client.js';

export function createCalendarsApi(
  client: ReturnType<typeof createOrchestratorClient>,
) {
  return {
    listCalendars(top = 20, folder?: FolderSelector) {
      const query = new URLSearchParams({
        $top: String(top),
        $count: 'true',
      });

      return client.getTenantScoped(`/odata/Calendars?${query.toString()}`, folder);
    },
    getCalendar(calendarId: number, folder?: FolderSelector) {
      return client.getTenantScoped(`/odata/Calendars(${calendarId})`, folder);
    },
    createCalendar(calendar: Record<string, unknown>, folder?: FolderSelector) {
      return client.postTenantScoped('/odata/Calendars', calendar, folder);
    },
    updateCalendar(
      calendarId: number,
      calendar: Record<string, unknown>,
      folder?: FolderSelector,
    ) {
      return client.putTenantScoped(`/odata/Calendars(${calendarId})`, calendar, folder);
    },
    deleteCalendar(calendarId: number, folder?: FolderSelector) {
      return client.deleteTenantScoped(`/odata/Calendars(${calendarId})`, folder);
    },
    calendarExists(calendarName: string, folder?: FolderSelector) {
      return client.postTenantScoped(
        '/odata/Calendars/UiPath.Server.Configuration.OData.CalendarExists',
        {
          calendarName,
        },
        folder,
      );
    },
  };
}
