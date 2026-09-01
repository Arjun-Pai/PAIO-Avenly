const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  `    const data = await res.json();
    const rows = data.values;
    if (!rows || rows.length === 0) return null;

    const lastRow = rows[rows.length - 1];`,
  `    const data = await res.json();
    const rows = data.values;
    if (!rows || rows.length === 0) return null;

    // Filter out truly empty rows
    const validRows = rows.filter(r => r && r.length > 0 && r.some(cell => cell && cell.trim() !== ""));
    if (validRows.length === 0) return null;
    
    const lastRow = validRows[validRows.length - 1];`
);

code = code.replace(
  `\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J?_cb=\${Date.now()}\``,
  `\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J?_cb=\${Date.now()}&_r=\${Math.random()}\``
);

code = code.replace(
  `cache: 'no-store'`,
  `cache: 'no-store', pragma: 'no-cache'`
);

fs.writeFileSync('src/lib/workspace.ts', code);
