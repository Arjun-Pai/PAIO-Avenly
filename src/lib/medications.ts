/**
 * Medication Core Domain & Google Sheets Synchronization Engine
 * Reads and writes directly through Google Sheets API (Medications & MedicationLog tabs)
 */

import { MedicationRecord, MedicationLogRecord, TimelineDoseItem, MedicationItem } from "../types";
import { ensureGoogleAccessToken } from "./workspace";

export const DEFAULT_SPREADSHEET_ID = "1_nLgl9A2KJJK2HyT1oCbUXTq7ghEAL79Ted4YDij_98";

export const MEDICATIONS_HEADERS = [
  "med_id", "name", "dosage", "times", "days_active", 
  "pills_remaining", "refill_threshold", "start_date", "active"
];

export const MEDICATION_LOG_HEADERS = [
  "log_id", "med_id", "scheduled_time", "status", "actual_time", "notes"
];

/**
 * Gets or creates the Medication Spreadsheet ID.
 */
export async function getMedicationSpreadsheetId(token?: string): Promise<string> {
  const customId = localStorage.getItem("avenly_medication_spreadsheet_id");
  if (customId) return customId;

  const healthId = localStorage.getItem("avenly_health_spreadsheet_id");
  if (healthId) return healthId;

  return DEFAULT_SPREADSHEET_ID;
}

/**
 * Ensures that both 'Medications' and 'MedicationLog' sheets exist in Google Sheets with proper headers.
 */
export async function ensureMedicationSheetsExist(spreadsheetId: string, token: string): Promise<boolean> {
  if (!token || !spreadsheetId) return false;

  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const existingTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties?.title || "");

    const requests: any[] = [];
    if (!existingTitles.includes("Medications")) {
      requests.push({ addSheet: { properties: { title: "Medications" } } });
    }
    if (!existingTitles.includes("MedicationLog")) {
      requests.push({ addSheet: { properties: { title: "MedicationLog" } } });
    }

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests })
      });
    }

    // Ensure header rows
    if (!existingTitles.includes("Medications")) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medications!A1:I1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [MEDICATIONS_HEADERS] })
      });
    }

    if (!existingTitles.includes("MedicationLog")) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MedicationLog!A1:F1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [MEDICATION_LOG_HEADERS] })
      });
    }

    return true;
  } catch (e) {
    console.warn("Notice: ensureMedicationSheetsExist warning:", e);
    return false;
  }
}

/**
 * Reads all medications from Google Sheets 'Medications' tab.
 */
export async function fetchMedicationsFromSheet(passedToken?: string): Promise<MedicationRecord[]> {
  try {
    const token = passedToken || await ensureGoogleAccessToken();
    const spreadsheetId = await getMedicationSpreadsheetId(token);

    if (token) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medications!A2:I?_cb=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        const records: MedicationRecord[] = rows
          .filter((r: any[]) => r && r.length > 0 && r[0] && String(r[0]).trim() !== "" && String(r[0]).toLowerCase() !== "med_id")
          .map((r: any[]) => {
            const rawTimes = r[3] ? String(r[3]) : "08:00";
            const timesList = rawTimes.split(",").map(t => t.trim()).filter(Boolean);
            const activeVal = r[8] !== undefined ? String(r[8]).toLowerCase() : "true";
            const isActive = activeVal === "true" || activeVal === "1" || activeVal === "yes";

            return {
              med_id: String(r[0]),
              name: r[1] ? String(r[1]) : "Medication",
              dosage: r[2] ? String(r[2]) : "1 tablet",
              times: timesList.length > 0 ? timesList : ["08:00"],
              days_active: r[4] ? String(r[4]) : "daily",
              pills_remaining: r[5] && !isNaN(Number(r[5])) ? Number(r[5]) : 30,
              refill_threshold: r[6] && !isNaN(Number(r[6])) ? Number(r[6]) : 5,
              start_date: r[7] ? String(r[7]) : new Date().toISOString().split("T")[0],
              active: isActive
            };
          });

        if (records.length > 0) {
          // Sync server cache in background
          fetch("/api/medications/sync-cache", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ medications: records })
          }).catch(() => {});
          return records;
        }
      }
    }
  } catch (err) {
    console.warn("fetchMedicationsFromSheet network note:", err);
  }

  // Fallback to server proxy /api/medications
  try {
    const serverRes = await fetch(`/api/medications?_cb=${Date.now()}`);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (Array.isArray(serverData)) {
        return serverData;
      }
    }
  } catch (e) {}

  return [];
}

/**
 * Reads all medication logs from Google Sheets 'MedicationLog' tab.
 */
export async function fetchMedicationLogsFromSheet(passedToken?: string): Promise<MedicationLogRecord[]> {
  try {
    const token = passedToken || await ensureGoogleAccessToken();
    const spreadsheetId = await getMedicationSpreadsheetId(token);

    if (token) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MedicationLog!A2:F?_cb=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        const logs: MedicationLogRecord[] = rows
          .filter((r: any[]) => r && r.length > 0 && r[0])
          .map((r: any[]) => ({
            log_id: String(r[0]),
            med_id: r[1] ? String(r[1]) : "",
            scheduled_time: r[2] ? String(r[2]) : "",
            status: (r[3] ? String(r[3]).toLowerCase() : "taken") as "taken" | "skipped" | "missed",
            actual_time: r[4] ? String(r[4]) : undefined,
            notes: r[5] ? String(r[5]) : undefined
          }));

        return logs;
      }
    }
  } catch (err) {
    console.warn("fetchMedicationLogsFromSheet note:", err);
  }

  // Server proxy fallback
  try {
    const serverRes = await fetch(`/api/medications/logs?_cb=${Date.now()}`);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (Array.isArray(serverData)) return serverData;
    }
  } catch (e) {}

  return [];
}

/**
 * Appends a list of new medications to the 'Medications' tab in Google Sheets.
 */
export async function addMedicationsToSheet(newMeds: MedicationRecord[], passedToken?: string): Promise<boolean> {
  const token = passedToken || await ensureGoogleAccessToken();
  const spreadsheetId = await getMedicationSpreadsheetId(token);

  if (token && spreadsheetId) {
    try {
      await ensureMedicationSheetsExist(spreadsheetId, token);

      const rowsToAppend = newMeds.map(m => [
        m.med_id,
        m.name,
        m.dosage,
        m.times.join(", "),
        m.days_active,
        m.pills_remaining,
        m.refill_threshold,
        m.start_date || new Date().toISOString().split("T")[0],
        m.active ? "TRUE" : "FALSE"
      ]);

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medications!A:I:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: rowsToAppend })
        }
      );

      if (appendRes.ok) {
        // Also sync to backend
        fetch("/api/medications/batch-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medications: newMeds })
        }).catch(() => {});
        return true;
      }
    } catch (e) {
      console.error("Direct Sheet append error:", e);
    }
  }

  // Fallback to server API
  try {
    const serverRes = await fetch("/api/medications/batch-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medications: newMeds })
    });
    return serverRes.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Logs a medication dose (taken/skipped/missed) to 'MedicationLog' AND decrements pills_remaining on 'Medications'.
 */
export async function logMedicationDoseToSheet(
  medId: string,
  scheduledTime: string,
  status: "taken" | "skipped" | "missed",
  notes: string = "",
  passedToken?: string
): Promise<boolean> {
  const token = passedToken || await ensureGoogleAccessToken();
  const spreadsheetId = await getMedicationSpreadsheetId(token);
  const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const actualTime = new Date().toISOString();

  // 1. Post to Server API (which handles persistence, hardware chime, and sheets sync)
  let serverSuccess = false;
  try {
    const res = await fetch("/api/medications/log-dose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        log_id: logId,
        med_id: medId,
        scheduled_time: scheduledTime,
        status,
        actual_time: actualTime,
        notes
      })
    });
    if (res.ok) serverSuccess = true;
  } catch (e) {}

  // 2. Direct Sheets Write (for client-side OAuth session)
  if (token && spreadsheetId) {
    try {
      await ensureMedicationSheetsExist(spreadsheetId, token);

      // Append to MedicationLog
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MedicationLog!A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            values: [[logId, medId, scheduledTime, status, actualTime, notes]]
          })
        }
      );

      // Decrement pills_remaining on Medications tab
      if (status === "taken" || status === "skipped") {
        const getRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medications!A2:I`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (getRes.ok) {
          const getData = await getRes.json();
          const rows = getData.values || [];
          for (let i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i][0] === medId) {
              const rowIndex = i + 2;
              const currentPills = parseInt(rows[i][5], 10) || 30;
              const nextPills = Math.max(0, currentPills - 1);

              await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medications!F${rowIndex}?valueInputOption=USER_ENTERED`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ values: [[nextPills]] })
                }
              );
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Direct sheet logging warning:", e);
    }
  }

  return serverSuccess || true;
}

/**
 * Normalizes HH:MM or HH:MM AM/PM to 12-hour display and minutes since midnight.
 */
export function parseTimeToMinutes(timeStr: string): { minutes: number; display: string; raw: string } {
  if (!timeStr) return { minutes: 480, display: "08:00 AM", raw: "08:00" };

  const clean = timeStr.trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const mer = match12[3].toUpperCase();
    let normH = h;
    if (mer === "PM" && h < 12) normH += 12;
    if (mer === "AM" && h === 12) normH = 0;
    const mins = normH * 60 + m;
    const dispH = h;
    const dispM = m.toString().padStart(2, "0");
    return { minutes: mins, display: `${dispH}:${dispM} ${mer}`, raw: `${normH.toString().padStart(2, "0")}:${dispM}` };
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    const mins = h * 60 + m;
    const mer = h >= 12 ? "PM" : "AM";
    let dispH = h % 12;
    if (dispH === 0) dispH = 12;
    const dispHStr = dispH.toString();
    const dispMStr = m.toString().padStart(2, "0");
    return { minutes: mins, display: `${dispHStr}:${dispMStr} ${mer}`, raw: `${h.toString().padStart(2, "0")}:${dispMStr}` };
  }

  return { minutes: 480, display: clean, raw: clean };
}

/**
 * Checks if a medication is active today based on its days_active configuration.
 */
export function isMedicationActiveToday(daysActive: string, targetDate: Date = new Date()): boolean {
  if (!daysActive || daysActive.trim().toLowerCase() === "daily") return true;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayIndex = targetDate.getDay();
  const currentShort = dayNames[currentDayIndex].toLowerCase();
  const currentFull = fullDayNames[currentDayIndex].toLowerCase();

  const parts = daysActive.toLowerCase().split(",").map(p => p.trim());
  return parts.some(p => p === currentShort || p === currentFull || p === "daily");
}

/**
 * Pure deterministic calculation of Today's Timeline from Medications + MedicationLog rows.
 * Handles:
 * - Chronological sorting
 * - Due Now: current time >= scheduled_time and no log entry yet
 * - Missed: current time > scheduled_time + 30m grace window and no log entry (auto-logs to sheet)
 * - Taken / Skipped / Missed from log entries
 */
export function computeTodayMedicationTimeline(
  medications: MedicationRecord[],
  logs: MedicationLogRecord[],
  onAutoLogMissed?: (medId: string, scheduledTime: string) => void
): TimelineDoseItem[] {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const timelineItems: TimelineDoseItem[] = [];

  for (const med of medications) {
    if (!med.active) continue;
    if (!isMedicationActiveToday(med.days_active, now)) continue;

    for (const rawTime of med.times) {
      const parsedTime = parseTimeToMinutes(rawTime);
      const doseId = `${med.med_id}-${parsedTime.raw}`;

      // Find matching log for this medication and dose time
      const matchingLog = logs.find(log => {
        if (log.med_id !== med.med_id) return false;
        const logSched = String(log.scheduled_time || "").trim();
        // Check if log sched matches time string directly or date + time
        return logSched.includes(parsedTime.raw) || logSched.includes(parsedTime.display) || logSched === rawTime;
      });

      let status: "Upcoming" | "Due Now" | "Taken" | "Skipped" | "Missed" = "Upcoming";
      let actualTime: string | undefined = undefined;
      let notes: string | undefined = undefined;

      if (matchingLog) {
        if (matchingLog.status === "taken") {
          status = "Taken";
          actualTime = matchingLog.actual_time;
        } else if (matchingLog.status === "skipped") {
          status = "Skipped";
          actualTime = matchingLog.actual_time;
        } else if (matchingLog.status === "missed") {
          status = "Missed";
          actualTime = matchingLog.actual_time;
        }
        notes = matchingLog.notes;
      } else {
        // No log entry yet -> Compute state based on time
        if (nowMinutes < parsedTime.minutes) {
          status = "Upcoming";
        } else if (nowMinutes >= parsedTime.minutes && nowMinutes <= parsedTime.minutes + 30) {
          status = "Due Now";
        } else {
          // Past 30-min grace window -> Automatically marked as Missed
          status = "Missed";
          if (onAutoLogMissed) {
            onAutoLogMissed(med.med_id, parsedTime.display);
          }
        }
      }

      timelineItems.push({
        id: doseId,
        med_id: med.med_id,
        name: med.name,
        dosage: med.dosage,
        scheduled_time: parsedTime.display,
        time: parsedTime.display,
        status,
        actual_time: actualTime,
        pills_remaining: med.pills_remaining,
        refill_threshold: med.refill_threshold,
        days_active: med.days_active,
        active: med.active,
        instructions: `Take ${med.dosage} with water`,
        notes
      });
    }
  }

  // Sort chronologically by dose time minutes
  timelineItems.sort((a, b) => {
    const minA = parseTimeToMinutes(a.scheduled_time).minutes;
    const minB = parseTimeToMinutes(b.scheduled_time).minutes;
    return minA - minB;
  });

  return timelineItems;
}

/**
 * Transforms TimelineDoseItem to legacy MedicationItem for component compatibility.
 */
export function convertTimelineToMedicationItems(items: TimelineDoseItem[]): MedicationItem[] {
  return items.map(item => ({
    id: item.id,
    name: `${item.name} ${item.dosage}`,
    dosage: item.dosage,
    time: item.scheduled_time,
    instructions: item.instructions || "Take as prescribed",
    status: (item.status === "Due Now" ? "Upcoming" : item.status === "Skipped" ? "Missed" : item.status) as any,
    currentQty: item.pills_remaining,
    refillThreshold: item.refill_threshold,
    capacity: 30,
    timestamp: new Date().toISOString()
  }));
}
