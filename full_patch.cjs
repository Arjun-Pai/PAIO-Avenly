const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

code = code.replace(
  `const [fetchingChats, setFetchingChats] = useState(false);`,
  `const [fetchingChats, setFetchingChats] = useState(false);
  const [spaces, setSpaces] = useState<{id: string, name: string}[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);`
);

code = code.replace(
  `  useEffect(() => {
    loadPreviousChats();
  }, []);`,
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
  `<h2 className="text-xl font-bold font-display text-zinc-100">{t.careCircleChats}</h2>`,
  `{spaces.length > 0 ? (
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
              )}`
);

fs.writeFileSync('src/components/ChatsView.tsx', code);
