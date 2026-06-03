import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type CalendarPayload = {
  Name: string;
  TimeZoneId?: string;
  ExcludedDates: string[];
  Id?: number;
  Key?: string;
};

type CalendarToolsDeps = {
  calendarsApi: {
    listCalendars: (
      top?: number,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
    getCalendar: (
      calendarId: number,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
    createCalendar: (
      calendar: CalendarPayload,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
    updateCalendar: (
      calendarId: number,
      calendar: CalendarPayload,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
    deleteCalendar: (
      calendarId: number,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
    calendarExists: (
      calendarName: string,
      folder?: { folderKey?: string; folderId?: number },
    ) => Promise<unknown>;
  };
};

const calendarSchema = z.object({
  name: z.string().min(1),
  timeZoneId: z.string().min(1).optional(),
  excludedDates: z.array(z.iso.datetime()).default([]),
});

export function registerCalendarTools(
  server: McpServer,
  deps: CalendarToolsDeps,
) {
  server.registerTool(
    'uipath_list_calendars',
    {
      description: 'List tenant-level UiPath calendars.',
      inputSchema: z.object({
        top: z.number().int().positive().max(100).default(20),
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({ top, folderKey, folderId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.calendarsApi.listCalendars(top, { folderKey, folderId }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_get_calendar',
    {
      description: 'Get a UiPath calendar by numeric id.',
      inputSchema: z.object({
        calendarId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({ calendarId, folderKey, folderId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.calendarsApi.getCalendar(calendarId, {
              folderKey,
              folderId,
            }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_create_calendar',
    {
      description:
        'Create a UiPath business calendar with a timezone and excluded holiday dates.',
      inputSchema: calendarSchema.extend({
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({ name, timeZoneId, excludedDates, folderKey, folderId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.calendarsApi.createCalendar({
              Name: name,
              ...(timeZoneId ? { TimeZoneId: timeZoneId } : {}),
              ExcludedDates: excludedDates,
            }, { folderKey, folderId }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_update_calendar',
    {
      description:
        'Update a UiPath calendar by id, including its name, timezone, and excluded dates.',
      inputSchema: calendarSchema.extend({
        calendarId: z.number().int().positive(),
        key: z.uuid().optional(),
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({
      calendarId,
      key,
      name,
      timeZoneId,
      excludedDates,
      folderKey,
      folderId,
    }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.calendarsApi.updateCalendar(calendarId, {
              Id: calendarId,
              Key: key,
              Name: name,
              ...(timeZoneId ? { TimeZoneId: timeZoneId } : {}),
              ExcludedDates: excludedDates,
            }, { folderKey, folderId }),
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    'uipath_delete_calendar',
    {
      description: 'Delete a UiPath calendar by numeric id.',
      inputSchema: z.object({
        calendarId: z.number().int().positive(),
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({ calendarId, folderKey, folderId }) => {
      await deps.calendarsApi.deleteCalendar(calendarId, { folderKey, folderId });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted calendar ${calendarId}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'uipath_calendar_exists',
    {
      description: 'Check whether a calendar name already exists in the tenant.',
      inputSchema: z.object({
        name: z.string().min(1),
        folderKey: z.uuid().optional(),
        folderId: z.number().int().positive().optional(),
      }),
    },
    async ({ name, folderKey, folderId }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            await deps.calendarsApi.calendarExists(name, { folderKey, folderId }),
            null,
            2,
          ),
        },
      ],
    }),
  );
}
