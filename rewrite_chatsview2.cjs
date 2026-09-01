const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

code = code.replace(
  "import { sendGoogleChatMessage, fetchGoogleChatMessages } from \"../lib/workspace\";",
  "import { sendGoogleChatMessage, fetchGoogleChatMessages, fetchGoogleChatSpaces } from \"../lib/workspace\";\nimport { Paperclip, Smile } from \"lucide-react\";"
);

fs.writeFileSync('src/components/ChatsView.tsx', code);
