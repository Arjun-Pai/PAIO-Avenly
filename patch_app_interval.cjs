const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `    // Dynamic vitals fluctuator
    const vitalInterval = setInterval(fetchVitals, 5000);`,
  `    // Dynamic vitals fluctuator
    const vitalInterval = setInterval(() => {
      fetchVitals();
    }, 5000);`
);

fs.writeFileSync('src/App.tsx', code);
