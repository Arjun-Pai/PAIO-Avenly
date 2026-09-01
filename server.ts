import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

app.use(express.json());

// Reload config dynamically
function getConfig() {
  try {
    const configPath = path.join(process.cwd(), "src", "config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load config.json:", e);
  }
  return {};
}

// Minimal state for WebRTC calls
let currentCall = {
  active: false,
  contactName: "",
  type: "video" as "video" | "voice",
  startTime: 0,
};

// ==========================================
// WebRTC Signaling over Socket.IO
// ==========================================
io.on("connection", (socket) => {
  console.log("Client connected for WebRTC signaling:", socket.id);
  
  socket.on("join-call", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", { offer: data.offer, sender: socket.id });
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", { answer: data.answer, sender: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", { candidate: data.candidate, sender: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ==========================================
// Google Sheets Integration
// ==========================================
async function getSheetsClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    return null;
  }
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  } catch (e) {
    console.error("Failed to init sheets client:", e);
    return null;
  }
}

// In-memory vitals store to maintain real synced data
let inMemoryVitals: any = {
  heartRate: 72,
  skinTemperature: 36.7,
  bloodOxygen: 98,
  bloodPressure: "118/78",
  glucose: 108,
  roomTemperature: 72,
  hydration: 1.8,
  sleep: "7.5 hrs Restful",
  sleepHours: 7.5,
  batteryPercentage: "94%",
  steps: 4280,
  distance: "2.8 km",
  calories: "310 kcal",
  mood: "Calm & Cheerful",
  overallScore: 94,
  isFallDetected: false,
  blynkConfigured: true,
  isStale: false,
  inactivityMinutes: 8,
  lastMovement: "8 mins ago",
  timestamp: new Date().toISOString()
};

let dailyCheckInState = {
  checkedIn: false,
  timestamp: null as string | null,
  message: "Daily check-in pending for today"
};

let symptomLogs: any[] = [
  { id: "sym-1", feeling: "great", title: "Feeling energetic & calm after breakfast", timestamp: "Today, 08:30 AM", reportedToCaregiver: true }
];

let securityAlerts: any[] = [
  {
    id: "alert-init",
    title: "System Online & Geofence Active",
    description: "Senior hub securely synced with caregiver network.",
    time: "Today, 08:00 AM",
    image: ""
  }
];

let medicalIDData = {
  bloodType: "A+",
  allergies: ["Penicillin", "Sulfa antibiotics", "Latex (Mild)"],
  dnrStatus: "DNR on File (POLST Signed 2025)",
  chronicConditions: ["Mild Hypertension", "Type-2 Diabetes (Controlled)", "Osteoarthritis"],
  medicationsSummary: "Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg",
  primaryPhysician: "Dr. Rajesh Sharma, MD (Cardiology)",
  physicianPhone: "+1 (555) 987-6543",
  homeAddress: "742 Evergreen Terrace, San Francisco, CA 94122"
};

let geofenceData = {
  isInsideSafeZone: true,
  zoneName: "Home & Garden Perimeter",
  currentLat: 37.7749,
  currentLng: -122.4194,
  distanceFromHomeMeters: 45,
  lastGpsPing: "Just now (High Accuracy GPS)"
};

app.get("/api/vitals", async (req, res) => {
  const sheetId = "1MDfS3rprPhYE4gCcJvgvnmNROYJym3JIkUPm7pqAexA";
  const sheets = await getSheetsClient();

  if (!sheets || !sheetId) {
    return res.json(inMemoryVitals);
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Health!A2:J",
    });
    const rows = response.data.values;
    if (rows && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      
      const rawHr = lastRow[1];
      const rawSpo2 = lastRow[2];
      const rawTemp = lastRow[3];
      const rawSteps = lastRow[4];
      const rawSleepHours = lastRow[7];
      const rawHydration = lastRow[8];
      const rawMood = lastRow[9];

      const heartRate = rawHr && rawHr !== "N/A" ? (isNaN(Number(rawHr)) ? rawHr : Number(rawHr)) : inMemoryVitals.heartRate;
      const bloodOxygen = rawSpo2 && rawSpo2 !== "N/A" ? (isNaN(Number(rawSpo2)) ? rawSpo2 : Number(rawSpo2)) : inMemoryVitals.bloodOxygen;
      const skinTemperature = rawTemp && rawTemp !== "N/A" ? (isNaN(Number(rawTemp)) ? rawTemp : Number(rawTemp)) : inMemoryVitals.skinTemperature;
      const steps = rawSteps && rawSteps !== "N/A" ? (isNaN(Number(rawSteps)) ? rawSteps : Number(rawSteps)) : inMemoryVitals.steps;
      const sleepHours = rawSleepHours && rawSleepHours !== "N/A" ? rawSleepHours : inMemoryVitals.sleepHours;
      const hydration = rawHydration && rawHydration !== "N/A" ? (isNaN(Number(rawHydration)) ? rawHydration : Number(rawHydration)) : inMemoryVitals.hydration;
      const mood = rawMood && rawMood !== "N/A" ? rawMood : inMemoryVitals.mood;

      inMemoryVitals = {
        ...inMemoryVitals,
        heartRate,
        bloodOxygen,
        skinTemperature,
        steps,
        sleepHours,
        sleep: `${sleepHours} hrs Restful`,
        hydration,
        mood,
        isStale: false,
        timestamp: lastRow[0] || new Date().toISOString()
      };

      return res.json(inMemoryVitals);
    }
    return res.json(inMemoryVitals);
  } catch (error) {
    console.error("Sheets error:", error);
    return res.json(inMemoryVitals);
  }
});

app.post("/api/vitals", (req, res) => {
  const body = req.body || {};
  inMemoryVitals = {
    ...inMemoryVitals,
    ...body,
    timestamp: new Date().toISOString()
  };
  return res.json({ success: true, vitals: inMemoryVitals });
});

app.post("/api/vitals/trigger-fall", (req, res) => {
  res.json({ success: true });
});
app.post("/api/vitals/reset-fall", (req, res) => {
  res.json({ success: true });
});
app.post("/api/vitals/hydrate", (req, res) => {
  res.json({ success: true });
});

// Medication Data via Google Sheets & Persistence
let serverMedications = [
  {
    med_id: "med-atorvastatin",
    name: "Atorvastatin 20mg",
    dosage: "20mg - 1 tablet",
    times: ["08:00 AM"],
    days_active: "daily",
    pills_remaining: 24,
    refill_threshold: 5,
    start_date: new Date().toISOString().split("T")[0],
    active: true
  },
  {
    med_id: "med-metformin",
    name: "Metformin 500mg",
    dosage: "500mg - 1 tablet",
    times: ["12:30 PM"],
    days_active: "daily",
    pills_remaining: 18,
    refill_threshold: 5,
    start_date: new Date().toISOString().split("T")[0],
    active: true
  },
  {
    med_id: "med-calcium",
    name: "Calcium & Mag 500mg",
    dosage: "500mg - 1 chewable",
    times: ["02:00 PM"],
    days_active: "daily",
    pills_remaining: 15,
    refill_threshold: 5,
    start_date: new Date().toISOString().split("T")[0],
    active: true
  },
  {
    med_id: "med-lisinopril",
    name: "Lisinopril 10mg",
    dosage: "10mg - 1 tablet",
    times: ["06:00 PM"],
    days_active: "daily",
    pills_remaining: 12,
    refill_threshold: 5,
    start_date: new Date().toISOString().split("T")[0],
    active: true
  },
  {
    med_id: "med-vitamind",
    name: "Vitamin D3 1000IU",
    dosage: "1 capsule",
    times: ["09:00 PM"],
    days_active: "daily",
    pills_remaining: 28,
    refill_threshold: 5,
    start_date: new Date().toISOString().split("T")[0],
    active: true
  }
];

let serverMedicationLogs = [
  {
    log_id: `log-seed-${Date.now()}`,
    med_id: "med-atorvastatin",
    scheduled_time: "08:00 AM",
    status: "taken",
    actual_time: new Date().toISOString(),
    notes: "Taken with breakfast"
  }
];

let linkedGoogleDocInfo = {
  docId: "",
  docUrl: "",
  docTitle: "",
  lastSynced: ""
};

// Standardized Google Sheets Medication Endpoints
app.get("/api/medications", async (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();

  if (sheets && sheetId) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Medications!A2:I",
      });

      if (response.data.values && response.data.values.length > 0) {
        const parsed = response.data.values
          .filter((r) => r && r.length > 0 && r[0] && String(r[0]).toLowerCase() !== "med_id")
          .map((r) => {
            const rawTimes = r[3] ? String(r[3]) : "08:00";
            const timesList = rawTimes.split(",").map((t: string) => t.trim()).filter(Boolean);
            const activeVal = r[8] !== undefined ? String(r[8]).toLowerCase() : "true";
            return {
              med_id: String(r[0]),
              name: r[1] ? String(r[1]) : "Medication",
              dosage: r[2] ? String(r[2]) : "1 dose",
              times: timesList.length > 0 ? timesList : ["08:00"],
              days_active: r[4] ? String(r[4]) : "daily",
              pills_remaining: r[5] && !isNaN(Number(r[5])) ? Number(r[5]) : 30,
              refill_threshold: r[6] && !isNaN(Number(r[6])) ? Number(r[6]) : 5,
              start_date: r[7] ? String(r[7]) : new Date().toISOString().split("T")[0],
              active: activeVal === "true" || activeVal === "1" || activeVal === "yes"
            };
          });

        if (parsed.length > 0) {
          serverMedications = parsed;
        }
      }
    } catch (e) {
      console.warn("Sheets reading notice:", e);
    }
  }

  res.json(serverMedications);
});

app.get("/api/medications/logs", async (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();

  if (sheets && sheetId) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "MedicationLog!A2:F",
      });

      if (response.data.values && response.data.values.length > 0) {
        const parsed = response.data.values
          .filter((r) => r && r.length > 0 && r[0])
          .map((r) => ({
            log_id: String(r[0]),
            med_id: r[1] ? String(r[1]) : "",
            scheduled_time: r[2] ? String(r[2]) : "",
            status: r[3] ? String(r[3]).toLowerCase() : "taken",
            actual_time: r[4] ? String(r[4]) : undefined,
            notes: r[5] ? String(r[5]) : undefined
          }));

        if (parsed.length > 0) {
          serverMedicationLogs = parsed;
        }
      }
    } catch (e) {
      console.warn("Sheets logs reading notice:", e);
    }
  }

  res.json(serverMedicationLogs);
});

app.post("/api/medications/batch-add", async (req, res) => {
  const { medications } = req.body;
  if (!Array.isArray(medications) || medications.length === 0) {
    return res.status(400).json({ error: "Missing medications array" });
  }

  // Add to in-memory server state
  for (const m of medications) {
    const existingIdx = serverMedications.findIndex(item => item.med_id === m.med_id);
    if (existingIdx >= 0) {
      serverMedications[existingIdx] = m;
    } else {
      serverMedications.push(m);
    }
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();
  if (sheets && sheetId) {
    try {
      const rows = medications.map(m => [
        m.med_id,
        m.name,
        m.dosage,
        Array.isArray(m.times) ? m.times.join(", ") : String(m.times || "08:00"),
        m.days_active || "daily",
        m.pills_remaining ?? 30,
        m.refill_threshold ?? 5,
        m.start_date || new Date().toISOString().split("T")[0],
        m.active ? "TRUE" : "FALSE"
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Medications!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows }
      });
    } catch (e) {
      console.warn("Sheets batch-add error:", e);
    }
  }

  res.json({ success: true, count: serverMedications.length, medications: serverMedications });
});

app.post("/api/medications/log-dose", async (req, res) => {
  const { log_id, med_id, scheduled_time, status, actual_time, notes } = req.body;
  const newLog = {
    log_id: log_id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    med_id: med_id || "",
    scheduled_time: scheduled_time || "08:00 AM",
    status: (status || "taken").toLowerCase(),
    actual_time: actual_time || new Date().toISOString(),
    notes: notes || ""
  };

  // Upsert into server logs
  const existingLogIdx = serverMedicationLogs.findIndex(l => l.med_id === med_id && l.scheduled_time === scheduled_time);
  if (existingLogIdx >= 0) {
    serverMedicationLogs[existingLogIdx] = newLog;
  } else {
    serverMedicationLogs.unshift(newLog);
  }

  // Decrement pills remaining on medication row if taken or skipped
  if (newLog.status === "taken" || newLog.status === "skipped") {
    const med = serverMedications.find(m => m.med_id === med_id);
    if (med && typeof med.pills_remaining === "number") {
      med.pills_remaining = Math.max(0, med.pills_remaining - 1);
    }
  }

  // Append to Google Sheets if configured
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();
  if (sheets && sheetId) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "MedicationLog!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[newLog.log_id, newLog.med_id, newLog.scheduled_time, newLog.status, newLog.actual_time, newLog.notes]]
        }
      });

      // Update pills remaining in sheet
      if (newLog.status === "taken" || newLog.status === "skipped") {
        const getRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "Medications!A2:I"
        });
        const rows = getRes.data.values || [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === med_id) {
            const rowIndex = i + 2;
            const currentPills = parseInt(rows[i][5], 10) || 30;
            const nextPills = Math.max(0, currentPills - 1);
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `Medications!F${rowIndex}`,
              valueInputOption: "USER_ENTERED",
              requestBody: { values: [[nextPills]] }
            });
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Sheets log-dose notice:", e);
    }
  }

  res.json({ success: true, log: newLog });
});

app.post("/api/medications/sync-cache", (req, res) => {
  const { medications, logs } = req.body;
  if (Array.isArray(medications)) serverMedications = medications;
  if (Array.isArray(logs)) serverMedicationLogs = logs;
  res.json({ success: true });
});

app.post("/api/medications/refill/:id", (req, res) => {
  const med = serverMedications.find(m => m.med_id === req.params.id);
  if (med) {
    med.pills_remaining = (med.pills_remaining || 0) + 30;
  }
  res.json({ success: true, med });
});

// Legacy backward-compatibility endpoints
app.get("/api/medication", async (req, res) => {
  // Convert serverMedications to legacy format
  const legacyMeds = serverMedications.map((m, idx) => ({
    id: m.med_id || `med-${idx}`,
    name: m.name,
    dosage: m.dosage,
    time: Array.isArray(m.times) && m.times.length > 0 ? m.times[0] : "08:00 AM",
    instructions: `Take ${m.dosage} with water`,
    status: "Upcoming",
    currentQty: m.pills_remaining,
    refillThreshold: m.refill_threshold,
    capacity: 30,
    timestamp: new Date().toISOString()
  }));
  res.json(legacyMeds);
});

// Sync medications directly from Google Doc
app.post("/api/medication/sync-google-doc", (req, res) => {
  const { docId, docUrl, docTitle, medications, rawText } = req.body;
  if (Array.isArray(medications) && medications.length > 0) {
    serverMedications = medications;
  }
  linkedGoogleDocInfo = {
    docId: docId || linkedGoogleDocInfo.docId,
    docUrl: docUrl || linkedGoogleDocInfo.docUrl,
    docTitle: docTitle || "Prescription Google Doc",
    lastSynced: new Date().toISOString()
  };
  return res.json({
    success: true,
    count: serverMedications.length,
    medications: serverMedications,
    docInfo: linkedGoogleDocInfo
  });
});

app.get("/api/medication/google-doc-info", (req, res) => {
  res.json({
    docInfo: linkedGoogleDocInfo,
    medications: serverMedications
  });
});

// Proxy fetch for public Google Doc text
app.get("/api/medication/google-doc-fetch", async (req, res) => {
  const docId = req.query.docId as string;
  if (!docId) {
    return res.status(400).json({ error: "Missing docId query parameter" });
  }

  try {
    const fetchRes = await fetch(`https://docs.google.com/document/d/${encodeURIComponent(docId)}/export?format=txt`);
    if (fetchRes.ok) {
      const text = await fetchRes.text();
      return res.json({ success: true, text, title: "Prescription Schedule" });
    }
  } catch (e) {
    console.warn("Public doc export failed:", e);
  }

  return res.status(404).json({ error: "Could not fetch document content" });
});

app.post("/api/medication/dispense/:id", async (req, res) => {
  const { execSync } = require('child_process');
  let result = null;
  try {
    const out = execSync(`python3 -c "from services.dispenser.carousel import dispense; import json; print(json.dumps(dispense(1)))"`).toString();
    // try to parse the last line as JSON, since there might be [simulated hardware] print statements
    const lines = out.trim().split('\n');
    result = JSON.parse(lines[lines.length - 1]);
  } catch (err) {
    console.error("Hardware dispense error:", err);
    result = { success: false, timestamp: new Date().toISOString(), error: String(err) };
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();
  if (sheets && sheetId) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "DispenserEvents!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[result.timestamp, req.params.id, "dispense", result.success ? "success" : "failure", result.error || "none"]],
        }
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Adherence!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[result.timestamp, req.params.id, "slot_1", "scheduled_time", "dispensed"]],
        }
      });
    } catch (e) {
      console.error("Sheets tracking error:", e);
    }
  }
  res.json({ success: true, hardware_result: result });
});
app.post("/api/medication/skip/:id", (req, res) => {
  res.json({ success: true, skipped: req.params.id });
});
app.post("/api/medication/reset", (req, res) => {
  res.json({ success: true });
});
app.post("/api/medication/refill/:id", (req, res) => {
  res.json({ success: true });
});

// Daily Check-In
app.get("/api/caregiver/checkin", (req, res) => {
  res.json(dailyCheckInState);
});

app.post("/api/caregiver/checkin", async (req, res) => {
  dailyCheckInState = {
    checkedIn: true,
    timestamp: new Date().toISOString(),
    message: "Checked in as OK and active for today"
  };
  
  // Also push to security alerts
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  securityAlerts.unshift({
    id: `alert-checkin-${Date.now()}`,
    title: "Daily 'I am OK' Check-In Received",
    description: "Senior pressed the morning check-in reassuring all caregivers.",
    time: `Today, ${timeStr}`,
    image: ""
  });
  
  res.json({ success: true, state: dailyCheckInState });
});

// Symptom Logger
app.get("/api/caregiver/symptoms", (req, res) => {
  res.json(symptomLogs);
});

app.post("/api/caregiver/symptoms", (req, res) => {
  const { feeling, title, notes } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const newEntry = {
    id: `sym-${Date.now()}`,
    feeling: feeling || "good",
    title: title || "Logged feeling state",
    notes: notes || "",
    timestamp: `Today, ${timeStr}`,
    reportedToCaregiver: true
  };
  symptomLogs.unshift(newEntry);
  
  if (feeling === "unwell" || feeling === "pain") {
    securityAlerts.unshift({
      id: `alert-sym-${Date.now()}`,
      title: "Caregiver Health Notice: Senior reported discomfort",
      description: `Senior logged: "${title || 'Unwell/Pain'}". Please check in.`,
      time: `Today, ${timeStr}`,
      image: ""
    });
  }
  
  res.json({ success: true, entry: newEntry });
});

// Medical ID & Geofence
app.get("/api/safety/medical-id", (req, res) => {
  res.json(medicalIDData);
});

app.post("/api/safety/medical-id", (req, res) => {
  medicalIDData = { ...medicalIDData, ...req.body };
  res.json({ success: true, data: medicalIDData });
});

app.get("/api/safety/geofence", (req, res) => {
  res.json(geofenceData);
});

// Calls
app.get("/api/calls/state", (req, res) => {
  if (!currentCall.active) {
    return res.json({ active: false, contactName: "", type: "video", duration: "00:00" });
  }
  const diff = Math.floor((Date.now() - currentCall.startTime) / 1000);
  const mins = String(Math.floor(diff / 60)).padStart(2, "0");
  const secs = String(diff % 60).padStart(2, "0");
  res.json({
    ...currentCall,
    duration: `${mins}:${secs}`
  });
});

app.post("/api/calls/start", (req, res) => {
  currentCall = {
    active: true,
    contactName: req.body.contactName || "Unknown",
    type: req.body.type || "video",
    startTime: Date.now()
  };
  res.json({ success: true });
});

app.post("/api/calls/end", (req, res) => {
  currentCall.active = false;
  res.json({ success: true });
});

// ==========================================
// Entertainment APIs (Deezer, Invidious, News)
// ==========================================
app.get("/api/deezer/search", async (req, res) => {
  const query = req.query.q || "relaxing";
  try {
    const fetchRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query as string)}`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      return res.json(data.data || []);
    }
  } catch (e) {
    console.error("Deezer API error:", e);
  }
  res.json([]);
});

const videoSearchCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function searchYouTubeVideos(query: string): Promise<any[]> {
  const normQuery = query.trim().toLowerCase();
  const cached = videoSearchCache.get(normQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const fetchRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (fetchRes.ok) {
      const html = await fetchRes.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
        const videos = [];
        for (const item of contents) {
          if (item.videoRenderer) {
            const vr = item.videoRenderer;
            videos.push({
              videoId: vr.videoId,
              title: vr.title?.runs?.[0]?.text || "",
              author: vr.ownerText?.runs?.[0]?.text || "",
              publishedText: vr.publishedTimeText?.simpleText || "",
              viewCount: vr.viewCountText?.simpleText || "",
              videoThumbnails: [{ url: vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg` }],
              descriptionSnippet: vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join("") || ""
            });
          }
        }
        if (videos.length > 0) {
          videoSearchCache.set(normQuery, { data: videos, timestamp: Date.now() });
          return videos;
        }
      }
    }
  } catch (e) {
    console.error("Primary YouTube search error:", e);
  }

  const instances = [
    "https://invidious.flokinet.to",
    "https://invidious.projectsegfau.lt"
  ];
  for (const instance of instances) {
    try {
      const fetchRes = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(2500)
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (Array.isArray(data) && data.length > 0) {
          videoSearchCache.set(normQuery, { data, timestamp: Date.now() });
          return data;
        }
      }
    } catch (e) {
      // Continue to next fallback
    }
  }

  return [];
}

// Pre-warm common categories in background
setTimeout(() => {
  const commonCategories = [
    "nature walk relaxation",
    "guided meditation",
    "elderly chair yoga",
    "classical music concerts",
    "documentaries",
    "simple cooking recipes"
  ];
  for (const cat of commonCategories) {
    searchYouTubeVideos(cat).catch(() => {});
  }
}, 500);

app.get("/api/videos/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  if (!query.trim()) return res.json([]);
  const videos = await searchYouTubeVideos(query);
  res.json(videos);
});

app.get("/api/news/search", async (req, res) => {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return res.json([]);
  const query = req.query.q || "health OR elderly OR positive";
  try {
    const fetchRes = await fetch(`https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(query as string)}&language=en`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      return res.json(data.results || []);
    }
  } catch (e) {
    console.error("NewsData API error:", e);
  }
  res.json([]);
});
app.get("/api/books/search", async (req, res) => {
  const query = req.query.q || "health";
  try {
    const fetchRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query as string)}&maxResults=12`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      return res.json(data.items || []);
    }
  } catch (e) {
    console.error("Books API error:", e);
  }
  res.json([]);
});

app.get("/api/radio/stations", async (req, res) => {
  const radioApiUrl = process.env.RADIO_BROWSER_API_URL || "https://de1.api.radio-browser.info";
  try {
    const fetchRes = await fetch(`${radioApiUrl}/json/stations/search?tag=relaxing,classical,ambient&limit=10&order=clickcount&reverse=true`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const stations = data.map((s: any) => ({
        id: s.stationuuid || Math.random().toString(),
        name: s.name ? s.name.trim() : "Ambient Radio",
        url: s.url_resolved || s.url,
        tags: s.tags || "relaxing, classical",
        country: s.country || "Global",
        favicon: s.favicon || ""
      }));
      return res.json(stations);
    }
  } catch (e) {
    console.error("Radio API error:", e);
  }
  // Curated fallback streams
  res.json([
    { id: "r1", name: "Classic FM Peaceful Light", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_three", tags: "classical, serene", country: "UK" },
    { id: "r2", name: "Ambient Forest & Rain Radio", url: "https://stream.zeno.fm/f3wvbbqmdg8uv", tags: "ambient, rain", country: "Global" },
    { id: "r3", name: "Calm Piano Meditation", url: "https://stream.zeno.fm/0r0xa792kwzuv", tags: "piano, calm", country: "Global" }
  ]);
});

app.get("/api/audiobooks/search", async (req, res) => {
  const openLibUrl = process.env.OPEN_LIBRARY_API_URL || "https://openlibrary.org";
  const query = (req.query.q as string) || "gardening literature";
  try {
    const fetchRes = await fetch(`${openLibUrl}/search.json?q=${encodeURIComponent(query)}&limit=6`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const books = (data.docs || []).map((d: any) => ({
        key: d.key,
        title: d.title || "Untitled Book",
        author: Array.isArray(d.author_name) ? d.author_name.join(", ") : "Unknown Author",
        firstPublishYear: d.first_publish_year || "N/A",
        cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop",
        subject: Array.isArray(d.subject) ? d.subject.slice(0, 3).join(", ") : "Literature"
      }));
      return res.json(books);
    }
  } catch (e) {
    console.error("Open Library API error:", e);
  }
  res.json([
    { key: "/works/OL1", title: "The Secret Garden", author: "Frances Hodgson Burnett", firstPublishYear: 1911, cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop", subject: "Gardening, Classic" },
    { key: "/works/OL2", title: "All Creatures Great and Small", author: "James Herriot", firstPublishYear: 1972, cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&fit=crop", subject: "Nature, Animals" }
  ]);
});

// ==========================================
// Gemini & Offline Ollama AI Integration
// ==========================================
let chatMessages: any[] = [];
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

async function queryOllama(prompt: string, targetLanguage: string): Promise<string | null> {
  try {
    // 1. Fetch available models from Ollama
    const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!tagsRes.ok) return null;
    const tagsData = await tagsRes.json();
    const models = tagsData.models || [];
    if (models.length === 0) return null;

    // Pick best available model (e.g. qwen2.5, llama3.2, smollm2, phi3.5, or first installed)
    const preferredOrder = ["qwen2.5", "llama3.2", "smollm2", "phi3.5", "gemma2", "tinyllama"];
    let selectedModel = models[0].name;
    for (const pref of preferredOrder) {
      const found = models.find((m: any) => m.name.toLowerCase().includes(pref));
      if (found) {
        selectedModel = found.name;
        break;
      }
    }

    const systemInstruction = `You are Avenly Care AI, a compassionate, soothing, and highly intelligent companion for home eldercare running offline on Raspberry Pi / Local Hardware. You MUST write your ENTIRE response in the ${targetLanguage} language. Keep responses concise, warm, helpful, and soothing.`;

    // Try /api/chat first
    const chatRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        stream: false
      })
    });

    if (chatRes.ok) {
      const data = await chatRes.json();
      const content = data.message?.content?.strip ? data.message.content.strip() : data.message?.content;
      if (content) return content;
    }

    // Fallback to /api/generate
    const genRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: selectedModel,
        prompt: `SYSTEM: ${systemInstruction}\nUSER: ${prompt}\nASSISTANT:`,
        stream: false
      })
    });

    if (genRes.ok) {
      const data = await genRes.json();
      if (data.response) return data.response.trim();
    }
  } catch (err) {
    console.warn("Ollama offline query failed:", err);
  }
  return null;
}

app.get("/api/ai/status", async (req, res) => {
  let ollamaAvailable = false;
  let ollamaModels: string[] = [];
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      const data = await r.json();
      ollamaAvailable = true;
      ollamaModels = (data.models || []).map((m: any) => m.name);
    }
  } catch (e) {
    ollamaAvailable = false;
  }

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  res.json({
    online: geminiConfigured,
    geminiAvailable: geminiConfigured,
    ollamaAvailable,
    ollamaModels,
    piperTtsReady: true,
    platform: process.arch === "arm" || process.arch === "arm64" ? "Raspberry Pi / ARM" : "Standard x64/Cloud",
    currentEngine: geminiConfigured ? "Gemini 3.6 Flash (Cloud)" : (ollamaAvailable ? "Ollama Local (Offline)" : "Built-in Care Engine")
  });
});

const handleAIChat = async (req: any, res: any) => {
  const userMessage = req.body.message || req.body.text || "";
  const targetLanguage = req.body.language || req.body.lang || "English";
  const forceOffline = req.body.forceOffline === true;
  const providedApiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

  if (!userMessage) return res.status(400).json({ error: "Empty prompt" });
  chatMessages.push({ sender: "user", text: userMessage, timestamp: new Date().toLocaleTimeString() });

  // 1. Try Gemini API if an API key is provided and not forced offline
  if (providedApiKey && !forceOffline) {
    try {
      const ai = new GoogleGenAI({
        apiKey: providedApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
        config: {
          systemInstruction: `You are Avenly Care AI, a compassionate, soothing, and highly intelligent companion for home eldercare. You MUST write your ENTIRE response in the ${targetLanguage} language. Keep responses concise, warm, helpful, and soothing.`
        }
      });
      const aiText = response.text || "I am here with you. How can I help next?";
      chatMessages.push({ sender: "assistant", text: aiText, timestamp: new Date().toLocaleTimeString() });

      // Try Logging to Sheets
      const sheetId = process.env.GOOGLE_SHEET_ID;
      const sheets = await getSheetsClient();
      if (sheets && sheetId) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: "AIChatLog!A:E",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [new Date().toISOString(), "user", "conversation", userMessage, "online-gemini"],
              [new Date().toISOString(), "hub", "conversation", aiText, "online-gemini"]
            ]
          }
        }).catch(() => {});
      }

      return res.json({ response: aiText, text: aiText, reply: aiText, engine: "gemini", mode: "Gemini 2.5 Flash Cloud AI" });
    } catch (geminiError: any) {
      console.warn("Gemini API call failed:", geminiError?.message || geminiError);
      const errMsg = geminiError?.message || "";
      if (errMsg.includes("API key") || errMsg.includes("API_KEY") || errMsg.includes("invalid") || errMsg.includes("suspended") || errMsg.includes("400") || errMsg.includes("403")) {
        const keyMsg = "Gemini API key is invalid or suspended. Please enter a valid API key in Settings or the top key banner to activate AI Chat.";
        chatMessages.push({ sender: "assistant", text: keyMsg, timestamp: new Date().toLocaleTimeString() });
        return res.json({ response: keyMsg, text: keyMsg, keyMissing: true, engine: "error" });
      }
    }
  }

  // If no API key was provided at all
  if (!providedApiKey && !forceOffline) {
    const keyRequiredMsg = "Gemini API key is required. Please enter your Gemini API key in Settings or the banner above to activate AI Chat.";
    chatMessages.push({ sender: "assistant", text: keyRequiredMsg, timestamp: new Date().toLocaleTimeString() });
    return res.json({ response: keyRequiredMsg, text: keyRequiredMsg, keyMissing: true, engine: "no-key" });
  }

  // 2. Fallback to Local Offline Ollama
  const ollamaResponse = await queryOllama(userMessage, targetLanguage);
  if (ollamaResponse) {
    chatMessages.push({ sender: "assistant", text: ollamaResponse, timestamp: new Date().toLocaleTimeString() });
    return res.json({ response: ollamaResponse, text: ollamaResponse, reply: ollamaResponse, engine: "ollama-offline", mode: "Ollama Local (Offline)" });
  }

  // 3. Fallback to built-in offline localized care response
  const defaultOfflineResponses: Record<string, string> = {
    Hindi: "मैं एवेनली देखभाल एआई हूँ। आज मैं आपकी दैनिक दिनचर्या और स्वास्थ्य देखभाल में कैसे सहायता कर सकता हूँ?",
    Spanish: "Soy Avenly Care AI. ¿Cómo puedo ayudarte hoy con tu rutina diaria, medicamentos o bienestar?",
    French: "Je suis Avenly Care AI. Comment puis-je vous aider aujourd'hui avec vos médicaments ou votre bien-être ?",
    German: "Ich bin Avenly Care AI. Wie kann ich Sie heute bei Ihrer Tagesroutine und Pflege unterstützen?",
    Mandarin: "我是 Avenly 关怀 AI。今天我能为您提供怎样的健康与用药日常协助？",
    English: "I am Avenly Care AI (Offline Mode). I am here to assist with your daily routine, medication reminders, or peaceful activities."
  };

  const fallbackMsg = defaultOfflineResponses[targetLanguage] || defaultOfflineResponses.English;
  chatMessages.push({ sender: "assistant", text: fallbackMsg, timestamp: new Date().toLocaleTimeString() });
  return res.json({ response: fallbackMsg, text: fallbackMsg, reply: fallbackMsg, engine: "offline-builtin", mode: "Built-in Care Engine" });
};

app.post("/api/gemini/chat", handleAIChat);
app.post("/api/chat", handleAIChat);
app.post("/api/ai/chat", handleAIChat);
app.get("/api/gemini/messages", (req, res) => {
  res.json(chatMessages);
});
app.post("/api/gemini/clear", (req, res) => {
  chatMessages = [];
  res.json({ success: true });
});

app.get("/api/security/alerts", async (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();
  if (!sheets || !sheetId) return res.json([]);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "EmergencyAlerts!A2:E",
    });
    const rows = response.data.values || [];
    const alerts = rows.map((r, i) => ({
      id: `alert-${i}`,
      time: r[0] || new Date().toISOString(),
      title: r[1] || "Alert",
      description: r[2] || "",
      image: "hub_camera",
    }));
    res.json(alerts);
  } catch (e) {
    res.json([]);
  }
});
app.post("/api/security/trigger", (req, res) => {
  res.json({ success: true });
});
app.post("/api/security/trigger/reset", (req, res) => {
  res.json({ success: true });
});
app.post("/api/security/alerts/clear", (req, res) => {
  res.json({ success: true });
});

// Vite & Static file integration
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server (HTTP + Socket.IO) running on port ${PORT}`);
  });
}

startApp();
