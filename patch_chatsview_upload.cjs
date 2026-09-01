const fs = require('fs');
let code = fs.readFileSync('src/components/ChatsView.tsx', 'utf8');

code = code.replace(
  `const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);`,
  `const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);`
);

code = code.replace(
  `setChatMessage("");`,
  `setChatMessage("");
      setSelectedFile(null);`
);

code = code.replace(
  `<button type="button" className="text-zinc-500 hover:text-purple-400 p-1">
             <Paperclip className="w-5 h-5" />
          </button>`,
  `<input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button 
            type="button" 
            className={\`p-1 transition-colors \${selectedFile ? 'text-purple-400' : 'text-zinc-500 hover:text-purple-400'}\`}
            onClick={() => fileInputRef.current?.click()}
            title={selectedFile ? selectedFile.name : "Attach file"}
          >
             <Paperclip className="w-5 h-5" />
          </button>`
);

fs.writeFileSync('src/components/ChatsView.tsx', code);
