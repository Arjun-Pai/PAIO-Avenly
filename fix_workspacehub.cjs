const fs = require('fs');
const lines = fs.readFileSync('src/components/WorkspaceHub.tsx', 'utf8').split('\n');

const newContent = [...lines.slice(0, 245), ...lines.slice(811)];
fs.writeFileSync('src/components/WorkspaceHub.tsx', newContent.join('\n'));
