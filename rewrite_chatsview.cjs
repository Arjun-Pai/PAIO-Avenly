const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

// Fix the hidden div issue
code = code.replace(
  `{/* hidden original div to avoid syntax errors */}
          <div className="hidden">
            <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider font-mono">{t.careCircleChats}</span>
              <h2 className="text-xl font-bold font-display text-zinc-100">{t.careCircleChats}</h2>
            </div>
          </div>`,
  ``
);

code = code.replace(
  `<form onSubmit={handleSendChatMessage} className="flex gap-2">`,
  `<form onSubmit={handleSendChatMessage} className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-2 pr-2 pl-4 focus-within:border-purple-500 transition-all">
          <button type="button" className="text-zinc-500 hover:text-purple-400 p-1">
             <Paperclip className="w-5 h-5" />
          </button>
          <button type="button" className="text-zinc-500 hover:text-purple-400 p-1 mr-2">
             <Smile className="w-5 h-5" />
          </button>`
);

code = code.replace(
  `className="flex-1 bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-xs text-white outline-none focus:border-purple-500 transition-all"`,
  `className="flex-1 bg-transparent py-2 text-xs text-white outline-none"`
);

code = code.replace(
  `{msg.text}`,
  `{msg.text}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any, i: number) => (
                        <div key={i} className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded text-[10px] text-zinc-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          <span>{att.name || "Attachment"}</span>
                        </div>
                      ))}
                    </div>
                  )}`
);

fs.writeFileSync('src/components/ChatsView.tsx', code);
