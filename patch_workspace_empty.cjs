const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

function fixEmpty(field, defaultVal) {
  return `(lastRow[${field}] && String(lastRow[${field}]).trim() !== "" && lastRow[${field}] !== "N/A") ? (isNaN(Number(lastRow[${field}])) ? lastRow[${field}] : Number(lastRow[${field}])) : ${defaultVal}`;
}

code = code.replace(
  `const heartRate = lastRow[1] && lastRow[1] !== "N/A" ? (isNaN(Number(lastRow[1])) ? lastRow[1] : Number(lastRow[1])) : 72;`,
  `const heartRate = ${fixEmpty(1, 72)};`
);

code = code.replace(
  `const bloodOxygen = lastRow[2] && lastRow[2] !== "N/A" ? (isNaN(Number(lastRow[2])) ? lastRow[2] : Number(lastRow[2])) : 98;`,
  `const bloodOxygen = ${fixEmpty(2, 98)};`
);

code = code.replace(
  `const skinTemperature = lastRow[3] && lastRow[3] !== "N/A" ? (isNaN(Number(lastRow[3])) ? lastRow[3] : Number(lastRow[3])) : 36.7;`,
  `const skinTemperature = ${fixEmpty(3, 36.7)};`
);

code = code.replace(
  `const steps = lastRow[4] && lastRow[4] !== "N/A" ? (isNaN(Number(lastRow[4])) ? lastRow[4] : Number(lastRow[4])) : 4280;`,
  `const steps = ${fixEmpty(4, 4280)};`
);

code = code.replace(
  `const sleepHours = lastRow[7] && lastRow[7] !== "N/A" ? lastRow[7] : "7.5";`,
  `const sleepHours = (lastRow[7] && String(lastRow[7]).trim() !== "" && lastRow[7] !== "N/A") ? lastRow[7] : "7.5";`
);

code = code.replace(
  `const hydration = lastRow[8] && lastRow[8] !== "N/A" ? (isNaN(Number(lastRow[8])) ? lastRow[8] : Number(lastRow[8])) : 1.8;`,
  `const hydration = ${fixEmpty(8, 1.8)};`
);

code = code.replace(
  `const mood = lastRow[9] && lastRow[9] !== "N/A" ? lastRow[9] : "Calm & Cheerful";`,
  `const mood = (lastRow[9] && String(lastRow[9]).trim() !== "" && lastRow[9] !== "N/A") ? lastRow[9] : "Calm & Cheerful";`
);

fs.writeFileSync('src/lib/workspace.ts', code);
