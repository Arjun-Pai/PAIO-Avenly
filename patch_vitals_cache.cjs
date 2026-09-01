const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `const res = await fetch("/api/vitals");`,
  `const res = await fetch("/api/vitals", { cache: 'no-store' });`
);

fs.writeFileSync('src/App.tsx', code);
