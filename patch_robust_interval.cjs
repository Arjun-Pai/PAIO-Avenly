const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We will use a ref to hold the latest fetchVitals
code = code.replace(
  `  const socketRef = useRef<any>(null);`,
  `  const socketRef = useRef<any>(null);\n  const fetchVitalsRef = useRef<any>(null);`
);

code = code.replace(
  `  const fetchVitals = async () => {`,
  `  const fetchVitals = async () => {`
);

// We need to update the ref
code = code.replace(
  `  const fetchVitals = async () => {
    console.log("Fetching latest vitals at", new Date().toLocaleTimeString());`,
  `  const fetchVitals = async () => {
    console.log("Fetching latest vitals at", new Date().toLocaleTimeString());`
);

// actually let's just do an effect for the interval
code = code.replace(
  `    // Dynamic vitals fluctuator
    const vitalInterval = setInterval(() => {
      fetchVitals();
    }, 5000);`,
  `    // Moved vitalInterval to a separate useEffect`
);

code = code.replace(
  `      clearInterval(vitalInterval);`,
  ``
);

code = code.replace(
  `  const fetchVitals = async () => {`,
  `  useEffect(() => {
    fetchVitalsRef.current = fetchVitals;
  });

  useEffect(() => {
    const vitalInterval = setInterval(() => {
      if (fetchVitalsRef.current) fetchVitalsRef.current();
    }, 5000);
    return () => clearInterval(vitalInterval);
  }, []);

  const fetchVitals = async () => {`
);

fs.writeFileSync('src/App.tsx', code);
