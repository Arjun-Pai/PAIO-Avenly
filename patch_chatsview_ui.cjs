const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

// Fix message send mocking refresh
code = code.replace(
  `      // Refresh chats in background
      setTimeout(loadPreviousChats, 1000);`,
  `      // Only refresh if it wasn't mocked, otherwise it will vanish since it's not actually in Google Chat
      if (!result?.mocked) {
        setTimeout(loadPreviousChats, 1000);
      }`
);

// Fix attachment rendering
code = code.replace(
  `{msg.attachments.map((att: any, i: number) => (
                        <div key={i} className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded text-[10px] text-zinc-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          <span>{att.name || "Attachment"}</span>
                        </div>
                      ))}`,
  `{msg.attachments.map((att: any, i: number) => {
                        const isImg = att.contentType?.startsWith('image/');
                        const isVideo = att.contentType?.startsWith('video/');
                        return (
                          <div key={i} className="rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/50">
                            {isImg ? (
                              <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] object-cover" referrerPolicy="no-referrer" />
                            ) : isVideo ? (
                              <video src={att.url} controls className="max-w-[200px] max-h-[200px]" />
                            ) : (
                              <div className="px-2 py-1 text-[10px] text-zinc-400 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                <span>{att.name || "Attachment"}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}`
);

fs.writeFileSync('src/components/ChatsView.tsx', code);
