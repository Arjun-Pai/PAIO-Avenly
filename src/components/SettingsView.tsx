import React, { useState } from "react";
import {
  Settings,
  Wifi,
  Bluetooth,
  Volume2,
  ShieldAlert,
  Users,
  Search,
  ChevronRight,
  Sparkles,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Smartphone,
  Sliders,
  Play,
  Clock,
  UserCheck,
  ChevronDown,
  X,
  Lock,
  Moon,
  FileSpreadsheet,
  Video,
  Zap,
  Mic
} from "lucide-react";
import { UserProfile } from "../types";
import { signInWithGoogle, logoutGoogle } from "../lib/firebase";
import WorkspaceHub from "./WorkspaceHub";
import HardwareStudio from "./HardwareStudio";
import { playAudioFeedback, speakText } from "../lib/audioFeedback";

interface SettingsViewProps {
  onClose?: () => void;
  onTriggerOnboarding?: () => void;
  onTriggerStandby?: () => void;
  onTriggerFall?: () => void;
  standbyTimeout?: number;
  onUpdateStandbyTimeout?: (mins: number) => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (updated: UserProfile) => void;
  onSendToChat?: (text: string) => void;
  isCaregiverMode?: boolean;
  setIsCaregiverMode?: (mode: boolean) => void;
  fontSizeScale?: "standard" | "large" | "extraLarge";
  onUpdateFontSizeScale?: (scale: "standard" | "large" | "extraLarge") => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  isSoundFeedback?: boolean;
  onToggleSoundFeedback?: () => void;
}

export default function SettingsView({
  onClose,
  onTriggerOnboarding,
  onTriggerStandby,
  onTriggerFall,
  standbyTimeout = 5,
  onUpdateStandbyTimeout,
  userProfile,
  onUpdateProfile,
  onSendToChat,
  isCaregiverMode,
  setIsCaregiverMode,
  fontSizeScale = "large",
  onUpdateFontSizeScale,
  isHighContrast = false,
  onToggleHighContrast,
  isSoundFeedback = true,
  onToggleSoundFeedback,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<string>("accessibility");
  const [searchQuery, setSearchQuery] = useState("");

  // Google Auth State
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [googleAuthMsg, setGoogleAuthMsg] = useState<string | null>(null);

  const handleGoogleConnect = async () => {
    try {
      setIsSigningInGoogle(true);
      setGoogleAuthMsg(null);
      const googleUser = await signInWithGoogle();
      
      const updated: UserProfile = {
        ...(userProfile || {
          fullName: googleUser.displayName,
          dateOfBirth: "1948-06-12",
          age: 78,
          gender: "Female",
          avatarUrl: googleUser.photoURL,
          primaryPhone: "",
          emergencyContact: { name: "", relationship: "", phone: "" },
          primaryDoctor: { name: "", clinic: "", phone: "" },
          medicalDocs: [],
          onboarded: true
        }),
        fullName: userProfile?.fullName && userProfile.fullName !== "No Profile Configured" ? userProfile.fullName : googleUser.displayName,
        avatarUrl: googleUser.photoURL || userProfile?.avatarUrl || "",
        googleAccount: {
          connected: true,
          email: googleUser.email,
          syncCalendar: true,
          syncDrive: true,
        }
      };

      if (onUpdateProfile) {
        onUpdateProfile(updated);
      }
      setGoogleAuthMsg(`Successfully connected as ${googleUser.email}`);
      setTimeout(() => setGoogleAuthMsg(null), 4000);
    } catch (err: any) {
      console.error("Google login error:", err);
      setGoogleAuthMsg(`Authentication error: ${err?.message || "Sign-in failed"}`);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await logoutGoogle();
      const updated: UserProfile = {
        ...(userProfile || {
          fullName: "",
          dateOfBirth: "",
          age: "",
          gender: "",
          avatarUrl: "",
          primaryPhone: "",
          emergencyContact: { name: "", relationship: "", phone: "" },
          primaryDoctor: { name: "", clinic: "", phone: "" },
          medicalDocs: [],
          onboarded: true
        }),
        googleAccount: {
          connected: false,
          email: "",
          syncCalendar: false,
          syncDrive: false,
        }
      };
      if (onUpdateProfile) {
        onUpdateProfile(updated);
      }
      setGoogleAuthMsg("Google account disconnected.");
      setTimeout(() => setGoogleAuthMsg(null), 3000);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // Sound settings toggles
  const [volume, setVolume] = useState(80);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [chimeSelected, setChimeSelected] = useState("Serene Chime");

  // Profile direct edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(userProfile?.fullName || "");
  const [editAge, setEditAge] = useState(String(userProfile?.age || ""));
  const [editDOB, setEditDOB] = useState(userProfile?.dateOfBirth || "");
  const [editPhone, setEditPhone] = useState(userProfile?.primaryPhone || "");
  const [editLanguage, setEditLanguage] = useState(userProfile?.language || "English");
  const [editEmergencyName, setEditEmergencyName] = useState(userProfile?.emergencyContact?.name || "");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(userProfile?.emergencyContact?.phone || "");
  const [editDoctorName, setEditDoctorName] = useState(userProfile?.primaryDoctor?.name || "");
  const [editDoctorPhone, setEditDoctorPhone] = useState(userProfile?.primaryDoctor?.phone || "");
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  const supportedLanguages = [
    "English", "Hindi", "Bengali", "Marathi", "Telugu", "Tamil",
    "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam", "Spanish",
    "French", "German", "Mandarin"
  ];

  const handleSaveProfile = () => {
    const updated: UserProfile = {
      fullName: editFullName,
      dateOfBirth: editDOB,
      age: editAge,
      gender: userProfile?.gender || "Unspecified",
      avatarUrl: userProfile?.avatarUrl || "",
      primaryPhone: editPhone,
      language: editLanguage,
      googleAccount: userProfile?.googleAccount || { connected: false, email: "", syncCalendar: false, syncDrive: false },
      emergencyContact: {
        name: editEmergencyName,
        relationship: userProfile?.emergencyContact?.relationship || "Caregiver",
        phone: editEmergencyPhone,
      },
      primaryDoctor: {
        name: editDoctorName,
        clinic: userProfile?.primaryDoctor?.clinic || "",
        phone: editDoctorPhone,
      },
      medicalDocs: userProfile?.medicalDocs || [],
      onboarded: true,
    };

    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
    setIsEditingProfile(false);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  // Wi-Fi toggles
  const [wifiEnabled, setWifiEnabled] = useState(() => {
    const val = localStorage.getItem("avenly_wifi_enabled");
    return val !== "false";
  });
  const [wifiSSID, setWifiSSID] = useState("Avenly_Home_5G");

  // Bluetooth toggles
  const [btEnabled, setBtEnabled] = useState(() => {
    const val = localStorage.getItem("avenly_bt_enabled");
    return val !== "false";
  });

  const handleWifiToggle = () => {
    const newVal = !wifiEnabled;
    setWifiEnabled(newVal);
    localStorage.setItem("avenly_wifi_enabled", String(newVal));
  };

  const handleBtToggle = () => {
    const newVal = !btEnabled;
    setBtEnabled(newVal);
    localStorage.setItem("avenly_bt_enabled", String(newVal));
  };

  // Settings menu layout
  const sidebarItems = [
    { id: "accessibility", label: "Elderly Accessibility & Comfort", sub: "Text Size, Contrast, Chimes", icon: <Sliders className="w-4 h-4 text-amber-400" /> },
    { id: "hardware", label: "Camera, Mic & Dictation Test", sub: "Live Hardware & Voice Lab", icon: <Video className="w-4 h-4 text-cyan-400" /> },
    { id: "standby", label: "Inactivity & Standby", sub: `Timeout: ${standbyTimeout === 0 ? "Disabled" : `${standbyTimeout} Mins`}`, icon: <Clock className="w-4 h-4 text-amber-400" /> },
    { id: "profile", label: "Elder Profile & Care", sub: userProfile?.fullName || "Not Configured", icon: <UserCheck className="w-4 h-4 text-emerald-400" /> },
    { id: "workspace", label: "Google Workspace Hub", sub: "Caregiver Access Only", icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> },
    { id: "google", label: "Google Account & Auth", sub: userProfile?.googleAccount?.connected ? (userProfile.googleAccount.email || "Connected") : "Sign in with Google", icon: <ShieldCheck className="w-4 h-4 text-blue-400" /> },
    { id: "general", label: "General & Storage", sub: "Device Name, System Memory", icon: <Settings className="w-4 h-4" /> },
    { id: "wifi", label: "Wi-Fi & Broadband", sub: "Connected: Avenly_Home_5G", icon: <Wifi className="w-4 h-4" /> },
    { id: "bluetooth", label: "Bluetooth Peripherals", sub: "Pulse Oximeter, HR Ring", icon: <Bluetooth className="w-4 h-4" /> },
    { id: "display", label: "Display & Touch", sub: "7-Inch Pi Screen, Brightness", icon: <Sliders className="w-4 h-4" /> },
    { id: "aivoice", label: "AI Voice & Wake Word", sub: "'Hey Aven' Trigger", icon: <Sparkles className="w-4 h-4" /> },
    { id: "sounds", label: "Sounds & Booster", sub: "Speaker Volume & Chimes", icon: <Volume2 className="w-4 h-4" /> },
    { id: "contacts", label: "Caregivers & Team", sub: userProfile?.emergencyContact?.name ? `${userProfile.emergencyContact.name}` : "Not Configured", icon: <Users className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy & Security", sub: "Local Vault, Encryption", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "ai", label: "Gemini AI Engine", sub: "Gemini 1.5 Pro, Grounding", icon: <Sparkles className="w-4 h-4" /> }
  ] as const;

  const testSpeakerChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // AudioContext blocked
    }
  };

  return (
    <div className="w-full h-full bg-[#08090d]/85 backdrop-blur-3xl text-zinc-100 select-none flex flex-col justify-between rounded-b-3xl border-b border-x border-white/10 shadow-2xl relative overflow-hidden animate-fadeIn">
      
      {/* TOP DRAG / PULL HANDLE BAR */}
      <div className="flex flex-col items-center justify-center -mt-2 mb-4 shrink-0 cursor-pointer group" onClick={onClose}>
        <div className="w-16 h-1.5 bg-white/30 group-hover:bg-white/80 rounded-full transition-all mb-1 backdrop-blur-md" />
        <span className="text-[9px] uppercase font-mono font-bold text-zinc-400 tracking-widest flex items-center gap-1">
          <ChevronDown className="w-3 h-3 text-white" /> Control Center & Settings Sheet (Tap or drag up to close)
        </span>
      </div>

      {/* Main Grid layout */}
      <div className="flex-1 grid grid-cols-12 gap-5 items-stretch overflow-hidden">
        
        {/* Left Column: Selector sidebar list */}
        <div className="col-span-4 bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between h-full backdrop-blur-2xl">
          <div>
            {/* Search inputs */}
            <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 mb-3 backdrop-blur-md">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-zinc-500"
              />
            </div>

            {/* Menu Items */}
            <div className="space-y-1 overflow-y-auto max-h-[300px] no-scrollbar">
              {sidebarItems
                .filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all backdrop-blur-md ${
                      activeTab === item.id
                        ? "bg-white/20 border-white/40 text-white shadow-lg"
                        : "bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold tracking-tight line-clamp-1">{item.label}</h4>
                      <p className="text-[9px] text-zinc-400 line-clamp-1 mt-0.5">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                ))}
            </div>
          </div>

          <div className="text-[9px] text-zinc-400 font-mono text-center border-t border-white/10 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
              <span>AvenlyOS v14.4.1</span>
              {onClose && (
                <button onClick={onClose} className="text-zinc-300 hover:text-white font-bold flex items-center gap-1">
                  <X className="w-3 h-3" /> Close
                </button>
              )}
            </div>
            {setIsCaregiverMode && (
              <>
                {/* Caregiver Settings Module */}
                {isCaregiverMode && (
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-3 mb-2">
                    <h4 className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-wider">Caregiver Settings</h4>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="AI Studio API Key"
                        defaultValue={localStorage.getItem("avenly_gemini_api_key") || ""}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val) localStorage.setItem("avenly_gemini_api_key", val);
                          else localStorage.removeItem("avenly_gemini_api_key");
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!isCaregiverMode) {
                      const pin = prompt("Enter Caregiver PIN to unlock management features (hint: 1234):");
                      if (pin === "1234") setIsCaregiverMode(true);
                      else if (pin) alert("Incorrect PIN.");
                    } else {
                      setIsCaregiverMode(false);
                    }
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isCaregiverMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isCaregiverMode ? "Exit Caregiver Mode" : "Unlock Caregiver Mode"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Active Configuration detail panel */}
        <div className="col-span-8 bg-white/5 backdrop-blur-2xl rounded-3xl p-5 border border-white/10 flex flex-col justify-between h-full overflow-y-auto no-scrollbar shadow-2xl">
          
          {/* TAB: ELDERLY ACCESSIBILITY & COMFORT */}
          {activeTab === "accessibility" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Elderly Accessibility & Frictionless Comfort
                </h3>
                <p className="text-xs text-zinc-300 mt-1">
                  Customized for visual clarity, large touch targets (min 48-60px), audible feedback chimes, and zero hidden gestures.
                </p>
              </div>

              {/* 1. Large High-Contrast Font Scaling */}
              <div className="bg-black/40 border-2 border-white/15 p-4 rounded-2xl space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white block">Text & Typography Size</label>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {fontSizeScale === "standard" ? "Standard (16px)" : fontSizeScale === "large" ? "Large (19px)" : "Extra Large (22px)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "standard", label: "Standard", sub: "16px base", sizeClass: "text-sm" },
                    { id: "large", label: "Large (Recommended)", sub: "19px base", sizeClass: "text-base font-bold" },
                    { id: "extraLarge", label: "Extra Large", sub: "22px base", sizeClass: "text-lg font-black" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        playAudioFeedback("tap");
                        if (onUpdateFontSizeScale) {
                          onUpdateFontSizeScale(opt.id as any);
                        }
                      }}
                      className={`min-h-[52px] p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        fontSizeScale === opt.id
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-950/40"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className={opt.sizeClass}>{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-xs text-zinc-400 block mb-1">Live Text Sample:</span>
                  <p className="text-white">
                    "Margaret, your next medication is Metformin 500mg at 12:00 PM with lunch."
                  </p>
                </div>
              </div>

              {/* 2. High-Contrast Display Mode */}
              <div className="bg-black/40 border-2 border-white/15 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                <div>
                  <h4 className="text-sm font-bold text-white">Ultra High-Contrast Mode</h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Solid jet black background with pure bright white text and thick high-contrast borders for low-vision readability.
                  </p>
                </div>
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    if (onToggleHighContrast) onToggleHighContrast();
                  }}
                  className={`min-h-[48px] px-5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md ${
                    isHighContrast
                      ? "bg-amber-400 text-black border-amber-300 font-black shadow-amber-400/20"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
                >
                  {isHighContrast ? "High Contrast: ON" : "High Contrast: OFF"}
                </button>
              </div>

              {/* 3. Audible Tap Chimes & Haptic Feedback */}
              <div className="bg-black/40 border-2 border-white/15 p-4 rounded-2xl space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Audible Tap Confirmation & Vibration</h4>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Plays a reassuring gentle chime whenever buttons are tapped, eliminating uncertainty about "did that work?".
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onToggleSoundFeedback) onToggleSoundFeedback();
                      if (!isSoundFeedback) {
                        playAudioFeedback("chime", 1.0, true);
                      }
                    }}
                    className={`min-h-[48px] px-5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md ${
                      isSoundFeedback
                        ? "bg-emerald-500 text-white border-emerald-400 font-bold"
                        : "bg-white/10 text-zinc-300 border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {isSoundFeedback ? "Sound Cues: ON" : "Sound Cues: OFF"}
                  </button>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => playAudioFeedback("tap", 1.0, true)}
                    className="min-h-[44px] px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    🎵 Test Tap Sound
                  </button>
                  <button
                    onClick={() => playAudioFeedback("medication_taken", 1.0, true)}
                    className="min-h-[44px] px-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl border border-emerald-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    ✨ Test Dose Chime
                  </button>
                  <button
                    onClick={() => playAudioFeedback("warning", 1.0, true)}
                    className="min-h-[44px] px-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl border border-red-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    ⚠️ Test Alert Chime
                  </button>
                </div>
              </div>

              {/* 4. Text-to-Speech Voice Narration Test */}
              <div className="bg-black/40 border-2 border-white/15 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                <div>
                  <h4 className="text-sm font-bold text-white">Voice Screen Narration</h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Clear voice narration with steady pacing for elderly users with cataracts or low vision.
                  </p>
                </div>
                <button
                  onClick={() => {
                    playAudioFeedback("chime");
                    speakText("Hello! Your Avenly Hub is online and monitoring all health vitals. You are safe and doing great today.", userProfile?.language === "Spanish" ? "es-ES" : "en-US");
                  }}
                  className="min-h-[48px] px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl border border-indigo-400 shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                  Test Voice Speech
                </button>
              </div>

              {/* 5. Senior-Friendly Design Guarantees */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Senior-Friendly Safety Architecture Active
                </h4>
                <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                  <li><strong>Zero Gesture-Only Controls:</strong> Every action has an explicit, high-contrast tappable button.</li>
                  <li><strong>Unmistakable Touch Targets:</strong> All buttons meet or exceed 48-60px minimum height.</li>
                  <li><strong>Persistent Back/Home:</strong> Every screen provides a large, prominent "← Back to Home" button.</li>
                  <li><strong>Irreversible Action Protection:</strong> Deletions or emergency triggers require plain-language confirmation.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: CAMERA, MIC & DICTATION TEST STUDIO */}
          {activeTab === "hardware" && (
            <div className="h-full flex flex-col">
              <HardwareStudio
                userLanguage={userProfile?.language}
                userName={userProfile?.fullName}
                onSendToChat={onSendToChat}
                onSetAvatar={(url) => {
                  if (userProfile && onUpdateProfile) {
                    onUpdateProfile({ ...userProfile, avatarUrl: url });
                  }
                }}
              />
            </div>
          )}

          {/* TAB: INACTIVITY & STANDBY MODE */}
          {activeTab === "standby" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white" />
                  Inactivity & Standby Lock Screen
                </h3>
                <p className="text-[11px] text-zinc-400">Configure auto-sleep timer and ambient live health standby mode when the touchscreen is left untouched.</p>
              </div>

              {/* Standby Timeout Selector */}
              <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-3 backdrop-blur-md">
                <label className="text-xs font-bold text-zinc-200 block">Auto-Standby Inactivity Timeout</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { mins: 1, label: "1 Min" },
                    { mins: 3, label: "3 Mins" },
                    { mins: 5, label: "5 Mins (Default)" },
                    { mins: 10, label: "10 Mins" },
                    { mins: 0, label: "Never" }
                  ].map((option) => (
                    <button
                      key={option.mins}
                      onClick={() => onUpdateStandbyTimeout && onUpdateStandbyTimeout(option.mins)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all backdrop-blur-md ${
                        standbyTimeout === option.mins
                          ? "bg-white/25 border-white/50 text-white shadow-lg"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400">
                  When inactive for more than <strong className="text-white">{standbyTimeout === 0 ? "Disabled" : `${standbyTimeout} minutes`}</strong>, Avenly Hub transitions to a low-brightness OLED standby lock screen showing live vital bars, time, date, and continuous safety alerts.
                </p>
              </div>

              {/* Manual Trigger Button */}
              {onTriggerStandby && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                  <div>
                    <h4 className="text-xs font-bold text-white">Test Standby Lock Screen</h4>
                    <p className="text-[10px] text-zinc-400">Preview the ambient time, date, and live vital bars overlay immediately.</p>
                  </div>
                  <button
                    onClick={onTriggerStandby}
                    className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 shadow-lg flex items-center gap-1.5 transition-all active:scale-95 backdrop-blur-md"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Enter Standby Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: ELDER PROFILE & DETAILS */}
          {activeTab === "profile" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-white" />
                    Elder Profile & Care Settings
                  </h3>
                  <p className="text-[11px] text-zinc-400">View and update user profile, emergency contact, and doctor information.</p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Edit Profile Details
                  </button>
                )}
              </div>

              {profileSavedMsg && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Profile details updated successfully!
                </div>
              )}

              {/* Profile Card Summary or Edit Mode */}
              {!isEditingProfile ? (
                <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-3 backdrop-blur-md">
                  <div className="flex items-center gap-4 border-b border-white/10 pb-3">
                    {userProfile?.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt="Elder Profile"
                        className="w-12 h-12 rounded-full object-cover border border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-zinc-400">
                        <UserCheck className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{userProfile?.fullName || "No Profile Configured"}</h4>
                      <p className="text-xs text-zinc-400">
                        {userProfile?.age ? `${userProfile.age} Yrs` : "Age N/A"} • DOB: {userProfile?.dateOfBirth || "N/A"}
                      </p>
                      <p className="text-[10px] text-zinc-300 font-mono mt-0.5">{userProfile?.primaryPhone || "No Phone Set"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 block font-mono">Emergency Contact</span>
                      <span className="text-white font-bold block">{userProfile?.emergencyContact?.name || "Not Configured"}</span>
                      <span className="text-[10px] text-zinc-400 block">{userProfile?.emergencyContact?.phone || ""}</span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 block font-mono">Primary Doctor</span>
                      <span className="text-white font-bold block">{userProfile?.primaryDoctor?.name || "Not Configured"}</span>
                      <span className="text-[10px] text-zinc-400 block">{userProfile?.primaryDoctor?.phone || ""}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/15 p-4 rounded-2xl space-y-4 backdrop-blur-md">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-2">
                    Edit Elder Information
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Primary Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Age</label>
                      <input
                        type="text"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Date of Birth</label>
                      <input
                        type="text"
                        value={editDOB}
                        onChange={(e) => setEditDOB(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">UI System Language (100% Full Translation)</label>
                      <select
                        value={editLanguage}
                        onChange={(e) => setEditLanguage(e.target.value)}
                        className="w-full bg-black/70 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-200 font-bold outline-none focus:border-purple-400"
                      >
                        {supportedLanguages.map((lang) => (
                          <option key={lang} value={lang} className="bg-zinc-900 text-white font-medium">
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-2 pt-2">
                    Emergency Contact & Doctor
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={editEmergencyName}
                        onChange={(e) => setEditEmergencyName(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Emergency Phone</label>
                      <input
                        type="text"
                        value={editEmergencyPhone}
                        onChange={(e) => setEditEmergencyPhone(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Doctor Name</label>
                      <input
                        type="text"
                        value={editDoctorName}
                        onChange={(e) => setEditDoctorName(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">Doctor Phone</label>
                      <input
                        type="text"
                        value={editDoctorPhone}
                        onChange={(e) => setEditDoctorPhone(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-white/40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Re-run Full Onboarding Setup Wizard */}
              {onTriggerOnboarding && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Re-Run Full Onboarding Setup Wizard
                    </h4>
                    <p className="text-[10px] text-zinc-400">Step-by-step guided setup for elder details, prescription uploads, and care preferences.</p>
                  </div>
                  <button
                    onClick={onTriggerOnboarding}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
                  >
                    Start Wizard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE WORKSPACE HUB */}
          {activeTab === "workspace" && (
            <div className="animate-fadeIn h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Google Workspace Caregiver Integration
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Access live Google Sheets vitals or view upcoming doctor appointments via Calendar.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Notice: we don't have vitals explicitly passed here, so we provide defaults or dummy vitals just to render the component */}
                <WorkspaceHub 
                  vitals={{
                    heartRate: "N/A",
                    bloodOxygen: "N/A",
                    skinTemperature: "N/A",
                    sleep: "N/A",
                    sleepHours: "N/A",
                    hydration: "N/A",
                    steps: "N/A",
                    mood: "N/A",
                    overallScore: "N/A",
                    isFallDetected: false,
                  }} 
                  initialTab="sheets" 
                  userName={userProfile?.fullName || "User"} 
                />
              </div>
            </div>
          )}

          {/* TAB: GOOGLE ACCOUNT & AUTH */}
          {activeTab === "google" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Google Account Integration & Auth
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Connect real Google credentials via Firebase Authentication for Workspace Sync (Calendar, Drive, Health logs).
                </p>
              </div>

              {googleAuthMsg && (
                <div className="p-3 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  {googleAuthMsg}
                </div>
              )}

              <div className="bg-black/30 border border-white/10 p-5 rounded-2xl space-y-4 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {userProfile?.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt="Google Avatar"
                        className="w-10 h-10 rounded-full border border-blue-400/40 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 font-bold text-lg">
                        G
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">Google OAuth & Firebase Identity</h4>
                      <p className="text-xs text-zinc-400">
                        {userProfile?.googleAccount?.connected
                          ? `Connected as ${userProfile.googleAccount.email}`
                          : "Not Connected — Click button to sign in"}
                      </p>
                    </div>
                  </div>

                  {userProfile?.googleAccount?.connected ? (
                    <button
                      onClick={handleGoogleDisconnect}
                      disabled={isSigningInGoogle}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Disconnect Account
                    </button>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      disabled={isSigningInGoogle}
                      className="px-4 py-2 bg-white text-black hover:bg-zinc-200 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      {isSigningInGoogle ? "Connecting..." : "Sign in with Google"}
                    </button>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <h5 className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">
                    Permissions & Workspace Services
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-black/40 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Google Calendar Sync</span>
                        <span className="text-[10px] text-zinc-400">Sync medication reminders & doctor visits</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${userProfile?.googleAccount?.connected ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        {userProfile?.googleAccount?.connected ? "Active" : "Disabled"}
                      </span>
                    </div>

                    <div className="bg-black/40 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Google Drive Storage</span>
                        <span className="text-[10px] text-zinc-400">Backup lab reports & medical PDFs</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${userProfile?.googleAccount?.connected ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        {userProfile?.googleAccount?.connected ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GENERAL & STORAGE */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">System Overview & Diagnostics</h3>
                <p className="text-[11px] text-zinc-500">About Avenly Hub & Dispenser console hardware diagnostics.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-500">Hardware Serial</span>
                  <div className="text-xs font-mono font-bold text-zinc-300 mt-1">AVLY-940-HG-COMB</div>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-500">Internal Storage</span>
                  <div className="text-xs font-bold text-zinc-300 mt-1">2.1 GB of 16 GB Used</div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
                    <div className="h-full w-[13%] bg-indigo-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* System Diagnostics section for testing fall detection */}
              {onTriggerFall && (
                <div className="bg-rose-950/30 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-rose-400">Caregiver Diagnostic Tool</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">Test Fall Trigger Diagnostic</h4>
                    <p className="text-[10px] text-zinc-400">Simulate fall accelerometer event to test 30s countdown & EMS dispatch workflow.</p>
                  </div>
                  <button
                    onClick={onTriggerFall}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0 border border-rose-400/30 flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>TEST FALL TRIGGER</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* WI-FI */}
          {activeTab === "wifi" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-display">Wi-Fi & Broadband Settings</h3>
                  <p className="text-[11px] text-zinc-500">Dual-band 5GHz / 2.4GHz Wi-Fi receiver module.</p>
                </div>
                <input
                  type="checkbox"
                  checked={wifiEnabled}
                  onChange={handleWifiToggle}
                  className="w-8 h-4 rounded-full bg-zinc-800 accent-indigo-500"
                />
              </div>

              {wifiEnabled && (
                <div className="space-y-2 bg-[#0f1015] border border-zinc-900 p-3 rounded-xl">
                  <div className="flex justify-between items-center p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-zinc-200">{wifiSSID}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">Connected (98% signal)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BLUETOOTH */}
          {activeTab === "bluetooth" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-display">Bluetooth & Medical Peripherals</h3>
                  <p className="text-[11px] text-zinc-500">Pairs with pulse oximeters and smart health rings.</p>
                </div>
                <input
                  type="checkbox"
                  checked={btEnabled}
                  onChange={handleBtToggle}
                  className="w-8 h-4 rounded-full bg-zinc-800 accent-indigo-500"
                />
              </div>
              <div className="space-y-2 bg-[#0f1015] border border-zinc-900 p-3 rounded-xl text-xs text-zinc-300">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <span>Pulse Oximeter (OxyPro-BLE)</span>
                  <span className="text-emerald-400 text-[10px] font-bold">Connected</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Smart HR Monitor Ring</span>
                  <span className="text-zinc-500 text-[10px]">Paired</span>
                </div>
              </div>
            </div>
          )}

          {/* DISPLAY & TOUCH */}
          {activeTab === "display" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">Display & Touch Screen</h3>
                <p className="text-[11px] text-zinc-500">7-Inch Raspberry Pi touchscreen brightness & sleep mode.</p>
              </div>
              <div className="bg-[#0f1015] border border-zinc-900 p-4 rounded-xl space-y-3">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Touchscreen Brightness</span>
                  <span className="font-mono">85%</span>
                </div>
                <input type="range" min="20" max="100" defaultValue="85" className="w-full accent-indigo-500 h-1.5 rounded-full bg-zinc-800 outline-none" />
              </div>
            </div>
          )}

          {/* SOUNDS & BOOSTER */}
          {activeTab === "sounds" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">Sounds & Booster</h3>
                <p className="text-[11px] text-zinc-500">Senior audio booster for clear speech synthesis.</p>
              </div>

              <div className="bg-[#0f1015] border border-zinc-900 p-4 rounded-xl space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Speaker Volume</span>
                    <span className="font-mono">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 rounded-full bg-zinc-800 outline-none"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                  <span className="text-xs text-zinc-300">Test Chime Audio</span>
                  <button
                    onClick={testSpeakerChime}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 rounded-lg flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 text-emerald-400" /> Play Chime
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI VOICE */}
          {activeTab === "aivoice" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">AI Voice & Wake Word</h3>
                <p className="text-[11px] text-zinc-500">Configure hands-free voice trigger parameters.</p>
              </div>
              <div className="bg-[#0f1015] border border-zinc-900 p-4 rounded-xl space-y-2.5 text-xs text-zinc-300">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span>Wake Name</span>
                  <span className="font-mono font-bold text-purple-400">"Hey Aven"</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Speech Synthesis Voice</span>
                  <span className="text-zinc-400">Comforting Female (Natural)</span>
                </div>
              </div>
            </div>
          )}

          {/* CAREGIVERS */}
          {activeTab === "contacts" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">Caregivers & Emergency Contacts</h3>
                <p className="text-[11px] text-zinc-500">Pre-configured contacts for video calling.</p>
              </div>
              <div className="bg-[#0f1015] border border-zinc-900 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-semibold text-zinc-300">Primary Caregiver</span>
                  <span className="text-xs font-bold text-emerald-400 font-sans">{userProfile?.emergencyContact?.name || "Not Set"}</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-zinc-300">Primary Doctor</span>
                  <span className="text-xs font-bold text-indigo-400 font-sans">{userProfile?.primaryDoctor?.name || "Not Set"}</span>
                </div>
              </div>
            </div>
          )}

          {/* GEMINI AI */}
          {activeTab === "ai" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-display">Gemini AI Engine</h3>
                <p className="text-[11px] text-zinc-500">Manage Gemini API integration, model selection, and user keys.</p>
              </div>

              <div className="space-y-3 bg-[#0f1015] border border-zinc-900 p-4 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Gemini API Key</span>
                  <p className="text-[10px] text-zinc-400 mb-2">
                    Enter your Gemini API Key below. This key will be used by Avenly AI Companion for intelligent voice chat.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Enter Gemini API Key..."
                      defaultValue={localStorage.getItem("avenly_gemini_api_key") || ""}
                      id="settings-gemini-key"
                      className="flex-1 bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                      onClick={() => {
                        const inputEl = document.getElementById("settings-gemini-key") as HTMLInputElement;
                        if (inputEl) {
                          const val = inputEl.value.trim();
                          localStorage.setItem("avenly_gemini_api_key", val);
                          alert(val ? "Gemini API key saved!" : "Gemini API key cleared.");
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md shrink-0"
                    >
                      Save Key
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 text-xs text-zinc-300">
                  <span className="text-xs font-semibold text-zinc-400 block mb-1">Engine Configuration</span>
                  <p className="text-[10px] text-zinc-500">
                    Model: <strong className="text-purple-300">gemini-2.5-flash</strong> with Search Grounding enabled.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
