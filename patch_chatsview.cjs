const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

code = code.replace(
  "import { sendGoogleChatMessage, fetchGoogleChatMessages } from \"../lib/workspace\";",
  "import { sendGoogleChatMessage, fetchGoogleChatMessages, fetchGoogleChatSpaces } from \"../lib/workspace\";\nimport { Paperclip, Smile } from \"lucide-react\";"
);

code = code.replace(
  "const [fetchingChats, setFetchingChats] = useState(false);",
  "const [fetchingChats, setFetchingChats] = useState(false);\n  const [spaces, setSpaces] = useState<{id: string, name: string}[]>([]);\n  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);"
);

code = code.replace(
  "  useEffect(() => {\n    loadPreviousChats();\n  }, []);",
  `  useEffect(() => {
    const init = async () => {
      setFetchingChats(true);
      const fetchedSpaces = await fetchGoogleChatSpaces();
      setSpaces(fetchedSpaces);
      if (fetchedSpaces.length > 0) {
        setSelectedSpaceId(fetchedSpaces[0].id);
      }
      setFetchingChats(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedSpaceId) {
      loadPreviousChats();
    }
  }, [selectedSpaceId]);`
);

code = code.replace(
  "const msgs = await fetchGoogleChatMessages();",
  "const msgs = await fetchGoogleChatMessages(selectedSpaceId || undefined);"
);

code = code.replace(
  "await sendGoogleChatMessage(chatMessage);",
  "await sendGoogleChatMessage(chatMessage, selectedSpaceId || undefined);"
);

code = code.replace(
  "<div className=\"flex items-center gap-3\">",
  `<div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider font-mono">{t.careCircleChats}</span>
              {spaces.length > 0 ? (
                <select 
                  value={selectedSpaceId || ''} 
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="bg-transparent text-xl font-bold font-display text-zinc-100 outline-none appearance-none border-b border-dashed border-zinc-700 pb-0.5 cursor-pointer"
                >
                  {spaces.map(s => (
                    <option key={s.id} value={s.id} className="bg-zinc-900 text-sm">{s.name}</option>
                  ))}
                </select>
              ) : (
                <h2 className="text-xl font-bold font-display text-zinc-100">{t.careCircleChats}</h2>
              )}
            </div>
          </div>
          {/* hidden original div to avoid syntax errors */}
          <div className="hidden">`
);

code = code.replace(
  "<div className=\"flex items-center justify-between border-b border-zinc-900 pb-4 mb-4\">",
  `<div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">`
);

// We need to add the hidden div closer safely.
// Let's replace the whole header instead of hacking it.
