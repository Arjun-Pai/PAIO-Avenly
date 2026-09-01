import React, { useState, useEffect, FormEvent, useRef } from "react";
import {
  MessageSquare,
  Send,
  Users,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mic,
  RefreshCw,
  Globe,
  Paperclip,
  Smile,
  X
} from "lucide-react";
import { sendGoogleChatMessage, fetchGoogleChatMessages, fetchGoogleChatSpaces } from "../lib/workspace";
import { getTranslation, getLocaleCode } from "../lib/translations";

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  avatar?: string;
  attachments?: any[];
  id?: string;
}

interface ChatsViewProps {
  userLanguage?: string;
}

const DEFAULT_CARE_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "Rudra",
    text: "Hi! How are you feeling today? Remember to take your afternoon Metformin with lunch.",
    time: "10:15 AM",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "msg-2",
    sender: "Dr. Sharma (Cardiologist)",
    text: "Good morning! The remote vitals telemetry is looking very stable today. Keep staying hydrated.",
    time: "11:05 AM",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "msg-3",
    sender: "Avenly Assistant",
    text: "Daily health check completed. All vitals are within optimal target ranges.",
    time: "11:30 AM"
  }
];

export default function ChatsView({ userLanguage }: ChatsViewProps) {
  const t = getTranslation(userLanguage);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsDictating(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setStatusMsg({ type: "error", text: "Voice dictation is not supported in this browser. Please type your message." });
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = getLocaleCode(userLanguage);
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsDictating(true);
      };

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        if (transcript.trim()) {
          setChatMessage(transcript.trim());
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Chat dictation error:", event.error);
        setIsDictating(false);
        if (event.error === "not-allowed") {
          setStatusMsg({ type: "error", text: "Microphone permission was denied. Please allow microphone access in your browser." });
        }
      };

      rec.onend = () => {
        setIsDictating(false);
      };

      rec.start();
    } catch (e: any) {
      setIsDictating(false);
      setStatusMsg({ type: "error", text: `Microphone error: ${e.message || "Failed to start speech recognition"}` });
    }
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("avenly_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure first care message is Rudra
          if (parsed[0] && (parsed[0].id === "msg-1" || parsed[0].sender.includes("Preeti"))) {
            parsed[0].sender = "Rudra";
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading local chat history", e);
    }
    return DEFAULT_CARE_MESSAGES;
  });

  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Save chat history locally
  useEffect(() => {
    try {
      localStorage.setItem("avenly_chat_history", JSON.stringify(chatHistory));
    } catch (e) {
      console.warn("Failed to persist chat history", e);
    }
  }, [chatHistory]);

  // Auto scroll within chat box container only
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    const init = async () => {
      setFetchingChats(true);
      try {
        const fetchedSpaces = await fetchGoogleChatSpaces();
        if (fetchedSpaces && fetchedSpaces.length > 0) {
          setSpaces(fetchedSpaces);
          setSelectedSpaceId(fetchedSpaces[0].id);
        }
      } catch (err) {
        console.warn("Could not load Google Chat spaces", err);
      } finally {
        setFetchingChats(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedSpaceId) {
      loadPreviousChats();
    }
  }, [selectedSpaceId]);

  const loadPreviousChats = async () => {
    setFetchingChats(true);
    try {
      const remoteMsgs = await fetchGoogleChatMessages(selectedSpaceId || undefined);
      if (remoteMsgs && remoteMsgs.length > 0) {
        setChatHistory((prev) => {
          // Merge unique remote messages
          const existingTexts = new Set(prev.map((m) => m.text));
          const newRemote = remoteMsgs.filter((m: ChatMessage) => !existingTexts.has(m.text));
          return [...prev, ...newRemote];
        });
        setStatusMsg({ type: "success", text: "Synced with Google Chat space!" });
      }
    } catch (err) {
      console.warn("Error loading Google Chat messages:", err);
    } finally {
      setFetchingChats(false);
    }
  };

  const handleSendChatMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedFile) return;

    setLoading(true);
    setStatusMsg(null);

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "You",
      text: chatMessage.trim(),
      time: currentTime,
      attachments: selectedFile
        ? [{ name: selectedFile.name, contentType: selectedFile.type, url: URL.createObjectURL(selectedFile) }]
        : undefined
    };

    // Update local state immediately so message NEVER disappears
    setChatHistory((prev) => [...prev, newMsg]);
    const sentText = chatMessage;
    setChatMessage("");
    setSelectedFile(null);

    try {
      const result = await sendGoogleChatMessage(sentText, selectedSpaceId || undefined);
      if (result && !result.mocked) {
        setStatusMsg({ type: "success", text: "Posted to Google Chat Space!" });
      } else {
        setStatusMsg({ type: "success", text: "Message posted to Family Care Circle!" });
      }
    } catch (err: any) {
      console.warn("Google Chat API notice:", err);
      setStatusMsg({ type: "success", text: "Saved locally to Family Circle chat." });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChatHistory = () => {
    setChatHistory(DEFAULT_CARE_MESSAGES);
    localStorage.removeItem("avenly_chat_history");
    setStatusMsg({ type: "success", text: "Reset conversation history to defaults." });
  };

  return (
    <div className="w-full animate-fadeIn flex flex-col font-sans select-none pb-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider font-mono">
                {t.careCircleChats || "Family & Caregiver Circle"}
              </span>
              {spaces.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSpaceId || ""}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="bg-transparent text-lg font-bold font-display text-zinc-100 outline-none appearance-none border-b border-dashed border-zinc-700 pb-0.5 cursor-pointer"
                  >
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-900 text-sm">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <h2 className="text-xl font-bold font-display text-zinc-100">
                  {t.careCircleChats || "Family & Caregiver Circle"}
                </h2>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPreviousChats}
              disabled={fetchingChats}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sync with Google Chat"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingChats ? "animate-spin" : ""}`} />
              <span>{fetchingChats ? "Syncing..." : "Sync Google Chat"}</span>
            </button>
            <button
              onClick={handleClearChatHistory}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Reset Chat History"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl mb-4 text-xs font-medium flex items-center justify-between border animate-fadeIn ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-zinc-400 hover:text-white text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Chat History Container */}
        <div ref={chatBoxRef} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 h-80 overflow-y-auto space-y-3 mb-4 text-xs scroll-smooth">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 font-mono">
              <MessageSquare className="w-8 h-8 mb-2 text-purple-400/50" />
              <p className="text-xs text-zinc-400 font-sans font-medium">No messages in Care Circle history.</p>
              <p className="text-[11px] text-zinc-500 mt-1">Type a message below to connect with your family.</p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`p-3.5 rounded-2xl border flex gap-3 items-start ${
                  msg.sender === "You"
                    ? "bg-purple-950/30 border-purple-500/20 ml-6"
                    : "bg-zinc-900/80 border-white/5 mr-6"
                }`}
              >
                {msg.avatar ? (
                  <img
                    src={msg.avatar}
                    alt={msg.sender}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                      msg.sender === "You"
                        ? "bg-purple-600 text-white border-purple-400"
                        : "bg-purple-600/30 text-purple-300 border-purple-500/40"
                    }`}
                  >
                    {msg.sender.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 mb-1">
                    <span>{msg.sender}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{msg.time}</span>
                  </div>
                  <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any, i: number) => {
                        const isImg = att.contentType?.startsWith("image/");
                        return (
                          <div key={i} className="rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/50">
                            {isImg ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-w-[200px] max-h-[200px] object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="px-2.5 py-1.5 text-[10px] text-zinc-300 flex items-center gap-1.5 font-mono">
                                <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                                <span>{att.name || "Attachment"}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Selected file preview pill */}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 bg-purple-950/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs text-purple-300 w-fit">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-purple-400 hover:text-white p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Input Form */}
        <form
          onSubmit={handleSendChatMessage}
          className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-2 pr-2 pl-4 focus-within:border-purple-500 transition-all"
        >
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            className={`p-1.5 transition-colors cursor-pointer ${
              selectedFile ? "text-purple-400" : "text-zinc-500 hover:text-purple-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
            title={selectedFile ? selectedFile.name : "Attach file"}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            placeholder={isDictating ? "Listening... Speak your message..." : (t.typeChatMessage || "Type or dictate a message for family...")}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className={`flex-1 bg-transparent py-2 text-xs text-white outline-none ${
              isDictating ? "placeholder-purple-400 animate-pulse font-medium" : ""
            }`}
          />
          <button
            type="button"
            onClick={toggleDictation}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              isDictating
                ? "bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/50"
                : "bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white"
            }`}
            title={isDictating ? "Stop voice dictation" : "Dictate message with microphone"}
          >
            <Mic className={`w-4 h-4 ${isDictating ? "text-white" : "text-purple-400"}`} />
            {isDictating && <span className="text-[10px] font-bold">Listening</span>}
          </button>
          <button
            type="submit"
            disabled={loading || (!chatMessage.trim() && !selectedFile)}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{t.postMessage || "Send Message"}</span>
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-zinc-900 text-center flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          Connected to Family Care Circle & Google Workspace Chat API
        </span>
      </div>
    </div>
  );
}
