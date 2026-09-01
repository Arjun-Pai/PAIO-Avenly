const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const sheetId = process\.env\.GOOGLE_SHEET_ID;/;
code = code.replace(regex, `const sheetId = "1MDfS3rprPhYE4gCcJvgvnmNROYJym3JIkUPm7pqAexA";`);

fs.writeFileSync('server.ts', code);
