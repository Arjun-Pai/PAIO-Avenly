const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the /api/vitals logic to average values and handle "stale" data
const vitalsApiRegex = /app\.get\("\/api\/vitals", async \(req, res\) => \{([\s\S]*?)\}\);\n\napp\.post\("\/api\/vitals\/trigger-fall/m;

const newVitalsApi = `app.get("/api/vitals", async (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = await getSheetsClient();
  
  const defaultVitals = {
    heartRate: "N/A",
    skinTemperature: "N/A",
    bloodOxygen: "N/A",
    bloodPressure: "N/A",
    hydration: "N/A",
    sleep: "N/A",
    sleepHours: "N/A",
    batteryPercentage: "98%",
    steps: "N/A",
    distance: "N/A",
    calories: "N/A",
    mood: "N/A",
    overallScore: "N/A",
    isFallDetected: false,
    blynkConfigured: true,
    isStale: false
  };

  if (!sheets || !sheetId) {
    return res.json(defaultVitals);
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Health!A2:J",
    });
    const rows = response.data.values;
    if (rows && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      
      const heartRate = lastRow[1] || "N/A";
      const bloodOxygen = lastRow[2] || "N/A";
      const skinTemperature = lastRow[3] || "N/A";
      const steps = lastRow[4] || "N/A";
      const sleepHours = lastRow[7] || "N/A";
      const hydration = lastRow[8] || "N/A";
      const mood = lastRow[9] || "N/A";
      
      const hrNum = parseFloat(heartRate) || 0;
      const spo2Num = parseFloat(bloodOxygen) || 0;
      const tempNum = parseFloat(skinTemperature) || 0;
      let scoreNum = 0;
      let count = 0;
      if (hrNum) { scoreNum += hrNum; count++; }
      if (spo2Num) { scoreNum += spo2Num; count++; }
      if (tempNum) { scoreNum += tempNum; count++; }
      
      const overallScore = count > 0 ? Math.round(scoreNum / count).toString() : "N/A";
      
      // Check timestamp to determine staleness
      let isStale = false;
      const timestamp = lastRow[0];
      if (timestamp) {
        const rowTime = new Date(timestamp).getTime();
        const now = new Date().getTime();
        // If older than 24 hours (86400000 ms), consider it stale
        if (now - rowTime > 86400000) {
          isStale = true;
        }
      } else {
        isStale = true; // No timestamp = stale
      }

      return res.json({
        heartRate,
        bloodOxygen,
        skinTemperature,
        steps,
        sleepHours,
        sleep: sleepHours !== "N/A" ? \`\${sleepHours} hrs Restful\` : "N/A",
        hydration,
        mood,
        overallScore,
        isFallDetected: false,
        isStale
      });
    }
    return res.json(defaultVitals);
  } catch (error) {
    console.error("Sheets error:", error);
    return res.json(defaultVitals);
  }
});

app.post("/api/vitals/trigger-fall`;

code = code.replace(vitalsApiRegex, newVitalsApi);
fs.writeFileSync('server.ts', code);
