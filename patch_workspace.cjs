const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  "export async function fetchGoogleChatMessages(): Promise<{ sender: string; text: string; time: string; avatar?: string }[]> {",
  `export async function fetchGoogleChatSpaces(): Promise<{ id: string; name: string }[]> {
  try {
    const token = await ensureGoogleAccessToken();
    if (!token) return [];
    const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: \`Bearer \${token}\` },
    });
    if (!spacesRes.ok) return [];
    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];
    return spaces.map((s: any) => ({
      id: s.name,
      name: s.displayName || (s.spaceType === "DIRECT_MESSAGE" ? "Direct Message" : "Unnamed Space")
    }));
  } catch (err) {
    console.warn("fetchGoogleChatSpaces error:", err);
    return [];
  }
}

export async function fetchGoogleChatMessages(spaceId?: string): Promise<{ sender: string; text: string; time: string; avatar?: string; attachments?: any[] }[]> {`
);

code = code.replace(
  "// Fetch messages from up to 3 spaces to ensure we find chats",
  `// Fetch messages from up to 3 spaces to ensure we find chats
    const spacesToFetch = spaceId ? [{ name: spaceId }] : spaces.slice(0, 3);`
);

code = code.replace(
  "for (const space of spaces.slice(0, 3)) {",
  "for (const space of spacesToFetch) {"
);

code = code.replace(
  "senderName = idStr ? `User ${idStr.substring(0, 4)}` : \"Member\";",
  `senderName = idStr ? \`User \${idStr.substring(0, 4)}\` : "Member";
         if (idStr.includes("1783") || idStr.includes("117337433769768236745")) {
             senderName = "Sinatra";
         } else if (idStr.includes("100151737644853489000")) {
             senderName = "Arjun";
         }`
);

code = code.replace(
  "return { sender: senderName, text, time, avatar };",
  `
      const attachments = msg.attachment ? msg.attachment.map((a: any) => ({
         name: a.attachmentDataRef?.attachmentDataRef || "File",
         contentType: a.contentType || "",
         url: a.downloadUri || ""
      })) : [];
      return { sender: senderName, text, time, avatar, attachments };`
);

code = code.replace(
  "export async function sendGoogleChatMessage(text: string): Promise<any> {",
  "export async function sendGoogleChatMessage(text: string, spaceId?: string): Promise<any> {"
);

code = code.replace(
  "let firstSpace = spacesData.spaces?.[0]?.name;",
  "let firstSpace = spaceId || spacesData.spaces?.[0]?.name;"
);

fs.writeFileSync('src/lib/workspace.ts', code);
