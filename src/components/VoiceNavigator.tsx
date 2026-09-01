import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  HelpCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Droplet,
  Pill,
  Heart,
  Calendar,
  Phone,
  MessageSquare,
  Radio,
  Clock
} from "lucide-react";
import { TabType, VitalsState, MedicationItem } from "../types";
import { parseVoiceCommand, getScreenVoiceSummary, SWIPEABLE_TABS } from "../lib/voiceCommands";
import { playAudioFeedback, speakText } from "../lib/audioFeedback";
import { getTranslation, getLocaleCode } from "../lib/translations";

interface VoiceNavigatorProps {
  activeTab: TabType;
  onNavigate: (tab: TabType, direction?: "next" | "prev") => void;
  vitals?: VitalsState;
  medications?: MedicationItem[];
  userLanguage?: string;
  onLogHydration: () => void;
  onMarkMedicationTaken: () => void;
  onTriggerSOS: () => void;
  onOpenSettings: () => void;
  onToggleHighContrast: () => void;
  onChangeFontSize: () => void;
  onAskAI: (query: string) => void;
  isHighContrast?: boolean;
}

export default function VoiceNavigator({
  activeTab,
  onNavigate,
  vitals,
  medications,
  userLanguage = "English",
  onLogHydration,
  onMarkMedicationTaken,
  onTriggerSOS,
  onOpenSettings,
  onToggleHighContrast,
  onChangeFontSize,
  onAskAI,
  isHighContrast
}: VoiceNavigatorProps) {
  const [isListening, setIsListening] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(() => {
    return localStorage.getItem("avenly_continuous_voice") === "true";
  });
  const [transcript, setTranscript] = useState<string>("");
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const feedbackTimerRef = useRef<any>(null);

  const t = getTranslation(userLanguage);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getLocaleCode(userLanguage) || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }

        const currentSpoken = (finalTranscript || interimTranscript).trim();
        if (currentSpoken) {
          setTranscript(currentSpoken);
        }

        if (finalTranscript.trim()) {
          handleExecuteCommand(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.debug("Voice recognition notice:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission required for voice navigation.");
          setIsListening(false);
        } else if (event.error === "no-speech") {
          // Expected on silence; continuous mode will restart automatically
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart if continuous mode is enabled
        if (isContinuousMode) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 300);
        }
      };

      recognitionRef.current = recognition;

      // Start automatically if continuous mode was previously enabled
      if (isContinuousMode) {
        try {
          recognition.start();
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setSpeechSupported(false);
    }

    return () => {
      clearTimeout(restartTimerRef.current);
      clearTimeout(feedbackTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [userLanguage, isContinuousMode]);

  // Handle Command Execution
  const handleExecuteCommand = (spokenText: string) => {
    const result = parseVoiceCommand(spokenText, activeTab, vitals, medications);
    
    // Display feedback toast
    setLastCommandFeedback(result.feedbackText);
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setLastCommandFeedback(null);
      setTranscript("");
    }, 4500);

    switch (result.action) {
      case "navigate":
        if (result.targetTab) {
          playAudioFeedback("tap");
          onNavigate(result.targetTab, result.direction);
          speakText(result.feedbackText);
        }
        break;

      case "action_sos":
        playAudioFeedback("warning");
        onTriggerSOS();
        speakText("Opening Emergency Response. Please confirm help dispatch.");
        break;

      case "action_hydrate":
        playAudioFeedback("success");
        onLogHydration();
        speakText("Logged one glass of water. Keep staying well hydrated!");
        break;

      case "action_taken_meds":
        playAudioFeedback("medication_taken");
        onMarkMedicationTaken();
        speakText("Marked your scheduled medication dose as taken.");
        break;

      case "action_read_screen": {
        playAudioFeedback("chime");
        const summary = getScreenVoiceSummary(activeTab, vitals, medications);
        speakText(summary);
        break;
      }

      case "action_tell_time": {
        playAudioFeedback("tap");
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
        speakText(`It is ${timeStr} on ${dateStr}.`);
        break;
      }

      case "action_vitals": {
        playAudioFeedback("chime");
        const hr = vitals?.heartRate || "72";
        const spo2 = vitals?.bloodOxygen || "98 percent";
        const steps = vitals?.steps || "3,400";
        speakText(`Your heart rate is currently ${hr} beats per minute. Blood oxygen is ${spo2}. You have taken ${steps} steps today.`);
        break;
      }

      case "action_settings":
        playAudioFeedback("tap");
        onOpenSettings();
        speakText("Opening Settings and Accessibility.");
        break;

      case "action_contrast":
        playAudioFeedback("tap");
        onToggleHighContrast();
        speakText("Toggled High Contrast display.");
        break;

      case "action_font_size":
        playAudioFeedback("tap");
        onChangeFontSize();
        speakText("Adjusted text size for better readability.");
        break;

      case "action_ai_query":
        if (result.aiQuery) {
          playAudioFeedback("tap");
          onAskAI(result.aiQuery);
          speakText(`Asking Avenly: ${result.aiQuery}`);
        }
        break;

      case "action_help":
        playAudioFeedback("tap");
        setIsHelpOpen(true);
        speakText("Opening Voice Navigation Help. You can speak commands like Go Home, Check Vitals, My Pills, or Call Family.");
        break;

      case "unknown":
      default:
        // Try passing general conversational phrases to AI
        if (spokenText.length > 5 && !spokenText.startsWith("err")) {
          onAskAI(spokenText);
          speakText(`Asking Avenly: ${spokenText}`);
        }
        break;
    }
  };

  // Auto-start listening on mount if supported
  useEffect(() => {
    if (speechSupported && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Auto-start voice failed", err);
      }
    }
  }, [speechSupported]);

  const toggleMic = () => {
    if (!speechSupported) {
      speakText("Voice recognition is not supported in this browser. Please use touch navigation.");
      return;
    }

    if (isListening) {
      playAudioFeedback("back");
      setIsListening(false);
      setIsContinuousMode(false);
      localStorage.setItem("avenly_continuous_voice", "false");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      playAudioFeedback("tap");
      setErrorMessage(null);
      setIsContinuousMode(true);
      localStorage.setItem("avenly_continuous_voice", "true");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.debug("Recognition start retry:", e);
        }
      }
      speakText("Voice navigation activated. Say Go to Health, My Pills, Call Family, or Next Screen.");
    }
  };

  // Quick suggestion chips
  const quickSuggestions = [
    { label: "Go Home", command: "Go home", icon: "🏠" },
    { label: "Check Vitals", command: "Check my vitals", icon: "❤️" },
    { label: "My Pills", command: "Open medication", icon: "💊" },
    { label: "Log Water", command: "I drank water", icon: "💧" },
    { label: "Call Family", command: "Open calls", icon: "📞" },
    { label: "Swipe Next ❯", command: "Next screen", icon: "➡️" },
    { label: "Read Screen", command: "Read screen", icon: "🔊" }
  ];

  return (
    <>
      {/* GLOBAL FLOATING VOICE ACTIVATION & NAVIGATION BAR */}
      <div className="hidden">
        <div
          className={`w-full max-w-2xl rounded-2xl p-2.5 transition-all duration-300 shadow-xl border-2 flex flex-col gap-2 ${
            isHighContrast
              ? "bg-black border-amber-400 text-white"
              : isListening
              ? "bg-indigo-950/90 border-cyan-400/80 shadow-[0_0_25px_rgba(34,211,238,0.25)] text-white backdrop-blur-xl"
              : "bg-zinc-900/85 border-white/15 text-zinc-200 backdrop-blur-xl"
          }`}
        >
          {/* Top Row: Mic Button + Status + Help */}
          <div className="flex items-center justify-between gap-2.5">
            {/* Big Senior-Friendly Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2 transition-all active:scale-95 cursor-pointer touch-target-senior border-2 ${
                isListening
                  ? "bg-red-600 hover:bg-red-500 text-white border-red-300 animate-pulse shadow-lg shadow-red-950/60"
                  : "bg-gradient-to-tr from-cyan-600 to-blue-600 hover:brightness-110 text-white border-cyan-300/60 shadow-md"
              }`}
              title={isListening ? "Tap to Stop Voice Navigation" : "Tap to Start Voice Navigation"}
            >
              {isListening ? (
                <>
                  <Mic className="w-5 h-5 animate-bounce" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <MicOff className="w-5 h-5 opacity-90" />
                  <span>Tap to Speak 🎤</span>
                </>
              )}
            </button>

            {/* Middle Status / Live Transcript */}
            <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
              {isListening ? (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold truncate text-cyan-200">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <span className="truncate">
                    {transcript ? `"${transcript}"` : "Say 'Go Home', 'My Pills', 'Next'..."}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-300 truncate font-medium">
                  {errorMessage || "Voice Navigation: Speak commands or tap suggestions"}
                </span>
              )}
            </div>

            {/* Action Buttons: Read Aloud & Help */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  playAudioFeedback("chime");
                  const summary = getScreenVoiceSummary(activeTab, vitals, medications);
                  speakText(summary);
                }}
                className="min-h-[44px] px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Read aloud what's on this screen"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Read Screen</span>
              </button>

              <button
                onClick={() => {
                  playAudioFeedback("tap");
                  setIsHelpOpen(true);
                }}
                className="min-h-[44px] w-11 bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white rounded-xl border border-white/20 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                title="Voice Navigation Instructions"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Voice Suggestion Chips (Horizontal Scrollable / Tap-or-Speak) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Quick Voice:
            </span>
            {quickSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTranscript(item.command);
                  handleExecuteCommand(item.command);
                }}
                className="min-h-[36px] px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title={`Say: "${item.command}" or tap here`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Toast / Active Command Feedback */}
          <AnimatePresence>
            {lastCommandFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bg-cyan-500/20 border border-cyan-400 text-cyan-100 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="truncate">{lastCommandFeedback}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* VOICE COMMANDS HELP MODAL (SENIOR FRIENDLY WITH BIG TEXT & ICONS) */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsHelpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
                      Voice Commands Guide
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400">
                      Speak naturally to control every feature of Avenly
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Instructions list with big high contrast cards */}
              <div className="space-y-3">
                <div className="p-3.5 bg-zinc-900 rounded-2xl border border-white/15 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm sm:text-base">
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                    <span>Travel & Switch Screens</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 pl-7">
                    Say: <strong>"Go Home"</strong>, <strong>"Next Screen"</strong>, <strong>"Previous Screen"</strong>, <strong>"Swipe Left"</strong>, or <strong>"Go Back"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900 rounded-2xl border border-white/15 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm sm:text-base">
                    <Heart className="w-5 h-5 text-emerald-400" />
                    <span>Health & Vitals</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 pl-7">
                    Say: <strong>"Check Vitals"</strong>, <strong>"What is my Heart Rate?"</strong>, or <strong>"Open Health"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900 rounded-2xl border border-white/15 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm sm:text-base">
                    <Pill className="w-5 h-5 text-cyan-400" />
                    <span>Medication & Water</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 pl-7">
                    Say: <strong>"I took my pills"</strong>, <strong>"Open Medication"</strong>, or <strong>"I drank water"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900 rounded-2xl border border-white/15 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-purple-300 text-sm sm:text-base">
                    <Phone className="w-5 h-5 text-purple-400" />
                    <span>Calls, Family & Calendar</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 pl-7">
                    Say: <strong>"Call Family"</strong>, <strong>"Open Calendar"</strong>, or <strong>"Open Chats"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900 rounded-2xl border border-white/15 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-400 text-sm sm:text-base">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span>Emergency SOS</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 pl-7">
                    Say: <strong>"Emergency"</strong>, <strong>"Call 911"</strong>, or <strong>"Help Me"</strong>.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  playAudioFeedback("tap");
                  setIsHelpOpen(false);
                }}
                className="w-full min-h-[52px] bg-amber-400 hover:bg-amber-300 text-black font-black text-sm sm:text-base uppercase rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95"
              >
                GOT IT, CLOSE GUIDE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
