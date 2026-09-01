const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `      setVitals(data);
      if (data.batteryPercentage) {`,
  `      setVitals(prev => ({ ...prev, ...data }));
      if (data.batteryPercentage) {`
);

fs.writeFileSync('src/App.tsx', code);
