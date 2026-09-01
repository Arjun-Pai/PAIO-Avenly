const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

// Insert after createGoogleCalendarEvent

const createRegex = /export async function createGoogleCalendarEvent[\s\S]*?return \{\n.*?id: item\.id,[\s\S]*?htmlLink: item\.htmlLink,\n\s*};\n\}/;

const toInsert = `

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  const token = await ensureGoogleAccessToken();
  const res = await fetch(\`https://www.googleapis.com/calendar/v3/calendars/primary/events/\${eventId}\`, {
    method: 'DELETE',
    headers: {
      Authorization: \`Bearer \${token}\`,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to delete Google Calendar event');
  }
}

export async function updateGoogleCalendarEvent(eventId: string, appointment: {
  summary: string;
  description?: string;
  location?: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
}): Promise<CalendarAppointment> {
  const token = await ensureGoogleAccessToken();
  const start = new Date(\`\${appointment.dateStr}T\${appointment.timeStr}:00\`);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour duration

  const res = await fetch(\`https://www.googleapis.com/calendar/v3/calendars/primary/events/\${eventId}\`, {
    method: 'PUT',
    headers: {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: appointment.summary,
      description: appointment.description || 'Doctor appointment managed via Avenly Elder Care',
      location: appointment.location || 'Medical Clinic',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 },
        ],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to update Google Calendar event');
  }

  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary,
    description: item.description,
    location: item.location,
    startDateTime: item.start?.dateTime || '',
    endDateTime: item.end?.dateTime || '',
    htmlLink: item.htmlLink,
  };
}`;

if (code.match(createRegex)) {
  code = code.replace(createRegex, (match) => match + toInsert);
  fs.writeFileSync('src/lib/workspace.ts', code);
  console.log("workspace.ts updated");
} else {
  console.log("Could not find createGoogleCalendarEvent");
}
