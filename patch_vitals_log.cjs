const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `const fetchVitals = async () => {
    try {
      let data;`,
  `const fetchVitals = async () => {
    console.log("Fetching latest vitals at", new Date().toLocaleTimeString());
    try {
      let data;`
);

fs.writeFileSync('src/App.tsx', code);
