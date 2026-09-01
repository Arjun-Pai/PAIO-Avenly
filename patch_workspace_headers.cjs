const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  `headers: { Authorization: \`Bearer \${token}\` },`,
  `headers: { 
          Authorization: \`Bearer \${token}\`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },`
);

fs.writeFileSync('src/lib/workspace.ts', code);
