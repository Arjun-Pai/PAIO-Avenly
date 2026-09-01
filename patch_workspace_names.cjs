const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf8');

code = code.replace(
  `const spaces = spacesData.spaces || [];
    return spaces.map((s: any) => ({
      id: s.name,
      name: s.displayName || (s.spaceType === "DIRECT_MESSAGE" ? "Direct Message" : "Unnamed Space")
    }));`,
  `const spaces = spacesData.spaces || [];
    const formattedSpaces = await Promise.all(spaces.map(async (s: any) => {
      let name = s.displayName;
      if (!name && s.spaceType === "DIRECT_MESSAGE") {
        try {
           const memRes = await fetch(\`https://chat.googleapis.com/v1/\${s.name}/members\`, {
              headers: { Authorization: \`Bearer \${token}\` }
           });
           if (memRes.ok) {
               const memData = await memRes.json();
               const members = memData.memberships || [];
               const otherMember = members.find((m: any) => m.member?.type === "HUMAN" && m.member?.displayName);
               if (otherMember) {
                   name = otherMember.member.displayName;
               }
           }
        } catch(e) { }
      }
      return {
        id: s.name,
        name: name || (s.spaceType === "DIRECT_MESSAGE" ? "Direct Message" : "Unnamed Space")
      };
    }));
    return formattedSpaces;`
);

code = code.replace(
  `// Resolve user details using People API if missing`,
  `// Resolve user details using People API or Chat Members API if missing`
);

code = code.replace(
  `      if (!senderName && msg.sender?.name) {
        // ID looks like users/12345
        const personId = msg.sender.name.replace('users/', 'people/');
        try {
          const personRes = await fetch(\`https://people.googleapis.com/v1/\${personId}?personFields=names,photos\`, {
            headers: { Authorization: \`Bearer \${token}\` }
          });
          if (personRes.ok) {
            const personData = await personRes.json();
            if (personData.names && personData.names.length > 0) {
              senderName = personData.names[0].displayName;
            }
            if (!avatar && personData.photos && personData.photos.length > 0) {
              avatar = personData.photos[0].url;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch person info", e);
        }
      }`,
  `      if (!senderName && msg.sender?.name) {
        // ID looks like users/12345
        try {
          // 1. Try Chat Members API first if we have the space name
          const spaceName = msg.space?.name || msg.name?.split('/messages/')[0] || spaceId;
          if (spaceName) {
            const memberId = msg.sender.name.replace('users/', '');
            const memberRes = await fetch(\`https://chat.googleapis.com/v1/\${spaceName}/members/\${memberId}\`, {
              headers: { Authorization: \`Bearer \${token}\` }
            });
            if (memberRes.ok) {
              const memberData = await memberRes.json();
              if (memberData.member?.displayName) {
                senderName = memberData.member.displayName;
                avatar = avatar || memberData.member.avatarUrl;
              }
            }
          }
          
          // 2. Fallback to People API
          if (!senderName) {
            const personId = msg.sender.name.replace('users/', 'people/');
            const personRes = await fetch(\`https://people.googleapis.com/v1/\${personId}?personFields=names,photos\`, {
              headers: { Authorization: \`Bearer \${token}\` }
            });
            if (personRes.ok) {
              const personData = await personRes.json();
              if (personData.names && personData.names.length > 0) {
                senderName = personData.names[0].displayName;
              }
              if (!avatar && personData.photos && personData.photos.length > 0) {
                avatar = personData.photos[0].url;
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch person info", e);
        }
      }`
);

code = code.replace(
  `         if (idStr.includes("1783") || idStr.includes("117337433769768236745")) {
             senderName = "Sinatra";
         } else if (idStr.includes("100151737644853489000")) {
             senderName = "Arjun";
         }`,
  `         if (idStr.includes("1783") || idStr.includes("117337433769768236745")) {
             senderName = "Sinatra";
         } else if (idStr.includes("100151737644853489000")) {
             senderName = "Arjun";
         } else if (idStr.includes("1082")) {
             senderName = "Family Member";
         }`
);

code = code.replace(
  `      const attachments = msg.attachment ? msg.attachment.map((a: any) => ({
         name: a.attachmentDataRef?.attachmentDataRef || "File",
         contentType: a.contentType || "",
         url: a.downloadUri || ""
      })) : [];`,
  `      const attachments = msg.attachment ? msg.attachment.map((a: any) => ({
         name: a.contentName || a.attachmentDataRef?.attachmentDataRef || "File",
         contentType: a.contentType || "",
         url: a.thumbnailUri || a.downloadUri || a.driveDataRef?.driveFileId || ""
      })) : [];`
);

fs.writeFileSync('src/lib/workspace.ts', code);
