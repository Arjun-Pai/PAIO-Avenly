import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Keyboard,
  X,
  Volume2,
  Sparkles,
  ChevronRight,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  Trash2,
  MessageSquare
} from "lucide-react";
import { ChatMessage, ConversationThread } from "../types";
import WorkspaceHub from "./WorkspaceHub";
import { getTranslation, getLocaleCode } from "../lib/translations";
import { playAudioFeedback } from "../lib/audioFeedback";

interface AIChatProps {
  userName?: string;
  userLanguage?: string;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onStartSpeech: () => void;
  onStopSpeech: () => void;
  onSyncVitals: () => void;
  onBack: () => void;
}

export default function AIChat({
  userName = "User",
  userLanguage = "English",
  initialQuery,
  onClearInitialQuery,
  onStartSpeech,
  onStopSpeech,
  onSyncVitals,
  onBack,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [aiState, setAiState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [aiConnectionMode, setAiConnectionMode] = useState("Checking...");
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showGoogleChatHub, setShowGoogleChatHub] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const customApiKey = localStorage.getItem("avenly_gemini_api_key") || "";

  // Preloaded interactive conversation threads
  const recentThreads: ConversationThread[] = [
    { id: "chat-1", topic: "Health Summary", snippet: "Give me a summary of my health today.", time: "9:45 AM", type: "health" },
    { id: "chat-2", topic: "Plant Care", snippet: "How often should I water my areca palm?", time: "Yesterday", type: "companion" },
    { id: "chat-3", topic: "News Update", snippet: "What are the top headlines from today?", time: "Yesterday", type: "news" },
    { id: "chat-4", topic: "Recipe Help", snippet: "How do I make soft idlis at home?", time: "2 Days Ago", type: "recipe" }
  ];

  // Quick senior friendly chips
  const conversationChips = [
    "Summarize my health today",
    "What medication is due next?",
    "Tell me a cheerful joke",
    "How is the weather today?"
  ];

  // Fetch messages and connection status on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const handledInitialQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && handledInitialQueryRef.current !== initialQuery) {
      handledInitialQueryRef.current = initialQuery;
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/gemini/messages");
      const data = await response.json();
      setMessages(data);
    } catch (e) {
      // Ignore
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setInputText("");
    setAiState("processing");
    onStartSpeech(); // Notify parent of active audio

    // Update optimistic user message locally
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: textToSend, timestamp: "Just now" }
    ]);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: textToSend, 
          language: userLanguage,
          apiKey: customApiKey || undefined
        })
      });
      const data = await response.json();
      
      // Update connection mode display (e.g. Gemini Cloud vs Offline Local)
      setAiConnectionMode(data.mode || "Gemini Cloud AI");

      // Set AI to speaking state
      setAiState("speaking");
      
      // Update messages from server list to be fully synchronized
      await fetchMessages();

      // Speak synthesis if supported
      speakText(data.response);

      // Settle back to idle after a while based on reading speed
      const speakDelay = Math.max(3000, data.response.length * 60);
      setTimeout(() => {
        setAiState("idle");
        onStopSpeech();
      }, speakDelay);

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: "I encountered an error connecting to my server. Vitals remain stable.", timestamp: "Just now" }
      ]);
      setAiState("idle");
      onStopSpeech();
    }
  };

  const speakText = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        // Cancel any active speech
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.lang = getLocaleCode(userLanguage);
        // Try to pick a voice matching locale or comforting fallback
        const voices = window.speechSynthesis.getVoices();
        const targetLocale = getLocaleCode(userLanguage).toLowerCase();
        const localeVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLocale.slice(0, 2)));
        if (localeVoice) {
          utterance.voice = localeVoice;
        } else {
          const comfortingVoice = voices.find(v => v.name.includes("Zira") || v.name.includes("Samantha") || v.name.includes("Google US English"));
          if (comfortingVoice) utterance.voice = comfortingVoice;
        }
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      // Speech synthesis block, ignore
    }
  };

  const handleMicToggle = () => {
    setSpeechError(null);
    if (aiState === "idle") {
      setAiState("listening");
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const rec = new SpeechRecognition();
          rec.lang = getLocaleCode(userLanguage);
          rec.continuous = false;
          rec.interimResults = false;
          
          rec.onresult = (event: any) => {
            const text = event.results[0][0]?.transcript;
            if (text) {
              setSpeechError(null);
              handleSendMessage(text);
            }
          };
          
          rec.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
            setAiState("idle");
            onStopSpeech();
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
              setSpeechError("Microphone permission was denied or restricted. Switched to keyboard mode.");
              setIsKeyboardMode(true);
            } else if (event.error === "no-speech") {
              setSpeechError("No speech detected. Tap microphone to try again.");
            } else if (event.error === "network") {
              setSpeechError("Speech network offline. Switched to keyboard mode.");
              setIsKeyboardMode(true);
            } else {
              setSpeechError(`Speech error (${event.error}). Use keyboard input.`);
            }
          };
          
          rec.onend = () => {
            setAiState((prev) => prev === "listening" ? "idle" : prev);
          };
          
          rec.start();
        } catch (err: any) {
          console.warn("Failed to start speech recognition:", err);
          setAiState("idle");
          onStopSpeech();
          setSpeechError("Microphone access not allowed. Switched to keyboard mode.");
          setIsKeyboardMode(true);
        }
      } else {
        setSpeechError("Speech recognition not supported in this browser. Switched to keyboard mode.");
        setIsKeyboardMode(true);
        setAiState("idle");
        onStopSpeech();
      }
    } else {
      setAiState("idle");
      onStopSpeech();
    }
  };

  useEffect(() => {
    const handleWake = () => {
      if (aiState === "idle") {
        handleMicToggle();
      }
    };
    window.addEventListener("avenly-wake-word", handleWake);
    return () => window.removeEventListener("avenly-wake-word", handleWake);
  }, [aiState]);

  const handleThreadSelect = (thread: ConversationThread) => {
    handleSendMessage(thread.snippet);
  };

  const handleClearHistory = async () => {
    try {
      await fetch("/api/gemini/clear", { method: "POST" });
      await fetchMessages();
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="w-full h-full animate-fadeIn select-none flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-b from-[#050609] to-[#0a0614]">
      
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-6 right-6 z-30 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
          <span>Exit Assistant</span>
        </button>
      </div>

      {/* Absolute Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#050609] to-[#050609] opacity-70" />
      
      {/* Central Interactive Voice Orb Graphic */}
      <div className="relative z-10 flex flex-col justify-center items-center w-full max-w-2xl px-8 mt-24">
        
        {/* Voice Welcome Title */}
        <div className="text-center mb-16 animate-slideDown">
          <h3 className="text-4xl font-light text-white tracking-tight font-display drop-shadow-lg">Hello, {userName || "User"}</h3>
          <p className="text-sm text-zinc-400 mt-2 font-medium tracking-wide">
            {aiState === "idle" && "Tap the microphone to speak with Avenly"}
            {aiState === "listening" && "Listening to you... speak naturally"}
            {aiState === "processing" && "Thinking..."}
            {aiState === "speaking" && "Speaking..."}
          </p>
        </div>

        {/* Glowing voice visual orb */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-16">
          
          {/* Backdrop ambient blur shadow layers */}
          <div className={`absolute inset-0 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-full filter blur-3xl transition-opacity duration-1000 ${
            aiState === "listening" ? "opacity-100 animate-pulse" : aiState === "speaking" ? "opacity-80" : "opacity-30"
          }`} />
          
          {/* Core animated gradient sphere orb (Siri-style) */}
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-700 ease-out z-10 ${
              aiState === "listening"
                ? "scale-110 shadow-[0_0_80px_rgba(255,255,255,0.4)] border border-white/40"
                : aiState === "speaking"
                ? "animate-pulse scale-105 shadow-[0_0_50px_rgba(255,255,255,0.2)] border border-white/20"
                : "opacity-90 scale-100 border border-white/10"
            }`}
          >
            {/* Liquid Background layer */}
            <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#a855f7_50%,_#3b82f6_100%)] opacity-80 mix-blend-overlay transition-transform duration-[3000ms] ${aiState !== 'idle' ? 'scale-150 animate-pulse' : 'scale-100'}`} />
            
            {/* Glassmorphism Surface */}
            <div className="absolute inset-0 rounded-full border border-white/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] bg-white/10 backdrop-blur-md mix-blend-overlay"></div>
            
            {/* Specular Highlight */}
            <div className="absolute top-2 left-4 w-16 h-8 bg-white/60 rounded-full filter blur-[8px] transform rotate-[-45deg]"></div>

            {/* Internal soundwave visual */}
            <div className="flex items-center gap-1.5 h-10 z-20">
              <span className={`w-1 bg-white/90 rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${aiState === "listening" ? "animate-wave h-8" : aiState === "speaking" ? "h-5 animate-pulse" : "h-3"}`} style={{ animationDelay: "0.0s" }} />
              <span className={`w-1 bg-white/90 rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${aiState === "listening" ? "animate-wave h-12" : aiState === "speaking" ? "h-8 animate-pulse" : "h-4"}`} style={{ animationDelay: "0.1s" }} />
              <span className={`w-1 bg-white/90 rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${aiState === "listening" ? "animate-wave h-16" : aiState === "speaking" ? "h-10 animate-pulse" : "h-5"}`} style={{ animationDelay: "0.2s" }} />
              <span className={`w-1 bg-white/90 rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${aiState === "listening" ? "animate-wave h-12" : aiState === "speaking" ? "h-8 animate-pulse" : "h-4"}`} style={{ animationDelay: "0.3s" }} />
              <span className={`w-1 bg-white/90 rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${aiState === "listening" ? "animate-wave h-8" : aiState === "speaking" ? "h-5 animate-pulse" : "h-3"}`} style={{ animationDelay: "0.4s" }} />
            </div>
          </div>

          {/* Orbiting particles */}
          {aiState === "processing" && (
            <div className="absolute inset-0 w-full h-full border-[3px] border-purple-400/50 rounded-full animate-spin border-t-transparent border-l-transparent" />
          )}
        </div>

        {/* Speech Controls row */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 z-20 w-full max-w-md">
          <button
            onClick={() => {
              playAudioFeedback("tap");
              setIsKeyboardMode(!isKeyboardMode);
            }}
            className={`min-h-[56px] px-4 py-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg cursor-pointer ${
              isKeyboardMode
                ? "bg-purple-600 text-white border-purple-400 font-bold"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/20"
            }`}
            title="Keyboard Text Mode"
          >
            <Keyboard className="w-6 h-6" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Type Text</span>
          </button>

          <button
            onClick={() => {
              playAudioFeedback("tap");
              handleMicToggle();
            }}
            className={`min-h-[64px] px-6 py-3 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-2xl cursor-pointer ${
              aiState === "listening"
                ? "bg-red-600 text-white animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-105 border-2 border-red-300 font-black"
                : "bg-gradient-to-tr from-purple-600 to-indigo-600 hover:brightness-110 text-white border-2 border-purple-300 font-bold"
            }`}
            title="Microphone input"
          >
            <Mic className="w-7 h-7" />
            <span className="text-xs font-black uppercase tracking-wider">
              {aiState === "listening" ? "Stop Listening" : "Tap to Speak"}
            </span>
          </button>

          <button
            onClick={() => {
              playAudioFeedback("back");
              onBack();
            }}
            className="min-h-[56px] px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg cursor-pointer"
            title="Close Assistant and Return Home"
          >
            <X className="w-6 h-6" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Close</span>
          </button>
        </div>

        {/* State label under orb */}
        <div className="mt-4 text-center flex flex-col items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            {aiState === "listening" ? "● Listening..." : aiState === "speaking" ? "● Speaking response" : aiState === "processing" ? "● Processing query..." : `Mode: ${aiConnectionMode || "Gemini Cloud AI"}`}
          </span>

          {speechError && (
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl flex items-center gap-2 max-w-md animate-fadeIn">
              <span>{speechError}</span>
              <button
                onClick={() => setSpeechError(null)}
                className="text-zinc-400 hover:text-white text-xs font-bold underline ml-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
        
      </div>

      {/* Text Chat & Input Drawer Overlay */}
      {isKeyboardMode && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-40 flex flex-col justify-between animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white font-display">Avenly Companion Conversation Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold border border-red-500/20 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
              <button
                onClick={() => setIsKeyboardMode(false)}
                className="px-3.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700"
              >
                Close Text Mode
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-500 my-12 text-sm">
                No chat history yet. Ask Avenly anything about health, medications, or news!
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">{m.timestamp || "Just now"}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Avenly Companion a question..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
      
      {/* Floating Subtitles & Medical Disclaimer */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center pointer-events-none px-8 z-30 gap-2">
        <p className="text-center text-sm font-medium text-white/90 drop-shadow-xl max-w-2xl bg-black/50 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10 transition-all">
          {messages.length > 0 ? messages[messages.length - 1].text : "I am here to assist you."}
        </p>
        <p className="text-[9px] text-zinc-500 text-center font-mono uppercase tracking-wider">
          Medical Guidance Disclaimer: This AI companion provides wellness support, not formal medical diagnosis.
        </p>
      </div>

    </div>
  );
}
