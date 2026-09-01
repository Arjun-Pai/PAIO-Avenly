const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  `    const res = await fetch(
      \`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J\`,
      { headers: { Authorization: \`Bearer \${token}\` } }
    );`,
  `    const res = await fetch(
      \`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J\`,
      { 
        headers: { Authorization: \`Bearer \${token}\` },
        cache: 'no-store'
      }
    );`
);

fs.writeFileSync('src/lib/workspace.ts', code);
