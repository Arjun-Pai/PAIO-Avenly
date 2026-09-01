const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  `\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J\``,
  `\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Health!A2:J?_cb=\${Date.now()}\``
);

fs.writeFileSync('src/lib/workspace.ts', code);
